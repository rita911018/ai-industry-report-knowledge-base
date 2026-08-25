# Prominent Home Navigation and Article Summaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage’s two primary navigation choices visibly prominent and replace all 51 refresh-window placeholder subtitles with reliable Chinese article summaries derived from the archived full text.

**Architecture:** Keep the existing homepage markup and browser rendering contract. Change only the shared homepage CSS for navigation, extend the refresh editorial override pipeline so `summaryZh` becomes the durable source of `coreView.zh`, apply those overrides to the canonical ledger, and regenerate the existing reader/corpus/browser artifacts through their current commands.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js ESM, Node test runner, JSON editorial data, existing reader and corpus generators.

---

## File map

- `web/styles.css` — homepage navigation sizing and states.
- `tests/web/static-contract.test.mjs` — desktop/mobile navigation CSS contract.
- `work/refresh/2026-08-23/editorial-overrides.json` — durable title and summary editorial decisions for the 51 refresh records.
- `src/refresh/build-records.mjs` — turns editorial `summaryZh` into canonical `coreView.zh` for future rebuilds.
- `tests/refresh/build-records.test.mjs` — requires complete, non-placeholder summary overrides.
- `src/refresh/apply-editorial-summaries.mjs` — safely applies the 51 approved summaries to an existing canonical ledger without changing identity or order.
- `tests/refresh/apply-editorial-summaries.test.mjs` — validates exact coverage, immutability of unrelated records, and rejection of weak data.
- `work/refresh/2026-08-23/new-records.json` — regenerated refresh records with real summaries.
- `work/normalized/articles.json` — canonical 469-article ledger updated in place by the safe application script.
- `work/archive/**/中文全文.html` — regenerated Chinese readers so detail-page subtitles match the canonical summary.
- `work/knowledge/corpus.json` — regenerated grounded-search corpus.
- `web/data/articles.js` — regenerated browser index used by both the article list and dialog.

### Task 1: Lock and implement the larger homepage navigation

**Files:**
- Modify: `tests/web/static-contract.test.mjs`
- Modify: `web/styles.css:27-30,144-146,170-173`

- [ ] **Step 1: Write the failing desktop and mobile CSS contract**

Add a dedicated test that reads `styles.css` and checks the approved A design without depending on declaration order:

```js
test('primary navigation is prominent on desktop and compact on mobile', async () => {
  const css = await readFile(new URL('styles.css', root), 'utf8');
  assert.match(css, /\.main-nav a\s*\{[^}]*min-height:\s*48px[^}]*padding:\s*\d+px 18px[^}]*font-size:\s*16px/s);
  assert.match(css, /\.main-nav a\[aria-current="page"\]\s*\{[^}]*border-bottom-width:\s*3px/s);
  assert.match(css, /\.main-nav a:focus-visible\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)[\s\S]*\.main-nav a\s*\{[^}]*min-height:\s*44px[^}]*font-size:\s*15px/s);
  assert.match(css, /@media\s*\(max-width:\s*390px\)[\s\S]*\.main-nav a\s*\{[^}]*font-size:\s*14px/s);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/web/static-contract.test.mjs
```

Expected: FAIL because current links are 12px high with a 38px target and a 1px active border.

- [ ] **Step 3: Implement the approved navigation sizing**

Replace the current navigation rules with:

```css
.main-nav { display: flex; align-items: center; gap: 8px; margin-right: auto; }
.main-nav a {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  padding: 0 18px;
  border-bottom: 3px solid transparent;
  color: #53625a;
  font-size: 16px;
  font-weight: 750;
  text-decoration: none;
}
.main-nav a:hover { color: var(--accent-deep); border-color: var(--accent); }
.main-nav a:focus-visible { outline: 2px solid var(--accent-deep); outline-offset: 3px; }
.main-nav a[aria-current="page"] { color: var(--ink); border-bottom-color: var(--ink); border-bottom-width: 3px; }
```

Inside `@media (max-width: 768px)` add:

```css
.main-nav a { min-height: 44px; padding-inline: 14px; font-size: 15px; }
```

Inside `@media (max-width: 390px)` add:

```css
.main-nav a { font-size: 14px; }
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test tests/web/static-contract.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the navigation change**

```bash
git add web/styles.css tests/web/static-contract.test.mjs
git commit -m "feat: emphasize homepage navigation"
```

### Task 2: Make refresh summaries a required editorial input

**Files:**
- Modify: `tests/refresh/build-records.test.mjs`
- Modify: `src/refresh/build-records.mjs:108-170`

- [ ] **Step 1: Write the failing refresh-record tests**

Update the valid fixture override to include a genuine summary and assert that it becomes the record’s core view:

```js
const overrides = {
  [candidates.candidates[0].url]: {
    titleZh: '新的 AI 证据',
    summaryZh: '该研究说明企业需要同时重构流程、治理与衡量机制，才能把 AI 采用转化为可验证的业务结果。',
  },
};
// ...
assert.equal(record.coreView.zh, overrides[candidates.candidates[0].url].summaryZh);
```

Add rejection cases:

```js
test('requires a real Chinese summary instead of refresh-window boilerplate', () => {
  const candidate = { publisher: 'BCG', url: 'https://www.bcg.com/publications/2026/new-ai', publishedAt: '2026-08-20', status: 'included', reason: 'New measured enterprise evidence' };
  const input = (override) => ({
    candidates: { run: { id: '2026-08-23' }, candidates: [candidate] },
    inspections: { candidates: [{ url: candidate.url, inspection: { status: 'verified', titleOriginal: 'New AI evidence' } }] },
    overrides: { [candidate.url]: override },
    existing: [],
  });
  assert.throws(() => buildRefreshRecords(input({ titleZh: '新的 AI 证据' })), /Missing editorial summary/);
  assert.throws(() => buildRefreshRecords(input({
    titleZh: '新的 AI 证据',
    summaryZh: '该文位于本次 2026-07-08 至 2026-08-23 更新窗口，主题为：新的 AI 证据。',
  })), /Placeholder editorial summary/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/refresh/build-records.test.mjs
```

Expected: FAIL because `buildRefreshRecords` currently invents `reasonZh` from dates and the title.

- [ ] **Step 3: Add explicit summary validation**

Add near the URL helpers:

```js
const PLACEHOLDER_SUMMARY = /^该文位于本次\s.+更新窗口，主题为：/;
const SUMMARY_FALLBACK = '暂无可靠概要，点击查看归档全文。';

function editorialSummary(override, sourceUrl) {
  const summary = String(override?.summaryZh || '').trim();
  if (!summary) throw new Error(`Missing editorial summary for ${sourceUrl}`);
  if (PLACEHOLDER_SUMMARY.test(summary)) throw new Error(`Placeholder editorial summary for ${sourceUrl}`);
  if (summary !== SUMMARY_FALLBACK && (summary.length < 24 || summary.length > 260)) throw new Error(`Invalid editorial summary length for ${sourceUrl}`);
  return summary;
}
```

Inside the candidate loop, replace the generated `reasonZh` with:

```js
const summaryZh = editorialSummary(override, sourceUrl);
```

and set:

```js
coreView: { original: null, zh: summaryZh },
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
node --test tests/refresh/build-records.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the refresh pipeline contract**

```bash
git add src/refresh/build-records.mjs tests/refresh/build-records.test.mjs
git commit -m "feat: require editorial refresh summaries"
```

### Task 3: Add a safe summary-application tool

**Files:**
- Create: `src/refresh/apply-editorial-summaries.mjs`
- Create: `tests/refresh/apply-editorial-summaries.test.mjs`

- [ ] **Step 1: Write the failing unit tests**

Cover the behavior with small fixtures:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyEditorialSummaries } from '../../src/refresh/apply-editorial-summaries.mjs';

const placeholder = '该文位于本次 2026-07-08 至 2026-08-23 更新窗口，主题为：测试文章。';
const records = [
  { id: 'old', sourceUrl: 'https://example.com/old', coreView: { zh: '已有可靠概要。' } },
  { id: 'refresh', sourceUrl: 'https://example.com/refresh', coreView: { zh: placeholder } },
];

test('replaces only matching placeholder summaries and preserves record order', () => {
  const overrides = {
    'https://example.com/refresh': {
      titleZh: '测试文章',
      summaryZh: '文章分析企业如何把 AI 纳入关键流程，并通过治理与衡量机制验证实际成效。',
    },
  };
  const updated = applyEditorialSummaries(records, overrides, { expected: 1 });
  assert.deepEqual(updated.map((record) => record.id), ['old', 'refresh']);
  assert.equal(updated[0], records[0]);
  assert.equal(updated[1].coreView.zh, overrides['https://example.com/refresh'].summaryZh);
  assert.equal(updated[1].coreView.original, undefined);
});

test('rejects incomplete coverage, extra targets, and placeholder replacements', () => {
  assert.throws(() => applyEditorialSummaries(records, {}, { expected: 1 }), /Missing summary override/);
  assert.throws(() => applyEditorialSummaries(records, { 'https://example.com/extra': { summaryZh: '足够长但没有对应记录的概要文字。' } }, { expected: 1 }), /Unused summary override/);
  assert.throws(() => applyEditorialSummaries(records, { 'https://example.com/refresh': { summaryZh: placeholder } }, { expected: 1 }), /Placeholder summary override/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/refresh/apply-editorial-summaries.test.mjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure updater and CLI**

Create an ESM module that:

- normalizes source URLs by removing hashes, tracking parameters, and trailing slashes;
- identifies targets only when `coreView.zh` matches `^该文位于本次\s.+更新窗口，主题为：`;
- requires exactly `expected` targets;
- requires one `summaryZh` override for every target and rejects unused `summaryZh` overrides;
- validates every replacement is 24–260 characters and is not the placeholder pattern, while allowing the exact audited fallback `暂无可靠概要，点击查看归档全文。`;
- returns new objects for changed records while preserving every other record and array order;
- provides a CLI with `--ledger`, `--overrides`, and `--expected`, writes to a temporary file, then atomically renames it.

The exported API must be named and called exactly as follows:

```js
applyEditorialSummaries(records, overrides, { expected: 51 });
```

CLI usage:

```bash
node src/refresh/apply-editorial-summaries.mjs \
  --ledger work/normalized/articles.json \
  --overrides work/refresh/2026-08-23/editorial-overrides.json \
  --expected 51
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test tests/refresh/apply-editorial-summaries.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the updater**

```bash
git add src/refresh/apply-editorial-summaries.mjs tests/refresh/apply-editorial-summaries.test.mjs
git commit -m "feat: apply audited article summaries"
```

### Task 4: Curate and apply all 51 article summaries

**Files:**
- Modify: `work/refresh/2026-08-23/editorial-overrides.json`
- Regenerate: `work/refresh/2026-08-23/new-records.json`
- Modify through script: `work/normalized/articles.json`
- Test: `tests/refresh/build-records.test.mjs`
- Test: `tests/refresh/apply-editorial-summaries.test.mjs`

- [ ] **Step 1: Build the exact target checklist**

Run this read-only command and save its 51 IDs as the review checklist in the task notes:

```bash
node -e 'const fs=require("fs");const records=JSON.parse(fs.readFileSync("work/normalized/articles.json","utf8"));const targets=records.filter(r=>/^该文位于本次\s/.test(r.coreView?.zh||""));console.log(targets.map(r=>`${r.publisher}\t${r.id}\t${r.localPaths.chineseMarkdown}`).join("\n"));console.error(`targets=${targets.length}`)'
```

Expected: `targets=51`, with BCG 16, Anthropic 7, Bain 3, MIT 5, McKinsey 20.

- [ ] **Step 2: Read each archived Chinese full text and write `summaryZh`**

For each target, resolve `localPaths.chineseMarkdown` under `work/archive` and add `summaryZh` to the matching source URL in `editorial-overrides.json`.

Every summary must:

- contain 1–2 complete Chinese sentences;
- be 24–260 characters;
- state the article’s actual subject plus its principal finding, method, or management implication;
- avoid the refresh window, a title-only paraphrase, unsupported numbers, and unsupported causal claims;
- use the fallback exactly `暂无可靠概要，点击查看归档全文。` only when the archived body cannot support a reliable summary.

The entry shape is:

```json
{
  "https://www.bcg.com/publications/2026/ceos-guide-to-closing-the-ai-knowledge-gap-with-your-board": {
    "titleZh": "CEO 缩小董事会 AI 认知差距指南",
    "summaryZh": "文章说明 CEO 应如何帮助董事会建立共同的 AI 认知框架，并把技术判断转化为投资、风险和治理决策。重点不是让董事掌握模型细节，而是形成能审视价值、能力与责任边界的提问方式。"
  }
}
```

- [ ] **Step 3: Regenerate refresh records from the durable overrides**

Create the exact pre-refresh ledger in a temporary location by excluding the 51 `-refresh-` records from the current canonical ledger, then run the refresh builder:

```bash
node -e 'const fs=require("fs");const records=JSON.parse(fs.readFileSync("work/normalized/articles.json","utf8"));const baseline=records.filter(r=>!r.id.includes("-refresh-"));if(baseline.length!==418)throw new Error(`Expected 418 baseline records, found ${baseline.length}`);fs.writeFileSync("/private/tmp/ai-report-pre-refresh-ledger.json",JSON.stringify(baseline,null,2)+"\n")'
node src/refresh/build-records.mjs \
  --candidates work/refresh/2026-08-23/candidates.json \
  --inspections work/refresh/2026-08-23/verified-candidates.json \
  --overrides work/refresh/2026-08-23/editorial-overrides.json \
  --ledger /private/tmp/ai-report-pre-refresh-ledger.json \
  --out work/refresh/2026-08-23/new-records.json
```

Expected output: 51 refresh records and no placeholder `coreView.zh`.

- [ ] **Step 4: Apply the audited summaries to the canonical ledger**

Run:

```bash
node src/refresh/apply-editorial-summaries.mjs \
  --ledger work/normalized/articles.json \
  --overrides work/refresh/2026-08-23/editorial-overrides.json \
  --expected 51
```

Expected: 469 records preserved, 51 summaries updated, zero placeholder summaries.

- [ ] **Step 5: Validate the complete summary data**

Run:

```bash
node -e 'const fs=require("fs");const records=JSON.parse(fs.readFileSync("work/normalized/articles.json","utf8"));const bad=records.filter(r=>!String(r.coreView?.zh||"").trim()||/^该文位于本次\s/.test(r.coreView.zh));if(records.length!==469||bad.length)process.exit(1);console.log("469 records; 0 placeholder summaries")'
```

Expected: `469 records; 0 placeholder summaries`.

- [ ] **Step 6: Review one article per publisher against its Chinese full text**

Check one BCG, Anthropic, Bain, MIT, and McKinsey target. For each, confirm the summary’s subject and main judgment are present in `中文全文.md`; record the five IDs in the commit message body or implementation notes.

- [ ] **Step 7: Run refresh tests and commit the curated data**

Run:

```bash
node --test tests/refresh/build-records.test.mjs tests/refresh/apply-editorial-summaries.test.mjs
```

Expected: all tests PASS.

Commit:

```bash
git add work/refresh/2026-08-23/editorial-overrides.json work/refresh/2026-08-23/new-records.json work/normalized/articles.json
git commit -m "content: replace refresh placeholder summaries"
```

### Task 5: Regenerate readers and browser/search artifacts

**Files:**
- Regenerate: `work/archive/**/中文全文.html`
- Regenerate: `work/knowledge/corpus.json`
- Regenerate: `web/data/articles.js`
- Modify: `tests/knowledge/build-corpus.test.mjs`

- [ ] **Step 1: Add a corpus-level regression test**

Import `browserMetadata` from `src/knowledge/build-corpus.mjs`, then add:

```js
test('browser metadata exposes genuine article summaries', () => {
  const article = { ...fixture, coreView: { zh: '文章分析企业如何通过治理与流程重构获得可验证的 AI 成效。' } };
  const [metadata] = browserMetadata(buildCorpus([article]));
  assert.equal(metadata.summary, article.coreView.zh);
  assert.doesNotMatch(metadata.summary, /^该文位于本次\s/);
});
```

- [ ] **Step 2: Run the test and confirm current behavior**

Run:

```bash
node --test tests/knowledge/build-corpus.test.mjs
```

Expected: PASS, documenting that the existing generator already carries canonical summaries to the browser. If the test fails, fix only the mapping in `browserMetadata`; do not add a second summary field.

- [ ] **Step 3: Regenerate Chinese readers**

Run:

```bash
npm run readers
npm run verify:readers
```

Expected: 469 generated and 469 verified.

- [ ] **Step 4: Regenerate corpus and browser article data**

Run:

```bash
npm run corpus
node src/knowledge/build-corpus.mjs --verify work/knowledge/corpus.json
```

Expected: 469 articles, valid corpus, and zero placeholder summaries in `web/data/articles.js`.

- [ ] **Step 5: Run focused data and UI tests**

Run:

```bash
node --test tests/knowledge/build-corpus.test.mjs tests/readers/generate-chinese-html.test.mjs tests/web/static-contract.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit generated artifacts**

```bash
git add tests/knowledge/build-corpus.test.mjs work/archive work/knowledge/corpus.json web/data/articles.js
git commit -m "build: regenerate summaries across knowledge artifacts"
```

### Task 6: Full verification, deployment, and visual QA

**Files:**
- Deploy: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/styles.css`
- Deploy: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/data/articles.js`
- Deploy: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/corpus.json`
- Deploy: `/Users/rita/Desktop/AI行业报告/*/articles/*/中文全文.html` for changed refresh readers

- [ ] **Step 1: Run the complete test suite**

Run:

```bash
npm test
```

Expected: every test PASS. If sandboxed localhost tests fail with `listen EPERM`, rerun the same command with permission to bind `127.0.0.1`; do not classify those environment failures as product failures.

- [ ] **Step 2: Check repository hygiene**

Run:

```bash
git diff --check
git status --short
```

Expected: only the pre-existing untracked `.superpowers/` directory; all implementation and generated artifacts committed.

- [ ] **Step 3: Sync the homepage and knowledge data**

Run:

```bash
rsync -a web/styles.css web/data/articles.js "/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/"
rsync -a work/knowledge/corpus.json "/Users/rita/Desktop/AI行业报告/AI行业报告知识库/corpus.json"
```

For each of the 51 changed readers, map `work/archive/<radar>/articles/<article>/中文全文.html` to `/Users/rita/Desktop/AI行业报告/<radar>/articles/<article>/中文全文.html` and use `rsync -a` without touching Markdown or original-source files.

- [ ] **Step 4: Verify byte-for-byte deployment consistency**

Use `cmp -s` for `styles.css`, `articles.js`, `corpus.json`, and every changed `中文全文.html`. Expected: every pair matches.

- [ ] **Step 5: Restart the local product only if required**

Check:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4318/
```

If the service is down, run `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/启动知识库.command`. Never print `.env.local` or API credentials.

- [ ] **Step 6: Browser-check desktop and mobile navigation**

At desktop width, confirm 16px text, 48px targets, clear 3px active underline, visible hover/focus, and no overlap with the brand or masthead metadata. At 390px, confirm two equal-width 44px targets, 14px text, no horizontal scrolling, and a visible active underline.

- [ ] **Step 7: Browser-check list and dialog summaries**

Open one updated record from each publisher in the homepage list. Confirm the title subtitle is a real 1–2 sentence overview, the dialog shows the same text, and no UI surface contains “该文位于本次……更新窗口，主题为……”. Confirm an untouched pre-refresh article still shows its original summary.

- [ ] **Step 8: Final deployment report**

Report the final test count, 51/51 summary replacement count, five reviewed sample IDs, deployment consistency, service URL, and any content that used the explicit “暂无可靠概要” fallback.
