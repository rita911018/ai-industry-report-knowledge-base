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

test('never splits a numeric token at an oversized-paragraph boundary', () => {
  const source = `${'A'.repeat(8)}2006${'B'.repeat(16)}`;
  const chunks = splitMarkdownForTranslation(source, 10);
  assert.equal(chunks.join(''), source);
  assert.ok(chunks.some((chunk) => chunk.includes('2006')));
  assert.equal(chunks.some((chunk) => /20$|^06/.test(chunk)), false);
});

test('never splits a URL at an oversized-paragraph boundary', () => {
  const url = 'https://example.com/a-very-long-asset-name.png';
  const source = `Image ${url} tail`;
  const chunks = splitMarkdownForTranslation(source, 16);
  assert.equal(chunks.join(''), source);
  assert.ok(chunks.some((chunk) => chunk.includes(url)));
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

test('measures translated image labels without letting a preserved asset URL dilute the Chinese ratio', () => {
  const url = `https://web-assets.example.com/${'asset-path/'.repeat(45)}chart.png`;
  const source = `![The Five Determinants of Who Captures the AI Dividend](${url})`;
  const translation = `![谁能捕获 AI 红利的五个决定因素](${url})`;
  assert.equal(verifyChunkTranslation(source, translation).ok, true);
});
