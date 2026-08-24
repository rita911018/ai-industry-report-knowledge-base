import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CANONICAL_TOPICS,
  TAXONOMY_VERSION,
  canonicalTopicFor,
  normalizeCategory,
} from '../../src/taxonomy/article-topics.mjs';

const ledgerPath = new URL('../../work/normalized/articles.json', import.meta.url);

test('maps every ledger topic into the ten canonical Chinese topics', async () => {
  const articles = JSON.parse(await readFile(ledgerPath, 'utf8'));
  const legacyTopics = [...new Set(articles.map((article) => article.category.primary))];

  assert.equal(CANONICAL_TOPICS.length, 10);
  assert.ok(CANONICAL_TOPICS.every((topic) => /[\u3400-\u9fff]/u.test(topic)));
  assert.deepEqual(new Set(legacyTopics.map(canonicalTopicFor)).size, 10);
  assert.equal(canonicalTopicFor('data-architecture'), '技术、数据与架构');
  assert.equal(canonicalTopicFor('finance-investment-ma'), '财务、投资与资本');
  assert.equal(canonicalTopicFor('AI战略与价值'), 'AI 战略与价值');
  assert.throws(() => canonicalTopicFor('unknown-topic'), /Unknown article topic/);
});

test('preserves the original topic and normalizes idempotently', () => {
  const first = normalizeCategory({ primary: 'consumer-brand-retail', secondary: ['retail'] });
  assert.deepEqual(first, {
    primary: '客户、品牌与零售',
    secondary: ['retail'],
    sourcePrimary: 'consumer-brand-retail',
    taxonomyVersion: TAXONOMY_VERSION,
  });
  assert.deepEqual(normalizeCategory(first), first);
});
