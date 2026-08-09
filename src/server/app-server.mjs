import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askDeepSeek } from './deepseek-client.mjs';
import { validateAnswer } from './validate-answer.mjs';
import { createSearchIndex, searchCorpus } from '../knowledge/search.mjs';

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.md', 'text/markdown; charset=utf-8'], ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'], ['.pdf', 'application/pdf'], ['.vtt', 'text/vtt; charset=utf-8'],
]);

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store' });
  res.end(payload);
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

async function serveFile(res, root, relative) {
  const target = safePath(root, relative);
  if (!target) return json(res, 403, { error: 'Forbidden path' });
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': MIME.get(path.extname(target).toLowerCase()) || 'application/octet-stream', 'content-length': info.size, 'x-content-type-options': 'nosniff' });
    createReadStream(target).pipe(res);
  } catch {
    json(res, 404, { error: 'Not found' });
  }
}

export function createAppServer({
  corpus,
  webRoot,
  archiveRoot,
  apiKey = process.env.DEEPSEEK_API_KEY,
  model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  askImpl = askDeepSeek,
  bodyLimit = 1_000_000,
}) {
  const chunks = corpus.flatMap((article) => article.chunks);
  const index = createSearchIndex(chunks);
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    try {
      if (req.method === 'GET' && url.pathname === '/api/health') {
        return json(res, 200, { status: 'ok', articles: corpus.length, chunks: chunks.length, deepseekConfigured: Boolean(apiKey), models: ['deepseek-v4-flash', 'deepseek-v4-pro'], model });
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
        if (!apiKey) return json(res, 503, { error: '尚未配置 DeepSeek API Key', code: 'MISSING_API_KEY' });
        const evidence = retrieval.results.map((chunk) => ({
          chunkId: chunk.chunkId, articleId: chunk.articleId, titleZh: chunk.titleZh, titleOriginal: chunk.titleOriginal,
          publisher: chunk.publisher, publishedAt: chunk.publishedAt, sectionPath: chunk.sectionPath,
          content: chunk.content, sourceUrl: chunk.sourceUrl, localPaths: chunk.localPaths,
        }));
        const raw = await askImpl({ question: body.question, evidence, model: body.model || model, apiKey });
        return json(res, 200, validateAnswer(raw, evidence));
      }
      if (req.method === 'GET' && url.pathname.startsWith('/archive/')) {
        return serveFile(res, archiveRoot, decodeURIComponent(url.pathname.slice('/archive/'.length)));
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
