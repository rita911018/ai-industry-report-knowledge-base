# HR and Legal Opportunity Radar Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both opportunity radars immediately understandable by replacing abstract scenario names, reducing each expanded scenario to five decision blocks, adding source-backed company examples, and removing the long management-framework sections.

**Architecture:** Preserve the shared static renderer and the two domain data files. Tighten the validator around a smaller scenario schema, render evidence and company cases inline from source IDs, and keep only hero, matrix, scenario portfolio, and three compact priority-start cards. The pages remain offline-capable except that evidence links open the public source in a new tab.

**Tech Stack:** Browser JavaScript, semantic HTML, CSS, Node.js `node:test`, JSDOM, Node `vm`.

---

## File map

- Modify `web/radars/data/legal.js`: approved action-oriented titles, five-field scenario schema, verified legal company cases.
- Modify `web/radars/data/hr.js`: approved action-oriented titles, five-field scenario schema, verified HR company cases.
- Modify `web/radars/validate-data.mjs`: validate the reduced schema and company-source integrity; stop requiring removed sections.
- Modify `web/radars/radar.js`: render exactly five scenario detail blocks and four page sections.
- Modify `web/radars/radar.css`: style evidence/company cards and remove obsolete section styles from the active layout.
- Modify `web/radars/legal.html` and `web/radars/hr.html`: update no-script summaries to the shorter information architecture.
- Modify `tests/radars/data-contract.test.mjs`: lock the 24 approved titles and new schema.
- Modify `tests/radars/interaction.test.mjs`: lock the five-block detail and absence of deleted sections.
- Modify `tests/radars/static-pages.test.mjs`: lock the revised fallback and page shell.

### Task 1: Lock the reduced data and UI contract with failing tests

**Files:**
- Modify: `tests/radars/data-contract.test.mjs`
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `tests/radars/static-pages.test.mjs`

- [ ] **Step 1: Replace the old title fixtures with the exact approved 24 titles**

Assert that every title begins with `用 AI` or `让 AI`, and preserve every existing priority, value, and feasibility score.

- [ ] **Step 2: Add new data-contract assertions**

For every scenario require `problem`, `aiValue`, `risk`, non-empty `evidenceIds`, and an array `companyCases`. For every case require `company`, `summary`, `sourceId`, `caseType`, and `caveat`, with a `sourceId` that exists in the radar source list. Assert the validator summary is exactly `{ id, scenarios: 12, p0: 3, pilots: 3 }`.

- [ ] **Step 3: Add renderer assertions**

Expand a scenario and assert its headings are exactly, in order:

```js
['业务痛点', 'AI 价值｜可以做什么', '主要风险', '证据锚点', '哪些公司做过']
```

Assert evidence and case links use `target="_blank" rel="noreferrer"`; a scenario with no case renders `暂无公开可核验案例`; and the DOM has no `.governance-section`, `.calibration-section`, or `.sources-section`.

- [ ] **Step 4: Add static-page assertions**

Require the no-script text to mention `核心判断`, `AI 能解决哪些业务问题`, `建议优先启动的 3 个场景`, and `证据`; reject `90 天路线图`, `治理门槛`, and `五家 Insight Radar`.

- [ ] **Step 5: Run the focused tests and confirm the expected RED state**

Run:

```bash
node --test tests/radars/data-contract.test.mjs tests/radars/interaction.test.mjs tests/radars/static-pages.test.mjs
```

Expected: FAIL because the current data still has abstract titles and legacy fields, and the renderer still emits eight detail blocks plus deleted sections.

- [ ] **Step 6: Commit the failing specification tests**

```bash
git add tests/radars
git commit -m "test: specify simplified opportunity radars"
```

### Task 2: Tighten the validator around the new schema

**Files:**
- Modify: `web/radars/validate-data.mjs`

- [ ] **Step 1: Remove requirements for legacy scenario and page fields**

Stop requiring `goal90Days`, `horizonDays`, `aiRole`, `valueCase`, `feasibilityCase`, `humanOwner`, `governanceGates`, `kpis`, and `sourceCalibrations`.

- [ ] **Step 2: Validate the five-field scenario contract and company cases**

Require action-oriented titles, valid evidence IDs, a `companyCases` array, complete case records, one of the four approved `caseType` values, and resolvable case source IDs. Keep unique IDs, counts, score ranges, matrix coordinates, sources, and local archive path protection.

- [ ] **Step 3: Preserve the high-risk HR boundary in the risk field**

Require `hr-12.risk` to include both `禁止` and `具名人员`.

- [ ] **Step 4: Run the malformed-data tests**

Run: `node --test --test-name-pattern="validator" tests/radars/data-contract.test.mjs`

Expected: malformed fixtures are rejected for the correct new-contract reason.

### Task 3: Migrate Legal data and company evidence

**Files:**
- Modify: `web/radars/data/legal.js`
- Modify: `tests/radars/data-contract.test.mjs`

- [ ] **Step 1: Replace all 12 Legal titles and fields**

Map useful legacy content into `problem`, `aiValue`, and `risk`; retain `evidenceIds`; remove the legacy scenario prose fields.

- [ ] **Step 2: Add verified company cases**

Use actual adopting companies from the existing official or supplier customer stories (for example Trench Group, ALPLA, Signifyd, Bupa, Wipro, SMBC, Kroll, Cvent, Microsoft, and Repsol). Do not use a vendor name as the adopting company. Use an empty array for a scenario without a supportable case.

- [ ] **Step 3: Remove obsolete top-level governance/calibration arrays**

Keep exactly three `pilots`, but rewrite their labels and copy as compact priority-start recommendations rather than a 90-day program.

- [ ] **Step 4: Run Legal contract tests**

Run: `node --test --test-name-pattern="legal" tests/radars/data-contract.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit Legal migration**

```bash
git add web/radars/data/legal.js web/radars/validate-data.mjs tests/radars/data-contract.test.mjs
git commit -m "feat: simplify legal opportunity scenarios"
```

### Task 4: Research and migrate HR company evidence

**Files:**
- Modify: `web/radars/data/hr.js`
- Modify: `tests/radars/data-contract.test.mjs`

- [ ] **Step 1: Verify remaining company-case gaps on the web**

Prefer company disclosures, then official vendor customer stories, then high-trust research/media. Research named, supportable cases for recruiting and employee listening; use Amazon's stopped recruiting experiment only as a clearly labelled warning case if supported by a high-trust source.

- [ ] **Step 2: Add new source records with evidence limitations**

Add official IBM AskHR, Gloat/Seagate, IBM Your Learning, ServiceNow/Robinhood, Visier/PepsiCo, Visier Vee adopters, and Visier/Sunstate sources where the page directly supports the use case. Label supplier case claims as supplier-reported.

- [ ] **Step 3: Replace all 12 HR titles and fields**

Map each scenario to `problem`, `aiValue`, `risk`, `evidenceIds`, and `companyCases`. High-risk monitoring defaults to no case unless a responsible, directly supported deployment is found; autonomous employment decisions remain prohibited and require a named human decision owner.

- [ ] **Step 4: Rewrite the three HR priority starts and remove obsolete arrays**

- [ ] **Step 5: Run both domain contract tests**

Run:

```bash
npm run validate:radars
node --test tests/radars/data-contract.test.mjs
```

Expected: both commands PASS and report 12 scenarios, three P0, and three priority starts per domain.

- [ ] **Step 6: Commit HR migration**

```bash
git add web/radars/data/hr.js tests/radars/data-contract.test.mjs
git commit -m "feat: add verified HR opportunity cases"
```

### Task 5: Implement the simplified shared renderer

**Files:**
- Modify: `web/radars/radar.js`
- Modify: `web/radars/radar.css`
- Modify: `web/radars/legal.html`
- Modify: `web/radars/hr.html`

- [ ] **Step 1: Render evidence anchors as source-backed link cards**

Each card shows publisher, title, evidence type, limitation, and `查看原文 ↗`. External links open safely in a new tab.

- [ ] **Step 2: Render company cases separately**

Show company, case type, one-sentence practice, caveat, and a linked source. If the array is empty, show the exact text `暂无公开可核验案例`.

- [ ] **Step 3: Reduce scenario details to exactly five blocks**

Use the approved order and make evidence/company sections full width. Remove all legacy blocks.

- [ ] **Step 4: Reduce the page to four sections**

Change `场景组合` to `AI 能解决哪些业务问题`; change the pilot heading to `建议优先启动的 3 个场景`; remove calls to governance, calibration, and global-source renderers. Keep filter, matrix jump, keyboard focus, and print behavior.

- [ ] **Step 5: Update hero and no-script content**

Remove the 90-day hero statistic and promise. Keep the P0 count, total scenario count, and a verified-company-case count or two-stat layout.

- [ ] **Step 6: Style the new evidence/company layouts**

Use a two-column detail layout above 768px and one column below; evidence and company sections span the full width; links have visible focus; 390px has no horizontal overflow.

- [ ] **Step 7: Run all radar tests**

Run:

```bash
node --test tests/radars/*.test.mjs
npm run validate:radars
```

Expected: PASS.

- [ ] **Step 8: Commit renderer changes**

```bash
git add web/radars/radar.js web/radars/radar.css web/radars/legal.html web/radars/hr.html tests/radars
git commit -m "feat: focus opportunity radars on business decisions"
```

### Task 6: Verify and deploy both radars

**Files:**
- Verify: `web/radars/legal.html`
- Verify: `web/radars/hr.html`
- Deploy to: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/`

- [ ] **Step 1: Run the complete repository test suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Visually QA both pages at desktop and 390px**

Check hero, matrix, all five detail blocks, no-case empty state, case/source links, filters, matrix jump, three priority-start cards, keyboard focus, and absence of deleted sections.

- [ ] **Step 3: Deploy the verified web tree**

Run:

```bash
rsync -a web/ /Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/
```

- [ ] **Step 4: Compare deployment and worktree checksums**

Verify `radar.js`, `radar.css`, both domain data files, and both page shells are byte-identical in the desktop delivery.

- [ ] **Step 5: Commit any QA-only correction and record final evidence**

```bash
git status --short
git log -5 --oneline
```
