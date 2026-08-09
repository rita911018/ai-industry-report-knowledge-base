# Article Archive and Full Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download, extract, archive, and fully translate all 418 articles referenced by the five radar HTML files, with complete manifests and failure evidence.

**Architecture:** A Node.js pipeline first normalizes the five radar DOM variants into one JSON schema, then downloads official pages with bounded concurrency, extracts readable article Markdown, and writes deterministic article folders. Codex translates the extracted Markdown in source-specific batches; validators enforce record counts, file presence, heading coverage, and preservation of numeric tokens and URLs.

**Tech Stack:** Node.js 24, native `fetch`, `node:test`, Cheerio, Mozilla Readability, JSDOM, Turndown, JSON/CSV manifests.

---

## File map

- `package.json`: scripts and runtime dependencies.
- `src/config/input-radars.mjs`: immutable mapping of five input files, titles, expected counts, and publisher codes.
- `src/schema/article-record.mjs`: validation and normalization contract.
- `src/radar/parse-radars.mjs`: five DOM adapters and unified record output.
- `src/archive/fetch-page.mjs`: retrying HTTP fetch with redirect and status capture.
- `src/archive/extract-article.mjs`: Readability extraction plus source-specific selectors.
- `src/archive/paths.mjs`: safe deterministic folder/file names.
- `src/archive/write-archive.mjs`: snapshots, Markdown, metadata, and manifests.
- `src/archive/run-archive.mjs`: resumable orchestration.
- `src/translation/queue.mjs`: translation queue and batch state.
- `src/translation/verify-translation.mjs`: structural and invariant verification.
- `src/audit/archive-audit.mjs`: final 418-record audit.
- `tests/fixtures/`: minimized HTML fixtures derived from each radar format and downloaded source samples.
- `tests/**/*.test.mjs`: unit and integration tests.
- `work/normalized/articles.json`: authoritative normalized ledger.
- `work/archive/`: staging tree copied to Desktop only after audit passes.

### Task 1: Initialize the tested Node project

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tests/smoke.test.mjs`

- [ ] **Step 1: Write the failing smoke test**

```js
// tests/smoke.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PROJECT_SCHEMA_VERSION } from '../src/schema/article-record.mjs';

test('archive schema version is fixed', () => {
  assert.equal(PROJECT_SCHEMA_VERSION, '1.0.0');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/smoke.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/schema/article-record.mjs`.

- [ ] **Step 3: Add package configuration and minimal implementation**

```json
{
  "name": "ai-industry-report-archive",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/**/*.test.mjs",
    "parse": "node src/radar/parse-radars.mjs",
    "archive": "node src/archive/run-archive.mjs",
    "audit": "node src/audit/archive-audit.mjs"
  },
  "dependencies": {
    "@mozilla/readability": "^0.6.0",
    "cheerio": "^1.1.2",
    "jsdom": "^26.1.0",
    "turndown": "^7.2.1"
  }
}
```

```js
// src/schema/article-record.mjs
export const PROJECT_SCHEMA_VERSION = '1.0.0';
```

`.gitignore` must contain:

```gitignore
node_modules/
work/archive/
work/http-cache/
.DS_Store
```

- [ ] **Step 4: Install and verify GREEN**

Run: `npm install`

Expected: exit 0 and a generated `package-lock.json`.

Run: `npm test`

Expected: 1 passing test, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore src/schema/article-record.mjs tests/smoke.test.mjs
git commit -m "chore: initialize article archive pipeline"
```

### Task 2: Define the five-source input contract

**Files:**
- Create: `src/config/input-radars.mjs`
- Create: `tests/input-radars.test.mjs`

- [ ] **Step 1: Write the failing contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { INPUT_RADARS } from '../src/config/input-radars.mjs';

test('five radar counts total 418', () => {
  assert.equal(INPUT_RADARS.length, 5);
  assert.equal(INPUT_RADARS.reduce((sum, item) => sum + item.expectedCount, 0), 418);
  assert.deepEqual(INPUT_RADARS.map(x => x.expectedCount), [116, 25, 29, 38, 210]);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/input-radars.test.mjs`

Expected: FAIL because the config module does not exist.

- [ ] **Step 3: Implement the immutable config**

```js
export const INPUT_RADARS = Object.freeze([
  { publisher: 'BCG', path: '/Users/rita/Downloads/BCG-Insight-Radar-2026-W31-Static.html', title: 'BCG Insight Radar · 2026-W31 · Static', expectedCount: 116, adapter: 'bcg' },
  { publisher: 'Anthropic', path: '/Users/rita/Downloads/Anthropic-Six-Month-Insight-Radar-2026-08-02.html', title: 'Anthropic 最近半年洞察雷达 | 2026-08-02', expectedCount: 25, adapter: 'bilingual-analysis' },
  { publisher: 'McKinsey', path: '/Users/rita/Downloads/McKinsey-Six-Month-Insight-Radar-2026-08-02.html', title: 'McKinsey 最近半年洞察雷达 | 2026-08-02', expectedCount: 29, adapter: 'bilingual-analysis' },
  { publisher: 'MIT', path: '/Users/rita/Downloads/MIT-AI-Management-Insight-Radar-2026-08-04.html', title: 'MIT AI Management Insight Radar · 2026-08-04', expectedCount: 38, adapter: 'mit' },
  { publisher: 'Bain', path: '/Users/rita/Downloads/Bain-Six-Month-Insight-Radar-2026-08-02.html', title: 'Bain Six-Month Insight Radar · 2026-08-02', expectedCount: 210, adapter: 'bain' }
]);
```

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/input-radars.test.mjs`

Expected: 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add src/config/input-radars.mjs tests/input-radars.test.mjs
git commit -m "feat: define radar input contract"
```

### Task 3: Parse all radar variants into one ledger

**Files:**
- Create: `src/schema/article-record.mjs`
- Create: `src/radar/parse-radars.mjs`
- Create: `tests/radar-parser.test.mjs`
- Create: `tests/fixtures/radars/*.html`

- [ ] **Step 1: Add fixtures containing one complete article card per source**

Copy the smallest self-contained card plus its enclosing language metadata from each input HTML. Preserve source attributes and URLs exactly.

- [ ] **Step 2: Write failing parser tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRadarHtml } from '../src/radar/parse-radars.mjs';

test('parses bilingual score dimensions and provenance', async () => {
  const records = await parseRadarHtml('tests/fixtures/radars/mckinsey.html', {
    publisher: 'McKinsey', adapter: 'bilingual-analysis', expectedCount: 1, title: 'fixture'
  });
  assert.equal(records[0].sourceUrl.startsWith('https://www.mckinsey.com/'), true);
  assert.equal(records[0].score.total, 98);
  assert.deepEqual(records[0].score.dimensions, { content: 35, impact: 25, relevance: 23, evidence: 15 });
  assert.equal(records[0].confidence.level, 'high');
});
```

- [ ] **Step 3: Verify RED**

Run: `node --test tests/radar-parser.test.mjs`

Expected: FAIL because `parseRadarHtml` is missing.

- [ ] **Step 4: Implement normalized validation**

`assertArticleRecord(record)` must reject missing `id`, `radarTitle`, `publisher`, `sourceUrl`, `titleOriginal`, `priority`, or provenance. It must verify dimension ranges and exact score addition when dimensions are present.

All adapters must emit this canonical shape; use `null` or an empty array for genuinely absent source fields rather than changing property names:

```js
{
  schemaVersion: '1.0.0',
  id: 'publisher-stable-id',
  radarTitle: 'Exact HTML title',
  publisher: 'Publisher',
  sourceUrl: 'https://official.example/article',
  canonicalUrl: 'https://official.example/article',
  titleOriginal: 'Original title',
  titleZh: 'Chinese title or null',
  publishedAt: '2026-01-01',
  documentType: 'article',
  authorRaw: null,
  category: { primary: 'strategy', secondary: [] },
  tags: { topics: [], geography: [], horizon: [], domains: [] },
  priority: 'must-read',
  score: { total: 90, dimensions: { content: 32, impact: 23, relevance: 23, evidence: 12 }, sourceScale: 100 },
  confidence: { level: 'middle', reason: 'Source-specific reason' },
  coreView: { original: null, zh: '核心观点' },
  evidence: [{ statementOriginal: null, statementZh: '证据', locator: 'Section name' }],
  impactZh: '影响范围',
  implicationZh: '业务含义',
  provenance: { sourceFile: '/absolute/input.html', elementId: 'article-id', extractionBasis: 'radar_html' }
}
```

```js
export function assertArticleRecord(record) {
  for (const key of ['id', 'radarTitle', 'publisher', 'sourceUrl', 'titleOriginal', 'priority']) {
    if (!record[key]) throw new Error(`Missing ${key} for ${record.id ?? 'unknown record'}`);
  }
  if (!/^https:\/\//.test(record.sourceUrl)) throw new Error(`Non-HTTPS source: ${record.sourceUrl}`);
  const d = record.score?.dimensions;
  if (d) {
    const total = d.content + d.impact + d.relevance + d.evidence;
    if (total !== record.score.total) throw new Error(`Score mismatch for ${record.id}`);
  }
  return record;
}
```

- [ ] **Step 5: Implement the adapters**

Use Cheerio and adapter-specific selectors. Preserve both source-provided totals and dimensions; never invent dimensions for BCG records that only expose a 10-point content-value score. Store source facts, analysis, and implications in separate fields.

- [ ] **Step 6: Verify fixtures and full inputs**

Run: `node --test tests/radar-parser.test.mjs`

Expected: all fixture tests pass.

Run: `npm run parse`

Expected output includes `BCG=116 Anthropic=25 McKinsey=29 MIT=38 Bain=210 Total=418` and writes `work/normalized/articles.json`.

- [ ] **Step 7: Commit**

```bash
git add src/schema src/radar tests/radar-parser.test.mjs tests/fixtures/radars work/normalized/articles.json
git commit -m "feat: normalize five insight radar formats"
```

### Task 4: Implement deterministic archive paths

**Files:**
- Create: `src/archive/paths.mjs`
- Create: `tests/archive-paths.test.mjs`

- [ ] **Step 1: Write failing tests for unsafe and duplicate titles**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { articleDirectoryName } from '../src/archive/paths.mjs';

test('creates stable safe numbered directories', () => {
  assert.equal(articleDirectoryName(7, 'AI / Data: What?'), '007-ai-data-what');
  assert.equal(articleDirectoryName(210, '中文标题'), '210-中文标题');
});
```

- [ ] **Step 2: Verify RED, implement, and verify GREEN**

Run: `node --test tests/archive-paths.test.mjs`

Expected before implementation: module-not-found failure. Expected after implementation: 2 passing assertions.

The implementation must normalize Unicode, replace `/`, `:`, NUL, and control characters, collapse whitespace/dashes, preserve Chinese, and cap the slug at 96 code points.

- [ ] **Step 3: Commit**

```bash
git add src/archive/paths.mjs tests/archive-paths.test.mjs
git commit -m "feat: add deterministic archive paths"
```

### Task 5: Download pages with resumable state

**Files:**
- Create: `src/archive/fetch-page.mjs`
- Create: `src/archive/run-archive.mjs`
- Create: `tests/fetch-page.test.mjs`

- [ ] **Step 1: Write a failing local HTTP integration test**

The test server must return 503 twice and 200 on the third request. Assert that `fetchPage` returns the 200 body, `attempts: 3`, final URL, content type, and retrieval timestamp.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/fetch-page.test.mjs`

Expected: FAIL because `fetchPage` is absent.

- [ ] **Step 3: Implement bounded retry**

```js
export async function fetchPage(url, { attempts = 4, timeoutMs = 30_000, sleep = setTimeout } = {}) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'AIIndustryReportArchive/1.0' } });
      const body = await response.text();
      if (response.ok) return { body, status: response.status, finalUrl: response.url, contentType: response.headers.get('content-type') ?? '', attempts: attempt, retrievedAt: new Date().toISOString() };
      last = new Error(`HTTP ${response.status}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) throw last;
    } catch (error) {
      last = error;
    } finally {
      clearTimeout(timer);
    }
    await new Promise(resolve => sleep(resolve, 500 * 2 ** (attempt - 1)));
  }
  throw new Error(`Fetch failed after ${attempts} attempts: ${url}: ${last?.message}`);
}
```

- [ ] **Step 4: Add resumable orchestration**

`run-archive.mjs` must read `work/archive-state.json`, skip records already marked `downloaded` with matching URL and snapshot hash, process at most three URLs concurrently, and atomically rewrite state after each item.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/fetch-page.test.mjs`

Expected: retry and non-retry tests pass without external network.

- [ ] **Step 6: Commit**

```bash
git add src/archive/fetch-page.mjs src/archive/run-archive.mjs tests/fetch-page.test.mjs
git commit -m "feat: add resumable article downloader"
```

### Task 6: Extract readable article content

**Files:**
- Create: `src/archive/extract-article.mjs`
- Create: `tests/extract-article.test.mjs`
- Create: `tests/fixtures/sources/*.html`

- [ ] **Step 1: Save one representative official-page fixture per publisher**

Fixtures must contain the real article container, headings, links, author/date metadata, and nearby navigation noise. Remove unrelated scripts and images only after preserving the selectors being tested.

- [ ] **Step 2: Write failing extraction tests**

Assert that extracted Markdown contains the known headline and body paragraph, excludes navigation/Cookie text, preserves official hyperlinks, and reports at least one heading and paragraph.

- [ ] **Step 3: Verify RED**

Run: `node --test tests/extract-article.test.mjs`

Expected: FAIL because the extractor is missing.

- [ ] **Step 4: Implement source selectors with Readability fallback**

Use source-specific main-content selectors first. If none yields at least 300 visible characters, use `Readability`. If the fallback remains below 300 characters, return status `thin` rather than fabricating content.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/extract-article.test.mjs`

Expected: five fixture tests pass and navigation sentinel strings are absent.

- [ ] **Step 6: Commit**

```bash
git add src/archive/extract-article.mjs tests/extract-article.test.mjs tests/fixtures/sources
git commit -m "feat: extract readable source articles"
```

### Task 7: Write snapshots, metadata, and manifests

**Files:**
- Create: `src/archive/write-archive.mjs`
- Create: `tests/write-archive.test.mjs`

- [ ] **Step 1: Write a failing temporary-directory test**

Assert exact files `原始网页.html`, `英文原文.md`, and `metadata.json`; assert SHA-256, relative paths, official URL, radar title, and status are in metadata; assert rerunning does not change paths.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/write-archive.test.mjs`

Expected: FAIL because the writer is missing.

- [ ] **Step 3: Implement atomic writes**

Write to sibling `.tmp` files and rename only after successful close. Never overwrite a nonempty `中文全文.md`. Generate source-level JSON/CSV manifests from metadata rather than maintaining a second manual ledger.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test tests/write-archive.test.mjs`

Expected: all writer tests pass.

```bash
git add src/archive/write-archive.mjs tests/write-archive.test.mjs
git commit -m "feat: write auditable article archives"
```

### Task 8: Run the 418-page archive download

**Files:**
- Generate: `work/archive/**`
- Generate: `work/archive-state.json`

- [ ] **Step 1: Run all preflight tests**

Run: `npm test`

Expected: 0 failures.

- [ ] **Step 2: Run the downloader with checkpoints**

Run: `npm run archive -- --concurrency 3 --resume`

Expected: final console summary lists all 418 records across `downloaded`, `thin`, `blocked`, or `failed`; the counts sum to 418.

- [ ] **Step 3: Retry transient failures once**

Run: `npm run archive -- --resume --retry-status failed`

Expected: only previously failed records are retried. Permanent access restrictions remain explicit.

- [ ] **Step 4: Commit the authoritative ledger, not bulky snapshots**

```bash
git add work/normalized/articles.json work/archive-state.json
git commit -m "data: record article archive results"
```

### Task 9: Build and test translation verification

**Files:**
- Create: `src/translation/queue.mjs`
- Create: `src/translation/verify-translation.mjs`
- Create: `tests/translation-verifier.test.mjs`

- [ ] **Step 1: Write failing tests for missing headings and altered numbers**

```js
test('rejects numeric drift', () => {
  const source = '# Result\nRevenue rose 17.5% to $2.4 billion.';
  const translation = '# 结果\n收入增长 15.7%，达到 24 亿美元。';
  assert.throws(() => verifyTranslation(source, translation), /17\.5%/);
});
```

- [ ] **Step 2: Verify RED, implement, and verify GREEN**

`verifyTranslation` must compare heading counts, URL sets, percentages, dates, currency/number tokens, nonempty paragraph coverage, and a minimum Chinese-character ratio. It returns a structured report and throws on hard failures.

Run: `node --test tests/translation-verifier.test.mjs`

Expected: all positive/negative cases pass.

- [ ] **Step 3: Generate the queue**

Run: `node src/translation/queue.mjs --archive work/archive`

Expected: `work/translation-queue.json` contains every `downloaded` or translatable `thin` record and excludes blocked/failed pages with reasons.

- [ ] **Step 4: Commit**

```bash
git add src/translation tests/translation-verifier.test.mjs work/translation-queue.json
git commit -m "feat: validate full article translations"
```

### Task 10: Translate all source batches with Codex

**Files:**
- Create: `work/archive/*/articles/*/中文全文.md`
- Modify: `work/translation-queue.json`

- [ ] **Step 1: Translate BCG records in ledger order**

For each source Markdown, translate every heading, paragraph, list item, caption, and footnote. Preserve link destinations and code/data literals. Run the verifier after each 10 records; fix all hard failures before continuing.

- [ ] **Step 2: Translate Anthropic records and verify every five**

Use the same translation contract. Preserve technical terms such as Agent, harness, context window, benchmark, and model names where Chinese-only wording would reduce precision.

- [ ] **Step 3: Translate McKinsey records and verify every five**

Preserve survey/sample boundaries, currency, percentages, and correlation/causation language exactly.

- [ ] **Step 4: Translate MIT records and verify every five**

Preserve research methods, sample sizes, study limitations, and quoted uncertainty.

- [ ] **Step 5: Translate Bain records and verify every ten**

Do not upgrade client claims, forecasts, interviews, podcasts, or vendor statements into independently proven facts.

- [ ] **Step 6: Run the full translation audit**

Run: `node src/translation/verify-translation.mjs --all work/archive`

Expected: every translated record passes hard invariants; warnings list only reviewed terminology/style items.

- [ ] **Step 7: Commit translation manifests**

Do not commit bulky translated articles if repository policy excludes archive outputs. Commit the queue and audit report that prove completion.

```bash
git add work/translation-queue.json work/translation-audit.json
git commit -m "data: verify complete Chinese translations"
```

### Task 11: Run the final archive audit and package staging output

**Files:**
- Create: `src/audit/archive-audit.mjs`
- Create: `tests/archive-audit.test.mjs`
- Generate: `work/archive-audit.json`
- Generate: `work/archive/归档总清单.csv`

- [ ] **Step 1: Write failing audit tests**

Cover missing source folder, missing translation, duplicate URL, incorrect radar title, total not equal to 418, and failed record absent from `failed.json`.

- [ ] **Step 2: Verify RED, implement, and verify GREEN**

Run: `node --test tests/archive-audit.test.mjs`

Expected: negative fixtures fail with exact record IDs; valid fixture passes.

- [ ] **Step 3: Audit the real staging archive**

Run: `npm run audit -- --root work/archive --expected 418`

Expected: JSON reports `total: 418`, five exact radar titles, no duplicate URL/ID, and every record either fully archived/translated or explicitly failed/blocked.

- [ ] **Step 4: Commit audit code and evidence**

```bash
git add src/audit tests/archive-audit.test.mjs work/archive-audit.json
git commit -m "test: audit 418-article archive"
```

### Task 12: Assemble and copy the verified delivery to Desktop

**Files:**
- Create: `work/delivery/AI行业报告/**`
- Create after approval: `/Users/rita/Desktop/AI行业报告/**`

- [ ] **Step 1: Assemble the delivery tree without modifying the audited archive**

Create `work/delivery/AI行业报告`. Copy the five audited radar folders using their exact HTML title values. Copy each corresponding input HTML to `雷达原始页面.html`. Copy `AI行业报告知识库/` from the verified web build and generate `归档总清单.csv` from the five manifests.

- [ ] **Step 2: Verify the staging delivery**

Run: `node src/audit/archive-audit.mjs --root work/delivery/AI行业报告 --expected 418 --require-web`

Expected: five exact title folders, 418 terminal records, every successful English article with `中文全文.md`, one knowledge webpage, and no secret-bearing files.

- [ ] **Step 3: Resolve the Desktop target safely**

Run: `test ! -e /Users/rita/Desktop/AI行业报告`

Expected: exit 0. If the path exists, stop and ask the user whether to merge or preserve it under a new name; do not overwrite it automatically.

- [ ] **Step 4: Copy the verified tree to Desktop**

```bash
mkdir -p /Users/rita/Desktop/AI行业报告
rsync -a work/delivery/AI行业报告/ /Users/rita/Desktop/AI行业报告/
```

- [ ] **Step 5: Audit the Desktop copy independently**

Run: `node src/audit/archive-audit.mjs --root /Users/rita/Desktop/AI行业报告 --expected 418 --require-web`

Expected: the Desktop audit output matches the staging audit for counts, record IDs, URLs, and file hashes.

- [ ] **Step 6: Commit non-bulky delivery evidence**

```bash
git add work/archive-audit.json work/delivery-audit.json
git commit -m "chore: verify desktop AI industry report delivery"
```
