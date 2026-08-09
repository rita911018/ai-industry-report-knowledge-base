# Knowledge Web and DeepSeek V4 Q&A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one local knowledge webpage that integrates all 418 radar records, supports browse/search/filter/source viewing, and answers questions with validated citations through DeepSeek V4.

**Architecture:** A dependency-light Node HTTP service serves the web UI and a generated search corpus. Local retrieval selects evidence chunks before any API request; a DeepSeek adapter sends only those chunks and requires structured JSON with citation IDs. The server validates every citation before returning it, while the browser renders answer claims and source cards without ever receiving the API Key.

**Tech Stack:** Node.js 24, native HTTP/fetch, `node:test`, vanilla HTML/CSS/JavaScript, BM25-style retrieval, DeepSeek OpenAI-compatible Chat Completions.

---

## File map

- `src/knowledge/build-corpus.mjs`: convert normalized radar records and archived full text into chunked corpus.
- `src/knowledge/search.mjs`: bilingual tokenization, filtering, BM25 scoring, and evidence reranking.
- `src/server/deepseek-client.mjs`: DeepSeek V4 structured-answer adapter.
- `src/server/validate-answer.mjs`: citation and schema validator.
- `src/server/app-server.mjs`: static serving plus `/api/health`, `/api/search`, `/api/ask`.
- `web/index.html`: single user-facing page shell.
- `web/styles.css`: responsive visual system.
- `web/app.js`: filters, browse, question history, answer rendering, source panels.
- `web/data/articles.js`: generated light metadata for immediate file/local browsing.
- `work/knowledge/corpus.json`: full server-side chunks.
- `tests/knowledge/*.test.mjs`: corpus/search tests.
- `tests/server/*.test.mjs`: API and citation tests.
- `tests/web/*.test.mjs`: DOM/static contract tests.

### Task 1: Build a normalized knowledge corpus

**Files:**
- Create: `src/knowledge/build-corpus.mjs`
- Create: `tests/knowledge/build-corpus.test.mjs`

- [ ] **Step 1: Write the failing corpus test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCorpus } from '../../src/knowledge/build-corpus.mjs';

test('chunks inherit auditable provenance', () => {
  const [article] = buildCorpus([{ id: 'mck-1', radarTitle: 'fixture', publisher: 'McKinsey', sourceUrl: 'https://www.mckinsey.com/a', canonicalUrl: 'https://www.mckinsey.com/a', titleOriginal: 'A', titleZh: '甲', publishedAt: '2026-03-01', category: { primary: 'strategy', secondary: [] }, tags: { topics: [], geography: [], horizon: [], domains: [] }, priority: 'must-read', score: { total: 90, dimensions: { content: 32, impact: 23, relevance: 23, evidence: 12 }, sourceScale: 100 }, confidence: { level: 'high', reason: 'Traceable evidence' }, coreView: { original: 'Core finding.', zh: '核心结论。' }, evidence: [{ statementOriginal: 'Evidence one.', statementZh: '证据一。', locator: 'Section 1' }], impactZh: '影响。', implicationZh: '启示。', provenance: { sourceFile: '/fixture.html', elementId: 'mck-1', extractionBasis: 'radar_html' }, translationMarkdown: '# 甲\n\n第一段。' }]);
  assert.equal(article.chunks[0].articleId, 'mck-1');
  assert.equal(article.chunks[0].sourceUrl, 'https://www.mckinsey.com/a');
  assert.match(article.chunks[0].chunkId, /^mck-1:/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/knowledge/build-corpus.test.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement heading-aware chunks**

Split Markdown under heading paths with a target of 1,200–1,800 Chinese characters and 150-character overlap. Each chunk must inherit article ID, publisher, titles, date, tags, scores, confidence, official URL, local paths, section path, and content fingerprint.

- [ ] **Step 4: Generate compact browser metadata separately**

`web/data/articles.js` must contain titles, radar/source, date, summary, tags, scores, confidence, and local/official links, but not all full-text chunks.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/knowledge/build-corpus.test.mjs`

Expected: corpus schema and chunk-boundary tests pass.

```bash
git add src/knowledge/build-corpus.mjs tests/knowledge/build-corpus.test.mjs
git commit -m "feat: build cited knowledge corpus"
```

### Task 2: Implement bilingual local retrieval

**Files:**
- Create: `src/knowledge/search.mjs`
- Create: `tests/knowledge/search.test.mjs`

- [ ] **Step 1: Write failing retrieval tests**

Use a six-document bilingual fixture. Assert that a Chinese question about Agent governance retrieves the corresponding English/Chinese chunk, filters exclude the wrong publisher, and an unrelated question returns `insufficient: true`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/knowledge/search.test.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement tokenizer and BM25**

Tokenize lowercase Latin words, numbers, preserved acronyms, and overlapping two-character Chinese grams. Score title ×3, core view ×2, evidence ×2, and body ×1. Apply explicit source/date/category filters before scoring. Return at most 12 chunks with a per-article cap of three.

- [ ] **Step 4: Add insufficiency threshold and diversity**

Return `insufficient: true` if no chunk passes the tested minimum. Prefer publisher diversity when scores are within 10%, without displacing a materially stronger source.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/knowledge/search.test.mjs`

Expected: bilingual, filter, diversity, and insufficient-evidence tests pass.

```bash
git add src/knowledge/search.mjs tests/knowledge/search.test.mjs
git commit -m "feat: add bilingual evidence retrieval"
```

### Task 3: Implement the DeepSeek V4 client

**Files:**
- Create: `src/server/deepseek-client.mjs`
- Create: `tests/server/deepseek-client.test.mjs`

- [ ] **Step 1: Write a failing mocked-fetch test**

Assert base URL `https://api.deepseek.com`, default model `deepseek-v4-flash`, optional `deepseek-v4-pro`, Bearer header from `DEEPSEEK_API_KEY`, and JSON response mode.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/server/deepseek-client.test.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the adapter**

```js
export async function askDeepSeek({ question, evidence, model = 'deepseek-v4-flash', apiKey = process.env.DEEPSEEK_API_KEY, fetchImpl = fetch }) {
  if (!apiKey) throw Object.assign(new Error('DEEPSEEK_API_KEY is not configured'), { code: 'MISSING_API_KEY' });
  if (!['deepseek-v4-flash', 'deepseek-v4-pro'].includes(model)) throw new Error(`Unsupported model: ${model}`);
  const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return JSON. Use only supplied evidence. Every factual claim must cite valid chunkIds. Mark inference as analysis. If evidence is insufficient, say so.' },
        { role: 'user', content: JSON.stringify({ question, evidence }) }
      ]
    })
  });
  if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
  return JSON.parse((await response.json()).choices[0].message.content);
}
```

- [ ] **Step 4: Add timeout and safe error mapping**

Timeout after 90 seconds. Return stable error codes for missing key, authentication, rate limit, upstream timeout, invalid JSON, and unsupported model. Never include the API Key in an error.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/server/deepseek-client.test.mjs`

Expected: request, model selection, missing-key, and redaction tests pass.

```bash
git add src/server/deepseek-client.mjs tests/server/deepseek-client.test.mjs
git commit -m "feat: connect DeepSeek V4 question answering"
```

### Task 4: Validate every generated citation

**Files:**
- Create: `src/server/validate-answer.mjs`
- Create: `tests/server/validate-answer.test.mjs`

- [ ] **Step 1: Write failing schema/citation tests**

Reject an answer with an unknown chunk ID, a factual claim with no citations, duplicate source IDs, or an invalid answer shape. Accept an explicit insufficient-evidence answer with no fabricated sources.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/server/validate-answer.test.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement strict validation**

Accepted JSON shape:

```json
{
  "answer": "string",
  "claims": [
    { "text": "string", "kind": "source_fact", "citations": ["article-id:chunk-number"] },
    { "text": "string", "kind": "analysis", "citations": ["article-id:chunk-number"] }
  ],
  "limitations": ["string"],
  "insufficient": false
}
```

All citation IDs must be present in the exact evidence set sent to the model. Enrich accepted IDs with title, publisher, official URL, local paths, and locator on the server.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test tests/server/validate-answer.test.mjs`

Expected: all shape, citation, and refusal tests pass.

```bash
git add src/server/validate-answer.mjs tests/server/validate-answer.test.mjs
git commit -m "feat: enforce answer citation integrity"
```

### Task 5: Build the local HTTP service

**Files:**
- Create: `src/server/app-server.mjs`
- Create: `tests/server/app-server.test.mjs`

- [ ] **Step 1: Write failing endpoint tests**

Test `GET /api/health`, `POST /api/search`, `POST /api/ask`, malformed JSON, body-size limit, missing API Key, and a mocked successful DeepSeek response.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/server/app-server.test.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement routes with dependency injection**

`/api/health` returns corpus count, model choices, and `deepseekConfigured` boolean. `/api/search` returns local results only. `/api/ask` retrieves evidence, refuses unsupported questions before calling DeepSeek, validates the generated answer, and returns cited sources.

- [ ] **Step 4: Add static serving and traversal protection**

Serve only `web/` and approved archive paths. Resolve every path and reject any target outside those roots. Bind to `127.0.0.1` by default.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/server/app-server.test.mjs`

Expected: all API, size-limit, and traversal tests pass.

```bash
git add src/server/app-server.mjs tests/server/app-server.test.mjs
git commit -m "feat: serve local knowledge API"
```

### Task 6: Build the unified responsive page

**Files:**
- Create: `web/index.html`
- Create: `web/styles.css`
- Create: `web/app.js`
- Create: `tests/web/static-contract.test.mjs`

- [ ] **Step 1: Invoke required visual design skills before implementation**

Use `frontend-skill` for the interface and `ui-ux-pro-max` for interaction/accessibility decisions. Do not imitate any of the five source brands; use a neutral editorial research identity.

- [ ] **Step 2: Write the failing static contract test**

Assert one `main`, a labelled question form, source/date/category/priority controls, an answer live region, article results, source drawer, visible API status, and links to local Chinese/original and official source.

- [ ] **Step 3: Verify RED**

Run: `node --test tests/web/static-contract.test.mjs`

Expected: missing file/selector failures.

- [ ] **Step 4: Implement semantic HTML**

The layout must include: editorial header/stat strip, question workspace, evidence/answer column, filter bar, article result grid, article detail dialog, source drawer, methodology footer, and no-key guidance.

- [ ] **Step 5: Implement responsive styling**

Support 1440px desktop, 1024px laptop, 768px tablet, and 390px mobile. Meet WCAG AA text contrast, visible focus, reduced-motion preference, keyboard-operable dialogs, and 44px touch targets.

- [ ] **Step 6: Implement browser behavior**

Load compact metadata, debounce search, synchronize filters to URL query parameters, call local endpoints, render each claim with source chips, preserve question history in localStorage, and never render untrusted strings with `innerHTML`.

- [ ] **Step 7: Verify GREEN and commit**

Run: `node --test tests/web/static-contract.test.mjs`

Expected: all semantic and asset tests pass.

```bash
git add web tests/web/static-contract.test.mjs
git commit -m "feat: build AI industry knowledge interface"
```

### Task 7: Generate the full corpus and verify counts

**Files:**
- Generate: `work/knowledge/corpus.json`
- Generate: `web/data/articles.js`
- Generate: `work/knowledge/corpus-audit.json`

- [ ] **Step 1: Run full archive audit first**

Run: `npm run audit -- --root work/archive --expected 418`

Expected: archive audit passes.

- [ ] **Step 2: Build corpus**

Run: `node src/knowledge/build-corpus.mjs --ledger work/normalized/articles.json --archive work/archive --out work/knowledge/corpus.json --browser web/data/articles.js`

Expected: 418 articles and at least 418 chunks; every chunk has official source URL and local Chinese path.

- [ ] **Step 3: Run corpus audit**

Run: `node src/knowledge/build-corpus.mjs --verify work/knowledge/corpus.json`

Expected: no duplicate chunk IDs, no missing source URLs, no orphan article IDs, and exact article count 418.

- [ ] **Step 4: Commit generated lightweight data and audit evidence**

```bash
git add web/data/articles.js work/knowledge/corpus-audit.json
git commit -m "data: publish 418-record knowledge index"
```

### Task 8: End-to-end browser and API verification

**Files:**
- Create: `tests/e2e/knowledge-web.spec.mjs`
- Create: `scripts/verify-knowledge-web.mjs`

- [ ] **Step 1: Add end-to-end scenarios**

Cover: load 418 count; Chinese query; English query; source filter; article dialog; local translation link; official link; missing API Key; mocked Flash answer with citations; mocked Pro answer; unknown citation rejection; unsupported question refusal; mobile viewport keyboard navigation.

- [ ] **Step 2: Run with a mocked DeepSeek service**

Run: `node scripts/verify-knowledge-web.mjs --mock-deepseek`

Expected: all scenarios pass and screenshots are written to `work/qa/`.

- [ ] **Step 3: Run with a real API Key when supplied**

Run the following in a private terminal so the key is not echoed or stored in a file:

```bash
read -s DEEPSEEK_API_KEY
export DEEPSEEK_API_KEY
node src/server/app-server.mjs
```

In a second terminal run: `node scripts/verify-knowledge-web.mjs --live-deepseek --model deepseek-v4-flash`

Expected: answer cites only retrieved chunk IDs and every citation opens its source card. Do not store the key in shell history or files; prefer a temporary environment injection mechanism during actual execution.

- [ ] **Step 4: Commit verification code and non-secret evidence**

```bash
git add tests/e2e scripts/verify-knowledge-web.mjs work/qa
git commit -m "test: verify cited DeepSeek knowledge answers"
```
