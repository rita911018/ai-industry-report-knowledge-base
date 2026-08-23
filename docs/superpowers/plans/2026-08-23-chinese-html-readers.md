# Chinese Full-Text HTML Readers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one safe, self-contained, reader-friendly Chinese HTML page for every archived article while retaining Markdown as the authoritative translation and search source.

**Architecture:** A dependency-free Markdown renderer escapes all source text before creating a limited set of approved HTML structures. A batch generator joins normalized article metadata with each archived `中文全文.md`, writes `中文全文.html` atomically beside it, and verifies all expected outputs before corpus paths or desktop files are updated. Corpus construction continues reading Markdown but exposes separate HTML and Markdown URLs.

**Tech Stack:** Node.js ESM, semantic HTML/CSS, `node:test`, existing archive/corpus/server modules.

---

## File map

- Create `src/readers/render-markdown.mjs`: deterministic safe Markdown block and inline renderer.
- Create `src/readers/chinese-reader-template.mjs`: self-contained editorial HTML document template.
- Create `src/readers/generate-chinese-html.mjs`: batch loading, atomic writing, validation, and CLI.
- Create `tests/readers/render-markdown.test.mjs`: headings, paragraphs, lists, quotes, links, code, and injection tests.
- Create `tests/readers/chinese-reader-template.test.mjs`: metadata, navigation, offline, and missing-field tests.
- Create `tests/readers/generate-chinese-html.test.mjs`: one-record generation, failure, determinism, and count tests.
- Modify `src/knowledge/build-corpus.mjs`: expose HTML as `localPaths.chinese` and Markdown as `localPaths.chineseMarkdown` while still chunking Markdown.
- Modify `tests/knowledge/build-corpus.test.mjs`: assert both paths and unchanged chunks.
- Modify `src/audit/archive-audit.mjs`: optionally require and validate Chinese HTML readers.
- Modify `tests/archive-audit.test.mjs`: cover reader presence and failure.
- Modify `package.json`: add `readers` and `verify:readers` commands.
- Modify `README.md`, `delivery-template/AI行业报告知识库/使用说明.md`: explain HTML for people and Markdown for search.

### Task 1: Build a safe Markdown renderer

**Files:**
- Create: `tests/readers/render-markdown.test.mjs`
- Create: `src/readers/render-markdown.mjs`

- [ ] **Step 1: Write failing renderer tests**

Assert that `renderMarkdown(markdown)` produces `<h1>`–`<h6>`, paragraphs, ordered and unordered lists, blockquotes, fenced code, inline code, emphasis, strong text, and safe links. Add these security assertions:

```js
const hostile = renderMarkdown('# 标题\n\n<script>alert(1)</script>\n\n[x](javascript:alert(2))');
assert.doesNotMatch(hostile, /<script|javascript:/i);
assert.match(hostile, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.doesNotMatch(hostile, /onclick=|onerror=/i);
```

Assert external `https:` links include `target="_blank" rel="noreferrer"`, relative/hash links remain same-tab, and blank input throws `Chinese Markdown rendered empty`.

- [ ] **Step 2: Run the renderer tests and verify red**

Run: `node --test tests/readers/render-markdown.test.mjs`

Expected: FAIL because `src/readers/render-markdown.mjs` is absent.

- [ ] **Step 3: Implement the minimal renderer**

Implement `escapeHtml`, `renderInline`, and `renderMarkdown`. Escape `& < > " '` before any inline transformation. Accept links only when parsed URL protocols are `https:` or `http:`, or the target begins with `#`, `/`, `./`, or `../`; otherwise render only escaped link text. Parse fenced code before ordinary blocks, then headings, blockquotes, contiguous list items, and paragraphs. Do not pass raw HTML through and do not create `<script>`, inline handlers, style attributes, embeds, images, or iframes.

- [ ] **Step 4: Run focused tests and verify green**

Run: `node --test tests/readers/render-markdown.test.mjs`

Expected: all renderer tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/readers/render-markdown.mjs tests/readers/render-markdown.test.mjs
git commit -m "feat: render safe Chinese article markdown"
```

### Task 2: Create the self-contained editorial reader template

**Files:**
- Create: `tests/readers/chinese-reader-template.test.mjs`
- Create: `src/readers/chinese-reader-template.mjs`

- [ ] **Step 1: Write failing template tests**

Build a fixture with Chinese title, English title, publisher, date, category, priority, Chinese summary, source URL, and rendered body. Assert exactly one `<main>`, no `<script>`, no external stylesheet/font/image requests, two `返回知识库` links, two safe `查看官网原文` links, a visible local-translation notice, and CSS rules for 390px, `prefers-reduced-motion`, print, `max-width: 760px`, and readable CJK line height.

Assert omitted optional date/category/priority/English title produce no empty label, while missing Chinese title, source URL, or body throws an error containing the article ID.

- [ ] **Step 2: Run the template tests and verify red**

Run: `node --test tests/readers/chinese-reader-template.test.mjs`

Expected: FAIL because the template module is absent.

- [ ] **Step 3: Implement the template**

Export `renderChineseReader({ article, bodyHtml, returnHref })`. Use a warm-paper canvas, deep-ink text, teal navigation, terracotta translation notice, one centered reading column, serif title/body hierarchy, quiet metadata row, styled lists/quotes/code, and sticky-free navigation. Insert metadata through `escapeHtml`; accept only `https:`/`http:` source URLs. `returnHref` defaults to `/` and is escaped. Include no JavaScript.

- [ ] **Step 4: Run template and renderer tests**

Run: `node --test tests/readers/render-markdown.test.mjs tests/readers/chinese-reader-template.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/readers/chinese-reader-template.mjs tests/readers/chinese-reader-template.test.mjs
git commit -m "feat: add self-contained Chinese reader template"
```

### Task 3: Generate and validate article readers atomically

**Files:**
- Create: `tests/readers/generate-chinese-html.test.mjs`
- Create: `src/readers/generate-chinese-html.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing batch tests**

Create a temporary archive with one `metadata.json` and a structurally rich `中文全文.md`, plus a one-record ledger. Assert `generateChineseReaders` creates `中文全文.html`, returns `{ expected: 1, generated: 1, verified: 1 }`, produces identical bytes on a second run, and includes the exact title, publisher, source URL, list, and escaped raw tag. Add failures for missing Markdown, blank Markdown, missing metadata, missing ledger record, missing Chinese title, and count mismatch; assert no HTML is left for a failed article.

- [ ] **Step 2: Run the generator test and verify red**

Run: `node --test tests/readers/generate-chinese-html.test.mjs`

Expected: FAIL because the generator module is absent.

- [ ] **Step 3: Implement batch generation**

Export:

- `collectArchivedArticles(archiveRoot)` returning metadata path, directory, metadata, and Markdown path;
- `generateChineseReader({ archived, ledgerRecord, archiveRoot })` rendering one deterministic document and atomically renaming `中文全文.html.tmp`;
- `validateChineseReader(filePath, article)` checking nonempty body, Chinese title, publisher, official URL, UTF-8 declaration, and absence of executable tags/handlers;
- `generateChineseReaders({ ledgerPath, archiveRoot, expected })` rejecting count/ID mismatches before writing, then generating and validating every record;
- `verifyChineseReaders({ ledgerPath, archiveRoot, expected })` validating without rewriting.

The CLI must support `--ledger`, `--archive`, `--expected`, and `--verify`; print JSON summary and exit non-zero on any failure. Use normalized `coreView.zh` as the summary when present, otherwise the first meaningful translated paragraph after the title.

- [ ] **Step 4: Add scripts**

Add:

```json
"readers": "node src/readers/generate-chinese-html.mjs --ledger work/normalized/articles.json --archive work/archive --expected 418",
"verify:readers": "node src/readers/generate-chinese-html.mjs --ledger work/normalized/articles.json --archive work/archive --expected 418 --verify"
```

- [ ] **Step 5: Run focused tests and verify green**

Run: `node --test tests/readers/*.test.mjs`

Expected: all reader tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/readers tests/readers package.json
git commit -m "feat: generate deterministic Chinese HTML readers"
```

### Task 4: Separate human-readable HTML paths from search Markdown paths

**Files:**
- Modify: `tests/knowledge/build-corpus.test.mjs`
- Modify: `src/knowledge/build-corpus.mjs`
- Modify: `tests/archive-audit.test.mjs`
- Modify: `src/audit/archive-audit.mjs`

- [ ] **Step 1: Write failing path and audit tests**

Update the corpus fixture expectation:

```js
assert.equal(article.localPaths.chinese, '/archive/中文全文.html');
assert.equal(article.localPaths.chineseMarkdown, '/archive/中文全文.md');
assert.equal(article.chunks[0].localPaths.chinese, '/archive/中文全文.html');
assert.equal(article.chunks[0].localPaths.chineseMarkdown, '/archive/中文全文.md');
```

Add an archive audit test with `verifyReaders: true`: a valid HTML reader passes; a missing reader makes the result invalid with `Missing or empty 中文全文.html`.

- [ ] **Step 2: Run focused tests and verify red**

Run: `node --test tests/knowledge/build-corpus.test.mjs tests/archive-audit.test.mjs`

Expected: FAIL because the current human path ends in Markdown and the audit does not inspect HTML.

- [ ] **Step 3: Update corpus loading without changing chunk input**

In `loadArchiveRecords`, keep reading `中文全文.md` into `translationMarkdown`, but construct:

```js
localPaths: {
  chinese: `/archive/${relativeDirectory}/中文全文.html`,
  chineseMarkdown: `/archive/${relativeDirectory}/中文全文.md`,
  original: `/archive/${relativeDirectory}/英文原文.md`,
  snapshot: `/archive/${relativeDirectory}/原始网页.html`,
}
```

No reader HTML may enter `splitMarkdown` or chunk content.

- [ ] **Step 4: Extend the audit**

Add `verifyReaders = false` to the library API and `--verify-readers` to the CLI. When enabled, require nonempty `中文全文.html`, call `validateChineseReader`, and report `verifiedReaders`. Keep existing fixture behavior unchanged unless the option is enabled.

- [ ] **Step 5: Run focused and existing corpus tests**

Run: `node --test tests/knowledge/*.test.mjs tests/archive-audit.test.mjs tests/web/static-contract.test.mjs`

Expected: all tests PASS; chunk content and count logic are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/knowledge/build-corpus.mjs tests/knowledge/build-corpus.test.mjs src/audit/archive-audit.mjs tests/archive-audit.test.mjs
git commit -m "feat: route Chinese reading links to HTML"
```

### Task 5: Generate 418 readers, rebuild indexes, and deploy

**Files:**
- Generate: `work/archive/**/中文全文.html` (exactly 418 files)
- Modify: `work/knowledge/corpus.json`
- Modify: `web/data/articles.js`
- Modify: `README.md`
- Modify: `delivery-template/AI行业报告知识库/使用说明.md`
- Copy after verification: generated HTML and rebuilt web/index files to `/Users/rita/Desktop/AI行业报告/`.

- [ ] **Step 1: Generate all readers**

Run: `npm run readers`

Expected: `{ "expected": 418, "generated": 418, "verified": 418 }` and exactly 418 files named `中文全文.html`.

- [ ] **Step 2: Run strict reader and translation audit**

Run: `npm run verify:readers`

Expected: 418 verified, zero errors.

Run: `node src/audit/archive-audit.mjs --root work/archive --expected 418 --verify-readers --out work/archive-audit.json`

Expected: 418 translations and 418 readers verified; `valid: true`.

- [ ] **Step 3: Rebuild corpus and browser index**

Run: `npm run corpus`

Expected: 418 articles; search chunk count remains 3,587 unless legitimate article-content updates from the separate source-refresh task have already landed. Every `localPaths.chinese` ends in `.html`; every `localPaths.chineseMarkdown` ends in `.md`.

- [ ] **Step 4: Update user-facing documentation**

Explain that “查看中文全文” opens formatted HTML, Markdown remains the full translation source used by local search, and regeneration never retranslates or deletes Markdown.

- [ ] **Step 5: Run complete regression**

Run: `npm test`

Expected: every archive, translation, corpus, server, web, radar, and reader test PASS.

- [ ] **Step 6: Perform five-publisher visual sampling**

Start the existing local server and open one generated reader each for BCG, Anthropic, McKinsey, MIT, and Bain. At normal and 390px widths verify title/meta/summary/body hierarchy, long headings, lists, links, code/quotes where present, no horizontal overflow, safe external links, correct return navigation, and zero console errors. Print-preview one long article and confirm readable page breaks.

- [ ] **Step 7: Sync only after all checks pass**

Use `rsync -a` to copy verified `work/archive/` HTML files, rebuilt corpus/browser index, updated web files, and documentation into `/Users/rita/Desktop/AI行业报告/AI行业报告知识库` and its parent archive layout. Do not delete or rewrite any `中文全文.md`, `.env.local`, source snapshot, or user file.

- [ ] **Step 8: Verify desktop parity**

Compare counts and SHA-256 hashes for all 418 HTML files between work archive and desktop archive. Request five delivered HTML URLs through the running desktop server and confirm `content-type: text/html; charset=utf-8` and HTTP 200.

- [ ] **Step 9: Commit generated and delivery artifacts**

```bash
git add src tests package.json README.md work/archive work/knowledge/corpus.json web/data/articles.js delivery-template
git commit -m "feat: deliver 418 Chinese HTML article readers"
```

## Self-review record

- Spec coverage: safe Markdown conversion, one-column editorial layout, metadata and summary, two navigation locations, official source links, offline self-containment, deterministic generation, separate HTML/Markdown paths, all-or-nothing count validation, corpus preservation, five-source visual sampling, and desktop parity each have a concrete implementation and verification step.
- Placeholder scan: no deferred implementation, omitted field, or “same as above” instruction remains; every task names exact exports, paths, commands, failure cases, and expected output.
- Type consistency: `localPaths.chinese` always denotes HTML, `localPaths.chineseMarkdown` always denotes Markdown, `translationMarkdown` remains the chunk input, and `verifiedReaders` is used consistently by generation and audit.
- Scope boundary: translation text is not rewritten, DeepSeek is not called, and the separate five-source July–August refresh can add articles before the final generation count is intentionally updated.
