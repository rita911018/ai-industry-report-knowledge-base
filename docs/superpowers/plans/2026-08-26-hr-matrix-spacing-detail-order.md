# HR Matrix Spacing and Detail Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make radar matrix labels visually lighter and non-overlapping, and place company cases before evidence anchors in every live and exported scenario detail.

**Architecture:** Keep the existing scenario coordinates and DOM structure. Use a bounded fixed-width point label with lightweight default styling and mobile overrides; change only the presentation order of the existing company/evidence renderers. Lock both behaviors with CSS-contract, DOM-order, and standalone-export tests before changing production code.

**Tech Stack:** Vanilla JavaScript, CSS, Node test runner, JSDOM.

---

### Task 1: Reorder all five decision blocks

**Files:**
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.js`

- [ ] **Step 1: Write the failing order test**

Add a helper and a focused test to `tests/radars/interaction.test.mjs`:

```js
function decisionHeadings(root) {
  return [...root.querySelectorAll('h4')].map((heading) => heading.textContent);
}

test('company cases precede evidence anchors in live and exported details', async () => {
  const legal = await loadRadarFile(fileURLToPath(legalPath));
  const dom = await setup(legal);
  const { document } = dom.window;
  const expected = ['业务痛点', 'AI 价值｜可以做什么', '主要风险', '哪些公司做过', '证据锚点'];

  document.querySelector('[data-scenario-target="legal-07"]').click();
  assert.deepEqual(decisionHeadings(document.querySelector('.matrix-inspector-details')), expected);

  document.querySelector('#legal-07 .scenario-header').click();
  assert.deepEqual(decisionHeadings(document.querySelector('#legal-07 .detail-grid')), expected);

  const report = dom.window.OpportunityRadar.buildStandaloneReport(legal, new Date('2026-08-26T08:00:00+08:00'));
  const exportDom = new JSDOM(report, { runScripts: 'dangerously', pretendToBeVisual: true });
  assert.deepEqual(decisionHeadings(exportDom.window.document.querySelector('#export-inspector .five-details')), expected);
  assert.deepEqual(decisionHeadings(exportDom.window.document.querySelector('#export-legal-07 .five-details')), expected);
  exportDom.window.close();
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
node --test tests/radars/interaction.test.mjs
```

Expected: the new test fails because `证据锚点` currently appears before `哪些公司做过`.

- [ ] **Step 3: Change the live and export order**

In both `renderInspectorScenario` and `renderScenario`, use this order:

```js
detailBlock('业务痛点', scenario.problem),
detailBlock('AI 价值｜可以做什么', renderAiValue(scenario)),
detailBlock('主要风险', renderRisk(scenario), true, 'risk-detail'),
detailBlock('哪些公司做过', renderCompanyCases(scenario, data), true, 'company-detail'),
detailBlock('证据锚点', renderEvidence(scenario, data), true, 'evidence-detail'),
```

Change `exportScenarioDetails` to emit company cases before evidence:

```js
return `<div class="five-details"><section><h4>业务痛点</h4>${exportTextList(scenario.problem)}</section><section><h4>AI 价值｜可以做什么</h4>${exportTextList(scenario.aiValue)}${acceptance}</section><section><h4>主要风险</h4>${exportTextList(scenario.risk)}${handoff}</section><section><h4>哪些公司做过</h4><div class="links">${exportCompanyCases(scenario, data)}</div></section><section><h4>证据锚点</h4><div class="links">${exportEvidence(scenario, data)}</div></section></div>`;
```

- [ ] **Step 4: Run the focused test to verify GREEN**

Run:

```bash
node --test tests/radars/interaction.test.mjs
```

Expected: all interaction tests pass.

- [ ] **Step 5: Commit the detail-order change**

```bash
git add tests/radars/interaction.test.mjs web/radars/radar.js
git commit -m "fix: put company cases before evidence"
```

---

### Task 2: Make matrix labels light, bounded, and collision-free

**Files:**
- Modify: `tests/radars/static-pages.test.mjs`
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.css`
- Modify: `web/radars/radar.js`

- [ ] **Step 1: Write failing live/export style-contract tests**

Extend `shared radar styles cover focus, mobile, reduced motion, print, and readable sage` in `tests/radars/static-pages.test.mjs`:

```js
assertRuleDeclaration(css, '.matrix-point', 'left', /^clamp\(42px,\s*var\(--x\),\s*calc\(100% - 42px\)\)$/);
assertRuleDeclaration(css, '.matrix-point', 'width', /^84px$/);
assertRuleDeclaration(css, '.matrix-point', 'min-width', /^84px$/);
assertRuleDeclaration(css, '.matrix-point', 'max-width', /^84px$/);
assertRuleDeclaration(css, '.matrix-point', 'background', /^transparent$/);
assertRuleDeclaration(css, '.matrix-point', 'box-shadow', /^none$/);
assertRuleDeclaration(css, '.matrix-point.p0 .matrix-point-number', 'background', /^var\(--signal\)$/);
assertRuleDeclaration(css, '.matrix-point.p3 .matrix-point-number', 'border-style', /^dashed$/);

const compactMobile = atRuleBlock(css, '@media (max-width: 390px)');
assertRuleDeclaration(compactMobile, '.matrix-point', 'width', /^100%$/);
assertRuleDeclaration(compactMobile, '.matrix-point', 'background', /^var\(--paper-bright\)$/);
assertRuleDeclaration(compactMobile, '.matrix-point', 'border', /^1px solid var\(--ink\)$/);
```

Extend the standalone report test in `tests/radars/interaction.test.mjs`:

```js
assert.match(reportCss, /\.matrix button\{[^}]*left:clamp\(42px,var\(--x\),calc\(100% - 42px\)\)/);
assert.match(reportCss, /\.matrix button\{[^}]*width:84px[^}]*background:transparent[^}]*box-shadow:none/);
assert.match(reportCss, /\.matrix button\.p0 b\{background:var\(--signal\)\}/);
assert.match(reportCss, /\.matrix button\.p3 b\{border-style:dashed\}/);
assert.match(reportCss, /@media\(max-width:760px\)\{[^}]*\.matrix\{[^}]*display:grid[^}]*grid-template-columns:1fr 1fr/);
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
node --test tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs
```

Expected: the new live and export matrix-style assertions fail against the current card styling.

- [ ] **Step 3: Implement the lightweight live matrix labels**

Replace the desktop `.matrix-point` styling in `web/radars/radar.css` with the following behavior:

```css
.matrix-point {
  position: absolute;
  left: clamp(42px, var(--x), calc(100% - 42px));
  top: var(--y);
  width: 84px;
  min-width: 84px;
  max-width: 84px;
  min-height: 40px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 4px;
  align-items: center;
  padding: 3px 4px;
  transform: translate(-50%, -50%);
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  box-shadow: none;
  cursor: pointer;
  transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
}
.matrix-point-number { min-height: 24px; background: var(--paper-bright); }
.matrix-point-title { font-size: 9.5px; font-weight: 780; line-height: 1.15; }
.matrix-point.p0 { background: transparent; }
.matrix-point.p0 .matrix-point-number { background: var(--signal); }
.matrix-point.p3 { border-style: solid; }
.matrix-point.p3 .matrix-point-number { border-style: dashed; }
```

Keep the current hover/focus/selected dark fill and outline. In the `@media (max-width: 390px)` block, explicitly restore compact cards:

```css
.matrix-point {
  position: static;
  width: 100%;
  min-width: 0;
  max-width: none;
  min-height: 46px;
  padding: 6px;
  transform: none;
  border: 1px solid var(--ink);
  background: var(--paper-bright);
}
.matrix-point.p0 { background: var(--signal); }
.matrix-point.p3 { border-style: dashed; }
```

- [ ] **Step 4: Mirror the styling in standalone HTML**

Give each exported matrix button its priority class:

```js
const matrixPoints = rankedScenarios.map((scenario) => `<button class="${escapeHtml(scenario.priority.toLowerCase())}" type="button" data-export-target="${escapeHtml(scenario.id)}" aria-pressed="${scenario === rankedScenarios[0] ? 'true' : 'false'}" style="--x:${scenario.matrix.x}%;top:${scenario.matrix.y}%"><b>${escapeHtml(scenario.number)}</b><span>${escapeHtml(scenario.shortTitle)}</span></button>`).join('');
```

In the standalone inline CSS, change `.matrix button` to use the same `left:clamp(...)`, `width:84px`, transparent background, transparent border, and no shadow. Add:

```css
.matrix button.p0 b{background:var(--signal)}
.matrix button.p3 b{border-style:dashed}
.matrix button:hover,.matrix button:focus-visible,.matrix button[aria-pressed=true]{z-index:3;background:var(--ink);color:var(--signal);box-shadow:0 14px 30px rgba(7,26,22,.24)}
```

Keep the existing selected outline. Add an export-only mobile rule at `max-width:760px` that turns `.matrix` into a two-column static grid and restores each button as a full-width bordered card with `position:static`, `transform:none`, and `background:var(--bright)`. This keeps standalone exports readable on phones instead of preserving absolute coordinates in a narrow viewport.

- [ ] **Step 5: Run focused and full automated verification**

Run:

```bash
node --test tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs
node web/radars/validate-data.mjs
npm test
git diff --check
```

Expected: focused tests, six-domain validation, and the full suite pass; `git diff --check` is silent.

- [ ] **Step 6: Commit the matrix styling**

```bash
git add tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs web/radars/radar.css web/radars/radar.js
git commit -m "fix: declutter radar matrix labels"
```

---

### Task 3: Deploy and visually verify the desktop product

**Files:**
- Deploy: `web/radars/radar.css`
- Deploy: `web/radars/radar.js`

- [ ] **Step 1: Sync exact production files**

```bash
rsync -a web/radars/radar.css '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/radar.css'
rsync -a web/radars/radar.js '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/radar.js'
```

- [ ] **Step 2: Verify byte identity and live service**

```bash
cmp -s web/radars/radar.css '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/radar.css'
cmp -s web/radars/radar.js '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/radar.js'
curl -fsS http://127.0.0.1:4318/radars/hr.html >/dev/null
```

Expected: both comparisons return 0 and HR returns HTTP 200.

- [ ] **Step 3: Browser acceptance**

At desktop width, measure every pair of `.matrix-point` rectangles and require zero intersections; require every rectangle to stay inside `.matrix`. Select multiple points and verify the inspector still changes and its headings use the approved order.

At 390×844, require `document.scrollWidth === 390`, 12 matrix entries, and no horizontal overflow. Generate the standalone report and verify its matrix labels, selection, and both company/evidence blocks.

- [ ] **Step 4: Final status check**

```bash
git status --short
git log -4 --oneline
```

Expected: only the pre-existing untracked `.superpowers/` and `tmp/` remain; the two implementation commits are present.
