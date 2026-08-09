import assert from 'node:assert/strict';
import test from 'node:test';
import { detectSourceLanguage } from '../src/translation/queue.mjs';

test('detects English and Chinese archive sources', () => {
  assert.equal(detectSourceLanguage('A complete English article about artificial intelligence and organizations.'), 'en');
  assert.equal(detectSourceLanguage('这是一篇关于人工智能和组织转型的完整中文文章。'), 'zh');
});
