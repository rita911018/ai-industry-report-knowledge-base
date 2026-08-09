import assert from 'node:assert/strict';
import test from 'node:test';
import { directTranslationPrompt, parseDirectTranslation } from '../src/translation/run-codex-direct.mjs';

test('direct prompt requires a complete structure-preserving translation', () => {
  const prompt = directTranslationPrompt('# Title\n\nValue 42%.');
  assert.match(prompt, /完整逐段/);
  assert.match(prompt, /42%/);
  assert.match(prompt, /Markdown/);
});

test('parses structured translation output', () => {
  assert.equal(parseDirectTranslation('{"translation":"# 标题\\n\\n数值 42%。"}'), '# 标题\n\n数值 42%。\n');
  assert.throws(() => parseDirectTranslation('{"translation":""}'), /empty/i);
});
