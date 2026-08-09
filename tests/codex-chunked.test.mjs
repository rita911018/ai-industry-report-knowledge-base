import assert from 'node:assert/strict';
import test from 'node:test';
import { parseChunkedArguments, splitMarkdownForTranslation, verifyChunkTranslation } from '../src/translation/run-codex-chunked.mjs';
import { verifyTranslation } from '../src/translation/verify-translation.mjs';

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

test('parses an archive index range for chunked translation', () => {
  const options = parseChunkedArguments(['--publisher', 'Bain', '--min-index', '141', '--max-index', '210']);
  assert.equal(options.publisher, 'Bain');
  assert.equal(options.minIndex, 141);
  assert.equal(options.maxIndex, 210);
});

test('allows a link-heavy translated chunk while the full-article verifier stays strict', () => {
  const source = 'Navigation links: https://example.com/a and https://example.com/b.';
  const translation = '导航：https://example.com/a 和 https://example.com/b 。';
  assert.throws(() => verifyTranslation(source, translation), /Chinese-character ratio too low/);
  assert.equal(verifyChunkTranslation(source, translation).ok, true);
});
