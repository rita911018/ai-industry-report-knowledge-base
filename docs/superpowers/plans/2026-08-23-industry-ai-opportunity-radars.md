# Industry AI Opportunity Radars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an offline “AI机会雷达” section to the existing AI report knowledge base, with a directory and full-screen Legal and Human Resources decision radars.

**Architecture:** The main knowledge page links to a static radar directory. Legal and HR each provide one browser-global, deeply frozen data object; a shared renderer builds the matrix, filters, expandable scenarios, pilots, controls, KPI groups, calibrations, and sources without network access. A Node validator evaluates the browser data files in a sandbox and blocks release if either data contract or a referenced local source is invalid.

**Tech Stack:** Semantic HTML, CSS, browser JavaScript without a framework, Node.js `node:test`, JSDOM, Node `vm`, existing local HTTP server.

---

## File map

- Create `web/radars/index.html`: radar directory with exactly two launch entries.
- Create `web/radars/legal.html`: accessible Legal radar shell and no-JavaScript summary.
- Create `web/radars/hr.html`: accessible HR radar shell and no-JavaScript summary.
- Create `web/radars/radar.css`: shared responsive, print, focus, matrix, portfolio, and governance styles.
- Create `web/radars/radar.js`: shared DOM renderer and interaction controller.
- Create `web/radars/data/legal.js`: all 12 Legal scenarios, three pilots, six gates, five KPI groups, five source calibrations, and 16 sources.
- Create `web/radars/data/hr.js`: all 12 HR scenarios and matching decision support content.
- Create `web/radars/validate-data.mjs`: load, validate, and freeze-check both data files.
- Create `tests/radars/data-contract.test.mjs`: deterministic data and source-integrity tests.
- Create `tests/radars/interaction.test.mjs`: JSDOM tests for filter, expand, matrix jump, empty state, and missing data.
- Create `tests/radars/static-pages.test.mjs`: navigation, accessibility, offline, and page-shell tests.
- Modify `web/index.html`: add the top-level `AI机会雷达` Tab.
- Modify `web/styles.css`: add responsive masthead navigation without changing the knowledge workspace layout.
- Modify `package.json`: add `validate:radars` and include it in the release verification command.
- Modify `README.md`: document the offline radars and their URLs.

### Task 1: Define and enforce the radar data contract

**Files:**
- Create: `web/radars/validate-data.mjs`
- Create: `tests/radars/data-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing contract tests**

Create `tests/radars/data-contract.test.mjs` with tests that import `loadRadarFile` and `validateRadarData`, load both domain files when present, and assert the shared invariants:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRadarFile, validateRadarData } from '../../web/radars/validate-data.mjs';

const radarRoot = fileURLToPath(new URL('../../web/radars/', import.meta.url));

test('validator rejects an incomplete radar', () => {
  assert.throws(() => validateRadarData({ id: 'broken' }, { radarRoot }), /title/);
});

for (const domain of ['legal', 'hr']) {
  test(`${domain} radar satisfies the shared contract`, async () => {
    const data = await loadRadarFile(`${radarRoot}/data/${domain}.js`);
    const result = validateRadarData(data, { radarRoot });
    assert.deepEqual(result, { id: domain, scenarios: 12, p0: 3, pilots: 3, gates: 6, kpis: 5, calibrations: 5 });
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/radars/data-contract.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `web/radars/validate-data.mjs`.

- [ ] **Step 3: Implement the validator**

Implement three named exports in `web/radars/validate-data.mjs`: `loadRadarFile(filePath)` evaluates only the data assignment in a Node `vm` context and returns `OPPORTUNITY_RADAR_DATA`; `validateRadarData(data, { radarRoot, archiveRoot })` throws one error containing every contract violation and otherwise returns the count summary; `validateRadarCollection(radars, options)` additionally rejects duplicate domain, scenario, and source IDs across the supplied collection.

The validator must enforce, without coercion:

- non-empty `id`, `title`, `eyebrow`, `updatedAt`, `coreJudgment`, and `goal90Days`;
- `scenarioCount === scenarios.length === 12`, `p0Count === 3`, and `horizonDays === 90`;
- every scenario has a unique `id`, two-digit `number`, title, `P0`–`P3` priority, category, `value` and `feasibility` in `[1,5]`, coordinates in `[0,100]`, and non-empty `problem`, `aiRole`, `valueCase`, `feasibilityCase`, `risk`, `humanOwner`, and `evidenceIds`;
- each evidence ID resolves to a source;
- exactly three pilots, six governance gates, five KPI groups, and five calibrations whose publishers are exactly `BCG`, `Anthropic`, `McKinsey`, `MIT Sloan`, and `Bain`;
- every source has a unique ID, title, publisher, `https:` official URL or `/archive/` local URL, evidence type, and limitation;
- local source paths resolve inside the configured archive root and exist;
- `legal` has exactly 16 sources;
- `hr` scenario `hr-12` contains both `禁止` and `具名人员` in its human decision boundary.

Use `node:vm` with a context containing only a stub `window`; do not import or execute arbitrary page scripts. When run directly, validate `data/legal.js` and `data/hr.js`, print a one-line count summary, and set a non-zero exit code on any violation.

- [ ] **Step 4: Add the validation command**

Add to `package.json`:

```json
"validate:radars": "node web/radars/validate-data.mjs"
```

- [ ] **Step 5: Run the focused test and preserve the expected data-file failure**

Run: `node --test tests/radars/data-contract.test.mjs`

Expected: the malformed-data test passes; Legal and HR tests fail because their data files do not exist yet.

- [ ] **Step 6: Commit the contract**

```bash
git add package.json web/radars/validate-data.mjs tests/radars/data-contract.test.mjs
git commit -m "test: define opportunity radar data contract"
```

### Task 2: Migrate the complete Legal radar data

**Files:**
- Create: `web/radars/data/legal.js`
- Modify: `tests/radars/data-contract.test.mjs`

- [ ] **Step 1: Add Legal-specific failing assertions**

Add assertions for the exact scenario sequence and scores:

```js
const expectedLegal = [
  ['标准合同审查、生成与红线比对', 'P0', 5, 5],
  ['法务统一入口、自动分流与知识问答', 'P0', 4.5, 5],
  ['存量合同搜索、条款抽取与履约预警', 'P0', 5, 4],
  ['法律检索、法规问答与文书初稿', 'P1', 4, 4.5],
  ['隐私权请求、数据映射与合规工作流', 'P1', 4.5, 4],
  ['外部律师账单审核与律所选择', 'P1', 4, 4.5],
  ['诉讼取证、内部调查与批量文档审阅', 'P2', 5, 3.5],
  ['法规变化监测、适用性判断与控制映射', 'P2', 4.5, 3.5],
  ['并购尽调与交易文件分析', 'P2', 4.5, 3.5],
  ['知识产权组合、申请与期限管理', 'P2', 4, 3.5],
  ['诉讼策略、结果预测与谈判辅助', 'P3', 4, 3],
  ['AI 自主谈判、接受条款或签署', 'P3', 4.5, 1.5],
];
assert.deepEqual(legal.scenarios.map(({ title, priority, value, feasibility }) => [title, priority, value, feasibility]), expectedLegal);
assert.equal(legal.sources.length, 16);
```

Also assert the 16 official URLs copied from the attachment in source order, beginning with Luminance/Trench Group and ending with Litera/Cvent Due Diligence.

- [ ] **Step 2: Run the Legal test to verify it fails**

Run: `node --test --test-name-pattern="legal" tests/radars/data-contract.test.mjs`

Expected: FAIL because `web/radars/data/legal.js` is absent.

- [ ] **Step 3: Create the complete Legal data file**

Declare one complete `legalRadar` object and assign it without fetching. Use this exact freezing and assignment wrapper after the object declaration:

```js
(() => {
  const deepFreeze = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
    return value;
  };
  window.OPPORTUNITY_RADAR_DATA = deepFreeze(legalRadar);
})();
```

The `legalRadar` declaration must contain the identity and judgment values shown in the approved design, plus the complete content extracted from `/Users/rita/Downloads/企业法务AI应用场景决策雷达.html`. Preserve all numbers, priorities, named examples, published result claims, source URLs, three pilots, six gates, five KPI groups, five calibrations, and the evidence boundary. Map each scenario to one or more `evidenceIds` from the 16-source list. The delivered file must contain no omission marker or abbreviated array.

- [ ] **Step 4: Validate Legal data**

Run: `node --test --test-name-pattern="legal" tests/radars/data-contract.test.mjs`

Expected: PASS for every Legal test.

- [ ] **Step 5: Commit Legal data**

```bash
git add web/radars/data/legal.js tests/radars/data-contract.test.mjs
git commit -m "feat: migrate complete legal opportunity radar"
```

### Task 3: Build the Human Resources radar data

**Files:**
- Create: `web/radars/data/hr.js`
- Modify: `tests/radars/data-contract.test.mjs`

- [ ] **Step 1: Add HR-specific failing assertions**

Assert the exact title, priority, value, feasibility, and decision boundary sequence from the approved design. The first and last records must be:

```js
assert.deepEqual(
  [hr.scenarios[0].id, hr.scenarios[0].title, hr.scenarios[0].priority, hr.scenarios[0].value, hr.scenarios[0].feasibility],
  ['hr-01', 'HR 政策问答、统一入口与服务分流', 'P0', 5, 5],
);
assert.deepEqual(
  [hr.scenarios[11].id, hr.scenarios[11].title, hr.scenarios[11].priority, hr.scenarios[11].value, hr.scenarios[11].feasibility],
  ['hr-12', 'AI 自主录用、晋升、调薪或解雇', 'P3', 4.5, 1],
);
assert.match(hr.scenarios[11].humanOwner, /禁止.*自主.*具名人员/);
assert.equal(new Set(hr.scenarios.flatMap((item) => item.evidenceIds)).size >= 10, true);
```

- [ ] **Step 2: Run the HR test to verify it fails**

Run: `node --test --test-name-pattern="hr" tests/radars/data-contract.test.mjs`

Expected: FAIL because `web/radars/data/hr.js` is absent.

- [ ] **Step 3: Create complete HR decision content**

Use the same `deepFreeze` IIFE as Legal. Populate exactly the 12 approved scenarios and:

- three pilots: HR service, skills mapping, and personalized learning;
- six gates: purpose limitation/data minimization, adverse-impact testing, named human decisions and appeals, policy-version citations, least privilege/audit/model versioning, and fixed bilingual regression sets;
- five KPI groups: efficiency, quality, talent outcomes, adoption/experience, and risk/fairness;
- five publisher calibrations, each clearly separating source fact, management inference, and recommended target state;
- at least the ten approved evidence anchors in the design spec, preferring `/archive/` links when the referenced article ID exists in `web/data/articles.js`, otherwise using its official `https:` URL;
- a limitation for every source, including supplier self-report, correlation/causality, sector transfer, or forward-looking inference as appropriate.

Do not describe an AI model as the decision owner for recruitment, promotion, compensation, discipline, or termination.

- [ ] **Step 4: Validate both radar datasets**

Run: `npm run validate:radars`

Expected: output reports `legal: 12 scenarios` and `hr: 12 scenarios`, then exits 0.

Run: `node --test tests/radars/data-contract.test.mjs`

Expected: all contract, Legal, and HR assertions PASS.

- [ ] **Step 5: Commit HR data**

```bash
git add web/radars/data/hr.js tests/radars/data-contract.test.mjs
git commit -m "feat: add human resources opportunity radar data"
```

### Task 4: Implement the shared accessible renderer

**Files:**
- Create: `web/radars/radar.js`
- Create: `tests/radars/interaction.test.mjs`

- [ ] **Step 1: Write failing interaction tests**

Create a minimal JSDOM shell with `#radar-app`, import the renderer after assigning fixture data, and assert:

```js
assert.equal(document.querySelectorAll('.matrix-point').length, 12);
assert.equal(document.querySelectorAll('.scenario').length, 12);
assert.equal(document.querySelectorAll('.pilot').length, 3);
assert.equal(document.querySelectorAll('.gate-item').length, 6);
assert.equal(document.querySelectorAll('.kpi-group').length, 5);
assert.equal(document.querySelectorAll('.source-card').length, fixture.sources.length);
```

Then click the `P0` filter and assert only three scenario cards remain visible and `#scenario-result-count` says `3 个场景`; click one scenario header and assert `aria-expanded="true"`; click its matrix point and assert the same scenario is expanded and receives focus; choose a category that has no match under the current priority and assert the empty-state reset button is visible. In a second DOM without data, assert `#radar-error` says `雷达数据未加载`.

- [ ] **Step 2: Run the interaction tests to verify they fail**

Run: `node --test tests/radars/interaction.test.mjs`

Expected: FAIL because `web/radars/radar.js` is absent.

- [ ] **Step 3: Implement DOM-safe rendering**

Export browser/global-compatible functions named `createElement`, `renderRadar`, `filterScenarios`, `toggleScenario`, `activateMatrixPoint`, and `initRadar`. `createElement` must accept `(tag, { className, text, attrs } = {}, children = [])`; `renderRadar` accepts `(root, data)` and returns controller state; `filterScenarios` accepts `(state, { priority, category })`; `toggleScenario` accepts `(card, expanded)`; `activateMatrixPoint` accepts `(state, scenarioId)`; and `initRadar` accepts `(documentRef = document)`.

Required behavior:

- all user-visible values enter the DOM through `textContent`;
- matrix points are real buttons with title, priority, value, and feasibility in the accessible name;
- priority and category controls use buttons with `aria-pressed`;
- each scenario header controls one detail region with stable IDs and `aria-expanded`;
- filtering updates result count and a resettable empty state;
- clicking a matrix point reveals and focuses its scenario;
- official sources open with `target="_blank" rel="noreferrer"`; local sources stay in the same tab unless explicitly marked;
- no runtime request is made and no DeepSeek state is read.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/radars/interaction.test.mjs`

Expected: all interaction tests PASS.

- [ ] **Step 5: Commit the shared renderer**

```bash
git add web/radars/radar.js tests/radars/interaction.test.mjs
git commit -m "feat: render accessible opportunity radars"
```

### Task 5: Create the radar directory and domain page shells

**Files:**
- Create: `web/radars/index.html`
- Create: `web/radars/legal.html`
- Create: `web/radars/hr.html`
- Create: `web/radars/radar.css`
- Create: `tests/radars/static-pages.test.mjs`

- [ ] **Step 1: Write failing static page tests**

Assert that the directory has one `<main>`, exactly two `.radar-directory-link` anchors, and links to `legal.html` and `hr.html`. For each domain page assert:

```js
assert.match(html, /id="radar-app"/);
assert.match(html, /id="radar-error"[^>]+aria-live="assertive"/);
assert.match(html, /返回雷达目录/);
assert.match(html, /返回知识库/);
assert.match(html, new RegExp(`data/${domain}\\.js`));
assert.match(html, /radar\.js/);
assert.match(html, /<noscript>[\s\S]+核心判断[\s\S]+场景[\s\S]+90 天[\s\S]+来源/);
assert.doesNotMatch(html, /iframe|DEEPSEEK|api\/ask/i);
```

Also assert CSS contains `:focus-visible`, `@media (max-width: 390px)`, `@media (max-width: 768px)`, `prefers-reduced-motion`, and `@media print` with interactive controls hidden and `.scenario-detail` displayed.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/radars/static-pages.test.mjs`

Expected: FAIL because the directory and shells are absent.

- [ ] **Step 3: Build the directory**

Create a semantic page with:

- the shared knowledge-base brand and a `返回知识库` link to `../index.html`;
- an editorial title `AI机会雷达` and explanation that these are prebuilt decision tools, not autonomous decisions;
- exactly two large directory links showing domain, 12 scenarios, three P0 opportunities, updated date, and core judgment;
- a future-domain note naming retail, supply chain, and finance without creating inactive fake buttons.

- [ ] **Step 4: Build the two domain shells**

Each shell must load `radar.css`, its domain data script, then `radar.js`, in that order. Add static masthead navigation, `#radar-error`, `#radar-app`, and a meaningful `<noscript>` fallback that lists the 12 scenario titles, the 90-day pilot headings, six governance headings, and source titles. Legal fallback values must match the attachment; HR fallback values must match the approved design.

- [ ] **Step 5: Implement the shared visual system**

Use deep ink green, warm paper, muted sage, and signal green. Use editorial serif headings and system sans-serif body type; avoid gradients. Implement:

- full-height but content-safe hero;
- value × feasibility matrix with labelled axes and non-overlapping buttons;
- filter controls and editorial scenario rows;
- alternating light/dark sections for portfolio, roadmap, governance, and sources;
- keyboard focus, 44px minimum controls, reduced motion, 390px and 768px layouts without horizontal overflow;
- print mode that expands all details, hides buttons, removes dark backgrounds, keeps URLs readable, and avoids splitting a scenario card.

- [ ] **Step 6: Verify static pages and renderer together**

Run: `node --test tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit the page experience**

```bash
git add web/radars/index.html web/radars/legal.html web/radars/hr.html web/radars/radar.css tests/radars/static-pages.test.mjs
git commit -m "feat: add legal and HR radar pages"
```

### Task 6: Add the top-level knowledge-base Tab

**Files:**
- Modify: `web/index.html`
- Modify: `web/styles.css`
- Modify: `tests/web/static-contract.test.mjs`
- Modify: `README.md`

- [ ] **Step 1: Write the failing navigation contract**

Extend `tests/web/static-contract.test.mjs`:

```js
assert.match(html, /<nav[^>]+aria-label="主导航"/);
assert.match(html, /href="radars\/"[^>]*>AI机会雷达<\/a>/);
```

- [ ] **Step 2: Run the navigation test to verify it fails**

Run: `node --test tests/web/static-contract.test.mjs`

Expected: FAIL because the top-level Tab is absent.

- [ ] **Step 3: Add semantic masthead navigation**

Wrap the product navigation in `<nav aria-label="主导航">` with two visible items: the current `知识库` item pointing to `#top` and `AI机会雷达` pointing to `radars/`. Mark the knowledge item with `aria-current="page"`. Do not move or remove article counts or DeepSeek status.

- [ ] **Step 4: Style navigation at desktop and mobile widths**

Add `.main-nav`, `.main-nav a`, hover, focus, and `[aria-current]` rules. At 390px, keep both labels visible, allow masthead wrapping, and move counts/status to their own compact row without overlapping the brand.

- [ ] **Step 5: Document the feature**

Add README URLs:

```markdown
- 雷达目录：<http://127.0.0.1:4318/radars/>
- 企业法务：<http://127.0.0.1:4318/radars/legal.html>
- 人力资源：<http://127.0.0.1:4318/radars/hr.html>
```

State explicitly that radars work without an API key and do not make autonomous personnel or legal decisions.

- [ ] **Step 6: Run the navigation and static suites**

Run: `node --test tests/web/static-contract.test.mjs tests/radars/static-pages.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit the top-level entry**

```bash
git add web/index.html web/styles.css tests/web/static-contract.test.mjs README.md
git commit -m "feat: link opportunity radars from knowledge base"
```

### Task 7: Release verification and desktop delivery

**Files:**
- Modify only if verification exposes a defect: files introduced in Tasks 1–6.
- Copy after verification: `web/` into the desktop delivery’s `AI行业报告知识库/web/`.

- [ ] **Step 1: Run deterministic validation**

Run: `npm run validate:radars`

Expected: both domains report 12 scenarios, three P0 items, three pilots, six gates, five KPI groups, and five calibrations; exit 0.

- [ ] **Step 2: Run the complete regression suite**

Run: `npm test`

Expected: all existing archive, translation, corpus, server, web, and new radar tests PASS.

- [ ] **Step 3: Start the existing local server without an API key**

Run: `npm start`

Expected: `AI 行业报告知识库：http://127.0.0.1:4318`; the knowledge library and both radars load while API status remains `DeepSeek 待配置`.

- [ ] **Step 4: Perform visual and interaction QA**

At desktop width and 390px width, check `/`, `/radars/`, `/radars/legal.html`, and `/radars/hr.html` for horizontal overflow, clipped labels, focus visibility, readable matrix points, and complete source lists. Verify keyboard-only navigation, P0 and category filtering, no-result reset, scenario expansion, matrix-to-card jump, return links, browser Back, reduced-motion behavior, and print preview with all details expanded.

- [ ] **Step 5: Verify content integrity against the approved inputs**

Compare Legal data with `/Users/rita/Downloads/企业法务AI应用场景决策雷达.html`: 12 titles, priorities, scores, three pilots, six gates, five KPI groups, five calibrations, evidence boundary, and 16 URLs must match. Compare HR data with `docs/superpowers/specs/2026-08-23-industry-ai-opportunity-radars-design.md`: all 12 decision boundaries and the explicit prohibition on autonomous high-impact employment decisions must match.

- [ ] **Step 6: Sync the verified web files into the delivery template and desktop copy**

First copy the repository `web/` tree into `delivery-template/AI行业报告知识库/web/`. Then use `rsync -a` to update `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/` without deleting any archive, environment, or user file. Run the same `validate:radars` command against the delivered data files or compare SHA-256 hashes for every file under `web/radars/`.

- [ ] **Step 7: Smoke-test the delivered launcher**

Launch the desktop copy, open the three radar routes, and verify a missing DeepSeek key affects only Q&A. Confirm official links point to the intended URLs and local archive links return HTTP 200.

- [ ] **Step 8: Commit any release-only corrections**

```bash
git add web tests README.md package.json delivery-template/AI行业报告知识库/web
git commit -m "test: verify opportunity radar delivery"
```

## Self-review record

- Spec coverage: navigation, two domains, all shared sections, 12/3/6/5/5 counts, attachment fidelity, HR prohibitions, offline behavior, accessibility, responsive, print, error states, sources, and desktop parity each map to a task and an automated or manual check.
- Placeholder scan: no `TBD`, `TODO`, omission marker, or “same as above” instruction remains. The Legal migration step names its authoritative input and every required preserved content class; contract and integrity tests reject omissions.
- Type consistency: `OPPORTUNITY_RADAR_DATA`, scenario field names, evidence IDs, section names, validator summaries, renderer selectors, and route names are consistent across Tasks 1–7.
- Scope boundary: this plan does not implement the separate Chinese HTML article-reader generation or the July–August five-source refresh; those receive their own plans and verification so each subsystem remains releasable on its own.
