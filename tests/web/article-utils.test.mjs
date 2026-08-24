import assert from 'node:assert/strict';
import test from 'node:test';

await import(`../../web/article-utils.js?test=${Date.now()}`);
const utils = globalThis.ArticleUtils;

test('normalizes every source scale to a visible 100-point score', () => {
  assert.equal(utils.normalizedScore({ score: { total: 9.2, sourceScale: 10 } }), 92);
  assert.equal(utils.normalizedScore({ score: { total: 88, sourceScale: 100 } }), 88);
  assert.equal(utils.normalizedScore({ score: { total: 3, sourceScale: 4 } }), 75);
  assert.equal(utils.scoreText({ score: { total: 8.65, sourceScale: 10 } }), '86.5/100');
  assert.equal(utils.scoreText({ score: {} }), '—');
});

test('sorts by newest with score and id as stable tie breakers', () => {
  const rows = [
    { id: 'a', publishedAt: null, score: {} },
    { id: 'b', publishedAt: '2026-08-02', score: { total: 8, sourceScale: 10 } },
    { id: 'c', publishedAt: '2026-08-03', score: { total: 75, sourceScale: 100 } },
    { id: 'd', publishedAt: '2026-08-03', score: { total: 85, sourceScale: 100 } },
  ];

  assert.deepEqual(utils.sortArticles(rows, 'date').map((article) => article.id), ['d', 'c', 'b', 'a']);
  assert.deepEqual(rows.map((article) => article.id), ['a', 'b', 'c', 'd']);
});

test('sorts by normalized score with missing scores last', () => {
  const rows = [
    { id: 'a', publishedAt: '2026-08-04', score: {} },
    { id: 'b', publishedAt: '2026-08-02', score: { total: 8, sourceScale: 10 } },
    { id: 'c', publishedAt: '2026-08-03', score: { total: 75, sourceScale: 100 } },
  ];

  assert.deepEqual(utils.sortArticles(rows, 'score').map((article) => article.id), ['b', 'c', 'a']);
  assert.throws(() => utils.sortArticles(rows, 'unknown'), /Unknown article sort mode/);
});
