import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { get } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createAppServer } from '../src/server/app-server.mjs';

const ARCHIVE_CSP = "sandbox allow-popups; default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
const ALLOWED_ARCHIVE_BASENAMES = new Set([
  '中文全文.html',
  '中文全文.md',
  '英文原文.md',
  '原始网页.html',
  'metadata.json',
  '原始报告.pdf',
]);

async function requestRaw(base, requestPath) {
  const url = new URL(base);
  return new Promise((resolve, reject) => {
    const request = get({ hostname: url.hostname, port: url.port, path: requestPath }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('error', reject);
  });
}

async function withStaticServer(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ai-radar-static-'));
  const webRoot = path.join(root, 'web');
  const archiveRoot = root;
  const articleRoot = path.join(archiveRoot, 'Radar 2026', 'articles', '001-report');
  const webArchiveArticleRoot = path.join(webRoot, 'archive', 'Radar 2026', 'articles', '001-report');
  await mkdir(path.join(webRoot, 'radars'), { recursive: true });
  await mkdir(webArchiveArticleRoot, { recursive: true });
  await mkdir(path.join(archiveRoot, 'AI行业报告知识库'), { recursive: true });
  await mkdir(path.join(articleRoot, 'nested'), { recursive: true });
  await mkdir(path.join(archiveRoot, '.hidden-radar', 'articles', '001-report'), { recursive: true });
  await mkdir(path.join(archiveRoot, 'Radar 2026', 'articles', '.hidden-article'), { recursive: true });
  await writeFile(path.join(webRoot, 'index.html'), '<!doctype html><h1>知识库</h1>');
  await writeFile(path.join(webRoot, 'radars', 'index.html'), '<!doctype html><h1>选择领域</h1>');
  await writeFile(path.join(webArchiveArticleRoot, '中文全文.html'), '<h1>web-root archive bypass marker</h1>');
  await writeFile(path.join(root, 'secret.txt'), 'protected');
  await writeFile(path.join(archiveRoot, 'AI行业报告知识库', '.env.local'), 'LLM_API_KEY=must-not-leak');
  await writeFile(path.join(articleRoot, '中文全文.html'), '<!doctype html><h1>中文全文</h1>');
  await writeFile(path.join(articleRoot, '中文全文.md'), '# 中文全文');
  await writeFile(path.join(articleRoot, '英文原文.md'), '# Original');
  await writeFile(path.join(articleRoot, '原始网页.html'), '<!doctype html><h1>原始网页</h1>');
  await writeFile(path.join(articleRoot, 'metadata.json'), '{"id":"report"}');
  await writeFile(path.join(articleRoot, '原始报告.pdf'), '%PDF-1.7\n');
  await writeFile(path.join(articleRoot, '.env.local'), 'ARTICLE_SECRET=must-not-leak');
  await writeFile(path.join(articleRoot, 'notes.txt'), 'private notes');
  await writeFile(path.join(articleRoot, 'index.html'), '<h1>directory index must not be served</h1>');
  await writeFile(path.join(articleRoot, 'nested', '中文全文.html'), '<h1>nested must not be served</h1>');
  await writeFile(path.join(archiveRoot, '.hidden-radar', 'articles', '001-report', '中文全文.html'), 'hidden radar');
  await writeFile(path.join(archiveRoot, 'Radar 2026', 'articles', '.hidden-article', '中文全文.html'), 'hidden article');

  const server = createAppServer({ corpus: [], webRoot, archiveRoot });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    server.close();
    await once(server, 'close');
    await rm(root, { recursive: true, force: true });
  }
}

test('serves safe directory index pages from the web root', async () => withStaticServer(async (base) => {
  for (const pathname of ['/radars/', '/radars/index.html']) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 200, pathname);
    assert.match(response.headers.get('content-type') || '', /^text\/html/);
    assert.match(await response.text(), /选择领域/);
  }
}));

test('directory index support does not expose paths outside the web root', async () => withStaticServer(async (base) => {
  const response = await fetch(`${base}/%2e%2e%2fsecret.txt`);
  assert.notEqual(response.status, 200);
  assert.doesNotMatch(await response.text(), /protected/);
}));

test('archive route serves only allowlisted report assets', async () => withStaticServer(async (base) => {
  for (const basename of ALLOWED_ARCHIVE_BASENAMES) {
    const response = await requestRaw(base, `/archive/Radar%202026/articles/001-report/${encodeURIComponent(basename)}`);
    assert.equal(response.status, 200, basename);
    assert.equal(response.headers['x-content-type-options'], 'nosniff', basename);
    assert.equal(response.headers['referrer-policy'], 'no-referrer', basename);
  }

  const pdf = await requestRaw(base, '/archive/Radar%202026/articles/001-report/%E5%8E%9F%E5%A7%8B%E6%8A%A5%E5%91%8A.pdf');
  assert.equal(pdf.headers['content-type'], 'application/pdf');
}));

test('archive HTML responses are sandboxed, including original page snapshots', async () => withStaticServer(async (base) => {
  for (const basename of ['中文全文.html', '原始网页.html']) {
    const response = await requestRaw(base, `/archive/Radar%202026/articles/001-report/${encodeURIComponent(basename)}`);
    assert.equal(response.status, 200, basename);
    assert.equal(response.headers['content-security-policy'], ARCHIVE_CSP, basename);
    assert.equal(response.headers['x-content-type-options'], 'nosniff', basename);
    assert.equal(response.headers['referrer-policy'], 'no-referrer', basename);
  }
}));

test('archive route returns 403 without leaking files outside the report asset shape', async () => withStaticServer(async (base) => {
  const forbidden = [
    '/archive/AI%E8%A1%8C%E4%B8%9A%E6%8A%A5%E5%91%8A%E7%9F%A5%E8%AF%86%E5%BA%93/.env.local',
    '/archive/Radar%202026/articles/001-report/.env.local',
    '/archive/Radar%202026/articles/001-report/notes.txt',
    '/archive/Radar%202026/articles/001-report/',
    '/archive/Radar%202026/articles/001-report/nested/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/.hidden-radar/articles/001-report/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/articles/.hidden-article/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/not-articles/001-report/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/articles/001-report/extra/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
  ];
  for (const pathname of forbidden) {
    const response = await requestRaw(base, pathname);
    assert.equal(response.status, 403, pathname);
    assert.doesNotMatch(response.body, /must-not-leak|private notes|directory index|nested must not be served/);
  }
}));

test('archive route rejects encoded dot, slash, traversal, and malformed escapes with 403', async () => withStaticServer(async (base) => {
  const forbidden = [
    '/archive/%2e/articles/001-report/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/articles/%2e/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/articles/%2e%2e/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/articles/001-report%2fextra/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/articles/001-report%2f%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/articles/001-report/metadata%2ejson',
    '/archive%2fRadar%202026%2farticles%2f001-report%2f%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/%61rchive/Radar%202026/articles/001-report/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html',
    '/archive/Radar%202026/articles/001-report/%2e%2e%2f%2e%2e%2f%2e%2e%2fAI%E8%A1%8C%E4%B8%9A%E6%8A%A5%E5%91%8A%E7%9F%A5%E8%AF%86%E5%BA%93%2f.env.local',
    '/archive/Radar%202026/articles/001-report/%E0%A4%A',
  ];
  for (const pathname of forbidden) {
    const response = await requestRaw(base, pathname);
    assert.equal(response.status, 403, pathname);
    assert.doesNotMatch(response.body, /must-not-leak/);
  }
}));

test('absolute-form archive request targets use the isolated archive route', async () => withStaticServer(async (base) => {
  const authority = new URL(base).host;
  const response = await requestRaw(base, `http://${authority}/archive/Radar%202026/articles/001-report/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html`);
  assert.equal(response.status, 200);
  assert.match(response.body, /中文全文/);
  assert.doesNotMatch(response.body, /web-root archive bypass marker/);
  assert.equal(response.headers['content-security-policy'], ARCHIVE_CSP);
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
}));

test('archive route returns 404 for a valid but missing allowlisted asset', async () => withStaticServer(async (base) => {
  const response = await requestRaw(base, '/archive/Radar%202026/articles/999-missing/%E4%B8%AD%E6%96%87%E5%85%A8%E6%96%87.html');
  assert.equal(response.status, 404);
}));

test('browser article local paths use only archive basenames supported by the server', async () => {
  const source = await readFile(new URL('../web/data/articles.js', import.meta.url), 'utf8');
  const articles = JSON.parse(source.replace(/^window\.ARTICLE_INDEX = /, '').replace(/;\s*$/, ''));
  const basenames = new Set(articles.flatMap((article) => Object.values(article.localPaths || {}).map((localPath) => path.posix.basename(localPath))));
  assert.ok(basenames.size > 0);
  for (const basename of basenames) assert.ok(ALLOWED_ARCHIVE_BASENAMES.has(basename), basename);
});
