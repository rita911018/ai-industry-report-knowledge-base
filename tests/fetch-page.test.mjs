import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fetchPage } from '../src/archive/fetch-page.mjs';

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('retries transient failures and returns complete response metadata', async () => {
  let requests = 0;
  await withServer((_, response) => {
    requests += 1;
    if (requests < 3) {
      response.writeHead(503, { 'content-type': 'text/plain' });
      response.end('temporary');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<main>ok</main>');
  }, async (baseUrl) => {
    const result = await fetchPage(`${baseUrl}/article`, { attempts: 4, sleep: async () => {} });
    assert.equal(result.body, '<main>ok</main>');
    assert.equal(result.status, 200);
    assert.equal(result.attempts, 3);
    assert.equal(result.contentType, 'text/html; charset=utf-8');
    assert.match(result.retrievedAt, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test('does not retry permanent HTTP errors', async () => {
  let requests = 0;
  await withServer((_, response) => {
    requests += 1;
    response.writeHead(404);
    response.end('missing');
  }, async (baseUrl) => {
    await assert.rejects(() => fetchPage(`${baseUrl}/missing`, { sleep: async () => {} }), /HTTP 404/);
    assert.equal(requests, 1);
  });
});
