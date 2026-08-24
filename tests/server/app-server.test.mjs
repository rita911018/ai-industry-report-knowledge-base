import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createAppServer } from '../../src/server/app-server.mjs';

const corpus = [{ id: 'a', chunks: [{ chunkId: 'a:001', articleId: 'a', publisher: 'BCG', titleZh: '智能体治理', titleOriginal: 'Agent governance', sectionPath: '治理', content: '智能体治理需要人工监督和审计。', sourceUrl: 'https://example.com', localPaths: { chinese: '/archive/a/中文全文.md' } }] }];

async function withServer(options, run) {
  const server = createAppServer({ corpus, webRoot: process.cwd(), archiveRoot: process.cwd(), ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); } finally { server.close(); await once(server, 'close'); }
}

test('health and local search work without an API key', async () => withServer({}, async (base) => {
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.articles, 1);
  assert.equal(health.llmConfigured, false);
  assert.equal(health.provider, null);
  assert.equal(health.deepseekConfigured, false);
  const response = await fetch(`${base}/api/search`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '智能体治理' }) });
  const result = await response.json();
  assert.equal(result.results[0].articleId, 'a');
}));

test('ask returns validated citations and handles missing API key', async () => {
  await withServer({ llmConfig: { configured: true, provider: 'deepseek', model: 'deepseek-v4-flash', apiKey: 'test', endpoint: 'https://api.deepseek.com/chat/completions' }, askImpl: async () => ({ answer: '需要监督。', claims: [{ text: '需要人工监督。', kind: 'source_fact', citations: ['a:001'] }], limitations: [], insufficient: false }) }, async (base) => {
    const response = await fetch(`${base}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: '如何治理智能体？' }) });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.sources[0].sourceUrl, 'https://example.com');
  });
  await withServer({}, async (base) => {
    const response = await fetch(`${base}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: '如何治理智能体？' }) });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'MISSING_API_KEY');
  });
});

test('health exposes provider metadata without exposing credentials', async () => {
  const llmConfig = {
    configured: true,
    provider: 'qwen',
    model: 'qwen-plus',
    apiKey: 'never-print',
    endpoint: 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
  };
  await withServer({ llmConfig }, async (base) => {
    const health = await fetch(`${base}/api/health`).then((response) => response.json());
    assert.deepEqual(
      { configured: health.llmConfigured, provider: health.provider, model: health.model },
      { configured: true, provider: 'qwen', model: 'qwen-plus' },
    );
    assert.doesNotMatch(JSON.stringify(health), /never-print|maas\.aliyuncs/);
  });
});

test('ask ignores client model, endpoint, and credential overrides', async () => {
  const llmConfig = {
    configured: true,
    provider: 'qwen',
    model: 'qwen-plus',
    apiKey: 'server-key',
    endpoint: 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
  };
  let captured;
  await withServer({
    llmConfig,
    askImpl: async (options) => {
      captured = options;
      return { answer: '需要监督。', claims: [{ text: '需要人工监督。', kind: 'source_fact', citations: ['a:001'] }], limitations: [], insufficient: false };
    },
  }, async (base) => {
    const response = await fetch(`${base}/api/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question: '如何治理智能体？',
        model: 'attacker-model',
        baseUrl: 'http://127.0.0.1:9',
        apiKey: 'attacker-key',
      }),
    });
    assert.equal(response.status, 200);
  });

  assert.equal(captured.config, llmConfig);
  assert.equal('model' in captured, false);
  assert.equal('apiKey' in captured, false);
});

test('rejects malformed JSON and oversized bodies', async () => withServer({ bodyLimit: 20 }, async (base) => {
  const malformed = await fetch(`${base}/api/search`, { method: 'POST', body: '{' });
  assert.equal(malformed.status, 400);
  const large = await fetch(`${base}/api/search`, { method: 'POST', body: JSON.stringify({ query: 'x'.repeat(100) }) });
  assert.equal(large.status, 413);
}));
