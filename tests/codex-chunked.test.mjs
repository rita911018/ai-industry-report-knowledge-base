import assert from 'node:assert/strict';
import test from 'node:test';
import { splitMarkdownForTranslation } from '../src/translation/run-codex-chunked.mjs';

test('splits long markdown at paragraph boundaries without losing text', () => {
  const source = '# Title\n\n' + Array.from({ length: 12 }, (_, index) => `Paragraph ${index} with value ${index}%.`).join('\n\n');
  const chunks = splitMarkdownForTranslation(source, 100);
  assert.ok(chunks.length > 2);
  assert.equal(chunks.join('\n\n'), source);
  assert.ok(chunks.every((chunk) => chunk.length <= 100 || !chunk.includes('\n\n')));
});

test('splits a single oversized paragraph without dropping characters', () => {
  const source = 'A'.repeat(251);
  const chunks = splitMarkdownForTranslation(source, 100);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [100, 100, 51]);
  assert.equal(chunks.join(''), source);
});
