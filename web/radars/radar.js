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

  function renderHero(data) {
    const action = createElement('a', { className: 'radar-hero-action', text: '查看优先级矩阵 ↓', attrs: { href: '#priority-matrix' } });
    const companyCaseCount = data.scenarios.reduce((total, scenario) => total + scenario.companyCases.length, 0);
    const stats = createElement('div', { className: 'radar-hero-stats', attrs: { 'aria-label': '核心数字' } }, [
      createElement('div', { className: 'radar-stat' }, [createElement('strong', { text: String(data.p0Count).padStart(2, '0') }), createElement('span', { text: '个 P0 场景立即立项' })]),
      createElement('div', { className: 'radar-stat' }, [createElement('strong', { text: String(data.scenarioCount) }), createElement('span', { text: '个场景完成排序' })]),
      createElement('div', { className: 'radar-stat' }, [createElement('strong', { text: String(companyCaseCount).padStart(2, '0') }), createElement('span', { text: '条可核验公司实践' })]),
    ]);
    return createElement('section', { className: 'radar-hero', attrs: { 'aria-labelledby': 'radar-title' } }, [
      createElement('div', { className: 'radar-shell radar-hero-grid' }, [
        createElement('div', { className: 'radar-hero-copy' }, [createElement('p', { className: 'radar-eyebrow', text: data.eyebrow }), createElement('h1', { text: data.title, attrs: { id: 'radar-title' } }), createElement('p', { className: 'radar-hero-lede', text: '从业务问题出发，逐项查看 AI 能做什么、主要风险、证据和已有公司实践。' }), action]),
        stats,
      ]),
      createElement('div', { className: 'decision-strip' }, [createElement('div', { className: 'radar-shell' }, [createElement('strong', { text: '核心判断' }), createElement('p', { text: data.coreJudgment })])]),
    ]);
  }

  function renderMatrix(data, state) {
    const matrix = createElement('div', { className: 'matrix', attrs: { role: 'group', 'aria-label': '业务价值与落地可行性矩阵' } });
    for (const scenario of data.scenarios) {
      const point = createElement('button', {
        className: `matrix-point ${scenario.priority.toLowerCase()}`,
        text: scenario.number,
        attrs: { type: 'button', 'data-scenario-target': scenario.id, 'aria-label': `${scenario.title}，${scenario.priority}，价值 ${scenario.value}，可行性 ${scenario.feasibility}` },
      });
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
    const note = createElement('aside', { className: 'matrix-note' }, [
      createElement('p', { className: 'section-kicker', text: 'DECISION RULE' }),
      createElement('h3', { text: '高价值，不等于可直接自动化' }),
      createElement('p', { text: '综合优先级采用业务价值 55% + 落地可行性 45%。涉及不可逆结果或高风险最终意见时，风险门槛优先于分数。' }),
      createElement('p', { className: 'risk-rule', text: 'P0 立即试点 · P1 第二批扩展 · P2 按条件启用 · P3 只作辅助或暂缓' }),
    ]);
    return createElement('section', { className: 'radar-section matrix-section', attrs: { id: 'priority-matrix' } }, [
      createElement('div', { className: 'radar-shell' }, [sectionHead('01', 'PRIORITY', '价值越高，越要先问：能否被可靠验证？', '点击矩阵点位，可直接定位并展开对应场景。'), createElement('div', { className: 'matrix-layout' }, [matrixWrap, note])]),
    ]);
  }

  function detailBlock(label, content, full = false, className = '') {
    const body = typeof content === 'string' ? createElement('p', { text: content }) : content;
    return createElement('div', { className: `detail-block${full ? ' detail-full' : ''}${className ? ` ${className}` : ''}` }, [createElement('h4', { text: label }), body]);
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
    for (const id of scenario.evidenceIds) {
      const source = data.sources.find((item) => item.id === id);
      if (source) list.append(sourceLink(source, 'evidence-link decision-link'));
    }
    return list;
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
        createElement('span', { className: 'decision-link-meta', text: companyCase.caseType }),
        createElement('strong', { text: companyCase.company }),
        createElement('span', { className: 'company-case-summary', text: companyCase.summary }),
        createElement('small', { text: `证据局限：${companyCase.caveat}` }),
        createElement('span', { className: 'decision-link-action', text: '查看案例 ↗' }),
      ]);
      list.append(card);
    }
    return list;
  }

  function renderScenario(scenario, data, state) {
    const detailId = `${scenario.id}-detail`;
    const header = createElement('button', {
      className: 'scenario-header',
      attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': detailId },
    }, [
      createElement('span', { className: 'scenario-index', text: scenario.number }),
      createElement('span', { className: `priority ${scenario.priority.toLowerCase()}`, text: scenario.priority }),
      createElement('span', { className: 'scenario-title', text: scenario.title }),
      createElement('span', { className: 'scenario-scores' }, [createElement('span', { text: `价值 ${scenario.value.toFixed(1)}` }), createElement('span', { text: `可行性 ${scenario.feasibility.toFixed(1)}` })]),
      createElement('span', { className: 'scenario-chevron', text: '＋', attrs: { 'aria-hidden': 'true' } }),
    ]);
    const detail = createElement('div', { className: 'scenario-detail', attrs: { id: detailId } }, [
      createElement('div', { className: 'detail-grid' }, [
        detailBlock('业务痛点', scenario.problem),
        detailBlock('AI 价值｜可以做什么', scenario.aiValue),
        detailBlock('主要风险', scenario.risk, true, 'risk-detail'),
        detailBlock('证据锚点', renderEvidence(scenario, data), true, 'evidence-detail'),
        detailBlock('哪些公司做过', renderCompanyCases(scenario, data), true, 'company-detail'),
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

  function renderPortfolio(data, state) {
    const priorityControls = createElement('div', { className: 'filter-group', attrs: { role: 'group', 'aria-label': '按优先级筛选' } });
    for (const value of ['all', 'P0', 'P1', 'P2', 'P3']) priorityControls.append(filterButton(value === 'all' ? '全部' : value, 'data-priority-filter', value, state));
    const categoryControls = createElement('div', { className: 'filter-group', attrs: { role: 'group', 'aria-label': '按场景类别筛选' } });
    categoryControls.append(filterButton('全部', 'data-category-filter', 'all', state));
    for (const [value, label] of Object.entries(data.categoryLabels)) categoryControls.append(filterButton(label, 'data-category-filter', value, state));
    const controls = createElement('div', { className: 'filter-panel' }, [createElement('span', { text: '优先级' }), priorityControls, createElement('span', { text: '类别' }), categoryControls]);
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
    return createElement('section', { className: 'radar-section portfolio-section', attrs: { id: 'scenario-portfolio' } }, [
      createElement('div', { className: 'radar-shell' }, [sectionHead('02', 'BUSINESS PROBLEMS', 'AI 能解决哪些业务问题', '按优先级与类别筛选；点开后只看痛点、AI 价值、风险、证据和公司实践。'), controls, createElement('div', { className: 'result-line' }, [count, createElement('button', { className: 'text-reset', text: '重置筛选', attrs: { type: 'button' } })]), list, empty]),
    ]);
  }

  function renderRoadmap(data) {
    const flow = createElement('div', { className: 'roadmap-flow' });
    for (const pilot of data.pilots) flow.append(createElement('article', { className: 'pilot' }, [
      createElement('p', { className: 'pilot-label', text: pilot.label }), createElement('h3', { text: pilot.title }),
      createElement('div', { className: 'pilot-copy' }, [detailBlock('范围与方案', pilot.scope), detailBlock('验收', pilot.acceptance)]),
    ]));
    return createElement('section', { className: 'radar-section roadmap-section', attrs: { id: 'priority-starts' } }, [createElement('div', { className: 'radar-shell' }, [sectionHead('03', 'START HERE', '建议优先启动的 3 个场景', '范围要小、证据要清楚、人工责任和停止条件要先写明。'), flow])]);
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
    resetFilters(state);
    const card = state.cards.get(scenarioId);
    if (!card) return;
    toggleScenario(card, true);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.querySelector('.scenario-header').focus({ preventScroll: true });
  }

  function renderRadar(root, data) {
    const state = { data, cards: new Map(), points: new Map(), filters: { priority: 'all', category: 'all' }, count: null, empty: null, filterPanel: null };
    root.replaceChildren(renderHero(data), renderMatrix(data, state), renderPortfolio(data, state), renderRoadmap(data));
    root.querySelector('.text-reset').addEventListener('click', () => resetFilters(state));
    return state;
  }

  function initRadar(documentRef = document) {
    const root = documentRef.querySelector('#radar-app');
    const error = documentRef.querySelector('#radar-error');
    if (!root) return null;
    const data = documentRef.defaultView?.OPPORTUNITY_RADAR_DATA || window.OPPORTUNITY_RADAR_DATA;
    if (!data) {
      if (error) { error.hidden = false; error.textContent = '雷达数据未加载，请返回雷达目录后重试。'; }
      root.replaceChildren();
      return null;
    }
    if (error) { error.hidden = true; error.textContent = ''; }
    return renderRadar(root, data);
  }

  window.OpportunityRadar = Object.freeze({ createElement, renderRadar, filterScenarios, toggleScenario, activateMatrixPoint, initRadar });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initRadar(document), { once: true });
  else initRadar(document);
})();
