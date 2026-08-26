import { createReadStream } from 'node:fs';
import { lstat, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askLlm } from './llm-client.mjs';
import { loadLlmConfig } from './llm-config.mjs';
import { validateAnswer } from './validate-answer.mjs';
import { createSearchIndex, searchCorpus } from '../knowledge/search.mjs';

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.md', 'text/markdown; charset=utf-8'], ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'], ['.pdf', 'application/pdf'], ['.vtt', 'text/vtt; charset=utf-8'],
]);

const ARCHIVE_BASENAMES = new Set([
  '中文全文.html', '中文全文.md', '英文原文.md', '原始网页.html', 'metadata.json', '原始报告.pdf',
]);
const ARCHIVE_HTML_CSP = "sandbox allow-popups allow-popups-to-escape-sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store' });
  res.end(payload);
}

function openNdjson(res) {
  res.writeHead(200, {
    'content-type': 'application/x-ndjson; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
}

function ndjson(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}

function evidenceFrom(results) {
  return results.map((chunk) => ({
    chunkId: chunk.chunkId, articleId: chunk.articleId, titleZh: chunk.titleZh, titleOriginal: chunk.titleOriginal,
    publisher: chunk.publisher, publishedAt: chunk.publishedAt, sectionPath: chunk.sectionPath,
    content: chunk.content, sourceUrl: chunk.sourceUrl, localPaths: chunk.localPaths,
  }));
}

async function readJson(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error('Request body is too large');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { const error = new Error('Malformed JSON'); error.code = 'MALFORMED_JSON'; throw error; }
}

function safePath(root, relative) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) return null;
  return resolved;
}

async function pathContainsSymlink(root, target) {
  const resolvedRoot = path.resolve(root);
  const relative = path.relative(resolvedRoot, target);
  let current = resolvedRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) return true;
  }
  return false;
}

async function serveFile(res, root, relative, { directoryIndex = true, headers = {}, rejectSymlinks = false } = {}) {
  let target = safePath(root, relative);
  if (!target) return json(res, 403, { error: 'Forbidden path' });
  try {
    if (rejectSymlinks && await pathContainsSymlink(root, target)) return json(res, 403, { error: 'Forbidden path' });
    let info = await stat(target);
    if (info.isDirectory()) {
      if (!directoryIndex) return json(res, 403, { error: 'Forbidden path' });
      target = safePath(root, path.join(relative, 'index.html'));
      if (!target) return json(res, 403, { error: 'Forbidden path' });
      info = await stat(target);
    }
    if (!info.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': MIME.get(path.extname(target).toLowerCase()) || 'application/octet-stream', 'content-length': info.size, 'x-content-type-options': 'nosniff', ...headers });
    createReadStream(target).pipe(res);
  } catch {
    json(res, 404, { error: 'Not found' });
  }
}

function requestPathname(requestTarget) {
  const absolute = requestTarget.match(/^[a-z][a-z\d+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i);
  if (absolute) return absolute[1] || '/';
  const network = requestTarget.match(/^\/\/[^/?#]*(\/[^?#]*)?/);
  if (network) return network[1] || '/';
  return requestTarget.split('?', 1)[0];
}

function isArchivePath(rawPathname) {
  const asciiDecoded = rawPathname.replace(/%([\da-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  return asciiDecoded === '/archive' || asciiDecoded.startsWith('/archive/');
}

function decodeArchivePath(rawPathname) {
  if (/%(?:2e|2f|5c)/i.test(rawPathname)) return null;
  if (!rawPathname.startsWith('/archive/')) return null;
  let decoded;
  try { decoded = decodeURIComponent(rawPathname); }
  catch { return null; }
  if (!decoded.startsWith('/archive/')) return null;
  const relative = decoded.slice('/archive/'.length);
  const parts = relative.split('/');
  if (parts.length !== 4) return null;
  const [radar, articles, article, basename] = parts;
  if (!radar || radar.startsWith('.') || articles !== 'articles' || !article || article.startsWith('.')) return null;
  if (parts.some((part) => part === '.' || part === '..' || part.includes('\\'))) return null;
  if (!ARCHIVE_BASENAMES.has(basename)) return null;
  return relative;
}

function archiveHeaders(relative) {
  const headers = { 'referrer-policy': 'no-referrer' };
  if (path.posix.extname(relative).toLowerCase() === '.html') headers['content-security-policy'] = ARCHIVE_HTML_CSP;
  return headers;
}

export function createAppServer({
  corpus,
  webRoot,
  archiveRoot,
  llmConfig = loadLlmConfig(),
  askImpl = askLlm,
  bodyLimit = 1_000_000,
}) {
  const chunks = corpus.flatMap((article) => article.chunks);
  const index = createSearchIndex(chunks);
  return createServer(async (req, res) => {
    try {
      const rawPathname = requestPathname(req.url);
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method === 'GET' && (isArchivePath(rawPathname) || isArchivePath(url.pathname))) {
        const relative = decodeArchivePath(rawPathname);
        if (!relative) return json(res, 403, { error: 'Forbidden path' });
        return serveFile(res, archiveRoot, relative, { directoryIndex: false, headers: archiveHeaders(relative), rejectSymlinks: true });
      }
      if (req.method === 'GET' && url.pathname === '/api/health') {
        return json(res, 200, {
          status: 'ok',
          articles: corpus.length,
          chunks: chunks.length,
          llmConfigured: Boolean(llmConfig.configured),
          provider: llmConfig.provider,
          model: llmConfig.model,
          deepseekConfigured: Boolean(llmConfig.configured && llmConfig.provider === 'deepseek'),
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/search') {
        const body = await readJson(req, bodyLimit);
        if (typeof body.query !== 'string' || !body.query.trim()) return json(res, 400, { error: 'query is required', code: 'INVALID_QUERY' });
        return json(res, 200, searchCorpus(index, body.query, body.filters || {}));
      }
      if (req.method === 'POST' && url.pathname === '/api/ask') {
        const body = await readJson(req, bodyLimit);
        if (typeof body.question !== 'string' || !body.question.trim()) return json(res, 400, { error: 'question is required', code: 'INVALID_QUERY' });
        const retrieval = searchCorpus(index, body.question, body.filters || {});
        if (retrieval.insufficient) return json(res, 200, { answer: '现有归档资料不足以可靠回答这个问题。', claims: [], limitations: ['未检索到足够相关的文章证据。'], insufficient: true, sources: [] });
        if (!llmConfig.configured) return json(res, 503, { error: '尚未配置问答模型 API Key', code: 'MISSING_API_KEY' });
        const evidence = evidenceFrom(retrieval.results);
        const raw = await askImpl({ question: body.question, evidence, config: llmConfig });
        return json(res, 200, validateAnswer(raw, evidence));
      }
      if (req.method === 'POST' && url.pathname === '/api/ask/stream') {
        const body = await readJson(req, bodyLimit);
        if (typeof body.question !== 'string' || !body.question.trim()) return json(res, 400, { error: 'question is required', code: 'INVALID_QUERY' });
        openNdjson(res);
        ndjson(res, { type: 'status', stage: 'retrieving', message: '正在检索归档全文…' });
        try {
          const retrieval = searchCorpus(index, body.question, body.filters || {});
          if (retrieval.insufficient) {
            ndjson(res, { type: 'insufficient', message: '这个问题我还在学习，目前归档资料不足以给出可靠结论。你可以换个问法，或先问我现有报告中的观点。' });
            ndjson(res, { type: 'done' });
            res.end();
            return;
          }
          ndjson(res, { type: 'status', stage: 'generating', message: '正在组织回答…' });
          if (!llmConfig.configured) {
            const error = new Error('Question-answering model is not configured');
            error.code = 'MISSING_API_KEY';
            throw error;
          }
          const evidence = evidenceFrom(retrieval.results);
          const raw = await askImpl({ question: body.question, evidence, config: llmConfig });
          ndjson(res, { type: 'status', stage: 'validating', message: '正在核验来源…' });
          const validated = validateAnswer(raw, evidence);
          ndjson(res, { type: 'answer_start', answer: validated.answer });
          for (const section of validated.sections) ndjson(res, { type: 'section', section });
          ndjson(res, { type: 'sources', sources: validated.sources });
          ndjson(res, { type: 'done' });
          res.end();
          return;
        } catch {
          ndjson(res, { type: 'error', message: '刚刚没能完成回答，请再试一次。' });
          ndjson(res, { type: 'done' });
          res.end();
          return;
        }
      }
      if (req.method === 'GET') {
        const relative = decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
        return serveFile(res, webRoot, relative);
      }
      json(res, 404, { error: 'Not found' });
    } catch (error) {
      if (error.code === 'BODY_TOO_LARGE') return json(res, 413, { error: error.message, code: error.code });
      if (error.code === 'MALFORMED_JSON') return json(res, 400, { error: error.message, code: error.code });
      const status = ['MISSING_API_KEY', 'AUTHENTICATION', 'RATE_LIMIT', 'UPSTREAM_TIMEOUT', 'UPSTREAM_HTTP', 'UPSTREAM_ERROR'].includes(error.code) ? 503 : 500;
      json(res, status, { error: error.message, code: error.code || 'INTERNAL_ERROR' });
    }
  });
}

function parseArgs(argv) {
  const options = { host: '127.0.0.1', port: 4318, corpusPath: 'work/knowledge/corpus.json', webRoot: 'web', archiveRoot: 'work/archive' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--host') options.host = argv[++i];
    else if (argv[i] === '--port') options.port = Number(argv[++i]);
    else if (argv[i] === '--corpus') options.corpusPath = argv[++i];
    else if (argv[i] === '--web') options.webRoot = argv[++i];
    else if (argv[i] === '--archive') options.archiveRoot = argv[++i];
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const corpus = JSON.parse(await readFile(path.resolve(options.corpusPath), 'utf8'));
  const server = createAppServer({ corpus, webRoot: path.resolve(options.webRoot), archiveRoot: path.resolve(options.archiveRoot) });
  server.listen(options.port, options.host, () => console.log(`AI 行业报告知识库：http://${options.host}:${options.port}`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
