import assert from 'node:assert/strict';
import test from 'node:test';
import { askDeepSeek } from '../../src/server/deepseek-client.mjs';

test('sends grounded JSON request to DeepSeek V4 without exposing the key', async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"answer":"答复","claims":[],"limitations":[],"insufficient":false}' } }] }) };
  };
  const result = await askDeepSeek({ question: '问题', evidence: [{ chunkId: 'a:001', content: '证据' }], apiKey: 'secret-key', fetchImpl });
  assert.equal(captured.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(captured.options.headers.authorization, 'Bearer secret-key');
  const body = JSON.parse(captured.options.body);
  assert.equal(body.model, 'deepseek-v4-flash');
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(result.answer, '答复');
});

test('rejects missing keys and unsupported models with stable codes', async () => {
  await assert.rejects(() => askDeepSeek({ question: 'q', evidence: [], apiKey: '' }), (error) => error.code === 'MISSING_API_KEY' && !error.message.includes('secret'));
  await assert.rejects(() => askDeepSeek({ question: 'q', evidence: [], apiKey: 'x', model: 'old-model' }), /Unsupported model/);
});

test('maps authentication errors without leaking credentials', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => 'secret-key invalid' });
  await assert.rejects(() => askDeepSeek({ question: 'q', evidence: [], apiKey: 'secret-key', fetchImpl }), (error) => error.code === 'AUTHENTICATION' && !error.message.includes('secret-key'));
});
