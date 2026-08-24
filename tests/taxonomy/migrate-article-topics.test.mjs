import assert from 'node:assert/strict';
import test from 'node:test';

import { CANONICAL_TOPICS } from '../../src/taxonomy/article-topics.mjs';
import { migrateArticleTopics } from '../../src/taxonomy/migrate-article-topics.mjs';

test('migrates topics without changing article identity or order', () => {
  const input = [
    {
      id: 'a',
      canonicalUrl: 'https://example.com/a',
      category: { primary: 'data-architecture', secondary: ['architecture'] },
    },
    {
      id: 'b',
      canonicalUrl: 'https://example.com/b',
      category: { primary: 'consumer-brand', secondary: [] },
    },
  ];

  const result = migrateArticleTopics(input, { migratedAt: '2026-08-24T00:00:00.000Z' });

  assert.deepEqual(result.articles.map(({ id, canonicalUrl }) => ({ id, canonicalUrl })), [
    { id: 'a', canonicalUrl: 'https://example.com/a' },
    { id: 'b', canonicalUrl: 'https://example.com/b' },
  ]);
  assert.equal(result.articles[0].category.primary, '技术、数据与架构');
  assert.equal(result.changes[0].from, 'data-architecture');
  assert.equal(result.changes[0].to, '技术、数据与架构');
  assert.deepEqual(result.summary, {
    articleCount: 2,
    inputTopicCount: 2,
    outputTopicCount: 2,
    unmappedCount: 0,
  });
});

test('preserves the initial source topic when migration is repeated', () => {
  const input = [{
    id: 'a',
    canonicalUrl: 'https://example.com/a',
    category: {
      primary: '技术、数据与架构',
      secondary: [],
      sourcePrimary: 'data-architecture',
      taxonomyVersion: 'zh-management-v1',
    },
  }];

  const { articles, changes } = migrateArticleTopics(input);

  assert.equal(articles[0].category.sourcePrimary, 'data-architecture');
  assert.equal(changes[0].from, 'data-architecture');
});

test('rejects duplicate identities and guarantees canonical output', () => {
  const duplicate = [
    { id: 'a', canonicalUrl: 'https://example.com/a', category: { primary: 'operations' } },
    { id: 'a', canonicalUrl: 'https://example.com/b', category: { primary: 'operations' } },
  ];
  assert.throws(() => migrateArticleTopics(duplicate), /identity invariant/);

  const valid = CANONICAL_TOPICS.map((primary, index) => ({
    id: `a-${index}`,
    canonicalUrl: `https://example.com/${index}`,
    category: { primary },
  }));
  assert.deepEqual(new Set(migrateArticleTopics(valid).articles.map((article) => article.category.primary)), new Set(CANONICAL_TOPICS));
});
