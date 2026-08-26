(() => {
  'use strict';

  function createElement(tag, { className, text, attrs } = {}, children = []) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    if (attrs) for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value));
    for (const child of children) if (child) element.append(child);
    return element;
  }

  function sectionHead(index, label, title, description) {
    const copy = createElement('div', {}, [createElement('p', { className: 'section-kicker', text: label }), createElement('h2', { text: title })]);
    if (description) copy.append(createElement('p', { className: 'section-description', text: description }));
    return createElement('header', { className: 'radar-section-head' }, [createElement('span', { className: 'section-number', text: index }), copy]);
  }

  function renderTextList(content) {
    if (!Array.isArray(content)) return createElement('p', { text: content || '' });
    return createElement('ul', { className: 'detail-list' }, content.map((item) => createElement('li', { text: item })));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function formatDate(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function exportTextList(content) {
    if (!Array.isArray(content)) return `<p>${escapeHtml(content)}</p>`;
    return `<ul>${content.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function domainName(data) {
    return ({ legal: '企业法务', hr: '人力资源', retail: '零售', supply_chain: '供应链', finance: '财务', marketing: '市场营销' })[data.id] || data.title.replace(/\s*AI\s*机会雷达\s*$/, '');
  }

  function isRankedLibrary(data) {
    return data.schemaVersion === '2.0' || data.libraryMode === 'ranked';
  }

  function matrixScenarios(data) {
    if (!isRankedLibrary(data)) return data.scenarios;
    return data.scenarios.filter((scenario) => Number.isInteger(scenario.matrixRank)).sort((a, b) => a.matrixRank - b.matrixRank);
  }

  function exportEvidence(scenario, data) {
    const links = scenario.evidenceIds.map((id) => data.sources.find((source) => source.id === id)).filter(Boolean).map((source) => `<a class="evidence" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer"><b>${escapeHtml(source.publisher)} · ${escapeHtml(source.evidenceType)}</b><span>${escapeHtml(source.title)}</span><small>证据局限：${escapeHtml(source.limitation)}</small></a>`).join('');
    const confidence = scenario.confidence ? `<p class="evidence-confidence">证据置信度：${escapeHtml(({ high: '高', middle: '中', low: '低' })[scenario.confidence.level] || scenario.confidence.level)}｜${escapeHtml(scenario.confidence.reason)}</p>` : '';
    const facts = Array.isArray(scenario.sourceFacts) ? `<div class="source-facts"><h5>原文事实与定位</h5>${scenario.sourceFacts.map((fact) => `<p><b>${escapeHtml(fact.locator)}</b><span>${escapeHtml(fact.text)}</span></p>`).join('')}</div>` : '';
    return `${confidence}${links}${facts}`;
  }

  function exportCompanyCases(scenario, data) {
    if (!scenario.companyCases.length) return '<p class="empty">暂无公开可核验案例</p>';
    return scenario.companyCases.map((companyCase) => {
      const source = data.sources.find((item) => item.id === companyCase.sourceId);
      return `<a class="evidence" href="${escapeHtml(source?.url || '#')}" target="_blank" rel="noreferrer"><b>${escapeHtml(companyCase.caseType)} · ${escapeHtml(companyCase.market)}${companyCase.market === '中国' ? '企业' : ''}</b><span>${escapeHtml(companyCase.company)}｜${escapeHtml(companyCase.summary)}</span><small>证据局限：${escapeHtml(companyCase.caveat)}</small></a>`;
    }).join('');
  }

  function exportScorecard(scenario) {
    const rows = SCORE_DIMENSIONS.map(([key, label, maximum]) => `<div class="score-row"><span>${escapeHtml(label)}</span><i><em style="width:${(scenario.scorecard.dimensions[key] / maximum) * 100}%"></em></i><b>${scenario.scorecard.dimensions[key]}/${maximum}</b></div>`).join('');
    const confidence = scenario.confidence ? `<small>证据置信度：${escapeHtml(({ high: '高', middle: '中', low: '低' })[scenario.confidence.level] || scenario.confidence.level)}｜${escapeHtml(scenario.confidence.reason)}</small>` : '';
    return `<section class="export-score"><header><span>${escapeHtml(scenario.priority)} · 五维总分</span><strong>${scenario.scorecard.total}</strong></header>${scenario.scorecard.redLine ? '<p class="redline">风险红线：不得让 AI 作最终决定或执行不可逆动作。</p>' : ''}${rows}<p>${escapeHtml(scenario.scorecard.rationale)}</p><small>关键前提：${escapeHtml(scenario.scorecard.prerequisite)}</small>${confidence}</section>`;
  }

  function exportScenarioDetails(scenario, data) {
    const acceptance = Array.isArray(scenario.acceptanceMetrics) ? `<h5>8–12 周验收指标</h5>${exportTextList(scenario.acceptanceMetrics)}` : '';
    const handoff = scenario.humanHandoff ? `<h5>人工接管</h5><p>${escapeHtml(scenario.humanHandoff)}</p>` : '';
    return `<div class="five-details"><section><h4>业务痛点</h4>${exportTextList(scenario.problem)}</section><section><h4>AI 价值｜可以做什么</h4>${exportTextList(scenario.aiValue)}${acceptance}</section><section><h4>主要风险</h4>${exportTextList(scenario.risk)}${handoff}</section><section><h4>哪些公司做过</h4><div class="links">${exportCompanyCases(scenario, data)}</div></section><section><h4>证据锚点</h4><div class="links">${exportEvidence(scenario, data)}</div></section></div>`;
  }

  function buildStandaloneReport(data, generatedAt = new Date()) {
    const generatedDate = formatDate(generatedAt);
    const currentDomainName = domainName(data);
    const rankedScenarios = matrixScenarios(data);
    const exportTocScenarios = data.scenarios.slice().sort((a, b) => a.number.localeCompare(b.number)).map((scenario) => `<li><a href="#export-${escapeHtml(scenario.id)}" data-export-toc-scenario="${escapeHtml(scenario.id)}">${escapeHtml(scenario.number)} ${escapeHtml(scenario.title)}</a></li>`).join('');
    const exportToc = `<aside class="export-toc" aria-labelledby="export-toc-title"><strong id="export-toc-title">本页目录</strong><nav aria-label="雷达报告目录"><a href="#export-priority-matrix">优先矩阵</a><a href="#export-scenario-portfolio">完整场景库</a><details open><summary>场景列表</summary><ol>${exportTocScenarios}</ol></details><a href="#export-priority-starts">优先启动建议</a></nav></aside>`;
    const matrixPoints = rankedScenarios.map((scenario) => `<button class="${escapeHtml(scenario.priority.toLowerCase())}" type="button" data-export-target="${escapeHtml(scenario.id)}" aria-pressed="${scenario === rankedScenarios[0] ? 'true' : 'false'}" style="--x:${scenario.matrix.x}%;top:${scenario.matrix.y}%"><b>${escapeHtml(scenario.number)}</b><span>${escapeHtml(scenario.shortTitle)}</span></button>`).join('');
    const templates = rankedScenarios.map((scenario) => `<template id="export-template-${escapeHtml(scenario.id)}"><div class="inspector-head"><span>${escapeHtml(scenario.priority)} · ${escapeHtml(scenario.number)}</span><h3>${escapeHtml(scenario.title)}</h3></div>${exportScorecard(scenario)}${exportScenarioDetails(scenario, data)}<a class="jump" href="#export-${escapeHtml(scenario.id)}">查看该场景完整条目 ↓</a></template>`).join('');
    const priorityFilters = ['全部', 'P0', 'P1', 'P2', 'P3'].map((label) => `<button type="button" data-export-priority="${label === '全部' ? 'all' : label}" aria-pressed="${label === '全部'}">${label}</button>`).join('');
    const categoryFilters = [`<button type="button" data-export-category="all" aria-pressed="true">全部类别</button>`, ...Object.entries(data.categoryLabels || {}).map(([value, label]) => `<button type="button" data-export-category="${escapeHtml(value)}" aria-pressed="false">${escapeHtml(label)}</button>`)].join('');
    const scenarios = data.scenarios.map((scenario) => `<article class="export-scenario" id="export-${escapeHtml(scenario.id)}" data-priority="${escapeHtml(scenario.priority)}" data-category="${escapeHtml(scenario.category)}"><details open><summary><span>${escapeHtml(scenario.number)}</span><b>${escapeHtml(scenario.priority)}</b><h3>${escapeHtml(scenario.title)}</h3><strong>${scenario.scorecard.total} 分</strong></summary>${exportScorecard(scenario)}${exportScenarioDetails(scenario, data)}</details></article>`).join('');
    const pilots = data.pilots.map((pilot, index) => {
      const scenario = data.scenarios.find((item) => item.id === pilot.scenarioId) || data.scenarios.filter((item) => item.priority === 'P0')[index];
      return `<article class="pilot"><span>${escapeHtml(pilot.label)}</span><h3>${escapeHtml(pilot.title)}</h3><div><h4>推荐理由</h4><p>${escapeHtml(scenario.scorecard.rationale)}</p><h4>关键前提</h4><p>${escapeHtml(scenario.scorecard.prerequisite)}</p><h4>范围与方案</h4><p>${escapeHtml(pilot.scope)}</p><h4>验收</h4><p>${escapeHtml(pilot.acceptance)}</p></div></article>`;
    }).join('');
    return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(currentDomainName)}-AI机会雷达-${generatedDate}</title>
<style>
:root{--ink:#071a16;--paper:#f4f1e8;--bright:#fffefa;--signal:#a9b77a;--signal-strong:#718052;--text-on-dark:#edf2ee;--text-muted-dark:#c1ccc5;--sage:#9eaa8b;--line:#ccd2c5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--paper)}*{box-sizing:border-box}body{margin:0;line-height:1.6}a{color:inherit}.shell{width:min(calc(100% - 48px),1280px);margin:auto}.export-toc{position:fixed;z-index:8;top:20px;left:18px;width:240px;max-height:calc(100vh - 40px);overflow:auto;padding:16px;background:var(--ink);color:#eef6f1;border:1px solid #385047}.export-toc strong{display:block;margin-bottom:12px;color:var(--signal);font-size:11px;letter-spacing:.12em}.export-toc nav{display:grid;gap:10px}.export-toc a,.export-toc summary{color:#eef6f1;font-size:13px;font-weight:700}.export-toc summary{cursor:pointer}.export-toc ol{margin:8px 0 0;padding-left:20px}.export-toc li{margin:5px 0}.export-toc li a{display:block;font-size:11px;font-weight:500;line-height:1.45;text-decoration:none}.export-toc a:hover,.export-toc a:focus-visible,.export-toc summary:hover{color:var(--signal)}.hero{padding:76px 0;background:var(--ink);color:white}.eyebrow{color:var(--signal);font-size:11px;font-weight:800;letter-spacing:.16em}.hero h1{max-width:11ch;margin:14px 0 24px;font:500 clamp(48px,8vw,104px)/.92 Georgia,"Songti SC",serif}.hero p{max-width:58em;color:#c2cec6}.hero .meta{display:flex;gap:24px;flex-wrap:wrap;color:var(--signal);font-weight:700}.section{padding:72px 0}.section h2{margin:0 0 16px;font:500 clamp(36px,5vw,64px)/1 Georgia,"Songti SC",serif}.lede{max-width:60em;color:#5f6b64}.matrix-layout{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:42px}.matrix{position:relative;height:620px;border-left:1px solid;border-bottom:1px solid;background:linear-gradient(90deg,transparent 49.9%,#dfe2da 50%,transparent 50.1%),linear-gradient(transparent 49.9%,#dfe2da 50%,transparent 50.1%)}.matrix button{position:absolute;left:clamp(42px,var(--x),calc(100% - 42px));width:84px;min-width:84px;max-width:84px;min-height:40px;transform:translate(-50%,-50%);display:grid;grid-template-columns:24px minmax(0,1fr);gap:4px;align-items:center;padding:3px 4px;border:1px solid transparent;border-radius:5px;background:transparent;color:var(--ink);text-align:left;box-shadow:none;cursor:pointer}.matrix button:hover,.matrix button:focus-visible,.matrix button[aria-pressed=true]{z-index:3;background:var(--ink);color:var(--signal);box-shadow:0 14px 30px rgba(7,26,22,.24)}.matrix button[aria-pressed=true]{outline:3px solid var(--signal)}.matrix button b{display:grid;place-items:center;width:24px;height:24px;border:1px solid;border-radius:50%;background:var(--bright);font-size:10px}.matrix button.p0 b{background:var(--signal);color:var(--ink)}.matrix button.p3 b{border-style:dashed}.matrix button span{font-size:9.5px;font-weight:750;line-height:1.15}.inspector{max-height:620px;overflow:auto;padding:28px;background:var(--ink);color:white}.inspector-head span,.export-score header span{color:var(--signal);font-size:11px;font-weight:800}.inspector-head h3{font:500 30px/1.15 Georgia,"Songti SC",serif}.export-score{padding:18px 0;border-block:1px solid #385047}.export-score header{display:flex;justify-content:space-between}.export-score header strong{color:var(--signal);font:500 42px/1 Georgia,serif}.score-row{display:grid;grid-template-columns:120px 1fr 48px;gap:10px;align-items:center;font-size:10px;margin:7px 0}.score-row i{height:5px;background:#294139}.score-row em{display:block;height:100%;background:var(--signal)}.export-score p,.export-score small{font-size:11px;color:#c6d1ca}.redline{padding:8px;border-left:3px solid #f2a65a;color:#ffd0a4!important}.five-details{display:grid;gap:1px;background:#385047;margin-top:18px}.five-details>section{padding:18px;background:#12352c}.five-details h4,.pilot h4{margin:0 0 8px;color:var(--signal);font-size:10px;letter-spacing:.1em}.five-details p,.five-details li{font-size:12px;color:#d2dcd5}.five-details ul{padding-left:18px}.links{display:grid;gap:8px}.evidence{display:grid;gap:5px;padding:12px;border:1px solid #496158;text-decoration:none;color:var(--text-on-dark)}.evidence b{color:var(--signal);font-size:9px}.evidence span{color:var(--text-on-dark);font-size:12px}.evidence small{color:var(--text-muted-dark);font-size:10px}.jump{display:block;margin-top:18px;padding:12px;background:var(--signal);text-align:center;text-decoration:none;font-weight:800}.method{padding:30px;margin:36px 0;background:var(--ink);color:white}.method-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#385047}.method-grid span{padding:15px;background:#12352c;color:var(--signal);font-size:11px;font-weight:800}.filters{display:flex;flex-wrap:wrap;gap:8px;margin:28px 0}.filters button{padding:8px 12px;border:1px solid;background:transparent}.filters button[aria-pressed=true]{background:var(--ink);color:var(--signal)}.export-scenario{border-top:1px solid var(--line)}.export-scenario summary{display:grid;grid-template-columns:36px 42px 1fr auto;gap:14px;align-items:center;padding:20px 0;cursor:pointer}.export-scenario summary h3{margin:0;font:500 22px/1.25 Georgia,"Songti SC",serif}.export-scenario details>.export-score,.export-scenario details>.five-details{margin-left:78px}.export-scenario details>.export-score{color:var(--ink);border-color:var(--line)}.export-scenario details>.export-score header span{color:#1f4b3f}.export-scenario details>.export-score header strong{color:var(--signal-strong)}.export-scenario details>.export-score .score-row em{background:var(--signal-strong)}.export-scenario details>.five-details{margin-bottom:28px}.pilot{display:grid;grid-template-columns:150px 260px 1fr;gap:24px;padding:28px 0;border-top:1px solid var(--line)}.pilot span{font-size:10px;font-weight:800}.pilot h3{margin:0;font:500 27px/1.1 Georgia,"Songti SC",serif}.pilot div{display:grid;grid-template-columns:110px 1fr;gap:8px 18px}.pilot h4{color:#1f4b3f}.pilot p{margin:0;font-size:12px}.footer{padding:30px 0;background:var(--ink);color:#b7c5bc;font-size:11px}@media(min-width:1100px){.hero .shell,main>.section>.shell,.footer .shell{width:auto;max-width:1280px;margin-left:282px;margin-right:24px}}@media(max-width:1099px){.export-toc{position:relative;top:auto;left:auto;width:calc(100% - 28px);max-height:none;overflow:visible;margin:14px auto}}@media(max-width:760px){.shell{width:calc(100% - 28px)}.matrix-layout{grid-template-columns:1fr}.matrix{height:auto;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;border:1px solid var(--ink);background:none}.matrix button{position:static;left:auto;top:auto;width:100%;min-width:0;max-width:none;min-height:46px;transform:none;border:1px solid var(--ink);background:var(--bright)}.matrix button.p0{background:var(--signal)}.matrix button.p3{border-style:dashed}.matrix button:hover,.matrix button:focus-visible,.matrix button[aria-pressed=true]{background:var(--ink)}.inspector{max-height:none}.method-grid{grid-template-columns:1fr 1fr}.export-scenario summary{grid-template-columns:30px 38px 1fr}.export-scenario summary>strong{display:none}.export-scenario details>.export-score,.export-scenario details>.five-details{margin-left:0}.pilot{grid-template-columns:1fr}.pilot div{grid-template-columns:1fr}.score-row{grid-template-columns:105px 1fr 44px}}@media print{.export-toc{display:none!important}body>.hero .shell,body>main .shell,body>.footer .shell{width:100%;margin-left:auto!important;margin-right:auto!important}.hero{padding:24px 0;background:white;color:#111}.hero p{color:#333}.matrix-layout,.filters,.jump{display:none}.section{padding:28px 0}.export-scenario{break-inside:avoid}.export-scenario details{display:block}.five-details>section{background:white;border:1px solid #aaa}.five-details h4,.five-details p,.five-details li,.evidence,.evidence b,.evidence span,.evidence small{color:#111}.footer{background:white;color:#333}a[href^="http"]:after{content:" (" attr(href) ")";font-size:8px;word-break:break-all}}
@media print{body>.hero .shell,body>main .shell,body>.footer .shell{width:100%!important;max-width:none!important;margin-left:auto!important;margin-right:auto!important}}
</style></head><body>${exportToc}<header class="hero"><div class="shell"><p class="eyebrow">${escapeHtml(data.eyebrow)} · 完整离线报告</p><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.coreJudgment)}</p><div class="meta"><span>${data.scenarioCount} 个场景</span><span>${data.p0Count} 个 P0</span><span>生成日期 ${generatedDate}</span><span>数据更新 ${escapeHtml(data.updatedAt)}</span></div></div></header>
<main><section class="section" id="export-priority-matrix"><div class="shell"><h2>哪些 AI 场景应该优先启动？</h2><p class="lede">先看业务价值和落地可行性，再通过证据与风险门槛。点击点位，在右侧查看完整判断。</p><div class="matrix-layout"><div class="matrix" aria-label="业务价值与落地可行性矩阵">${matrixPoints}</div><aside class="inspector" id="export-inspector"></aside></div>${templates}</div></section>
<section class="section" id="export-scenario-portfolio"><div class="shell"><h2>${data.scenarioCount} 个场景完整详情</h2><div class="method"><h3>五维评分与风险红线</h3><div class="method-grid">${SCORE_DIMENSIONS.map(([, label, maximum]) => `<span>${escapeHtml(label)} ${maximum}%</span>`).join('')}</div><p>P0：≥80 且无红线 · P1：65–79 · P2：50–64 或仍有关键前置条件 · P3：风险红线覆盖总分。</p></div><div class="filters">${priorityFilters}${categoryFilters}</div><div id="export-scenarios">${scenarios}</div></div></section>
<section class="section" id="export-priority-starts"><div class="shell"><h2>建议优先启动的 ${data.pilots.length} 个场景</h2>${pilots}</div></section></main><footer class="footer"><div class="shell">${escapeHtml(currentDomainName)} AI 机会雷达 · 单文件离线报告 · 外部链接保留至公开原文。本报告是内部决策工具，不替代法律、隐私或就业合规意见。</div></footer>
<script>(function(){const inspector=document.querySelector('#export-inspector');function select(id){const template=document.getElementById('export-template-'+id);if(!template)return;inspector.replaceChildren(template.content.cloneNode(true));document.querySelectorAll('[data-export-target]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.exportTarget===id)))}document.querySelectorAll('[data-export-target]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.exportTarget)));let priority='all',category='all';function filter(){document.querySelectorAll('.export-scenario').forEach(card=>{card.hidden=!((priority==='all'||card.dataset.priority===priority)&&(category==='all'||card.dataset.category===category))})}function setPriority(value){priority=value;document.querySelectorAll('[data-export-priority]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.exportPriority===value)))}function setCategory(value){category=value;document.querySelectorAll('[data-export-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.exportCategory===value)))}function resetFilters(){setPriority('all');setCategory('all');filter()}document.querySelectorAll('[data-export-priority]').forEach(button=>button.addEventListener('click',()=>{setPriority(button.dataset.exportPriority);filter()}));document.querySelectorAll('[data-export-category]').forEach(button=>button.addEventListener('click',()=>{setCategory(button.dataset.exportCategory);filter()}));document.querySelectorAll('[data-export-toc-scenario]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const target=document.getElementById('export-'+link.dataset.exportTocScenario);if(!target)return;resetFilters();const details=target.querySelector('details');if(details)details.open=true;const hash='#'+encodeURIComponent(target.id);try{if(window.history&&window.history.replaceState)window.history.replaceState(null,'',hash);else window.location.hash=hash}catch(error){try{window.location.hash=hash}catch(ignore){}}const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(target.scrollIntoView)target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});const summary=target.querySelector('summary');if(summary)summary.focus()}));const initial=document.querySelector('[data-export-target]');if(initial)select(initial.dataset.exportTarget)})();</script></body></html>`;
  }

  function downloadStandaloneReport(data) {
    const date = formatDate(new Date());
    const currentDomainName = domainName(data);
    const blob = new Blob([buildStandaloneReport(data)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = createElement('a', { attrs: { href: url, download: `${currentDomainName}-AI机会雷达-${date}.html` } });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function renderHero(data) {
    const action = createElement('a', { className: 'radar-hero-action', text: '查看优先级矩阵 ↓', attrs: { href: '#priority-matrix' } });
    const exportButton = createElement('button', { className: 'radar-export-button', text: '导出完整 HTML', attrs: { type: 'button', title: `导出矩阵、${data.scenarioCount} 个场景、证据与公司案例` } });
    exportButton.addEventListener('click', () => downloadStandaloneReport(data));
    const companyCaseCount = data.scenarios.reduce((total, scenario) => total + scenario.companyCases.length, 0);
    const stats = createElement('div', { className: 'radar-hero-stats', attrs: { 'aria-label': '核心数字' } }, [
      createElement('div', { className: 'radar-stat' }, [createElement('strong', { text: String(data.p0Count).padStart(2, '0') }), createElement('span', { text: '个 P0 场景立即立项' })]),
      createElement('div', { className: 'radar-stat' }, [createElement('strong', { text: String(data.scenarioCount) }), createElement('span', { text: '个场景完成排序' })]),
      createElement('div', { className: 'radar-stat' }, [createElement('strong', { text: String(companyCaseCount).padStart(2, '0') }), createElement('span', { text: '条可核验公司实践' })]),
    ]);
    return createElement('section', { className: 'radar-hero', attrs: { 'aria-labelledby': 'radar-title' } }, [
      createElement('div', { className: 'radar-shell radar-hero-grid' }, [
        createElement('div', { className: 'radar-hero-copy' }, [createElement('p', { className: 'radar-eyebrow', text: data.eyebrow }), createElement('h1', { text: data.title, attrs: { id: 'radar-title' } }), createElement('p', { className: 'radar-hero-lede', text: '从业务问题出发，逐项查看 AI 能做什么、主要风险、证据和已有公司实践。' }), createElement('div', { className: 'radar-hero-actions' }, [action, exportButton]), createElement('small', { className: 'radar-export-note', text: `导出包含矩阵、完整 ${data.scenarioCount} 个场景、证据与公司案例` })]),
        stats,
      ]),
      createElement('div', { className: 'decision-strip' }, [createElement('div', { className: 'radar-shell' }, [createElement('strong', { text: '核心判断' }), createElement('p', { text: data.coreJudgment })])]),
    ]);
  }

  function renderMatrix(data, state) {
    const matrix = createElement('div', { className: 'matrix', attrs: { role: 'group', 'aria-label': '业务价值与落地可行性矩阵' } });
    for (const scenario of matrixScenarios(data)) {
      const point = createElement('button', {
        className: `matrix-point ${scenario.priority.toLowerCase()}`,
        attrs: { type: 'button', 'data-scenario-target': scenario.id, 'aria-label': `${scenario.title}，${scenario.priority}，价值 ${scenario.value}，可行性 ${scenario.feasibility}`, 'aria-pressed': 'false' },
      }, [createElement('span', { className: 'matrix-point-number', text: scenario.number }), createElement('span', { className: 'matrix-point-title', text: scenario.shortTitle })]);
      point.style.setProperty('--x', `${scenario.matrix.x}%`);
      point.style.setProperty('--y', `${scenario.matrix.y}%`);
      point.addEventListener('click', () => activateMatrixPoint(state, scenario.id));
      matrix.append(point);
      state.points.set(scenario.id, point);
    }
    const matrixWrap = createElement('div', { className: 'matrix-wrap' }, [
      createElement('span', { className: 'axis axis-y', text: '业务价值 →' }),
      createElement('span', { className: 'axis axis-x', text: '落地可行性 →' }),
      matrix,
    ]);
    const inspectorContent = createElement('div', { className: 'matrix-inspector-content', attrs: { 'aria-live': 'polite' } });
    state.inspectorContent = inspectorContent;
    const inspector = createElement('aside', { className: 'matrix-inspector' }, [inspectorContent]);
    return createElement('section', { className: 'radar-section matrix-section', attrs: { id: 'priority-matrix' } }, [
      createElement('div', { className: 'radar-shell' }, [sectionHead('01', 'PRIORITY', '哪些 AI 场景应该优先启动？', `${isRankedLibrary(data) ? '矩阵展示前 12 个场景；' : ''}先看业务价值和落地可行性，再通过证据与风险门槛。点击点位，在右侧查看完整判断。`), createElement('div', { className: 'matrix-layout' }, [matrixWrap, inspector])]),
    ]);
  }

  function detailBlock(label, content, full = false, className = '') {
    const body = content && typeof content.nodeType === 'number' ? content : renderTextList(content);
    return createElement('div', { className: `detail-block${full ? ' detail-full' : ''}${className ? ` ${className}` : ''}` }, [createElement('h4', { text: label }), body]);
  }

  const SCORE_DIMENSIONS = [
    ['businessValue', '业务价值', 30],
    ['processFit', '流程适配度', 20],
    ['readiness', '数据与系统准备度', 15],
    ['evidence', '证据与可验收性', 15],
    ['riskControl', '风险可控性', 20],
  ];

  function renderScorecard(scenario, compact = false) {
    const rows = createElement('div', { className: 'scorecard-rows' });
    for (const [key, label, maximum] of SCORE_DIMENSIONS) {
      const score = scenario.scorecard.dimensions[key];
      rows.append(createElement('div', { className: 'scorecard-row' }, [
        createElement('span', { text: label }),
        createElement('span', { className: 'scorecard-track' }, [createElement('i', { attrs: { style: `--score-width:${(score / maximum) * 100}%` } })]),
        createElement('strong', { text: `${score}/${maximum}` }),
      ]));
    }
    const card = createElement('div', { className: `scorecard${compact ? ' scorecard-compact' : ''}` }, [
      createElement('div', { className: 'scorecard-total' }, [createElement('span', { text: `${scenario.priority} · 五维总分` }), createElement('strong', { text: String(scenario.scorecard.total) })]),
      rows,
      createElement('p', { className: 'scorecard-rationale', text: scenario.scorecard.rationale }),
      createElement('p', { className: 'scorecard-prerequisite', text: `关键前提：${scenario.scorecard.prerequisite}` }),
    ]);
    if (scenario.confidence) card.append(createElement('p', { className: 'scorecard-confidence', text: `证据置信度：${({ high: '高', middle: '中', low: '低' })[scenario.confidence.level] || scenario.confidence.level}｜${scenario.confidence.reason}` }));
    if (scenario.scorecard.redLine) card.prepend(createElement('p', { className: 'scorecard-redline', text: '风险红线：不得让 AI 作最终决定或执行不可逆动作。' }));
    return card;
  }

  function sourceLink(source, className) {
    return createElement('a', { className, attrs: { href: source.url, target: '_blank', rel: 'noreferrer' } }, [
      createElement('span', { className: 'decision-link-meta', text: `${source.publisher} · ${source.evidenceType}` }),
      createElement('strong', { text: source.title }),
      createElement('small', { text: source.limitation }),
      createElement('span', { className: 'decision-link-action', text: '查看原文 ↗' }),
    ]);
  }

  function renderEvidence(scenario, data) {
    const list = createElement('div', { className: 'evidence-links' });
    if (scenario.confidence) list.append(createElement('p', { className: 'evidence-confidence', text: `证据置信度：${({ high: '高', middle: '中', low: '低' })[scenario.confidence.level] || scenario.confidence.level}｜${scenario.confidence.reason}` }));
    for (const id of scenario.evidenceIds) {
      const source = data.sources.find((item) => item.id === id);
      if (source) list.append(sourceLink(source, 'evidence-link decision-link'));
    }
    if (Array.isArray(scenario.sourceFacts)) {
      const facts = createElement('div', { className: 'source-facts' }, [createElement('h5', { text: '原文事实与定位' })]);
      for (const fact of scenario.sourceFacts) facts.append(createElement('div', { className: 'source-fact' }, [createElement('strong', { text: fact.locator }), createElement('p', { text: fact.text })]));
      list.append(facts);
    }
    return list;
  }

  function renderAiValue(scenario) {
    const content = createElement('div', { className: 'ai-value-detail' }, [renderTextList(scenario.aiValue)]);
    if (Array.isArray(scenario.acceptanceMetrics)) content.append(createElement('h5', { text: '8–12 周验收指标' }), renderTextList(scenario.acceptanceMetrics));
    return content;
  }

  function renderRisk(scenario) {
    const content = createElement('div', { className: 'risk-content' }, [renderTextList(scenario.risk)]);
    if (scenario.humanHandoff) content.append(createElement('h5', { text: '人工接管' }), createElement('p', { text: scenario.humanHandoff }));
    return content;
  }

  function renderCompanyCases(scenario, data) {
    const list = createElement('div', { className: 'company-cases' });
    if (scenario.companyCases.length === 0) {
      list.append(createElement('p', { className: 'company-case-empty', text: '暂无公开可核验案例' }));
      return list;
    }
    for (const companyCase of scenario.companyCases) {
      const source = data.sources.find((item) => item.id === companyCase.sourceId);
      const card = createElement('a', { className: 'company-case-link decision-link', attrs: { href: source.url, target: '_blank', rel: 'noreferrer' } }, [
        createElement('span', { className: 'decision-link-meta', text: `${companyCase.caseType} · ${companyCase.market}${companyCase.market === '中国' ? '企业' : ''}` }),
        createElement('strong', { text: companyCase.company }),
        createElement('span', { className: 'company-case-summary', text: companyCase.summary }),
        createElement('small', { text: `证据局限：${companyCase.caveat}` }),
        createElement('span', { className: 'decision-link-action', text: '查看案例 ↗' }),
      ]);
      list.append(card);
    }
    return list;
  }

  function renderInspectorScenario(scenario, data, state) {
    const jump = createElement('button', { className: 'matrix-inspector-jump', text: '查看全部详情 ↓', attrs: { type: 'button' } });
    jump.addEventListener('click', () => jumpToScenario(state, scenario.id));
    return createElement('div', { className: 'matrix-inspector-scenario' }, [
      createElement('div', { className: 'matrix-inspector-head' }, [
        createElement('span', { className: `priority ${scenario.priority.toLowerCase()}`, text: scenario.priority }),
        createElement('span', { className: 'matrix-inspector-number', text: scenario.number }),
        createElement('h3', { text: scenario.title }),
      ]),
      renderScorecard(scenario, true),
      createElement('div', { className: 'matrix-inspector-details' }, [
        detailBlock('业务痛点', scenario.problem),
        detailBlock('AI 价值｜可以做什么', renderAiValue(scenario)),
        detailBlock('主要风险', renderRisk(scenario), true, 'risk-detail'),
        detailBlock('哪些公司做过', renderCompanyCases(scenario, data), true, 'company-detail'),
        detailBlock('证据锚点', renderEvidence(scenario, data), true, 'evidence-detail'),
      ]),
      jump,
    ]);
  }

  function renderScenario(scenario, data, state) {
    const detailId = `${scenario.id}-detail`;
    const statusClass = scenario.priority === 'P3' || scenario.scorecard.redLine ? 'boundary' : (Number.isInteger(scenario.matrixRank) ? 'core' : 'observe');
    const statusLabel = ({ core: '核心矩阵', observe: '观察', boundary: '风险边界' })[statusClass];
    const titleGroup = createElement('span', { className: 'scenario-title-group' }, [
      createElement('span', { className: 'scenario-title', text: scenario.title }),
      isRankedLibrary(data) ? createElement('small', { className: `scenario-badge scenario-badge-${statusClass}`, text: statusLabel }) : null,
    ]);
    const header = createElement('button', {
      className: 'scenario-header',
      attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': detailId },
    }, [
      createElement('span', { className: 'scenario-index', text: scenario.number }),
      createElement('span', { className: `priority ${scenario.priority.toLowerCase()}`, text: scenario.priority }),
      titleGroup,
      createElement('span', { className: 'scenario-scores' }, [createElement('span', { text: `价值 ${scenario.value.toFixed(1)}` }), createElement('span', { text: `可行性 ${scenario.feasibility.toFixed(1)}` })]),
      createElement('span', { className: 'scenario-chevron', text: '＋', attrs: { 'aria-hidden': 'true' } }),
    ]);
    const detail = createElement('div', { className: 'scenario-detail', attrs: { id: detailId } }, [
      createElement('div', { className: 'detail-grid' }, [
        detailBlock('业务痛点', scenario.problem),
        detailBlock('AI 价值｜可以做什么', renderAiValue(scenario)),
        detailBlock('主要风险', renderRisk(scenario), true, 'risk-detail'),
        detailBlock('哪些公司做过', renderCompanyCases(scenario, data), true, 'company-detail'),
        detailBlock('证据锚点', renderEvidence(scenario, data), true, 'evidence-detail'),
      ]),
    ]);
    detail.hidden = true;
    const card = createElement('article', { className: 'scenario', attrs: { id: scenario.id, 'data-priority': scenario.priority, 'data-category': scenario.category, tabindex: '-1' } }, [header, detail]);
    header.addEventListener('click', () => toggleScenario(card, header.getAttribute('aria-expanded') !== 'true'));
    state.cards.set(scenario.id, card);
    return card;
  }

  function filterButton(label, attribute, value, state) {
    const button = createElement('button', { className: 'filter-button', text: label, attrs: { type: 'button', [attribute]: value, 'aria-pressed': value === 'all' ? 'true' : 'false' } });
    button.addEventListener('click', () => {
      if (attribute === 'data-priority-filter') state.filters.priority = value;
      else state.filters.category = value;
      filterScenarios(state, state.filters);
    });
    return button;
  }

  function resetFilters(state) {
    state.filters = { priority: 'all', category: 'all' };
    filterScenarios(state, state.filters);
  }

  function scenarioEvidenceTime(scenario, data) {
    const timestamps = scenario.evidenceIds
      .map((id) => data.sources.find((source) => source.id === id)?.publishedAt)
      .filter(Boolean)
      .map((value) => Date.parse(`${value}T00:00:00Z`))
      .filter(Number.isFinite);
    return timestamps.length ? Math.max(...timestamps) : null;
  }

  function compareBinaryStrings(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  function sortScenarios(state, mode) {
    state.sortMode = mode;
    const scenarios = [...state.data.scenarios].sort((a, b) => {
      if (mode === 'score') {
        const totalDifference = b.scorecard.total - a.scorecard.total;
        if (totalDifference) return totalDifference;
        const evidenceDifference = b.scorecard.dimensions.evidence - a.scorecard.dimensions.evidence;
        if (evidenceDifference) return evidenceDifference;
        const aTime = scenarioEvidenceTime(a, state.data);
        const bTime = scenarioEvidenceTime(b, state.data);
        if (aTime === null && bTime !== null) return 1;
        if (aTime !== null && bTime === null) return -1;
        if (aTime !== bTime) return bTime - aTime;
        return compareBinaryStrings(a.id, b.id);
      }
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
    state.filterPanel.querySelectorAll('[data-scenario-sort]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.scenarioSort === mode)));
  }

  function renderPortfolio(data, state) {
    const priorityControls = createElement('div', { className: 'filter-group', attrs: { role: 'group', 'aria-label': '按优先级筛选' } });
    for (const value of ['all', 'P0', 'P1', 'P2', 'P3']) priorityControls.append(filterButton(value === 'all' ? '全部' : value, 'data-priority-filter', value, state));
    const categoryControls = createElement('div', { className: 'filter-group', attrs: { role: 'group', 'aria-label': '按场景类别筛选' } });
    categoryControls.append(filterButton('全部', 'data-category-filter', 'all', state));
    for (const [value, label] of Object.entries(data.categoryLabels || {})) categoryControls.append(filterButton(label, 'data-category-filter', value, state));
    const controlChildren = [createElement('span', { text: '优先级' }), priorityControls, createElement('span', { text: '类别' }), categoryControls];
    if (isRankedLibrary(data)) {
      const sortControls = createElement('div', { className: 'filter-group', attrs: { role: 'group', 'aria-label': '场景排序' } });
      const sortOptions = data.libraryMode === 'ranked' ? [['date', '按时间'], ['score', '按打分']] : [['number', '按编号'], ['score', '按总分']];
      const defaultSort = data.libraryMode === 'ranked' ? 'date' : 'number';
      for (const [value, label] of sortOptions) {
        const button = createElement('button', { className: 'filter-button', text: label, attrs: { type: 'button', 'data-scenario-sort': value, 'aria-pressed': String(value === defaultSort) } });
        button.addEventListener('click', () => sortScenarios(state, value));
        sortControls.append(button);
      }
      controlChildren.push(createElement('span', { text: '排序' }), sortControls);
    }
    const controls = createElement('div', { className: 'filter-panel' }, controlChildren);
    const count = createElement('strong', { text: `${data.scenarioCount} 个场景`, attrs: { id: 'scenario-result-count' } });
    const list = createElement('div', { className: 'scenario-list' });
    for (const scenario of data.scenarios) list.append(renderScenario(scenario, data, state));
    const emptyReset = createElement('button', { className: 'filter-button', text: '重置筛选', attrs: { type: 'button', id: 'radar-empty-reset' } });
    emptyReset.addEventListener('click', () => resetFilters(state));
    const empty = createElement('div', { className: 'radar-empty', attrs: { id: 'radar-empty' } }, [createElement('h3', { text: '没有匹配场景' }), createElement('p', { text: '请调整筛选条件，或重置为全部场景。' }), emptyReset]);
    empty.hidden = true;
    state.count = count;
    state.empty = empty;
    state.filterPanel = controls;
    state.list = list;
    if (isRankedLibrary(data)) sortScenarios(state, data.libraryMode === 'ranked' ? 'date' : 'number');
    return createElement('section', { className: 'radar-section portfolio-section', attrs: { id: 'scenario-portfolio' } }, [
      createElement('div', { className: 'radar-shell' }, [sectionHead('02', 'BUSINESS PROBLEMS', 'AI 能解决哪些业务问题', `完整 ${data.scenarioCount} 个场景，可按优先级与类别筛选；点开后查看痛点、AI 价值、风险、证据和公司实践。`), controls, createElement('div', { className: 'result-line' }, [count, createElement('button', { className: 'text-reset', text: '重置筛选', attrs: { type: 'button' } })]), list, empty]),
    ]);
  }

  function renderPriorityMethod() {
    const dimensions = createElement('div', { className: 'priority-method-dimensions' }, SCORE_DIMENSIONS.map(([, label, maximum]) => createElement('span', {}, [createElement('strong', { text: `${label} ${maximum}%` }), createElement('small', { text: '纳入五维总分' })])));
    return createElement('aside', { className: 'priority-method' }, [
      createElement('p', { className: 'section-kicker', text: 'SCORING METHOD' }),
      createElement('h3', { text: '五维评分决定顺序，风险红线可以覆盖总分' }),
      dimensions,
      createElement('p', { className: 'priority-thresholds', text: 'P0：≥80 且无红线 · P1：65–79 · P2：50–64 或仍有关键前置条件 · P3：触发风险红线，只作辅助或禁止' }),
      createElement('p', { className: 'priority-redline', text: '风险红线包括：AI 自主录用、解雇、晋升、调薪、签约或给出最终法律意见；无人复核；输出不可追溯；结果不可撤销；敏感数据没有合法目的与最小权限。' }),
    ]);
  }

  function renderRoadmap(data) {
    const flow = createElement('div', { className: 'roadmap-flow' });
    const priorityScenarios = data.scenarios.filter((scenario) => scenario.priority === 'P0');
    data.pilots.forEach((pilot, index) => flow.append(createElement('article', { className: 'pilot' }, [
      createElement('p', { className: 'pilot-label', text: pilot.label }), createElement('h3', { text: pilot.title }),
      createElement('div', { className: 'pilot-copy' }, (() => { const scenario = data.scenarios.find((item) => item.id === pilot.scenarioId) || priorityScenarios[index]; return [detailBlock('推荐理由', scenario.scorecard.rationale), detailBlock('关键前提', scenario.scorecard.prerequisite), detailBlock('范围与方案', pilot.scope), detailBlock('验收', pilot.acceptance)]; })()),
    ])));
    return createElement('section', { className: 'radar-section roadmap-section', attrs: { id: 'priority-starts' } }, [createElement('div', { className: 'radar-shell' }, [sectionHead('03', 'START HERE', `建议优先启动的 ${data.pilots.length} 个场景`, '先按五维分数排序，再检查风险红线、关键前提和 8–12 周内是否能够验收。'), renderPriorityMethod(), flow])]);
  }

  function toggleScenario(card, expanded) {
    const header = card.querySelector('.scenario-header');
    const detail = card.querySelector('.scenario-detail');
    header.setAttribute('aria-expanded', String(Boolean(expanded)));
    detail.hidden = !expanded;
    const chevron = header.querySelector('.scenario-chevron');
    if (chevron) chevron.textContent = expanded ? '−' : '＋';
  }

  function filterScenarios(state, { priority = 'all', category = 'all' }) {
    state.filters = { priority, category };
    let visible = 0;
    for (const card of state.cards.values()) {
      const matches = (priority === 'all' || card.dataset.priority === priority) && (category === 'all' || card.dataset.category === category);
      card.hidden = !matches;
      if (matches) visible += 1;
    }
    state.filterPanel.querySelectorAll('[data-priority-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.priorityFilter === priority)));
    state.filterPanel.querySelectorAll('[data-category-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.categoryFilter === category)));
    state.count.textContent = `${visible} 个场景`;
    state.empty.hidden = visible !== 0;
    return visible;
  }

  function activateMatrixPoint(state, scenarioId) {
    const scenario = state.data.scenarios.find((item) => item.id === scenarioId);
    if (!scenario || !state.inspectorContent) return;
    state.selectedScenarioId = scenarioId;
    for (const [id, point] of state.points) point.setAttribute('aria-pressed', String(id === scenarioId));
    state.inspectorContent.replaceChildren(renderInspectorScenario(scenario, state.data, state));
  }

  function preferredScrollBehavior(state) {
    const view = state.root?.ownerDocument?.defaultView || window;
    return view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  function jumpToScenario(state, scenarioId) {
    resetFilters(state);
    const card = state.cards.get(scenarioId);
    if (!card) return;
    toggleScenario(card, true);
    card.scrollIntoView({ behavior: preferredScrollBehavior(state), block: 'start' });
    card.querySelector('.scenario-header').focus({ preventScroll: true });
  }

  function focusSection(state, targetId) {
    const section = state.root.ownerDocument.getElementById(targetId);
    if (!section) return;
    section.scrollIntoView({ behavior: preferredScrollBehavior(state), block: 'start' });
    const heading = section.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  function sortedTocScenarios(data) {
    return [...data.scenarios].sort((a, b) => a.number.localeCompare(b.number));
  }

  function setTocActive(state, targetId) {
    if (!state.toc) return false;
    const activeLink = [...state.toc.panel.querySelectorAll('[data-toc-section], [data-toc-scenario]')]
      .find((link) => link.dataset.tocSection === targetId || link.dataset.tocScenario === targetId);
    if (!activeLink) return false;
    if (state.activeTocTargetId === targetId && activeLink.getAttribute('aria-current') === 'location') return false;
    state.toc.panel.querySelectorAll('[aria-current="location"]').forEach((link) => link.removeAttribute('aria-current'));
    activeLink.setAttribute('aria-current', 'location');
    state.activeTocTargetId = targetId;
    return true;
  }

  function setLocationHash(state, targetId) {
    const view = state.root?.ownerDocument?.defaultView || window;
    const hash = `#${encodeURIComponent(targetId)}`;
    if (view.location.hash === hash) return;
    try {
      view.history.replaceState(view.history.state, '', hash);
    } catch {
      view.location.hash = hash;
    }
  }

  function setBackgroundInert(state, inert) {
    for (const element of state.toc?.backgroundElements || []) element.toggleAttribute('inert', Boolean(inert));
  }

  function isDesktopToc(state) {
    return Boolean(state.toc?.desktopQuery?.matches);
  }

  function openTocDrawer(state) {
    if (!state.toc || isDesktopToc(state)) return;
    state.root?.ownerDocument?.body.classList.add('radar-toc-open');
    state.toc.panel.removeAttribute('inert');
    setBackgroundInert(state, true);
    state.toc.trigger.setAttribute('aria-expanded', 'true');
    state.toc.panel.setAttribute('role', 'dialog');
    state.toc.panel.setAttribute('aria-modal', 'true');
    state.toc.closeButton.focus();
  }

  function closeTocDrawer(state, restoreFocus = true) {
    if (!state.toc) return;
    state.root?.ownerDocument?.body.classList.remove('radar-toc-open');
    state.toc.trigger.setAttribute('aria-expanded', 'false');
    state.toc.panel.removeAttribute('role');
    state.toc.panel.removeAttribute('aria-modal');
    setBackgroundInert(state, false);
    state.toc.panel.toggleAttribute('inert', !isDesktopToc(state));
    if (restoreFocus) state.toc.trigger.focus();
  }

  function trapTocFocus(state, event) {
    if (event.key !== 'Tab' || !state.root.ownerDocument.body.classList.contains('radar-toc-open')) return;
    const focusable = [...state.toc.panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.closest('[hidden]'));
    if (!focusable.length) return;
    const active = state.root.ownerDocument.activeElement;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if ((event.shiftKey && (active === first || !state.toc.panel.contains(active))) || (!event.shiftKey && (active === last || !state.toc.panel.contains(active)))) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  function setupTocBreakpoint(state) {
    const view = state.root?.ownerDocument?.defaultView || window;
    if (typeof view.matchMedia !== 'function') {
      closeTocDrawer(state, false);
      return;
    }
    const query = view.matchMedia('(min-width: 1100px)');
    const handler = () => {
      const restoreFocus = !query.matches && state.toc.panel.contains(state.root.ownerDocument.activeElement);
      closeTocDrawer(state, restoreFocus);
    };
    state.toc.desktopQuery = query;
    state.toc.breakpointHandler = handler;
    if (typeof query.addEventListener === 'function') query.addEventListener('change', handler);
    else query.addListener?.(handler);
    handler();
  }

  function observeToc(state) {
    const view = state.root?.ownerDocument?.defaultView || window;
    if (typeof view.IntersectionObserver !== 'function') return null;
    const observer = new view.IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) state.tocIntersections.set(entry.target, entry.intersectionRatio);
        else state.tocIntersections.delete(entry.target);
      }
      let strongest = null;
      let strongestRatio = -1;
      for (const target of state.tocTargets) {
        const ratio = state.tocIntersections.get(target);
        if (ratio !== undefined && ratio > strongestRatio) {
          strongest = target;
          strongestRatio = ratio;
        }
      }
      if (strongest?.id && strongest.id !== state.activeTocTargetId && setTocActive(state, strongest.id) && state.initialHashProcessed) setLocationHash(state, strongest.id);
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.15, 0.4, 0.75] });
    const documentRef = state.root.ownerDocument;
    const targets = [];
    for (const id of ['priority-matrix', 'scenario-portfolio', 'priority-starts']) {
      const section = documentRef.getElementById(id);
      if (section) targets.push(section);
    }
    targets.push(...state.cards.values());
    state.tocTargets = targets;
    for (const target of targets) observer.observe(target);
    state.tocObserver = observer;
    return observer;
  }

  function openInitialHash(state) {
    const view = state.root?.ownerDocument?.defaultView || window;
    let targetId;
    try {
      targetId = decodeURIComponent(view.location.hash.slice(1));
    } catch {
      return;
    }
    if (!targetId) return;
    if (state.cards.has(targetId)) {
      jumpToScenario(state, targetId);
      setTocActive(state, targetId);
      return;
    }
    if (!['priority-matrix', 'scenario-portfolio', 'priority-starts'].includes(targetId)) return;
    focusSection(state, targetId);
    setTocActive(state, targetId);
  }

  function cleanupRadar(state) {
    const view = state.root?.ownerDocument?.defaultView || window;
    state.tocObserver?.disconnect();
    if (state.initialHashFrame !== null && typeof view.cancelAnimationFrame === 'function') view.cancelAnimationFrame(state.initialHashFrame);
    const documentRef = state.root.ownerDocument;
    if (state.toc?.keydownHandler) documentRef.removeEventListener('keydown', state.toc.keydownHandler);
    const query = state.toc?.desktopQuery;
    const breakpointHandler = state.toc?.breakpointHandler;
    if (query && breakpointHandler) {
      if (typeof query.removeEventListener === 'function') query.removeEventListener('change', breakpointHandler);
      else query.removeListener?.(breakpointHandler);
    }
    closeTocDrawer(state, false);
    state.toc?.panel.removeAttribute('inert');
    state.tocIntersections.clear();
    if (state.root.radarCleanup === state.cleanup) state.root.radarCleanup = null;
  }

  function renderToc(data, state) {
    const title = createElement('strong', { text: '本页目录', attrs: { id: 'radar-toc-title' } });
    const closeButton = createElement('button', { className: 'radar-toc-close', text: '关闭', attrs: { type: 'button', 'aria-label': '关闭目录' } });
    const panel = createElement('aside', { className: 'radar-toc-panel', attrs: { id: 'radar-toc', 'aria-labelledby': 'radar-toc-title' } });
    const navigation = createElement('nav', { attrs: { 'aria-label': '雷达页面目录' } });
    const sectionList = createElement('ol', { className: 'radar-toc-sections' });
    const scenarioList = createElement('ol', { className: 'radar-toc-scenarios', attrs: { id: 'radar-toc-scenarios' } });
    const scenarioToggle = createElement('button', {
      className: 'radar-toc-scenario-toggle',
      text: '场景列表 ▾',
      attrs: { type: 'button', id: 'radar-toc-scenario-toggle', 'aria-label': '展开或收起场景列表', 'aria-expanded': 'true', 'aria-controls': 'radar-toc-scenarios' },
    });
    const sectionLink = (targetId, label) => {
      const link = createElement('a', { text: label, attrs: { href: `#${targetId}`, 'data-toc-section': targetId } });
      link.addEventListener('click', (event) => {
        event.preventDefault();
        setLocationHash(state, targetId);
        setTocActive(state, targetId);
        closeTocDrawer(state, false);
        focusSection(state, targetId);
      });
      return link;
    };

    sectionList.append(createElement('li', {}, [sectionLink('priority-matrix', '优先矩阵')]));
    const scenarioSection = createElement('li', { className: 'radar-toc-scenario-section' }, [sectionLink('scenario-portfolio', '完整场景库'), scenarioToggle, scenarioList]);
    for (const scenario of sortedTocScenarios(data)) {
      const link = createElement('a', { text: `${scenario.number} ${scenario.title}`, attrs: { href: `#${scenario.id}`, 'data-toc-scenario': scenario.id } });
      link.addEventListener('click', (event) => {
        event.preventDefault();
        closeTocDrawer(state, false);
        jumpToScenario(state, scenario.id);
        setLocationHash(state, scenario.id);
        setTocActive(state, scenario.id);
      });
      scenarioList.append(createElement('li', {}, [link]));
    }
    sectionList.append(scenarioSection, createElement('li', {}, [sectionLink('priority-starts', '优先启动建议')]));
    scenarioToggle.addEventListener('click', () => {
      const expanded = scenarioToggle.getAttribute('aria-expanded') === 'true';
      scenarioToggle.setAttribute('aria-expanded', String(!expanded));
      scenarioList.hidden = expanded;
    });

    const trigger = createElement('button', { className: 'radar-toc-trigger', text: '目录', attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'radar-toc' } });
    const backdrop = createElement('button', { className: 'radar-toc-backdrop', attrs: { type: 'button', 'aria-label': '关闭目录', tabindex: '-1' } });
    state.toc = { panel, trigger, backdrop, closeButton, scenarioList, scenarioToggle, backgroundElements: [], desktopQuery: null, breakpointHandler: null, keydownHandler: null };
    trigger.addEventListener('click', () => openTocDrawer(state));
    closeButton.addEventListener('click', () => closeTocDrawer(state, true));
    backdrop.addEventListener('click', () => closeTocDrawer(state, true));
    const documentRef = state.root.ownerDocument;
    state.toc.keydownHandler = (event) => {
      if (event.key === 'Escape' && documentRef.body.classList.contains('radar-toc-open')) closeTocDrawer(state, true);
      else trapTocFocus(state, event);
    };
    documentRef.addEventListener('keydown', state.toc.keydownHandler);
    panel.append(createElement('div', { className: 'radar-toc-head' }, [title, closeButton]), navigation);
    navigation.append(sectionList);
    return [trigger, panel, backdrop];
  }

  function renderRadar(root, data) {
    root.radarCleanup?.();
    const state = { root, data, cards: new Map(), points: new Map(), filters: { priority: 'all', category: 'all' }, sortMode: 'number', count: null, empty: null, filterPanel: null, list: null, inspectorContent: null, selectedScenarioId: null, toc: null, tocObserver: null, tocTargets: [], tocIntersections: new Map(), activeTocTargetId: null, initialHashFrame: null, initialHashProcessed: false, cleanup: null };
    root.ownerDocument.body.classList.add('radar-detail-page');
    const content = [renderHero(data), renderMatrix(data, state), renderPortfolio(data, state), renderRoadmap(data)];
    const tocElements = renderToc(data, state);
    state.toc.backgroundElements = content;
    root.replaceChildren(...tocElements, ...content);
    setupTocBreakpoint(state);
    root.querySelector('.text-reset').addEventListener('click', () => resetFilters(state));
    activateMatrixPoint(state, matrixScenarios(data).find((scenario) => scenario.priority === 'P0')?.id || matrixScenarios(data)[0]?.id);
    observeToc(state);
    const view = root.ownerDocument.defaultView || window;
    const handleInitialHash = () => {
      state.initialHashFrame = null;
      try { openInitialHash(state); } finally { state.initialHashProcessed = true; }
    };
    if (typeof view.requestAnimationFrame === 'function') state.initialHashFrame = view.requestAnimationFrame(handleInitialHash);
    else handleInitialHash();
    state.cleanup = () => cleanupRadar(state);
    root.radarCleanup = state.cleanup;
    return state;
  }

  function initRadar(documentRef = document) {
    const root = documentRef.querySelector('#radar-app');
    const error = documentRef.querySelector('#radar-error');
    if (!root) return null;
    const data = documentRef.defaultView?.OPPORTUNITY_RADAR_DATA || window.OPPORTUNITY_RADAR_DATA;
    if (!data) {
      if (error) { error.hidden = false; error.textContent = '雷达数据未加载，请返回雷达目录后重试。'; }
      root.radarCleanup?.();
      root.replaceChildren();
      return null;
    }
    if (error) { error.hidden = true; error.textContent = ''; }
    return renderRadar(root, data);
  }

  window.OpportunityRadar = Object.freeze({ createElement, renderRadar, filterScenarios, sortScenarios, toggleScenario, activateMatrixPoint, jumpToScenario, setTocActive, buildStandaloneReport, downloadStandaloneReport, initRadar });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initRadar(document), { once: true });
  else initRadar(document);
})();
