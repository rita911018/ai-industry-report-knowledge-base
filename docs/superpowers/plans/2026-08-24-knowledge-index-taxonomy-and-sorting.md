# Knowledge Index Taxonomy and Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 469 articles to ten canonical Chinese topics, normalize visible scores to 100 points, and add simple date/score sorting to the knowledge index.

**Architecture:** A single taxonomy module owns the 45→10 mapping and migration audit. A small browser-safe article utility owns score normalization and stable sorting, while the existing page controller applies filtering and rendering. Generated corpus, browser index, and Chinese readers are rebuilt from the migrated canonical ledger.

**Tech Stack:** Node.js ESM, browser JavaScript, node:test, JSDOM, static HTML/CSS.

---

### Task 1: Canonical topic vocabulary and mapping

**Files:**
- Create: `src/taxonomy/article-topics.mjs`
- Create: `tests/taxonomy/article-topics.test.mjs`

- [ ] **Step 1: Write the failing mapping tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { CANONICAL_TOPICS, canonicalTopicFor, normalizeCategory } from '../../src/taxonomy/article-topics.mjs';

test('maps all legacy topic families to ten Chinese topics', () => {
  assert.equal(CANONICAL_TOPICS.length, 10);
  assert.equal(canonicalTopicFor('data-architecture'), '技术、数据与架构');
  assert.equal(canonicalTopicFor('finance-investment-ma'), '财务、投资与资本');
  assert.equal(canonicalTopicFor('AI战略与价值'), 'AI 战略与价值');
  assert.throws(() => canonicalTopicFor('unknown-topic'), /Unknown article topic/);
});

test('preserves the original topic for audit', () => {
  assert.deepEqual(normalizeCategory({ primary: 'consumer-brand-retail', secondary: [] }), {
    primary: '客户、品牌与零售', secondary: [], sourcePrimary: 'consumer-brand-retail', taxonomyVersion: 'zh-management-v1',
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/taxonomy/article-topics.test.mjs`

Expected: FAIL because `src/taxonomy/article-topics.mjs` does not exist.

- [ ] **Step 3: Implement the fixed vocabulary and exhaustive mapping**

```js
export const TAXONOMY_VERSION = 'zh-management-v1';
export const CANONICAL_TOPICS = Object.freeze([
  'AI 战略与价值', '战略、增长与行业洞察', '客户、品牌与零售', '运营、供应链与成本', '财务、投资与资本',
  '组织、人才与工作', '技术、数据与架构', '治理、风险与安全', '可持续发展与韧性', '前沿研究与社会影响',
]);

const GROUPS = {
  'AI 战略与价值': ['AI战略与价值', 'AI 战略与价值', 'strategy-value', 'ai-operating-model', 'operating-model-agents', 'enterprise-workflows'],
  '战略、增长与行业洞察': ['战略与行业观察', '战略、增长与行业洞察', 'strategy-growth-transformation', 'industry-market-signals', 'macro-risk-geopolitics', 'risk-geopolitics', 'ecosystem-policy', 'innovation-methods'],
  '客户、品牌与零售': ['消费者、品牌与营销', '客户、增长与商业模式', '客户、品牌与零售', 'consumer-brand-retail', 'consumer-brand', 'retail-fashion'],
  '运营、供应链与成本': ['运营、供应链与成本', 'operations-supply-chain', 'operations'],
  '财务、投资与资本': ['财务、投资与资本', 'finance-investment-ma', 'finance-functional-use', 'strategy-finance'],
  '组织、人才与工作': ['组织、人才与变革', '组织、人才与工作', 'organization-leadership-talent', 'organization-work', 'organization', 'organization-talent'],
  '技术、数据与架构': ['技术、数据与架构', '数据、平台与基础设施', 'ai-digital-platform', 'agent-architecture', 'architecture-data', 'data-architecture', 'models-platform'],
  '治理、风险与安全': ['治理、风险与安全', 'safety-governance', 'governance-risk-trust', 'cyber-resilience'],
  '可持续发展与韧性': ['可持续与韧性', '可持续发展与韧性', 'sustainability-resilience'],
  '前沿研究与社会影响': ['前沿研究与技术', '前沿研究与社会影响', 'physical-science', 'economics-society'],
};
const TOPIC_MAP = new Map(Object.entries(GROUPS).flatMap(([canonical, aliases]) => aliases.map((alias) => [alias, canonical])));
export function canonicalTopicFor(value) { const topic = TOPIC_MAP.get(value); if (!topic) throw new Error(`Unknown article topic: ${value}`); return topic; }
export function normalizeCategory(category) { const sourcePrimary = category?.sourcePrimary || category?.primary; return { ...category, primary: canonicalTopicFor(category?.primary), secondary: category?.secondary || [], sourcePrimary, taxonomyVersion: TAXONOMY_VERSION }; }
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `node --test tests/taxonomy/article-topics.test.mjs`

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/taxonomy/article-topics.mjs tests/taxonomy/article-topics.test.mjs
git commit -m "feat: define canonical Chinese article topics"
```

### Task 2: Deterministic 469-article migration and audit ledger

**Files:**
- Create: `src/taxonomy/migrate-article-topics.mjs`
- Create: `tests/taxonomy/migrate-article-topics.test.mjs`
- Modify: `package.json`
- Generate: `work/normalized/topic-migration.json`
- Generate: `web/data/topics.js`
- Modify: `work/normalized/articles.json`

- [ ] **Step 1: Write the failing migration test**

```js
test('migrates without changing article identity or count', () => {
  const input = [{ id: 'a', canonicalUrl: 'https://example.com/a', category: { primary: 'data-architecture', secondary: [] } }];
  const { articles, changes } = migrateArticleTopics(input, { migratedAt: '2026-08-24T00:00:00Z' });
  assert.equal(articles.length, 1);
  assert.equal(articles[0].id, 'a');
  assert.equal(articles[0].category.primary, '技术、数据与架构');
  assert.equal(changes[0].from, 'data-architecture');
  assert.equal(changes[0].to, '技术、数据与架构');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/taxonomy/migrate-article-topics.test.mjs`

Expected: FAIL because `migrateArticleTopics` is unavailable.

- [ ] **Step 3: Implement migration, invariants, and CLI**

```js
export function migrateArticleTopics(input, { migratedAt = new Date().toISOString() } = {}) {
  const idsBefore = input.map((article) => article.id);
  const urlsBefore = input.map((article) => article.canonicalUrl);
  const changes = [];
  const articles = input.map((article) => {
    const category = normalizeCategory(article.category);
    changes.push({ articleId: article.id, from: article.category.sourcePrimary || article.category.primary, to: category.primary, taxonomyVersion: category.taxonomyVersion, migratedAt });
    return { ...article, category };
  });
  if (new Set(idsBefore).size !== articles.length || new Set(urlsBefore).size !== articles.length || articles.some((article, index) => article.id !== idsBefore[index] || article.canonicalUrl !== urlsBefore[index])) throw new Error('Migration identity invariant failed');
  return { articles, changes };
}
```

The CLI also writes `web/data/topics.js` as `window.ARTICLE_TOPICS = [...]`, using the exported canonical order. Add `"topics": "node src/taxonomy/migrate-article-topics.mjs --ledger work/normalized/articles.json --audit work/normalized/topic-migration.json --browser-topics web/data/topics.js"` to `package.json`.

- [ ] **Step 4: Verify migration tests GREEN**

Run: `node --test tests/taxonomy/*.test.mjs`

Expected: all taxonomy tests pass.

- [ ] **Step 5: Run the real migration and verify the 45→10 contract**

Run: `npm run topics`

Expected: `469 articles migrated; 45 input topics; 10 canonical topics; 0 unmapped`.

- [ ] **Step 6: Commit**

```bash
git add package.json src/taxonomy/migrate-article-topics.mjs tests/taxonomy/migrate-article-topics.test.mjs work/normalized/articles.json work/normalized/topic-migration.json web/data/topics.js
git commit -m "feat: migrate article topics to Chinese taxonomy"
```

### Task 3: Browser-safe score normalization and stable sorting

**Files:**
- Create: `web/article-utils.js`
- Create: `tests/web/article-utils.test.mjs`

- [ ] **Step 1: Write failing utility tests**

```js
test('normalizes all source scales to 100', () => {
  assert.equal(utils.normalizedScore({ score: { total: 9.2, sourceScale: 10 } }), 92);
  assert.equal(utils.normalizedScore({ score: { total: 88, sourceScale: 100 } }), 88);
  assert.equal(utils.scoreText({ score: { total: 9.2, sourceScale: 10 } }), '92/100');
});
test('sorts by newest and by highest with missing values last', () => {
  const rows = [{ id: 'a', publishedAt: null, score: {} }, { id: 'b', publishedAt: '2026-08-02', score: { total: 8, sourceScale: 10 } }, { id: 'c', publishedAt: '2026-08-03', score: { total: 75, sourceScale: 100 } }];
  assert.deepEqual(utils.sortArticles(rows, 'date').map((x) => x.id), ['c', 'b', 'a']);
  assert.deepEqual(utils.sortArticles(rows, 'score').map((x) => x.id), ['b', 'c', 'a']);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/web/article-utils.test.mjs`

Expected: FAIL because `web/article-utils.js` does not exist.

- [ ] **Step 3: Implement a UMD-style utility**

```js
(function (root, factory) { const api = factory(); if (typeof module !== 'undefined') module.exports = api; root.ArticleUtils = api; })(globalThis, () => {
  const normalizedScore = (article) => { const total = Number(article?.score?.total); const scale = Number(article?.score?.sourceScale || 100); return Number.isFinite(total) && scale > 0 ? Math.round((total / scale) * 1000) / 10 : null; };
  const dateValue = (article) => { const value = Date.parse(article?.publishedAt || ''); return Number.isFinite(value) ? value : null; };
  const idTie = (a, b) => String(a.id).localeCompare(String(b.id));
  const sortArticles = (articles, mode = 'date') => [...articles].sort((a, b) => mode === 'score'
    ? ((normalizedScore(b) ?? -Infinity) - (normalizedScore(a) ?? -Infinity) || (dateValue(b) ?? -Infinity) - (dateValue(a) ?? -Infinity) || idTie(a, b))
    : ((dateValue(b) ?? -Infinity) - (dateValue(a) ?? -Infinity) || (normalizedScore(b) ?? -Infinity) - (normalizedScore(a) ?? -Infinity) || idTie(a, b)));
  return { normalizedScore, scoreText: (article) => { const score = normalizedScore(article); return score === null ? '—' : `${score}/100`; }, sortArticles };
});
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/web/article-utils.test.mjs`

Expected: all utility tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/article-utils.js tests/web/article-utils.test.mjs
git commit -m "feat: add normalized article sorting utilities"
```

### Task 4: Sorting control and canonical topic order in the page

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Modify: `tests/web/static-contract.test.mjs`

- [ ] **Step 1: Add failing page contract assertions**

```js
assert.match(html, /id="sort-control"/);
assert.match(html, /value="date"[^>]*>最新发布/);
assert.match(html, /value="score"[^>]*>评分最高/);
assert.match(html, /<script src="article-utils\.js"><\/script>/);
assert.match(html, /<script src="data\/topics\.js"><\/script>/);
assert.match(js, /ArticleUtils\.sortArticles/);
assert.match(js, /params\.set\('sort'/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/web/static-contract.test.mjs`

Expected: FAIL because the sorting control is absent.

- [ ] **Step 3: Add the select and update filtering/rendering**

```html
<label>排序
  <select id="sort-control" name="sort">
    <option value="date">最新发布</option>
    <option value="score">评分最高</option>
  </select>
</label>
```

Load `data/topics.js` before `article-utils.js`. In `filterArticles`, filter first and then assign `state.filtered = ArticleUtils.sortArticles(filtered, $('#sort-control').value)`; reset `state.visible = 30`; store `sort=score` only for the non-default mode. Replace `scoreText` with `ArticleUtils.scoreText`, change visible labels from `SOURCE SCORE` to `综合评分`, and fill topics in `window.ARTICLE_TOPICS` order.

- [ ] **Step 4: Run page tests and verify GREEN**

Run: `node --test tests/web/static-contract.test.mjs tests/web/article-utils.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/app.js web/styles.css tests/web/static-contract.test.mjs web/data/topics.js
git commit -m "feat: sort and normalize the article index"
```

### Task 5: Rebuild all generated knowledge artifacts

**Files:**
- Modify: `work/knowledge/corpus.json`
- Modify: `web/data/articles.js`
- Modify: `work/archive/**/中文全文.html`
- Test: `tests/archive-audit.test.mjs`

- [ ] **Step 1: Run topic, corpus, and reader generation**

Run: `npm run corpus && npm run readers`

Expected: 469 articles, 4,117 chunks, and 469 Chinese readers generated.

- [ ] **Step 2: Verify generated consistency**

Run: `npm run verify:readers && npm run audit`

Expected: 469/469 readers valid; archive audit valid; all visible topics belong to the 10-topic vocabulary.

- [ ] **Step 3: Run full tests**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 4: Commit generated outputs**

```bash
git add work/knowledge/corpus.json web/data/articles.js work/archive
git commit -m "feat: publish canonical article topics"
```
