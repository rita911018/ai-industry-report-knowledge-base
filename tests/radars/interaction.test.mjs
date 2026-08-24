import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { loadRadarFile } from '../../web/radars/validate-data.mjs';

const rendererUrl = new URL('../../web/radars/radar.js', import.meta.url);
const legalPath = new URL('../../web/radars/data/legal.js', import.meta.url);
const hrPath = new URL('../../web/radars/data/hr.js', import.meta.url);
const extendedPath = new URL('./fixtures/extended-radar.js', import.meta.url);

async function setup(data) {
  const dom = new JSDOM('<!doctype html><div id="radar-error" aria-live="assertive" hidden></div><main id="radar-app"></main>', {
    url: 'http://127.0.0.1/radars/legal.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  let scrollCalls = 0;
  dom.window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() { scrollCalls += 1; };
  dom.getScrollCalls = () => scrollCalls;
  if (data) dom.window.OPPORTUNITY_RADAR_DATA = data;
  dom.window.eval(await readFile(rendererUrl, 'utf8'));
  dom.radarState = dom.window.OpportunityRadar.initRadar(dom.window.document);
  return dom;
}

test('shared renderer builds only the four approved decision sections', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('.matrix-point').length, 12);
  assert.equal(document.querySelectorAll('.scenario').length, 12);
  assert.equal(document.querySelectorAll('.pilot').length, 3);
  assert.equal(document.querySelectorAll('.governance-section').length, 0);
  assert.equal(document.querySelectorAll('.calibration-section').length, 0);
  assert.equal(document.querySelectorAll('.sources-section').length, 0);
  assert.match(document.querySelector('.portfolio-section h2').textContent, /AI 能解决哪些业务问题/);
  assert.match(document.querySelector('.roadmap-section h2').textContent, /建议优先启动的 3 个场景/);
  assert.equal(document.querySelector('.matrix-section h2').textContent, '哪些 AI 场景应该优先启动？');
});

test('extended renderer shows the ranked 12 in the matrix and all 24 in the library and export', async () => {
  const extended = await loadRadarFile(fileURLToPath(extendedPath));
  const dom = await setup(extended);
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('.matrix-point').length, 12);
  assert.equal(document.querySelectorAll('.scenario').length, 24);
  assert.ok(document.querySelector('[data-scenario-target="fixture-12"]'));
  assert.equal(document.querySelector('[data-scenario-target="fixture-13"]'), null);
  assert.match(document.querySelector('.matrix-section .section-description').textContent, /前 12 个/);
  assert.match(document.querySelector('.portfolio-section .section-description').textContent, /完整 24 个/);
  assert.equal(document.querySelectorAll('.scenario-badge-core').length, 12);
  assert.equal(document.querySelectorAll('.scenario-badge-observe').length, 12);

  extended.scenarios[23].scorecard.dimensions = { businessValue: 25, processFit: 16, readiness: 12, evidence: 12, riskControl: 14 };
  extended.scenarios[23].scorecard.total = 79;
  const sortedDom = await setup(extended);
  sortedDom.window.document.querySelector('[data-scenario-sort="score"]').click();
  assert.equal(sortedDom.window.document.querySelectorAll('.scenario')[3].id, 'fixture-24');

  document.querySelector('#fixture-01 .scenario-header').click();
  const detail = document.querySelector('#fixture-01 .scenario-detail').textContent;
  assert.match(detail, /第 2 节：流程机会/);
  assert.match(detail, /平均处理时间下降至少 20%/);
  assert.match(detail, /转交具名业务负责人审批/);
  assert.match(detail, /证据置信度：高/);

  const report = dom.window.OpportunityRadar.buildStandaloneReport(extended, new Date('2026-08-24T08:00:00+08:00'));
  assert.equal((report.match(/class="export-scenario"/g) || []).length, 24);
  assert.equal((report.match(/data-export-target=/g) || []).length, 12);
  assert.match(report, /24 个场景完整详情/);
  assert.match(report, /第 2 节：流程机会/);
  assert.match(report, /平均处理时间下降至少 20%/);
});

test('each scenario contains only five linked decision blocks', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const { document } = dom.window;
  const first = document.querySelector('#legal-01');
  first.querySelector('.scenario-header').click();
  assert.deepEqual(
    [...first.querySelectorAll('.detail-block > h4')].map((heading) => heading.textContent),
    ['业务痛点', 'AI 价值｜可以做什么', '主要风险', '证据锚点', '哪些公司做过'],
  );
  assert.equal(first.querySelectorAll('.detail-block ul li').length >= 7, true);
  const evidenceLink = first.querySelector('.evidence-link');
  assert.ok(evidenceLink);
  assert.equal(evidenceLink.target, '_blank');
  assert.equal(evidenceLink.rel, 'noreferrer');
  const caseLink = first.querySelector('.company-case-link');
  assert.ok(caseLink);
  assert.equal(caseLink.target, '_blank');
  assert.equal(caseLink.rel, 'noreferrer');

  const prohibited = document.querySelector('#legal-12');
  assert.match(prohibited.querySelector('.company-cases').textContent, /暂无公开可核验案例/);
});

test('filters, expands, resets, and selects a named matrix point without jumping', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const { document, MouseEvent } = dom.window;
  document.querySelector('[data-priority-filter="P0"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(document.querySelectorAll('.scenario:not([hidden])').length, 3);
  assert.equal(document.querySelector('#scenario-result-count').textContent, '3 个场景');

  const firstHeader = document.querySelector('.scenario-header');
  firstHeader.click();
  assert.equal(firstHeader.getAttribute('aria-expanded'), 'true');
  assert.equal(document.querySelector(`#${firstHeader.getAttribute('aria-controls')}`).hidden, false);

  document.querySelector('[data-category-filter="disputes"]').click();
  assert.equal(document.querySelectorAll('.scenario:not([hidden])').length, 0);
  assert.equal(document.querySelector('#radar-empty').hidden, false);
  document.querySelector('#radar-empty-reset').click();
  assert.equal(document.querySelectorAll('.scenario:not([hidden])').length, 12);

  const point = document.querySelector('[data-scenario-target="legal-07"]');
  assert.match(point.textContent, /07/);
  assert.match(point.textContent, /诉讼证据发现/);
  point.click();
  assert.equal(dom.getScrollCalls(), 0);
  assert.equal(point.getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('[data-scenario-target="legal-01"]').getAttribute('aria-pressed'), 'false');
  const inspector = document.querySelector('.matrix-inspector');
  assert.match(inspector.textContent, /用 AI 从海量材料中找出诉讼和调查关键证据/);
  assert.match(inspector.textContent, /业务痛点/);
  assert.match(inspector.textContent, /AI 价值｜可以做什么/);
  assert.match(inspector.textContent, /主要风险/);
  assert.match(inspector.textContent, /证据锚点/);
  assert.match(inspector.textContent, /哪些公司做过/);
  assert.match(inspector.textContent, /72/);

  inspector.querySelector('.matrix-inspector-jump').click();
  const target = document.querySelector('#legal-07');
  assert.equal(target.querySelector('.scenario-header').getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement, target.querySelector('.scenario-header'));
  assert.equal(dom.getScrollCalls(), 1);
});

test('priority method exposes the five weights, thresholds, and risk red line', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const text = dom.window.document.querySelector('.priority-method').textContent;
  for (const item of ['业务价值 30', '流程适配度 20', '数据与系统准备度 15', '证据与可验收性 15', '风险可控性 20']) assert.match(text, new RegExp(item));
  for (const item of ['P0', '80', 'P1', '65–79', 'P2', '50–64', 'P3', '风险红线']) assert.match(text, new RegExp(item));
  assert.doesNotMatch(dom.window.document.body.textContent, /业务价值 55%/);
});

test('standalone export contains the complete current-domain report and no secrets', async () => {
  const legal = await loadRadarFile(fileURLToPath(legalPath));
  const dom = await setup(legal);
  const report = dom.window.OpportunityRadar.buildStandaloneReport(legal, new Date('2026-08-24T08:00:00+08:00'));
  assert.match(report, /<!doctype html>/i);
  assert.match(report, /企业法务 AI 机会雷达/);
  assert.match(report, /哪些 AI 场景应该优先启动/);
  assert.equal((report.match(/class="export-scenario"/g) || []).length, 12);
  for (const heading of ['业务痛点', 'AI 价值｜可以做什么', '主要风险', '证据锚点', '哪些公司做过']) assert.match(report, new RegExp(heading));
  for (const item of ['业务价值', '流程适配度', '数据与系统准备度', '证据与可验收性', '风险可控性']) assert.match(report, new RegExp(item));
  assert.match(report, /中国建设科技集团/);
  assert.match(report, /https:\/\//);
  assert.match(report, /data-export-target="legal-07"/);
  assert.match(report, /<script>/);
  assert.doesNotMatch(report, /file:\/\/|DEEPSEEK[_ -]?API|API[_ -]?KEY|人力资源 AI 机会雷达/i);

  const hr = await loadRadarFile(fileURLToPath(hrPath));
  const hrReport = dom.window.OpportunityRadar.buildStandaloneReport(hr, new Date('2026-08-24T08:00:00+08:00'));
  assert.match(hrReport, /人力资源 AI 机会雷达/);
  assert.doesNotMatch(hrReport, /企业法务 AI 机会雷达/);
});

test('export button downloads a UTF-8 HTML blob with the current domain filename', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  let capturedBlob;
  let capturedDownload;
  dom.window.URL.createObjectURL = (blob) => { capturedBlob = blob; return 'blob:radar-report'; };
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function click() { capturedDownload = this.download; };
  dom.window.document.querySelector('.radar-export-button').click();
  assert.equal(capturedBlob.type, 'text/html;charset=utf-8');
  assert.match(capturedDownload, /^企业法务-AI机会雷达-\d{4}-\d{2}-\d{2}\.html$/);
});

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

test('missing data displays an explicit error instead of a blank page', async () => {
  const dom = await setup(null);
  assert.equal(dom.window.document.querySelector('#radar-error').hidden, false);
  assert.match(dom.window.document.querySelector('#radar-error').textContent, /雷达数据未加载/);
});
