import assert from 'node:assert/strict';
import test from 'node:test';

import { askLlm } from '../../src/server/llm-client.mjs';

const validAnswer = {
  answer: '答复',
  claims: [{ text: '证据', kind: 'source_fact', citations: ['a:001'] }],
  limitations: [],
  insufficient: false,
};

function jsonResponse(content = validAnswer) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1_787_500_000,
      model: 'test-model',
      choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(content) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    }),
  };
}

test('Qwen uses OpenAI-compatible JSON mode with thinking disabled', async () => {
  let captured;
  const config = {
    configured: true,
    provider: 'qwen',
    model: 'qwen-plus',
    apiKey: 'qwen-secret',
    endpoint: 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
  };

  const answer = await askLlm({
    question: '问题',
    evidence: [{ chunkId: 'a:001', content: '证据' }],
    config,
    fetchImpl: async (url, options) => { captured = { url, options }; return jsonResponse(); },
  });

  const body = JSON.parse(captured.options.body);
  assert.equal(captured.url, config.endpoint);
  assert.equal(captured.options.headers.authorization, 'Bearer qwen-secret');
  assert.equal(body.model, 'qwen-plus');
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(body.enable_thinking, false);
  assert.match(body.messages[0].content, /JSON/);
  assert.match(body.messages[0].content, /"answer":"回答正文"/);
  assert.match(body.messages[0].content, /"claims":\[\{"text":"可核验陈述","kind":"source_fact","citations":\["chunkId"\]\}\]/);
  assert.match(body.messages[0].content, /"limitations":\[\]/);
  assert.match(body.messages[0].content, /"insufficient":false/);
  assert.match(body.messages[0].content, /不得返回顶层 citations/);
  assert.deepEqual(answer, validAnswer);
});

test('DeepSeek does not receive Qwen-only request parameters', async () => {
  let body;
  await askLlm({
    question: '问题',
    evidence: [],
    config: {
      configured: true,
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      apiKey: 'deepseek-secret',
      endpoint: 'https://api.deepseek.com/chat/completions',
    },
    fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return jsonResponse(); },
  });

  assert.equal('enable_thinking' in body, false);
});

test('maps configuration, authentication, and invalid-response errors without leaking credentials', async () => {
  await assert.rejects(
    () => askLlm({ question: 'q', evidence: [], config: { configured: false } }),
    (error) => error.code === 'MISSING_API_KEY',
  );
  await assert.rejects(
    () => askLlm({
      question: 'q', evidence: [],
      config: { configured: true, provider: 'qwen', model: 'qwen-plus', apiKey: 'never-print', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' },
      fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: 'never-print invalid' }) }),
    }),
    (error) => error.code === 'AUTHENTICATION' && !error.message.includes('never-print'),
  );
  await assert.rejects(
    () => askLlm({
      question: 'q', evidence: [],
      config: { configured: true, provider: 'deepseek', model: 'deepseek-v4-flash', apiKey: 'x', endpoint: 'https://api.deepseek.com/chat/completions' },
      fetchImpl: async () => jsonResponse('not-an-object'),
    }),
    (error) => error.code === 'INVALID_RESPONSE',
  );
});
