import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIndexedPage, parseSearchResult } from '../src/archive/import-indexed-pages.mjs';

test('reassembles paginated indexed lines and removes internal citation markup', () => {
  const rawParts = [
    `Example (https://example.com/article)\nTotal lines: 7\nL0: Skip to main content L1: #\nL2: \nL3: Article title\nL4: First paragraph with cite2†a source link.`,
    `Total lines: 7\nL3: Article title\nL4: First paragraph with cite2†a source link.\nL5: ## Findings\nL6: Final paragraph.`,
  ];
  const parsed = parseIndexedPage(rawParts);

  assert.equal(parsed.totalLines, 7);
  assert.equal(parsed.capturedLines, 7);
  assert.equal(parsed.coverage, 1);
  assert.match(parsed.markdown, /^# Article title/m);
  assert.match(parsed.markdown, /## Findings/);
  assert.match(parsed.markdown, /a source link/);
  assert.ok(!parsed.markdown.includes('cite'));
  assert.ok(!parsed.markdown.includes('Skip to main content'));
});

test('extracts only the first complete article from a long search result', () => {
  const raw = `First title (https://example.com/first)\nmetadata line\n\n# First title\n\nFirst full paragraph.\n\nSecond title (https://example.com/second)\nmetadata\n\n# Second title\n\nUnrelated result.`;
  const parsed = parseSearchResult(raw);
  assert.match(parsed.markdown, /# First title/);
  assert.match(parsed.markdown, /First full paragraph/);
  assert.ok(!parsed.markdown.includes('Second title'));
  assert.equal(parsed.sourceUrl, 'https://example.com/first');
});
