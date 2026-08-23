import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createAppServer } from '../src/server/app-server.mjs';

async function withStaticServer(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ai-radar-static-'));
  const webRoot = path.join(root, 'web');
  const archiveRoot = path.join(root, 'archive');
  await mkdir(path.join(webRoot, 'radars'), { recursive: true });
  await mkdir(archiveRoot, { recursive: true });
  await writeFile(path.join(webRoot, 'index.html'), '<!doctype html><h1>知识库</h1>');
  await writeFile(path.join(webRoot, 'radars', 'index.html'), '<!doctype html><h1>选择领域</h1>');
  await writeFile(path.join(root, 'secret.txt'), 'protected');

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

test('serves safe directory index pages', async () => withStaticServer(async (base) => {
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
