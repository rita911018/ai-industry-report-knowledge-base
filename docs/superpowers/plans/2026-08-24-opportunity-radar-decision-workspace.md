# HR 与法务 AI 机会雷达决策工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 HR 与企业法务雷达改造成可直接比较、查看场景详情、解释优先级并导出完整单文件 HTML 的决策工作台，同时修复首页雷达入口 404。

**Architecture:** 两个领域继续共用 `radar.js` 与 `radar.css`，领域差异仅保存在各自数据文件。矩阵检查器、场景卡片和导出报告都读取同一份场景对象；校验器负责评分、案例和内容深度约束，服务器与首页共同修复目录入口。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js ESM、`node:test`、JSDOM、现有静态文件服务器。

---

## 文件职责

- `src/server/app-server.mjs`：安全解析静态目录首页并返回 `index.html`。
- `web/index.html`：使用明确的 `radars/index.html` 导航目标。
- `web/radars/data/legal.js`：法务 12 场景的短标题、深度详情、评分、证据和公司案例。
- `web/radars/data/hr.js`：HR 12 场景的短标题、深度详情、评分、证据和公司案例。
- `web/radars/validate-data.mjs`：验证五维评分、优先级、风险红线、内容条数和中国企业案例。
- `web/radars/radar.js`：矩阵检查器、评分方法、详情列表、导出单文件 HTML。
- `web/radars/radar.css`：双栏矩阵、场景标签、检查器、评分条、移动端、打印和导出样式。
- `tests/server-static-routing.test.mjs`：目录首页、显式文件与路径越界回归测试。
- `tests/radars/data-contract.test.mjs`：两个领域完整数据契约测试。
- `tests/radars/interaction.test.mjs`：点位选择、详情同步、定位、评分说明和导出测试。
- `tests/radars/static-pages.test.mjs`：入口、页面结构、移动端和打印静态保证。

### Task 1: 修复 AI 机会雷达入口 404

**Files:**
- Create: `tests/server-static-routing.test.mjs`
- Modify: `src/server/app-server.mjs`
- Modify: `web/index.html`

- [ ] **Step 1: 写目录首页失败测试**

测试启动临时服务器，请求 `/radars/`、`/radars/index.html`、不存在目录和 `/%2e%2e/`；断言前两者返回 200 HTML，后两者不返回受保护文件。

```js
test('serves safe directory index pages', async () => {
  const directory = await request('/radars/');
  assert.equal(directory.status, 200);
  assert.match(directory.contentType, /^text\/html/);
  assert.match(directory.body, /选择领域/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/server-static-routing.test.mjs`
Expected: FAIL，`/radars/` 当前返回 404。

- [ ] **Step 3: 最小实现目录首页解析**

在 `serveFile` 内仅当安全目标是目录时追加 `index.html`，再对最终目标重新执行根目录边界检查；首页链接改为：

```html
<a href="radars/index.html">AI机会雷达</a>
```

- [ ] **Step 4: 运行路由和静态页测试**

Run: `node --test tests/server-static-routing.test.mjs tests/radars/static-pages.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/server/app-server.mjs web/index.html tests/server-static-routing.test.mjs
git commit -m "fix: serve radar directory index"
```

### Task 2: 扩展并锁定雷达数据契约

**Files:**
- Modify: `tests/radars/data-contract.test.mjs`
- Modify: `web/radars/validate-data.mjs`

- [ ] **Step 1: 写新契约失败测试**

每个场景必须有 `shortTitle`、至少 3 条 `problem`、至少 4 条 `aiValue`、完整 `scorecard`，且至少一条价值描述包含授权输入、可检查交付、人工接管或验收信息；每个雷达至少有两家不同且 `market === '中国'` 的公司。

```js
assert.ok(scenario.shortTitle.length >= 4 && scenario.shortTitle.length <= 14);
assert.ok(Array.isArray(scenario.problem) && scenario.problem.length >= 3);
assert.ok(Array.isArray(scenario.aiValue) && scenario.aiValue.length >= 4);
assert.equal(Object.values(scenario.scorecard.dimensions).reduce((a, b) => a + b, 0), scenario.scorecard.total);
assert.ok(new Set(chinaCases.map((item) => item.company)).size >= 2);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/radars/data-contract.test.mjs`
Expected: FAIL，现有数据缺少新字段且痛点/价值是字符串。

- [ ] **Step 3: 实现校验器**

定义五维最高分 `30/20/15/15/20`，校验每项为非负整数且不超上限；总分必须等于分项和；P0 为 `>=80` 且无红线，P1 为 `65–79`，P2 为 `50–64` 或有明确前置条件，P3 必须包含风险红线；案例 `market` 只能是 `中国` 或 `国际`。

- [ ] **Step 4: 运行测试确认只剩数据失败**

Run: `node --test tests/radars/data-contract.test.mjs`
Expected: FAIL 仅指向 `legal.js` 和 `hr.js` 缺少字段。

- [ ] **Step 5: 提交契约测试与校验器**

```bash
git add tests/radars/data-contract.test.mjs web/radars/validate-data.mjs
git commit -m "test: define radar decision data contract"
```

### Task 3: 补全法务雷达 12 个场景

**Files:**
- Modify: `web/radars/data/legal.js`

- [ ] **Step 1: 为 12 个场景添加短标题与深度详情**

`problem` 写 3–4 条业务痛点，`aiValue` 写 4–5 条具体动作，并在价值条目中明确授权输入、输出、人工责任和验收指标；不使用无来源数字。

- [ ] **Step 2: 添加五维评分与优先级理由**

每个场景添加：

```js
scorecard: {
  dimensions: { businessValue: 27, processFit: 18, readiness: 13, evidence: 13, riskControl: 16 },
  total: 87,
  rationale: '高频标准化任务，输出可逐条复核；需限定条款库和审批权限。',
  prerequisite: '限定合同类型、条款库版本和人工签署责任。',
  redLine: false,
}
```

- [ ] **Step 3: 补充至少两家中国企业案例**

使用已核验公开来源，把企业、做法、案例性质、证据局限和 `market: '中国'` 写入对应场景；没有成效数字时只陈述披露做法。

- [ ] **Step 4: 运行法务数据测试**

Run: `node --test tests/radars/data-contract.test.mjs --test-name-pattern="legal|collection|contract"`
Expected: 法务相关断言 PASS。

- [ ] **Step 5: 提交**

```bash
git add web/radars/data/legal.js
git commit -m "feat: deepen legal radar scenarios"
```

### Task 4: 补全 HR 雷达 12 个场景

**Files:**
- Modify: `web/radars/data/hr.js`

- [ ] **Step 1: 为 12 个场景添加短标题与深度详情**

使用与法务相同的数组和责任边界结构；对招聘、绩效、流失和员工监测场景明确公平、隐私、解释和人工复核风险。

- [ ] **Step 2: 添加五维评分与风险硬门槛**

P0/P1/P2 符合分数区间；自主录用、晋升、调薪或解雇场景即使业务价值较高也设置 `redLine: true` 并归 P3。

- [ ] **Step 3: 补充至少两家中国企业案例**

把公开可核验的中国企业 HR AI 实践映射到对应场景，添加市场标签和证据局限；供应商能力介绍不得写成客户成效。

- [ ] **Step 4: 运行全部数据契约**

Run: `node --test tests/radars/data-contract.test.mjs && npm run validate:radars`
Expected: 两个领域均为 12 场景、3 个 P0、3 个优先启动项，所有契约 PASS。

- [ ] **Step 5: 提交**

```bash
git add web/radars/data/hr.js
git commit -m "feat: deepen HR radar scenarios"
```

### Task 5: 实现带名称的矩阵点位与右侧检查器

**Files:**
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.js`
- Modify: `web/radars/radar.css`

- [ ] **Step 1: 写矩阵交互失败测试**

断言 12 个点位显示编号和短标题；默认选中场景 01；点击 07 后不滚动，`aria-pressed` 和右侧五项详情、总分同步为 07；点击“查看全部详情”才展开并聚焦下方 07。

```js
point.click();
assert.equal(point.getAttribute('aria-pressed'), 'true');
assert.match(document.querySelector('.matrix-inspector').textContent, /legal-07 对应标题/);
assert.equal(scrollCalls, 0);
document.querySelector('.matrix-inspector-jump').click();
assert.equal(document.querySelector('#legal-07 .scenario-header').getAttribute('aria-expanded'), 'true');
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/radars/interaction.test.mjs`
Expected: FAIL，现有点位仅有编号且会直接跳转。

- [ ] **Step 3: 实现共用列表渲染与检查器状态**

新增 `renderTextList` 兼容字符串与数组；`selectMatrixScenario` 只更新 `state.selectedScenarioId`、点位和检查器；`jumpToScenario` 才重置筛选、展开、聚焦和滚动。

- [ ] **Step 4: 更新矩阵标题和布局样式**

标题改为“哪些 AI 场景应该优先启动？”，左右两栏布局；点位用编号加 `shortTitle` 的可读标签；窄屏改为上下排列，激活态同时具有背景、边框和 `aria-pressed`。

- [ ] **Step 5: 运行交互与静态样式测试**

Run: `node --test tests/radars/interaction.test.mjs tests/radars/static-pages.test.mjs`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add tests/radars/interaction.test.mjs web/radars/radar.js web/radars/radar.css
git commit -m "feat: add interactive radar scenario inspector"
```

### Task 6: 展示透明的优先级方法

**Files:**
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.js`
- Modify: `web/radars/radar.css`

- [ ] **Step 1: 写评分方法失败测试**

断言页面展示五个维度及 `30/20/15/15/20` 权重、P0–P3 规则和风险红线；矩阵检查器展示五维实际得分、总分、理由和前置条件。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/radars/interaction.test.mjs --test-name-pattern="score|priority"`
Expected: FAIL，页面仍是旧的 55%/45% 文案。

- [ ] **Step 3: 实现评分条和方法说明**

在检查器中按最大权重渲染五条评分；在“建议优先启动”之前渲染精简方法卡，并给三个 P0 场景显示最高得分维度、关键前提和验收指标。

- [ ] **Step 4: 运行交互测试**

Run: `node --test tests/radars/interaction.test.mjs`
Expected: PASS，且 DOM 不再包含“业务价值 55% + 落地可行性 45%”。

- [ ] **Step 5: 提交**

```bash
git add tests/radars/interaction.test.mjs web/radars/radar.js web/radars/radar.css
git commit -m "feat: explain radar priority scoring"
```

### Task 7: 导出当前领域的完整单文件 HTML

**Files:**
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.js`
- Modify: `web/radars/radar.css`

- [ ] **Step 1: 写导出失败测试**

在 JSDOM 中替换 `URL.createObjectURL` 和下载链接点击，断言按钮生成 `text/html` Blob；读取 Blob 后断言包含当前领域标题、矩阵、12 个场景、五项详情、评分、证据、案例和三个优先项，不含另一领域名、`file://`、`DEEPSEEK` 或 API key。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/radars/interaction.test.mjs --test-name-pattern="export"`
Expected: FAIL，页面尚无导出按钮。

- [ ] **Step 3: 实现安全序列化和导出**

`buildStandaloneReport(data)` 生成带内联 CSS、转义文本和内联领域数据的完整 HTML；报告默认展开所有场景，并包含无脚本可读内容。`downloadStandaloneReport(data)` 用 Blob 下载 `领域-AI机会雷达-YYYY-MM-DD.html`，最后回收对象 URL。

- [ ] **Step 4: 在首屏添加导出入口**

导出按钮与“查看优先级矩阵”并列；按钮文案为“导出完整 HTML”，辅助说明写明“矩阵、12 个场景、证据与公司案例”。

- [ ] **Step 5: 运行导出和静态测试**

Run: `node --test tests/radars/interaction.test.mjs tests/radars/static-pages.test.mjs`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add tests/radars/interaction.test.mjs web/radars/radar.js web/radars/radar.css
git commit -m "feat: export standalone radar reports"
```

### Task 8: 完整回归、视觉验收与桌面部署

**Files:**
- Modify: `docs/superpowers/specs/2026-08-23-opportunity-radar-decision-workspace-design.md`

- [ ] **Step 1: 运行雷达与服务器全量测试**

Run: `npm run validate:radars && node --test tests/server-static-routing.test.mjs tests/radars/*.test.mjs`
Expected: 全部 PASS。

- [ ] **Step 2: 运行项目全量测试**

Run: `npm test`
Expected: 0 failures。

- [ ] **Step 3: 启动本地服务并做桌面视觉验收**

检查 HR 与法务在 1440px：点位名称无关键遮挡、右侧检查器随点击更新、五项详情和评分可读、导出按钮可用；检查 `/radars/` 不再 404。

- [ ] **Step 4: 做 390px 与打印验收**

确认无横向滚动，矩阵和检查器上下排列；键盘 Tab/Enter 可选择点位；打印预览中 12 个场景全部展开。

- [ ] **Step 5: 实际导出并离线打开两个报告**

分别导出 HR 和法务，断网条件下打开；确认当前领域 12 个场景、证据链接、案例、评分和优先项完整，且不含另一领域数据。

- [ ] **Step 6: 更新设计状态并提交**

将设计文档状态改为“已实施并验证”，写入测试与视觉验收日期。

```bash
git add docs/superpowers/specs/2026-08-23-opportunity-radar-decision-workspace-design.md
git commit -m "docs: record radar workspace verification"
```

- [ ] **Step 7: 部署到桌面知识库并复测**

将 `web/` 与所需数据同步到 `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/`，从桌面服务重新打开首页、HR、法务和两个导出文件；确认部署版本与工作树一致。

## 自检结果

- 设计中的 12 项验收要求均映射到 Task 1–8。
- 计划没有 `TBD`、`TODO` 或未定义的占位接口。
- `scorecard.dimensions`、`redLine`、`prerequisite`、`shortTitle` 和 `market` 在数据、校验、渲染与测试中命名一致。
- 首页 404、交互、内容深度、五维评分、中国企业案例、导出、移动端、打印和部署均有独立验证步骤。
