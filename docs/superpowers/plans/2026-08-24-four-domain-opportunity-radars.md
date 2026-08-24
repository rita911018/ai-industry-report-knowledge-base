# Four Domain Opportunity Radars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish evidence-backed retail, supply-chain, finance, and marketing AI opportunity radars with 20–30 scenarios each, top-12 decision matrices, Chinese cases, and complete standalone HTML exports.

**Architecture:** Research is closed in a per-domain candidate ledger before data reaches the UI. A versioned extended radar contract separates the full scenario library from the top-12 matrix selection, and the existing shared renderer/exporter is upgraded once for all six domains. Each domain is an independently validated research package.

**Tech Stack:** Official web research, JSON/JavaScript data ledgers, Node.js validators, static HTML/CSS/JS, JSDOM, node:test.

---

### Task 1: Extend the radar contract for full libraries

**Files:**
- Modify: `web/radars/validate-data.mjs`
- Modify: `tests/radars/data-contract.test.mjs`
- Create: `tests/radars/fixtures/extended-radar.js`

- [ ] **Step 1: Write failing extended-contract tests**

```js
test('accepts 20-30 scenarios and selects at most twelve matrix-eligible ranks', async () => {
  const data = await loadRadarFile(fixturePath);
  const result = validateRadarData(data, { radarRoot });
  assert.equal(result.scenarioCount, 24);
  assert.equal(result.matrixCount, 12);
});
test('rejects missing locators, invalid ranks, and weak P0 evidence', () => {
  assert.throws(() => validateRadarData(brokenNoLocator, { radarRoot }), /sourceFacts.*locator/);
  assert.throws(() => validateRadarData(brokenRank13, { radarRoot }), /matrixRank/);
  assert.throws(() => validateRadarData(brokenP0SingleSource, { radarRoot }), /P0.*two different sources/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/radars/data-contract.test.mjs`

Expected: FAIL because the existing contract assumes the old 12-scenario structure.

- [ ] **Step 3: Implement the extended validation rules**

```js
const fullLibrary = data.scenarios.length >= 20;
if (fullLibrary && data.scenarios.length > 30) fail('Full scenario library must contain 20-30 scenarios');
const matrix = data.scenarios.filter((scenario) => Number.isInteger(scenario.matrixRank) && scenario.matrixRank <= 12);
if (matrix.length > 12 || new Set(matrix.map((scenario) => scenario.matrixRank)).size !== matrix.length) fail('matrixRank must be unique and within 1-12');
for (const scenario of data.scenarios) {
  if (!['high', 'middle', 'low'].includes(scenario.confidence?.level)) fail(`${scenario.id}.confidence`);
  if (!scenario.sourceFacts?.every((fact) => fact.text?.trim() && fact.locator?.trim() && scenario.evidenceIds.includes(fact.sourceId))) fail(`${scenario.id}.sourceFacts locator`);
  if (scenario.priority === 'P0' && new Set(scenario.evidenceIds.map((id) => sourceById.get(id)?.publisher)).size < 2) fail(`${scenario.id} P0 requires two different sources`);
}
```

Preserve compatibility for the existing 12-scenario HR and legal files while requiring the extended fields for data with `schemaVersion: '2.0'`.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/radars/data-contract.test.mjs`

Expected: contract tests pass for legacy and extended radars.

- [ ] **Step 5: Commit**

```bash
git add web/radars/validate-data.mjs tests/radars/data-contract.test.mjs tests/radars/fixtures/extended-radar.js
git commit -m "feat: validate full opportunity radar libraries"
```

### Task 2: Render top-12 matrices and complete scenario libraries

**Files:**
- Modify: `web/radars/radar.js`
- Modify: `web/radars/radar.css`
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `tests/radars/export.test.mjs`

- [ ] **Step 1: Write failing renderer/export tests**

```js
test('renders only matrixRank 1-12 in the matrix and all 24 in the library', async () => {
  const document = await renderFixture(extendedRadar);
  assert.equal(document.querySelectorAll('.matrix-point').length, 12);
  assert.equal(document.querySelectorAll('.scenario-card').length, 24);
});
test('sorts the full library and exports every scenario', async () => {
  const html = buildStandaloneReport(extendedRadar);
  assert.equal((html.match(/data-export-scenario=/g) || []).length, 24);
  assert.match(html, /完整场景库/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/radars/interaction.test.mjs tests/radars/export.test.mjs`

Expected: FAIL because the shared renderer uses the same scenario set everywhere.

- [ ] **Step 3: Implement matrix/library separation**

```js
const matrixScenarios = data.scenarios.filter((scenario) => (scenario.matrixRank ?? scenario.number) <= 12 && scenario.matrixEligible !== false).sort((a, b) => (a.matrixRank ?? a.number) - (b.matrixRank ?? b.number));
const visibleScenarios = [...data.scenarios].filter(matchesCategory).sort((a, b) => sortMode === 'score' ? b.scorecard.total - a.scorecard.total : a.number.localeCompare(b.number));
```

Add category and score sorting controls, badges for “核心矩阵”“观察”“风险边界”, and export all scenarios while preserving the existing inspector and five-detail content.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/radars/interaction.test.mjs tests/radars/export.test.mjs`

Expected: all renderer and export tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/radars/radar.js web/radars/radar.css tests/radars/interaction.test.mjs tests/radars/export.test.mjs
git commit -m "feat: support complete radar scenario libraries"
```

### Task 3: Retail evidence ledger and 24-scenario radar

**Files:**
- Create: `work/radars/2026-08-24/retail/candidates.json`
- Create: `work/radars/2026-08-24/retail/evidence.json`
- Create: `work/radars/2026-08-24/retail/scenario-ledger.json`
- Create: `work/radars/2026-08-24/retail/sources/<source-id>/原始网页.html`
- Create: `work/radars/2026-08-24/retail/sources/<source-id>/来源全文.md`
- Create when English: `work/radars/2026-08-24/retail/sources/<source-id>/中文全文.md`
- Create: `web/radars/data/retail.js`
- Create: `web/radars/retail.html`
- Create: `tests/radars/retail-data.test.mjs`

- [ ] **Step 1: Define and test the 24 candidate scenario IDs**

Use these candidates: assortment trend sensing; assortment localization; price recommendations; promotion simulation; SKU-store demand forecasting; replenishment exceptions; inventory rebalancing; shelf availability; store-task orchestration; workforce scheduling; associate copilot; customer-service copilot; product search; personalized recommendations; loyalty next-best-action; product-content generation; review/voice-of-customer analysis; return-reason analysis; payment/return fraud; shrink detection; store-network planning; e-commerce conversion; customer-promise disruption management; autonomous discriminatory pricing/biometric surveillance risk boundary.

```js
test('retail closes its source ledger and publishes a valid full library', async () => {
  assert.equal(ledger.coverage.discovered, ledger.coverage.included + ledger.coverage.excluded + ledger.coverage.failed);
  assert.equal(radar.scenarios.length, 24);
  assert.equal(radar.scenarios.filter((s) => s.matrixRank <= 12).length, 12);
  assert.ok(new Set(radar.scenarios.flatMap((s) => s.companyCases.filter((c) => c.market === '中国').map((c) => c.company))).size >= 2);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/radars/retail-data.test.mjs`

Expected: FAIL because the retail package does not exist.

- [ ] **Step 3: Research and close the candidate ledger**

Search the five local publishers first, then official company, regulator, standards, and vendor customer pages dated primarily 2025–2026. Record every URL as included/excluded/failed. For every included URL save the original HTML snapshot, extracted source text, and—when the source is English—a complete Chinese translation under `sources/<source-id>/`; archive readable source facts with locators; include at least two Chinese retail companies from official or explicitly caveated supplier sources.

- [ ] **Step 4: Build and validate the radar data/page**

Populate every scenario with 3+ pain points, 4+ AI actions, human handoff, risks, acceptance metrics, five-dimension score, rationale, prerequisite, confidence, located source facts, evidence IDs, and company cases. Select the top 12 eligible by total/evidence/date/stable ID.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/radars/retail-data.test.mjs && node web/radars/validate-data.mjs`

```bash
git add work/radars/2026-08-24/retail web/radars/data/retail.js web/radars/retail.html tests/radars/retail-data.test.mjs
git commit -m "feat: add retail AI opportunity radar"
```

### Task 4: Supply-chain evidence ledger and 24-scenario radar

**Files:**
- Create: `work/radars/2026-08-24/supply-chain/candidates.json`
- Create: `work/radars/2026-08-24/supply-chain/evidence.json`
- Create: `work/radars/2026-08-24/supply-chain/scenario-ledger.json`
- Create: `work/radars/2026-08-24/supply-chain/sources/<source-id>/原始网页.html`
- Create: `work/radars/2026-08-24/supply-chain/sources/<source-id>/来源全文.md`
- Create when English: `work/radars/2026-08-24/supply-chain/sources/<source-id>/中文全文.md`
- Create: `web/radars/data/supply-chain.js`
- Create: `web/radars/supply-chain.html`
- Create: `tests/radars/supply-chain-data.test.mjs`

- [ ] **Step 1: Write the failing supply-chain closure test**

Use these candidates: demand sensing; S&OP scenarios; safety-stock optimization; replenishment; production planning; quality inspection/root cause; predictive maintenance coordination; procurement intake; spend classification; supplier discovery; supplier risk; negotiation preparation; PO/contract exception handling; route optimization; ETA prediction; disruption control tower; warehouse slotting; picking orchestration; customs/document automation; supply-chain carbon; network design; digital-twin simulation; reverse logistics; autonomous supplier selection/ordering risk boundary.

```js
test('supply chain closes its source ledger and publishes a valid full library', async () => {
  assert.equal(ledger.coverage.discovered, ledger.coverage.included + ledger.coverage.excluded + ledger.coverage.failed);
  assert.equal(radar.scenarios.length, 24);
  assert.deepEqual(radar.scenarios.filter((scenario) => scenario.matrixRank <= 12).map((scenario) => scenario.matrixRank).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const chineseCompanies = new Set(radar.scenarios.flatMap((scenario) => scenario.companyCases.filter((item) => item.market === '中国').map((item) => item.company)));
  assert.ok(chineseCompanies.size >= 2);
});
```

- [ ] **Step 2: Run RED, research official evidence, and close coverage**

Run: `node --test tests/radars/supply-chain-data.test.mjs`

Expected before data: FAIL. Research 2025–2026 sources and at least two Chinese supply-chain cases; record older classic cases as `legacy_reference`. For every included URL save `原始网页.html`, `来源全文.md`, and a complete `中文全文.md` when the source is English.

- [ ] **Step 3: Build, validate, and commit**

Run: `node --test tests/radars/supply-chain-data.test.mjs && node web/radars/validate-data.mjs`

```bash
git add work/radars/2026-08-24/supply-chain web/radars/data/supply-chain.js web/radars/supply-chain.html tests/radars/supply-chain-data.test.mjs
git commit -m "feat: add supply chain AI opportunity radar"
```

### Task 5: Finance evidence ledger and 24-scenario radar

**Files:**
- Create: `work/radars/2026-08-24/finance/candidates.json`
- Create: `work/radars/2026-08-24/finance/evidence.json`
- Create: `work/radars/2026-08-24/finance/scenario-ledger.json`
- Create: `work/radars/2026-08-24/finance/sources/<source-id>/原始网页.html`
- Create: `work/radars/2026-08-24/finance/sources/<source-id>/来源全文.md`
- Create when English: `work/radars/2026-08-24/finance/sources/<source-id>/中文全文.md`
- Create: `web/radars/data/finance.js`
- Create: `web/radars/finance.html`
- Create: `tests/radars/finance-data.test.mjs`

- [ ] **Step 1: Write the closed-ledger/full-library test with `finance` IDs**

Use these candidates: invoice capture; expense audit; close reconciliation; journal anomaly review; reporting narratives; FP&A forecasting; scenario planning; variance analysis; finance business-partner copilot; cash forecasting; treasury/liquidity; credit/collections; revenue leakage; tax research/drafting; tax reconciliation; audit evidence; control testing; fraud detection; regulatory reporting; customer/product profitability; M&A/investment screening; working-capital optimization; master-data/account coding; autonomous postings/payments/budget decisions risk boundary.

```js
test('finance closes its source ledger and publishes a valid full library', async () => {
  assert.equal(ledger.coverage.discovered, ledger.coverage.included + ledger.coverage.excluded + ledger.coverage.failed);
  assert.equal(radar.scenarios.length, 24);
  assert.equal(radar.scenarios.filter((scenario) => Number.isInteger(scenario.matrixRank) && scenario.matrixRank <= 12).length, 12);
  assert.ok(new Set(radar.scenarios.flatMap((scenario) => scenario.companyCases.filter((item) => item.market === '中国').map((item) => item.company))).size >= 2);
  assert.ok(radar.scenarios.every((scenario) => scenario.domainBoundary === 'corporate-finance'));
});
```

- [ ] **Step 2: Run RED, research official evidence, and close coverage**

Run: `node --test tests/radars/finance-data.test.mjs`

Expected before data: FAIL. Research 2025–2026 sources and at least two Chinese finance-function cases; separate CFO-function use cases from financial-services industry products. For every included URL archive original HTML, extracted text, and complete Chinese translation when English.

- [ ] **Step 3: Build, validate, and commit**

Run: `node --test tests/radars/finance-data.test.mjs && node web/radars/validate-data.mjs`

```bash
git add work/radars/2026-08-24/finance web/radars/data/finance.js web/radars/finance.html tests/radars/finance-data.test.mjs
git commit -m "feat: add finance AI opportunity radar"
```

### Task 6: Marketing evidence ledger and 24-scenario radar

**Files:**
- Create: `work/radars/2026-08-24/marketing/candidates.json`
- Create: `work/radars/2026-08-24/marketing/evidence.json`
- Create: `work/radars/2026-08-24/marketing/scenario-ledger.json`
- Create: `work/radars/2026-08-24/marketing/sources/<source-id>/原始网页.html`
- Create: `work/radars/2026-08-24/marketing/sources/<source-id>/来源全文.md`
- Create when English: `work/radars/2026-08-24/marketing/sources/<source-id>/中文全文.md`
- Create: `web/radars/data/marketing.js`
- Create: `web/radars/marketing.html`
- Create: `tests/radars/marketing-data.test.mjs`

- [ ] **Step 1: Write the closed-ledger/full-library test with `marketing` IDs**

Use these candidates: market intelligence; social listening; consumer-research synthesis; segmentation; persona development; content briefs; copy/image generation; localization; brand consistency; campaign planning; channel mix; media planning; bidding optimization; audience targeting; next-best-action; CRM journeys; lead scoring; SEO/search discovery; conversion optimization; experimentation; attribution/MMM; influencer selection; brand safety/claims review; manipulative hyper-personalization/regulated claims risk boundary.

```js
test('marketing closes its source ledger and publishes a valid full library', async () => {
  assert.equal(ledger.coverage.discovered, ledger.coverage.included + ledger.coverage.excluded + ledger.coverage.failed);
  assert.equal(radar.scenarios.length, 24);
  assert.equal(radar.scenarios.filter((scenario) => Number.isInteger(scenario.matrixRank) && scenario.matrixRank <= 12).length, 12);
  assert.ok(new Set(radar.scenarios.flatMap((scenario) => scenario.companyCases.filter((item) => item.market === '中国').map((item) => item.company))).size >= 2);
  assert.ok(radar.scenarios.every((scenario) => scenario.companyCases.every((item) => item.measurementBasis)));
});
```

- [ ] **Step 2: Run RED, research official evidence, and close coverage**

Run: `node --test tests/radars/marketing-data.test.mjs`

Expected before data: FAIL. Research 2025–2026 sources and at least two Chinese marketing cases; distinguish vendor-reported conversion lift from independently measured incrementality. For every included URL archive original HTML, extracted text, and complete Chinese translation when English.

- [ ] **Step 3: Build, validate, and commit**

Run: `node --test tests/radars/marketing-data.test.mjs && node web/radars/validate-data.mjs`

```bash
git add work/radars/2026-08-24/marketing web/radars/data/marketing.js web/radars/marketing.html tests/radars/marketing-data.test.mjs
git commit -m "feat: add marketing AI opportunity radar"
```

### Task 7: Directory, standalone exports, and deployment verification

**Files:**
- Modify: `web/radars/index.html`
- Modify: `tests/radars/static-pages.test.mjs`
- Modify: `tests/radars/export.test.mjs`

- [ ] **Step 1: Write failing directory contracts**

```js
for (const page of ['retail.html', 'supply-chain.html', 'finance.html', 'marketing.html']) assert.match(directory, new RegExp(`href="${page}"`));
assert.match(directory, /零售/);
assert.match(directory, /供应链/);
assert.match(directory, /财务/);
assert.match(directory, /市场营销/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/radars/static-pages.test.mjs`

Expected: FAIL because the four entries are absent.

- [ ] **Step 3: Add entries and remove “future” copy**

Render six ordered directory cards with live scenario/P0 counts and links. Confirm each page's export includes every scenario, evidence URL, company case, scoring method and limitation.

- [ ] **Step 4: Run complete validation**

Run: `npm run validate:radars && npm test`

Expected: all six radars valid and zero test failures.

- [ ] **Step 5: Browser acceptance and desktop sync**

At 1440px verify 12 non-overlapping matrix labels and the full library for each new radar. At 390px verify no horizontal overflow. Export each domain and reopen the generated HTML offline. Sync `web/` and `work/radars/` to `/Users/rita/Desktop/AI行业报告/AI行业报告知识库`, restart port 4318, and verify `/radars/` plus all four new pages return HTTP 200.

- [ ] **Step 6: Commit**

```bash
git add web/radars/index.html tests/radars/static-pages.test.mjs tests/radars/export.test.mjs
git commit -m "feat: publish four new opportunity radars"
```
