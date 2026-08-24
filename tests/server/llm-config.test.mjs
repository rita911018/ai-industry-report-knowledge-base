import assert from 'node:assert/strict';
import test from 'node:test';

import { loadLlmConfig } from '../../src/server/llm-config.mjs';

test('loads Qwen from server-only environment settings', () => {
  const config = loadLlmConfig({
    LLM_PROVIDER: 'qwen',
    LLM_API_KEY: 'secret',
    LLM_MODEL: 'qwen-plus',
    LLM_BASE_URL: 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
  });

  assert.equal(config.configured, true);
  assert.equal(config.provider, 'qwen');
  assert.equal(config.model, 'qwen-plus');
  assert.equal(config.endpoint, 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions');
  assert.equal(config.apiKey, 'secret');
  assert.equal(config.legacy, false);
});

test('supports legacy DeepSeek settings', () => {
  const config = loadLlmConfig({ DEEPSEEK_API_KEY: 'x', DEEPSEEK_MODEL: 'deepseek-v4-pro' });

  assert.equal(config.provider, 'deepseek');
  assert.equal(config.model, 'deepseek-v4-pro');
  assert.equal(config.endpoint, 'https://api.deepseek.com/chat/completions');
  assert.equal(config.legacy, true);
});

test('returns a stable unconfigured state when no provider is selected', () => {
  assert.deepEqual(loadLlmConfig({}), {
    configured: false,
    provider: null,
    model: null,
    endpoint: null,
    apiKey: '',
    legacy: false,
  });
});

test('rejects missing or unsafe Qwen endpoints and unknown providers', () => {
  assert.throws(
    () => loadLlmConfig({ LLM_PROVIDER: 'qwen', LLM_API_KEY: 'x', LLM_MODEL: 'qwen-plus' }),
    (error) => error.code === 'INVALID_LLM_CONFIG' && /LLM_BASE_URL/.test(error.message),
  );
  assert.throws(
    () => loadLlmConfig({ LLM_PROVIDER: 'qwen', LLM_API_KEY: 'x', LLM_MODEL: 'qwen-plus', LLM_BASE_URL: 'http://127.0.0.1:9000' }),
    (error) => error.code === 'INVALID_LLM_CONFIG' && /official HTTPS/.test(error.message),
  );
  assert.throws(
    () => loadLlmConfig({ LLM_PROVIDER: 'other', LLM_API_KEY: 'x' }),
    (error) => error.code === 'INVALID_LLM_CONFIG' && /Unsupported LLM provider/.test(error.message),
  );
});
