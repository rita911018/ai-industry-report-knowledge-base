import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAnswer } from '../../src/server/validate-answer.mjs';

const evidence = [{ chunkId: 'a:001', articleId: 'a', titleZh: '标题', publisher: 'BCG', sourceUrl: 'https://example.com', localPaths: { chinese: '/a.md' }, sectionPath: '结论' }];

test('accepts cited claims and enriches sources', () => {
  const result = validateAnswer({ answer: '回答', claims: [{ text: '事实', kind: 'source_fact', citations: ['a:001'] }], limitations: [], insufficient: false }, evidence);
  assert.equal(result.sources[0].publisher, 'BCG');
  assert.equal(result.claims[0].citations[0], 'a:001');
});

test('rejects unknown or missing citations and duplicate source IDs', () => {
  assert.throws(() => validateAnswer({ answer: 'x', claims: [{ text: 'x', kind: 'source_fact', citations: ['bad:001'] }], limitations: [], insufficient: false }, evidence), /Unknown citation/);
  assert.throws(() => validateAnswer({ answer: 'x', claims: [{ text: 'x', kind: 'source_fact', citations: [] }], limitations: [], insufficient: false }, evidence), /requires citations/);
  assert.throws(() => validateAnswer({ answer: 'x', claims: [{ text: 'x', kind: 'analysis', citations: ['a:001', 'a:001'] }], limitations: [], insufficient: false }, evidence), /Duplicate citation/);
});

test('allows an explicit insufficient-evidence response without sources', () => {
  const result = validateAnswer({ answer: '资料不足。', claims: [], limitations: ['现有资料不支持该问题'], insufficient: true }, evidence);
  assert.deepEqual(result.sources, []);
});
