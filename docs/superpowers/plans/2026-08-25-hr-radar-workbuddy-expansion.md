# HR Radar WorkBuddy Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the HR AI opportunity radar from 12 to 20 scenarios while keeping exactly 12 matrix points and treating the WorkBuddy WeChat article as low-confidence workflow evidence rather than verified company impact.

**Architecture:** Keep the existing hand-authored HR dataset and add an explicit `libraryMode: 'ranked'` contract for a 20–30 item library with 12 stable `matrixRank` values. Generalize the shared renderer to recognize ranked libraries without forcing HR into the stricter schema-v2 red-line rules used by the four 24-scenario domains. Add the eight operational HR scenarios in `hr.js`, then validate live rendering, sorting, navigation, and standalone export through contract and JSDOM interaction tests.

**Tech Stack:** Browser JavaScript, Node.js, `node:test`, JSDOM, static HTML/CSS, local Node HTTP server.

---

## File map

- Modify `web/radars/data/hr.js`: source records, ranked-library flag, existing scenario enrichment, and scenarios `hr-13`–`hr-20`.
- Modify `web/radars/validate-data.mjs`: validate ranked libraries independently from schema-v2 extended libraries.
- Modify `web/radars/radar.js`: select 12 ranked matrix items, enable HR date/score sorting, and export all 20 items.
- Modify `tests/radars/data-contract.test.mjs`: enforce the 20/12 HR contract, titles, source classification, and risk boundaries.
- Modify `tests/radars/interaction.test.mjs`: enforce live and standalone 20/12 behavior, TOC, filters, sorting, and details.
- Deploy the three production files above to `/Users/rita/Desktop/AI行业报告/AI行业报告知识库` after all tests pass.

## Source records to add

The implementation must use these exact source IDs and classifications:

| ID | Source | Date | Evidence type | Purpose |
|---|---|---|---|---|
| `hr-src-11` | `https://mp.weixin.qq.com/s/-8a1_8-ifOsFP_JP-1RAuw` | `2026-08-21` | `个人实务流程示例` | WorkBuddy workflows; never a company case |
| `hr-src-12` | `https://ph.adp.com/about-adp/press-centre/adp-integrates-new-ai-agent--to-elevate-global-payroll-accuracy-and-efficiency.aspx` | `2026-04-13` | `供应商产品披露` | Payroll variance detection under human review |
| `hr-src-13` | `https://www.sap.com/india/use-cases/joule-assistant/core-hr-ai` | `2026-05-12` | `供应商产品说明` | Core-HR data consistency and workflow checks |
| `hr-src-14` | `https://www.sap.com/use-cases/joule-assistant/hr-service-ai` | `2026-05-11` | `供应商产品说明` | Policy-grounded answers and time/payroll explanations |
| `hr-src-15` | `https://www.kingdee.com/resources/articles/1468621652711684001` | `2026-02-04` | `供应商方法说明` | Multi-source attendance/payroll data and calculation workflow |
| `hr-case-12` | `https://www.servicenow.com/customers/bayer.html` | `null` | `供应商客户案例` | AI-generated HR case summaries; adjacent, not legal advice |
| `hr-case-13` | `https://www.kingdee.com/case/52492` | `null` | `供应商客户案例` | Moutai attendance, payroll, social-insurance and annuity integration |
| `hr-case-14` | `https://www.kingdee.com/success-stories/1574590651243192322.html` | `null` | `供应商客户案例` | Baimei payroll formulas and contract-expiry reminders |

Every source must state its limitation. In particular, `hr-src-11` must say that it has no independent outcome evaluation, sample, control group, or audited metric.

---

### Task 1: Write the ranked-library contract tests

**Files:**
- Modify: `tests/radars/data-contract.test.mjs`
- Test: `tests/radars/data-contract.test.mjs`

- [ ] **Step 1: Replace the combined legal/HR 12-scenario expectation with separate expectations**

Keep legal unchanged and add an HR test with these assertions:

```js
test('hr ranked library contains 20 scenarios and exactly 12 stable matrix ranks', async () => {
  const hr = await loadRadarFile(`${radarRoot}/data/hr.js`);
  const result = validateRadarData(hr, { radarRoot });
  assert.deepEqual(result, { id: 'hr', scenarios: 20, p0: 3, pilots: 3, scenarioCount: 20, matrixCount: 12 });
  assert.equal(hr.libraryMode, 'ranked');
  assert.deepEqual(
    hr.scenarios.filter((scenario) => Number.isInteger(scenario.matrixRank)).map((scenario) => scenario.matrixRank),
    Array.from({ length: 12 }, (_, index) => index + 1),
  );
  assert.deepEqual(hr.scenarios.slice(12).map((scenario) => scenario.matrixRank), Array(8).fill(null));
});
```

- [ ] **Step 2: Add exact content and evidence-boundary assertions**

```js
test('hr operational scenarios preserve approved titles and WorkBuddy evidence boundaries', async () => {
  const hr = await loadRadarFile(`${radarRoot}/data/hr.js`);
  assert.deepEqual(hr.scenarios.slice(12).map(({ id, title, priority }) => [id, title, priority]), [
    ['hr-13', '用 AI 清洗考勤数据并识别异常记录', 'P1'],
    ['hr-14', '用 AI 生成工资初算表和计算公式，但不执行发薪', 'P2'],
    ['hr-15', '用 AI 复核薪资波动、缺项和计算异常', 'P1'],
    ['hr-16', '用 AI 回答社保公积金问题，并引用属地政策', 'P1'],
    ['hr-17', '用 AI 准备社保增减员、基数调整和申报清单', 'P2'],
    ['hr-18', '用 AI 起草员工关系沟通方案和协议初稿', 'P2'],
    ['hr-19', '用 AI 整理劳动争议事实、证据和事件时间线', 'P2'],
    ['hr-20', '用 AI 检查人事制度、表单版本、签字和到期风险', 'P1'],
  ]);
  const workBuddy = hr.sources.find((source) => source.id === 'hr-src-11');
  assert.equal(workBuddy.evidenceType, '个人实务流程示例');
  assert.equal(workBuddy.publishedAt, '2026-08-21');
  assert.match(workBuddy.limitation, /没有.*独立.*效果评估|未提供.*独立.*效果评估/);
  assert.equal(hr.scenarios.flatMap((scenario) => scenario.companyCases).some((item) => item.sourceId === 'hr-src-11'), false);
  assert.match(hr.scenarios.find((scenario) => scenario.id === 'hr-14').risk, /不得.*发薪|不能.*发薪/);
  assert.match(hr.scenarios.find((scenario) => scenario.id === 'hr-17').risk, /不得自动提交|不能自动申报/);
  assert.match(hr.scenarios.find((scenario) => scenario.id === 'hr-18').risk, /法务|律师/);
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
node --test tests/radars/data-contract.test.mjs
```

Expected: FAIL because HR still has 12 scenarios and no `libraryMode` or matrix ranks.

- [ ] **Step 4: Commit the failing tests**

```bash
git add tests/radars/data-contract.test.mjs
git commit -m "test: define expanded HR radar contract"
```

---

### Task 2: Add ranked-library validation

**Files:**
- Modify: `web/radars/validate-data.mjs`
- Test: `tests/radars/data-contract.test.mjs`

- [ ] **Step 1: Introduce an explicit ranked-library mode**

Add immediately after `isExtended`:

```js
const isRankedLibrary = isExtended || data?.libraryMode === 'ranked';
```

Use these count rules:

```js
if (isRankedLibrary) {
  if (data?.scenarioCount !== scenarios.length || scenarios.length < 20 || scenarios.length > 30) {
    errors.push('ranked radar.scenarioCount must match 20–30 scenarios');
  }
  if (data?.p0Count !== scenarios.filter((item) => item.priority === 'P0').length) {
    errors.push('ranked radar.p0Count must match the actual P0 count');
  }
} else {
  if (data?.scenarioCount !== 12 || scenarios.length !== 12) errors.push('radar.scenarioCount and scenarios.length must both equal 12');
  if (data?.p0Count !== 3 || scenarios.filter((item) => item.priority === 'P0').length !== 3) errors.push('radar.p0Count and actual P0 count must both equal 3');
}
```

- [ ] **Step 2: Validate ranks for both ranked modes without weakening schema v2**

For every ranked library require `matrixEligible` and `matrixRank`; retain the P3/red-line prohibition only for schema v2:

```js
if (isRankedLibrary) {
  if (typeof scenario?.matrixEligible !== 'boolean') errors.push(`${prefix}.matrixEligible must be boolean`);
  const hasRank = scenario?.matrixRank !== null && scenario?.matrixRank !== undefined;
  if (hasRank && (!Number.isInteger(scenario.matrixRank) || scenario.matrixRank < 1 || scenario.matrixRank > 12)) {
    errors.push(`${prefix}.matrixRank must be an integer in [1,12] or null`);
  }
  if (hasRank && !scenario?.matrixEligible) errors.push(`${prefix}.matrixRank requires matrixEligible to be true`);
  if (isExtended && hasRank && (scenario?.priority === 'P3' || scenario?.scorecard?.redLine)) {
    errors.push(`${prefix}.matrixRank cannot include a P3 or red-line scenario`);
  }
}
```

Keep `confidence`, `humanHandoff`, `sourceFacts`, `acceptanceMetrics`, and P0 publisher validation inside `if (isExtended)` so existing hand-authored HR content is not silently fabricated.

- [ ] **Step 3: Validate optional publication dates and the exact rank set**

Add:

```js
function validIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}
```

For every source:

```js
if (source.publishedAt !== null && source.publishedAt !== undefined && !validIsoDate(source.publishedAt)) {
  errors.push(`sources[${index}].publishedAt must be YYYY-MM-DD or null`);
}
```

Move the exact rank-set calculation from the schema-v2-only branch to `isRankedLibrary`, and include `scenarioCount` and `matrixCount` in the returned summary for both ranked modes.

- [ ] **Step 4: Run the focused test**

Run:

```bash
node --test tests/radars/data-contract.test.mjs
```

Expected: still FAIL only because `hr.js` has not yet provided the 20 scenarios and ranks; existing legal and schema-v2 tests remain green.

- [ ] **Step 5: Commit the validator**

```bash
git add web/radars/validate-data.mjs
git commit -m "feat: validate ranked radar libraries"
```

---

### Task 3: Expand the HR dataset to 20 scenarios

**Files:**
- Modify: `web/radars/data/hr.js`
- Test: `tests/radars/data-contract.test.mjs`

- [ ] **Step 1: Mark HR as ranked and add the three new categories**

```js
libraryMode: 'ranked',
updatedAt: '2026-08-25',
scenarioCount: 20,
categoryLabels: {
  service: '员工服务', skills: '技能与学习', lifecycle: '人才全周期', planning: '组织规划', listening: '员工洞察',
  payroll: '考勤与薪酬', compliance: '社保与人事合规', relations: '员工关系', highrisk: '高风险决策',
},
```

- [ ] **Step 2: Add the eight source objects exactly as listed in “Source records to add”**

Each object must contain `id`, `title`, `publisher`, `url`, `evidenceType`, `publishedAt`, and `limitation`. Use `publishedAt: null` for the three undated customer pages. Do not assign company, case summary, or outcome fields to `hr-src-11`.

- [ ] **Step 3: Enrich the three existing scenarios without changing rank or priority**

Append `hr-src-11` to the evidence IDs of `hr-01`, `hr-04`, and `hr-05`. Add only these workflow details:

```js
const workBuddyWorkflowDetails = {
  'hr-01': '政策知识库需要区分属地、员工类型、版本和生效日期。',
  'hr-04': '员工名册、合同到期、证件缺失和社保状态可形成待核清单。',
  'hr-05': '批量简历读取、JD、邀请、结构化问题、评分表、录音转写和候选人比较均只形成招聘人员复核材料。',
};
```

Integrate the exact meaning into the existing `problem` or `aiValue` arrays; do not replace existing safeguards.

- [ ] **Step 4: Add `operationalScenarios` with the approved prose and exact scores**

Use the approved business pain, AI value, risk, and evidence boundaries from Sections 3 and 5 of `docs/superpowers/specs/2026-08-25-hr-radar-workbuddy-expansion-design.md` without changing their meaning. Use these exact structural values:

| ID | Category | Priority | Value | Feasibility | Score tuple `business/process/readiness/evidence/risk` | Total |
|---|---|---|---:|---:|---|---:|
| `hr-13` | `payroll` | P1 | 4.5 | 4.5 | `26/18/12/8/13` | 77 |
| `hr-14` | `payroll` | P2 | 4.0 | 3.0 | `25/16/10/6/5` | 62 |
| `hr-15` | `payroll` | P1 | 4.5 | 4.0 | `24/18/11/9/11` | 73 |
| `hr-16` | `compliance` | P1 | 4.0 | 4.0 | `22/17/10/8/12` | 69 |
| `hr-17` | `compliance` | P2 | 4.0 | 3.5 | `20/16/10/7/8` | 61 |
| `hr-18` | `relations` | P2 | 3.5 | 3.0 | `18/14/9/6/7` | 54 |
| `hr-19` | `relations` | P2 | 4.0 | 3.0 | `20/15/9/7/8` | 59 |
| `hr-20` | `compliance` | P1 | 4.5 | 4.0 | `23/17/11/9/14` | 74 |

Use these exact short titles, each within the existing 4–14 character contract:

```js
const operationalShortTitles = {
  'hr-13': '考勤清洗检查',
  'hr-14': '工资初算草稿',
  'hr-15': '薪资异常复核',
  'hr-16': '社保政策问答',
  'hr-17': '社保申报清单',
  'hr-18': '员工关系初稿',
  'hr-19': '争议证据时间线',
  'hr-20': '人事文档风险',
};
```

For every scenario, expand the approved pain into exactly three non-empty `problem` entries and the approved AI value into exactly four non-empty `aiValue` entries. The four AI-value entries must cover, in order: authorized inputs, analysis/checking action, traceable output, and named-human handoff plus acceptance. Do not introduce an autonomous execution step.

Every object must include:

```js
matrixEligible: false,
matrixRank: null,
matrix: { x: 0, y: 0 },
confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。',
evidenceWindow: 'current',
```

Add at least three `acceptanceMetrics` per scenario. Metrics must measure accuracy, human-review changes, turnaround time, and unauthorized-action count; they must not promise an unverified percentage improvement.

Use these evidence/case mappings:

| Scenario | Evidence IDs | Company cases |
|---|---|---|
| `hr-13` | `hr-src-11`, `hr-src-15`, `hr-case-13` | 贵州茅台, with the caveat that the case is HR digital integration rather than an isolated generative-AI test |
| `hr-14` | `hr-src-11`, `hr-src-15`, `hr-case-14` | 佰美基因, with the caveat that formulas were system-configured rather than generated autonomously |
| `hr-15` | `hr-src-11`, `hr-src-12` | Empty array; ADP is a product disclosure, not a named customer outcome |
| `hr-16` | `hr-src-11`, `hr-src-14`, `hr-case-13` | 贵州茅台, limited to social-insurance/annuity integration rather than AI legal advice |
| `hr-17` | `hr-src-11`, `hr-case-13` | 贵州茅台, limited to connected personnel and annuity operations |
| `hr-18` | `hr-src-11`, `hr-case-12` | Bayer, limited to HR case summarization rather than employment-law drafting |
| `hr-19` | `hr-src-11`, `hr-case-12` | Bayer, limited to case summaries rather than arbitration evidence analysis |
| `hr-20` | `hr-src-11`, `hr-src-13`, `hr-case-14` | 佰美基因, limited to contract reminders and configured workflows |

- [ ] **Step 5: Assign stable ranks to the original 12 and append the eight new objects**

Use the existing enhancement mapping, then add rank fields without changing original scenario order:

```js
const rankedCoreScenarios = hrRadar.scenarios.map((scenario, index) => {
  const { companyCases = [], extraEvidenceIds = [], ...enhancement } = scenarioEnhancements[scenario.id];
  return {
    ...scenario,
    ...enhancement,
    matrixEligible: true,
    matrixRank: index + 1,
    evidenceIds: [...scenario.evidenceIds, ...extraEvidenceIds],
    companyCases: [...scenario.companyCases, ...companyCases].map((companyCase) => ({ market: '国际', ...companyCase })),
  };
});
hrRadar.scenarios = [...rankedCoreScenarios, ...operationalScenarios];
```

- [ ] **Step 6: Run data tests and validator**

Run:

```bash
node --test tests/radars/data-contract.test.mjs
node web/radars/validate-data.mjs
```

Expected: both PASS; validator prints `hr: 20 scenarios, 3 P0, 3 priority starts`.

- [ ] **Step 7: Commit the data**

```bash
git add web/radars/data/hr.js tests/radars/data-contract.test.mjs
git commit -m "feat: expand HR radar to 20 scenarios"
```

---

### Task 4: Render ranked HR libraries and add time/score sorting

**Files:**
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.js`
- Test: `tests/radars/interaction.test.mjs`

- [ ] **Step 1: Write a failing HR interaction/export test**

```js
test('HR ranked library keeps 12 matrix points and exposes all 20 scenarios', async () => {
  const hr = await loadRadarFile(fileURLToPath(hrPath));
  const dom = await setup(hr, 'http://127.0.0.1/radars/hr.html');
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('.matrix-point').length, 12);
  assert.equal(document.querySelectorAll('.scenario').length, 20);
  assert.equal(document.querySelectorAll('[data-toc-scenario]').length, 20);
  assert.equal(document.querySelector('#scenario-result-count').textContent, '20 个场景');
  assert.deepEqual([...document.querySelectorAll('[data-scenario-sort]')].map((button) => button.textContent), ['按时间', '按打分']);
  assert.ok(document.querySelector('#hr-20'));

  const report = dom.window.OpportunityRadar.buildStandaloneReport(hr, new Date('2026-08-25T08:00:00+08:00'));
  assert.equal((report.match(/data-export-target=/g) || []).length, 12);
  assert.equal((report.match(/class="export-scenario"/g) || []).length, 20);
  assert.equal((report.match(/data-export-toc-scenario=/g) || []).length, 20);
  assert.match(report, /教你用 WorkBuddy 搞定公司日常人事工作/);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/radars/interaction.test.mjs
```

Expected: FAIL because the legacy renderer tries to put all 20 HR scenarios in the matrix and does not show ranked-library sorting.

- [ ] **Step 3: Generalize matrix selection**

Replace the schema-only matrix helper with:

```js
function isRankedLibrary(data) {
  return data.schemaVersion === '2.0' || data.libraryMode === 'ranked';
}

function matrixScenarios(data) {
  if (!isRankedLibrary(data)) return data.scenarios;
  return data.scenarios
    .filter((scenario) => Number.isInteger(scenario.matrixRank))
    .sort((a, b) => a.matrixRank - b.matrixRank);
}
```

Use `isRankedLibrary(data)` for the matrix description and scenario status badges instead of `data.schemaVersion === '2.0'`.

- [ ] **Step 4: Add deterministic time sorting for HR**

```js
function scenarioEvidenceTime(scenario, data) {
  const timestamps = scenario.evidenceIds
    .map((id) => data.sources.find((source) => source.id === id)?.publishedAt)
    .filter(Boolean)
    .map((value) => Date.parse(`${value}T00:00:00Z`))
    .filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : null;
}

function sortScenarios(state, mode) {
  state.sortMode = mode;
  const scenarios = [...state.data.scenarios].sort((a, b) => {
    if (mode === 'score') return b.scorecard.total - a.scorecard.total || a.number.localeCompare(b.number);
    if (mode === 'date') {
      const aTime = scenarioEvidenceTime(a, state.data);
      const bTime = scenarioEvidenceTime(b, state.data);
      if (aTime === null && bTime !== null) return 1;
      if (aTime !== null && bTime === null) return -1;
      if (aTime !== bTime) return bTime - aTime;
    }
    return a.number.localeCompare(b.number);
  });
  for (const scenario of scenarios) state.list.append(state.cards.get(scenario.id));
  state.filterPanel.querySelectorAll('[data-scenario-sort]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.scenarioSort === mode));
  });
}
```

For `libraryMode === 'ranked'`, render `[['date', '按时间'], ['score', '按打分']]` and default to `date`. Keep schema-v2 radars on their current `[['number', '按编号'], ['score', '按总分']]` choices.

- [ ] **Step 5: Extend the test to verify sorting, filtering, and deep-link opening**

```js
const scoreButton = [...document.querySelectorAll('[data-scenario-sort]')].find((button) => button.textContent === '按打分');
scoreButton.click();
assert.equal(document.querySelector('.scenario').id, 'hr-01');
const payrollFilter = document.querySelector('[data-category-filter="payroll"]');
payrollFilter.click();
assert.equal(document.querySelectorAll('.scenario:not([hidden])').length, 3);
const link = document.querySelector('[data-toc-scenario="hr-20"]');
assert.doesNotThrow(() => link.click());
assert.equal(document.querySelector('#hr-20 .scenario-header').getAttribute('aria-expanded'), 'true');
```

- [ ] **Step 6: Run interaction and static tests**

Run:

```bash
node --test tests/radars/interaction.test.mjs tests/radars/static-pages.test.mjs
```

Expected: PASS with 12 HR matrix points, 20 cards/TOC/export entries, correct sorting, and no legal or extended-domain regression.

- [ ] **Step 7: Commit renderer and tests**

```bash
git add web/radars/radar.js tests/radars/interaction.test.mjs
git commit -m "feat: render ranked HR scenario library"
```

---

### Task 5: Full verification and desktop deployment

**Files:**
- Deploy: `web/radars/data/hr.js`
- Deploy: `web/radars/radar.js`
- Deploy: `web/radars/validate-data.mjs`

- [ ] **Step 1: Run all verification commands**

```bash
node web/radars/validate-data.mjs
node --test tests/radars/data-contract.test.mjs tests/radars/interaction.test.mjs tests/radars/static-pages.test.mjs
npm test
git diff --check
git status --short
```

Expected:

- all six radar datasets validate;
- focused radar tests pass;
- full test suite passes;
- `git diff --check` is silent;
- only the pre-existing untracked `.superpowers/` and `tmp/` remain.

- [ ] **Step 2: Sync the exact production files to the desktop product**

```bash
rsync -a web/radars/data/hr.js '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/data/hr.js'
rsync -a web/radars/radar.js '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/radar.js'
rsync -a web/radars/validate-data.mjs '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/validate-data.mjs'
```

- [ ] **Step 3: Verify byte identity and live HTTP behavior**

```bash
cmp -s web/radars/data/hr.js '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/data/hr.js'
cmp -s web/radars/radar.js '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/radar.js'
cmp -s web/radars/validate-data.mjs '/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/validate-data.mjs'
curl -fsS http://127.0.0.1:4318/radars/hr.html >/dev/null
```

Expected: all `cmp` commands return 0 and HR returns HTTP 200. The static-file service does not require restart; restart only if the existing PID is no longer serving the desktop directory.

- [ ] **Step 4: Browser acceptance**

Verify in the live desktop page:

- hero shows `20` scenarios and `3` P0;
- matrix shows exactly 12 labeled points and the right inspector still opens;
- the left directory contains 20 scenario links;
- `按时间` and `按打分` change order without losing filters;
- `考勤与薪酬` shows exactly three scenarios;
- opening `hr-20` shows all five detail sections and a traceable source link;
- WorkBuddy is labeled `个人实务流程示例` and is never shown as a company case;
- standalone export contains 12 matrix controls and 20 full scenario entries;
- 390px mobile width has no horizontal overflow.

- [ ] **Step 5: Final status check**

```bash
git log -5 --oneline
git status --short
```

Expected: implementation commits are present; no unexpected tracked changes remain.
