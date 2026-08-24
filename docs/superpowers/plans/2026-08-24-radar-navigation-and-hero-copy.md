# Radar Navigation and Hero Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the knowledge/radar hero copy and add a shared, accessible two-level table of contents to all six live radars and their standalone HTML exports.

**Architecture:** Keep the six domain HTML shells and data files unchanged. Extend the shared radar renderer with one data-driven navigation component and state helpers; extend the embedded export template with a parallel offline navigation component. The shared stylesheet owns desktop, mobile, active-state, and print behavior.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js test runner, JSDOM, IntersectionObserver with a no-support fallback.

---

### Task 1: Update the approved hero copy and typography

**Files:**
- Modify: `tests/web/static-contract.test.mjs`
- Modify: `tests/radars/static-pages.test.mjs`
- Modify: `web/index.html`
- Modify: `web/radars/index.html`
- Modify: `web/radars/radar.css`

- [ ] **Step 1: Write failing copy and typography contracts**

In `tests/web/static-contract.test.mjs`, add these assertions to `unified page exposes an accessible cited research workspace`:

```js
assert.match(html, /<h1 id="knowledge-heading">AI 行业报告知识库，<br>洞察皆有出处。<\/h1>/);
assert.doesNotMatch(html, /问报告，也问证据。/);
```

In `tests/radars/static-pages.test.mjs`, extend the directory test and style test:

```js
assert.match(html, /<p class="directory-lede">在你的行业，发现 AI 机会。<\/p>/);
assert.doesNotMatch(html, /完整场景库用于发现机会/);
```

```js
assert.match(css, /\.directory-hero h1\s*\{[^}]*font-size:\s*clamp\(56px,\s*6\.5vw,\s*96px\)/s);
assert.match(css, /\.directory-lede\s*\{[^}]*font-size:\s*24px/s);
assert.match(css, /@media\s*\(max-width:\s*390px\)[\s\S]*\.directory-hero h1\s*\{[^}]*font-size:\s*48px/s);
assert.match(css, /@media\s*\(max-width:\s*390px\)[\s\S]*\.directory-lede\s*\{[^}]*font-size:\s*18px/s);
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
node --test tests/web/static-contract.test.mjs tests/radars/static-pages.test.mjs
```

Expected: FAIL because the old knowledge title, long radar subtitle, and old `132px / 19px` typography are still present.

- [ ] **Step 3: Apply the approved copy**

Change the knowledge heading in `web/index.html` to:

```html
<h1 id="knowledge-heading">AI 行业报告知识库，<br>洞察皆有出处。</h1>
```

Change the radar directory lede in `web/radars/index.html` to:

```html
<p class="directory-lede">在你的行业，发现 AI 机会。</p>
```

- [ ] **Step 4: Apply the approved type ratio**

In `web/radars/radar.css`, keep the shared radar detail heading rule unchanged and override only the directory page:

```css
.directory-hero h1 {
  max-width: none;
  font-size: clamp(56px, 6.5vw, 96px);
}

.directory-lede {
  max-width: 52em;
  margin: 38px 0 0;
  color: #b7c5bc;
  font-size: 24px;
}
```

In the existing `@media (max-width: 390px)` block, use:

```css
.directory-hero h1 { font-size: 48px; }
.directory-lede { font-size: 18px; }
```

- [ ] **Step 5: Run tests and confirm GREEN**

Run:

```bash
node --test tests/web/static-contract.test.mjs tests/radars/static-pages.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the hero changes**

```bash
git add tests/web/static-contract.test.mjs tests/radars/static-pages.test.mjs web/index.html web/radars/index.html web/radars/radar.css
git commit -m "feat: clarify knowledge and radar hero copy"
```

### Task 2: Add the live two-level radar navigation

**Files:**
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.js`

- [ ] **Step 1: Make the test harness retain renderer state**

In `tests/radars/interaction.test.mjs`, replace the final initialization lines in `setup` with:

```js
dom.window.eval(await readFile(rendererUrl, 'utf8'));
dom.radarState = dom.window.OpportunityRadar.initRadar(dom.window.document);
return dom;
```

- [ ] **Step 2: Write failing navigation structure tests**

Add:

```js
test('live radar builds a two-level table of contents from domain data', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const { document } = dom.window;
  assert.ok(document.querySelector('#radar-toc'));
  assert.equal(document.querySelectorAll('[data-toc-section]').length, 3);
  assert.equal(document.querySelectorAll('[data-toc-scenario]').length, 12);
  assert.deepEqual(
    [...document.querySelectorAll('[data-toc-section]')].map((link) => link.textContent.trim()),
    ['优先矩阵', '完整场景库', '优先启动建议'],
  );

  const extended = await setup(await loadRadarFile(fileURLToPath(extendedPath)));
  assert.equal(extended.window.document.querySelectorAll('[data-toc-scenario]').length, 24);
});
```

- [ ] **Step 3: Write failing navigation behavior tests**

Add:

```js
test('table of contents can collapse scenarios and jump to a filtered scenario', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const { document } = dom.window;
  const toggle = document.querySelector('#radar-toc-scenario-toggle');
  const list = document.querySelector('#radar-toc-scenarios');
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(list.hidden, true);
  toggle.click();

  document.querySelector('[data-priority-filter="P0"]').click();
  assert.equal(document.querySelector('#legal-07').hidden, true);
  document.querySelector('[data-toc-scenario="legal-07"]').click();
  assert.equal(document.querySelector('#legal-07').hidden, false);
  assert.equal(document.querySelector('#legal-07 .scenario-header').getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement, document.querySelector('#legal-07 .scenario-header'));
  assert.equal(dom.window.location.hash, '#legal-07');
});
```

- [ ] **Step 4: Run the interaction tests and confirm RED**

Run:

```bash
node --test tests/radars/interaction.test.mjs
```

Expected: FAIL because `#radar-toc` and its links do not exist.

- [ ] **Step 5: Add data-driven navigation rendering**

Add these helpers before `renderRadar` in `web/radars/radar.js`:

```js
function sortedTocScenarios(data) {
  return [...data.scenarios].sort((a, b) => a.number.localeCompare(b.number));
}

function setTocActive(state, targetId) {
  if (!state.toc) return;
  state.toc.panel.querySelectorAll('[aria-current]').forEach((link) => link.removeAttribute('aria-current'));
  const active = state.toc.panel.querySelector(`[data-toc-section="${targetId}"], [data-toc-scenario="${targetId}"]`);
  if (active) active.setAttribute('aria-current', 'location');
}

function setLocationHash(state, targetId) {
  const view = state.root.ownerDocument.defaultView;
  if (view?.history?.replaceState) view.history.replaceState(null, '', `#${targetId}`);
}

function closeTocDrawer(state, restoreFocus = false) {
  if (!state.toc) return;
  state.root.ownerDocument.body.classList.remove('radar-toc-open');
  state.toc.trigger.setAttribute('aria-expanded', 'false');
  state.toc.panel.removeAttribute('role');
  state.toc.panel.removeAttribute('aria-modal');
  if (restoreFocus) state.toc.trigger.focus();
}

function renderToc(data, state) {
  const scenarioList = createElement('ol', { className: 'radar-toc-scenarios', attrs: { id: 'radar-toc-scenarios' } });
  for (const scenario of sortedTocScenarios(data)) {
    const link = createElement('a', {
      text: `${scenario.number} ${scenario.title}`,
      attrs: { href: `#${scenario.id}`, 'data-toc-scenario': scenario.id },
    });
    link.addEventListener('click', (event) => {
      event.preventDefault();
      jumpToScenario(state, scenario.id);
      setLocationHash(state, scenario.id);
      setTocActive(state, scenario.id);
      closeTocDrawer(state, false);
    });
    scenarioList.append(createElement('li', {}, [link]));
  }

  const scenarioToggle = createElement('button', {
    text: '场景列表 ▾',
    attrs: { type: 'button', id: 'radar-toc-scenario-toggle', 'aria-label': '展开或收起场景列表', 'aria-expanded': 'true', 'aria-controls': 'radar-toc-scenarios' },
  });
  scenarioToggle.addEventListener('click', () => {
    const expanded = scenarioToggle.getAttribute('aria-expanded') === 'true';
    scenarioToggle.setAttribute('aria-expanded', String(!expanded));
    scenarioList.hidden = expanded;
  });

  const sectionLinks = [
    ['priority-matrix', '优先矩阵'],
    ['scenario-portfolio', '完整场景库'],
    ['priority-starts', '优先启动建议'],
  ].map(([id, label]) => {
    const link = createElement('a', { text: label, attrs: { href: `#${id}`, 'data-toc-section': id } });
    link.addEventListener('click', () => {
      setLocationHash(state, id);
      setTocActive(state, id);
      closeTocDrawer(state, false);
    });
    return link;
  });

  const closeButton = createElement('button', { className: 'radar-toc-close', text: '×', attrs: { type: 'button', 'aria-label': '关闭目录' } });
  const panel = createElement('aside', { className: 'radar-toc-panel', attrs: { id: 'radar-toc', 'aria-labelledby': 'radar-toc-title' } }, [
    createElement('div', { className: 'radar-toc-head' }, [createElement('strong', { text: '本页目录', attrs: { id: 'radar-toc-title' } }), closeButton]),
    createElement('nav', { attrs: { 'aria-label': '雷达页面目录' } }, [
      sectionLinks[0],
      createElement('div', { className: 'radar-toc-scenario-group' }, [sectionLinks[1], scenarioToggle, scenarioList]),
      sectionLinks[2],
    ]),
  ]);
  const trigger = createElement('button', { className: 'radar-toc-trigger', text: '目录', attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'radar-toc' } });
  const backdrop = createElement('button', { className: 'radar-toc-backdrop', attrs: { type: 'button', 'aria-label': '关闭目录', tabindex: '-1' } });
  state.toc = { panel, trigger, backdrop, closeButton, scenarioList, scenarioToggle };
  return [trigger, backdrop, panel];
}
```

When rendering the scenario group, keep the visible section link and the collapse control as separate controls; label the collapse control `展开或收起场景列表` with `aria-label` if visual styling uses only a chevron.

- [ ] **Step 6: Integrate navigation into renderer state**

Change the state initialization and render sequence to:

```js
const state = {
  root, data, cards: new Map(), points: new Map(), filters: { priority: 'all', category: 'all' },
  sortMode: 'number', count: null, empty: null, filterPanel: null, list: null,
  inspectorContent: null, selectedScenarioId: null, toc: null, tocObserver: null,
};
root.ownerDocument.body.classList.add('radar-detail-page');
const hero = renderHero(data);
const matrix = renderMatrix(data, state);
const portfolio = renderPortfolio(data, state);
const roadmap = renderRoadmap(data);
const toc = renderToc(data, state);
root.replaceChildren(...toc, hero, matrix, portfolio, roadmap);
```

`renderPortfolio` must run before `renderToc` so `state.cards` is ready when a scenario directory link is clicked.

- [ ] **Step 7: Run the interaction tests and confirm GREEN**

Run:

```bash
node --test tests/radars/interaction.test.mjs
```

Expected: PASS for navigation counts, collapse state, filter reset, scenario expansion, focus, and hash.

- [ ] **Step 8: Commit live navigation structure**

```bash
git add tests/radars/interaction.test.mjs web/radars/radar.js
git commit -m "feat: add two-level radar navigation"
```

### Task 3: Add desktop, mobile, and active-reading behavior

**Files:**
- Modify: `tests/radars/static-pages.test.mjs`
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.css`
- Modify: `web/radars/radar.js`

- [ ] **Step 1: Write failing responsive style contracts**

Add to the shared-style test:

```js
assert.match(css, /\.radar-toc-panel\s*\{[^}]*position:\s*fixed/s);
assert.match(css, /@media\s*\(min-width:\s*1100px\)[\s\S]*\.radar-toc-trigger[^}]*display:\s*none/s);
assert.match(css, /@media\s*\(max-width:\s*1099px\)[\s\S]*\.radar-toc-panel[^}]*transform:\s*translateX\(-/s);
assert.match(css, /body\.radar-toc-open[\s\S]*overflow:\s*hidden/s);
assert.match(css, /@media\s+print[\s\S]*\.radar-toc-panel[\s\S]*display:\s*none\s*!important/s);
```

- [ ] **Step 2: Write failing drawer and active-state tests**

Add:

```js
test('mobile table of contents opens, closes, restores focus, and marks the active item', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const { document } = dom.window;
  const trigger = document.querySelector('.radar-toc-trigger');
  const panel = document.querySelector('#radar-toc');
  trigger.click();
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(document.body.classList.contains('radar-toc-open'), true);
  assert.equal(panel.getAttribute('role'), 'dialog');
  document.querySelector('.radar-toc-backdrop').click();
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, trigger);

  dom.window.OpportunityRadar.setTocActive(dom.radarState, 'legal-04');
  assert.equal(document.querySelector('[data-toc-scenario="legal-04"]').getAttribute('aria-current'), 'location');
});
```

- [ ] **Step 3: Run focused tests and confirm RED**

Run:

```bash
node --test tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs
```

Expected: FAIL because drawer state, active-state API, and responsive styles are not implemented.

- [ ] **Step 4: Implement drawer state and keyboard handling**

Add:

```js
function closeTocDrawer(state, restoreFocus = true) {
  if (!state.toc) return;
  const { panel, trigger } = state.toc;
  state.root.ownerDocument.body.classList.remove('radar-toc-open');
  trigger.setAttribute('aria-expanded', 'false');
  panel.removeAttribute('role');
  panel.removeAttribute('aria-modal');
  if (restoreFocus) trigger.focus();
}

function openTocDrawer(state) {
  const { panel, trigger, closeButton } = state.toc;
  state.root.ownerDocument.body.classList.add('radar-toc-open');
  trigger.setAttribute('aria-expanded', 'true');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  closeButton.focus();
}

function bindTocControls(state) {
  const { trigger, closeButton, backdrop } = state.toc;
  trigger.addEventListener('click', () => openTocDrawer(state));
  closeButton.addEventListener('click', () => closeTocDrawer(state));
  backdrop.addEventListener('click', () => closeTocDrawer(state));
  state.root.ownerDocument.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.root.ownerDocument.body.classList.contains('radar-toc-open')) closeTocDrawer(state);
  });
}
```

Call `bindTocControls(state)` after `root.replaceChildren`.

- [ ] **Step 5: Implement active-reading observation and initial hash**

Replace Task 2's minimal `closeTocDrawer` helper with the version above, then add:

```js
function observeToc(state) {
  const ViewObserver = state.root.ownerDocument.defaultView?.IntersectionObserver;
  if (!ViewObserver) return null;
  const observer = new ViewObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setTocActive(state, visible.target.id);
  }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.15, 0.4, 0.75] });
  for (const id of ['priority-matrix', 'scenario-portfolio', 'priority-starts']) {
    const section = state.root.querySelector(`#${id}`);
    if (section) observer.observe(section);
  }
  for (const card of state.cards.values()) observer.observe(card);
  state.tocObserver = observer;
  return observer;
}

function openInitialHash(state) {
  const id = decodeURIComponent(state.root.ownerDocument.defaultView?.location.hash.slice(1) || '');
  if (!id) return;
  if (state.cards.has(id)) jumpToScenario(state, id);
  else if (['priority-matrix', 'scenario-portfolio', 'priority-starts'].includes(id)) state.root.querySelector(`#${id}`)?.scrollIntoView({ block: 'start' });
  setTocActive(state, id);
}
```

Call `observeToc(state)` and schedule `openInitialHash(state)` with `requestAnimationFrame` when available, otherwise call it immediately.

Expose `setTocActive` in `window.OpportunityRadar` so the behavior contract can test the public renderer helper.

- [ ] **Step 6: Add shared desktop and mobile styles**

Add to `web/radars/radar.css`:

```css
.radar-toc-panel {
  position: fixed;
  z-index: 18;
  top: 92px;
  left: 22px;
  width: 258px;
  max-height: calc(100vh - 116px);
  overflow: auto;
  padding: 18px;
  background: rgba(7, 26, 22, .97);
  color: var(--text-on-dark, #edf2ee);
  border: 1px solid var(--line-dark);
  box-shadow: 0 18px 48px rgba(7, 26, 22, .22);
}
.radar-toc-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.radar-toc-head strong { color: var(--signal); font-size: 11px; letter-spacing: .12em; }
.radar-toc-panel nav { display: grid; gap: 4px; }
.radar-toc-panel a, .radar-toc-panel button { width: 100%; padding: 8px 9px; border: 0; background: transparent; color: #c1ccc5; text-align: left; text-decoration: none; cursor: pointer; }
.radar-toc-panel a:hover, .radar-toc-panel button:hover, .radar-toc-panel [aria-current="location"] { color: #edf2ee; background: rgba(169, 183, 122, .12); box-shadow: inset 3px 0 0 var(--signal); }
.radar-toc-scenarios { display: grid; gap: 2px; margin: 2px 0 8px; padding: 0 0 0 12px; list-style: none; }
.radar-toc-scenarios a { font-size: 11px; line-height: 1.35; }
.radar-toc-close { font-size: 22px; text-align: right !important; }
.radar-toc-trigger { position: fixed; z-index: 19; left: 14px; bottom: 18px; min-width: 70px; min-height: 44px; border: 1px solid var(--signal); background: var(--ink); color: white; }
.radar-toc-backdrop { position: fixed; z-index: 17; inset: 0; border: 0; background: rgba(7, 26, 22, .54); }

@media (min-width: 1100px) {
  .radar-toc-trigger, .radar-toc-backdrop, .radar-toc-close { display: none; }
  body.radar-detail-page #radar-app .radar-shell { width: min(calc(100% - 360px), 1280px); margin-left: 320px; margin-right: auto; }
}

@media (max-width: 1099px) {
  .radar-toc-panel { top: 0; left: 0; width: min(340px, 88vw); max-height: 100vh; height: 100vh; transform: translateX(-105%); transition: transform .2s ease; }
  .radar-toc-backdrop { display: none; }
  body.radar-toc-open { overflow: hidden; }
  body.radar-toc-open .radar-toc-panel { transform: translateX(0); }
  body.radar-toc-open .radar-toc-backdrop { display: block; }
}
```

Add `.radar-toc-panel, .radar-toc-trigger, .radar-toc-backdrop` to the existing print-hidden selector.

- [ ] **Step 7: Run focused tests and confirm GREEN**

Run:

```bash
node --test tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit responsive navigation**

```bash
git add tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs web/radars/radar.css web/radars/radar.js
git commit -m "feat: make radar navigation responsive"
```

### Task 4: Add the two-level navigation to standalone HTML exports

**Files:**
- Modify: `tests/radars/interaction.test.mjs`
- Modify: `web/radars/radar.js`

- [ ] **Step 1: Write failing export structure and behavior tests**

Extend the standalone export test:

```js
assert.match(report, /class="export-toc"/);
assert.equal((report.match(/data-export-toc-scenario=/g) || []).length, 12);
for (const id of ['export-priority-matrix', 'export-scenario-portfolio', 'export-priority-starts']) {
  assert.match(report, new RegExp(`id="${id}"`));
}
assert.match(report, /@media print\{[\s\S]*\.export-toc[\s\S]*display:none/);
```

Add a behavior test:

```js
test('standalone export navigation opens and targets a scenario offline', async () => {
  const legal = await loadRadarFile(fileURLToPath(legalPath));
  const dom = await setup(legal);
  const report = dom.window.OpportunityRadar.buildStandaloneReport(legal, new Date('2026-08-24T08:00:00+08:00'));
  const exported = new JSDOM(report, {
    url: 'http://127.0.0.1/legal-export.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) { window.HTMLElement.prototype.scrollIntoView = () => {}; },
  });
  const target = exported.window.document.querySelector('#export-legal-07 details');
  target.open = false;
  exported.window.document.querySelector('[data-export-toc-scenario="legal-07"]').click();
  assert.equal(target.open, true);
  assert.equal(exported.window.location.hash, '#export-legal-07');
});
```

- [ ] **Step 2: Run the export tests and confirm RED**

Run:

```bash
node --test tests/radars/interaction.test.mjs
```

Expected: FAIL because export navigation markup and listeners do not exist.

- [ ] **Step 3: Generate export navigation markup and anchors**

Before the export document template, build:

```js
const exportTocScenarios = data.scenarios
  .slice()
  .sort((a, b) => a.number.localeCompare(b.number))
  .map((scenario) => `<li><a href="#export-${escapeHtml(scenario.id)}" data-export-toc-scenario="${escapeHtml(scenario.id)}">${escapeHtml(scenario.number)} ${escapeHtml(scenario.title)}</a></li>`)
  .join('');
const exportToc = `<aside class="export-toc" aria-labelledby="export-toc-title"><strong id="export-toc-title">本页目录</strong><nav aria-label="雷达报告目录"><a href="#export-priority-matrix">优先矩阵</a><details open><summary>完整场景库</summary><ol>${exportTocScenarios}</ol></details><a href="#export-priority-starts">优先启动建议</a></nav></aside>`;
```

Insert `${exportToc}` immediately after `<body>`. Add the exact IDs `export-priority-matrix`, `export-scenario-portfolio`, and `export-priority-starts` to the three export sections.

- [ ] **Step 4: Add export navigation CSS**

Add to embedded export CSS:

```css
.export-toc{position:fixed;z-index:8;top:20px;left:18px;width:240px;max-height:calc(100vh - 40px);overflow:auto;padding:16px;background:#071a16;color:#edf2ee;border:1px solid #385047}.export-toc strong{color:var(--signal);font-size:11px;letter-spacing:.12em}.export-toc nav{display:grid;gap:4px;margin-top:10px}.export-toc a,.export-toc summary{display:block;padding:7px;color:#c1ccc5;text-decoration:none;cursor:pointer}.export-toc ol{display:grid;gap:2px;margin:0;padding:0 0 0 12px;list-style:none}.export-toc li a{font-size:10px;line-height:1.35}.export-toc a:hover{color:#edf2ee;background:rgba(169,183,122,.12)}
@media(min-width:1100px){body>.hero .shell,body>main .shell,body>.footer .shell{width:min(calc(100% - 340px),1120px);margin-left:300px;margin-right:auto}}
@media(max-width:1099px){.export-toc{position:relative;top:auto;left:auto;width:calc(100% - 28px);max-height:none;margin:14px auto}}
```

Add `.export-toc{display:none!important}` inside the export print block.

- [ ] **Step 5: Extend the offline export script**

Inside the existing export IIFE, add:

```js
document.querySelectorAll('[data-export-toc-scenario]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  const id = link.dataset.exportTocScenario;
  const target = document.querySelector('#export-' + id);
  if (!target) return;
  target.hidden = false;
  const details = target.querySelector('details');
  if (details) details.open = true;
  history.replaceState(null, '', '#export-' + id);
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.querySelector('summary')?.focus();
}));
```

Add `tabindex="-1"` to each exported scenario `<summary>` so the focus move is reliable.

- [ ] **Step 6: Run the export tests and confirm GREEN**

Run:

```bash
node --test tests/radars/interaction.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit export navigation**

```bash
git add tests/radars/interaction.test.mjs web/radars/radar.js
git commit -m "feat: add navigation to radar exports"
```

### Task 5: Verify, deploy, and visually inspect

**Files:**
- Verify: `web/index.html`
- Verify: `web/radars/index.html`
- Verify: `web/radars/radar.css`
- Verify: `web/radars/radar.js`
- Deploy: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/`

- [ ] **Step 1: Run all automated tests**

Run:

```bash
npm test
```

Expected: all tests PASS with no unhandled JSDOM errors.

- [ ] **Step 2: Sync the changed production assets**

```bash
rsync -a web/index.html "/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/index.html"
rsync -a web/radars/index.html web/radars/radar.css web/radars/radar.js "/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/"
```

- [ ] **Step 3: Inspect the knowledge and radar directory heroes**

Open `http://127.0.0.1:4318/` and verify the two-line heading. Open `http://127.0.0.1:4318/radars/index.html` and verify the `96px / 24px` desktop hierarchy and the exact subtitle.

- [ ] **Step 4: Inspect a 12-scenario live radar**

Open `http://127.0.0.1:4318/radars/hr.html`. Verify desktop sticky navigation, section/scenario highlighting, collapse/expand, filter reset, scenario opening, and hash updates.

- [ ] **Step 5: Inspect a 24-scenario live radar at mobile width**

Open `http://127.0.0.1:4318/radars/retail.html` at a viewport below `1100px`. Verify the drawer opens, scrolls internally, closes by link/backdrop/Escape, and returns focus.

- [ ] **Step 6: Inspect standalone exports**

Export HR and retail reports. Verify both contain the left/tall directory, scenario links open the right item offline, and print preview hides navigation.

- [ ] **Step 7: Check the worktree**

Run:

```bash
git status --short
```

Expected: only the pre-existing untracked `.superpowers/` directory remains.
