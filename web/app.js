(() => {
  'use strict';
  const articles = Array.isArray(window.ARTICLE_INDEX) ? window.ARTICLE_INDEX : [];
  const byId = new Map(articles.map((article) => [article.id, article]));
  const state = { visible: 30, filtered: articles, sources: [] };
  const $ = (selector) => document.querySelector(selector);

  function node(tag, options = {}, children = []) {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.attrs) for (const [key, value] of Object.entries(options.attrs)) element.setAttribute(key, value);
    for (const child of children) if (child) element.append(child);
    return element;
  }

  function unique(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')); }
  function fillSelect(selector, values) {
    const select = $(selector);
    for (const value of values) select.append(node('option', { text: value, attrs: { value } }));
  }
  function displayDate(value) { return value ? String(value).slice(0, 10) : '日期未列出'; }

  function syncFiltersToUrl() {
    const params = new URLSearchParams();
    for (const [key, selector] of [['publisher', '#publisher-filter'], ['date', '#date-filter'], ['category', '#category-filter'], ['priority', '#priority-filter'], ['q', '#keyword-filter']]) {
      const value = $(selector).value.trim();
      if (value) params.set(key, value);
    }
    if ($('#sort-control').value === 'score') params.set('sort', 'score');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  }

  function filterArticles() {
    const publisher = $('#publisher-filter').value;
    const year = $('#date-filter').value;
    const category = $('#category-filter').value;
    const priority = $('#priority-filter').value;
    const query = $('#keyword-filter').value.trim().toLowerCase();
    const filtered = articles.filter((article) => {
      const haystack = [article.titleZh, article.titleOriginal, article.summary, article.publisher, article.category?.primary, article.category?.sourcePrimary, ...(article.tags?.topics || [])].join(' ').toLowerCase();
      return (!publisher || article.publisher === publisher)
        && (!year || String(article.publishedAt || '').startsWith(year))
        && (!category || article.category?.primary === category)
        && (!priority || article.priority === priority)
        && (!query || haystack.includes(query));
    });
    state.filtered = ArticleUtils.sortArticles(filtered, $('#sort-control').value);
    state.visible = 30;
    syncFiltersToUrl();
    renderArticles();
  }

  function renderArticles() {
    const container = $('#article-results');
    container.replaceChildren();
    const visible = state.filtered.slice(0, state.visible);
    for (const article of visible) {
      const source = node('span', { className: 'article-source', text: article.publisher }, [node('span', { className: 'article-date', text: displayDate(article.publishedAt) })]);
      const detail = node('span', {}, [
        node('span', { className: 'article-title', text: article.titleZh || article.titleOriginal }),
        node('span', { className: 'article-summary', text: article.summary || '暂无摘要，点击查看归档全文。' }),
      ]);
      const score = node('span', { className: 'article-score', text: ArticleUtils.scoreText(article) }, [node('small', { text: '综合评分' })]);
      const row = node('button', { className: 'article-row', attrs: { type: 'button', 'data-article-id': article.id, 'aria-label': `查看 ${article.titleZh || article.titleOriginal}` } }, [source, detail, score]);
      row.addEventListener('click', () => openArticle(article));
      container.append(row);
    }
    if (!visible.length) container.append(node('p', { className: 'answer-placeholder', text: '没有符合当前筛选条件的文章。' }));
    $('#result-count').textContent = `${state.filtered.length} 篇结果 · 已显示 ${visible.length} 篇`;
    $('#load-more').hidden = visible.length >= state.filtered.length;
  }

  function openArticle(article) {
    $('#dialog-publisher').textContent = `${article.publisher} · ${displayDate(article.publishedAt)}`;
    $('#dialog-title').textContent = article.titleZh || article.titleOriginal;
    $('#dialog-original').textContent = article.titleOriginal && article.titleOriginal !== article.titleZh ? article.titleOriginal : '';
    $('#dialog-summary').textContent = article.summary || '该文章已完整归档，可通过下方入口查看全文。';
    const meta = $('#dialog-meta');
    meta.replaceChildren();
    for (const value of [article.category?.primary, article.priority ? `优先级：${article.priority}` : '', `综合评分：${ArticleUtils.scoreText(article)}`, `全文片段：${article.chunkCount || 0}`]) if (value) meta.append(node('span', { text: value }));
    const dialog = $('#article-dialog');
    const links = new Map([...dialog.querySelectorAll('[data-link]')].map((link) => [link.dataset.link, link]));
    links.get('chinese').href = article.localPaths?.chinese || '#';
    links.get('original').href = article.localPaths?.original || article.localPaths?.snapshot || '#';
    links.get('official').href = article.sourceUrl;
    dialog.showModal();
  }

  function saveQuestion(question) {
    const old = JSON.parse(localStorage.getItem('ai-report-questions') || '[]');
    localStorage.setItem('ai-report-questions', JSON.stringify([question, ...old.filter((item) => item !== question)].slice(0, 5)));
    renderHistory();
  }
  function renderHistory() {
    const historyBox = $('#question-history');
    historyBox.replaceChildren();
    for (const question of JSON.parse(localStorage.getItem('ai-report-questions') || '[]')) {
      const button = node('button', { text: question, attrs: { type: 'button' } });
      button.addEventListener('click', () => { $('#question').value = question; $('#question').focus(); });
      historyBox.append(button);
    }
  }

  function sourceButton(id) {
    const source = state.sources.find((item) => item.chunkId === id);
    const button = node('button', { className: 'source-chip', text: source ? `${source.publisher} · ${source.sectionPath || '正文'}` : id, attrs: { type: 'button' } });
    button.addEventListener('click', openSources);
    return button;
  }
  function renderAnswer(payload) {
    const answer = $('#answer');
    answer.replaceChildren(node('h2', { text: payload.insufficient ? '资料范围说明' : '基于归档全文的回答' }), node('p', { className: 'answer-lead', text: payload.answer }));
    state.sources = payload.sources || [];
    for (const claim of payload.claims || []) {
      const block = node('div', { className: `claim ${claim.kind === 'analysis' ? 'analysis' : ''}` }, [node('p', { text: claim.text })]);
      const chips = node('div');
      for (const id of claim.citations || []) chips.append(sourceButton(id));
      block.append(chips);
      answer.append(block);
    }
    if (payload.limitations?.length) answer.append(node('p', { className: 'limitations', text: `边界：${payload.limitations.join('；')}` }));
    if (state.sources.length) {
      const button = node('button', { className: 'text-button', text: `查看全部 ${state.sources.length} 个来源`, attrs: { type: 'button' } });
      button.addEventListener('click', openSources);
      answer.append(button);
    }
  }

  function openSources() {
    const list = $('#source-list');
    list.replaceChildren();
    for (const source of state.sources) {
      const links = node('div', { className: 'source-links' });
      for (const [label, href] of [['中文全文', source.localPaths?.chinese], ['原文归档', source.localPaths?.original], ['官方原文', source.sourceUrl]]) {
        if (href) links.append(node('a', { text: label, attrs: { href, target: '_blank', rel: 'noreferrer' } }));
      }
      list.append(node('article', { className: 'source-item' }, [
        node('span', { className: 'eyebrow', text: `${source.publisher} · ${source.chunkId}` }),
        node('h3', { text: source.titleZh || source.titleOriginal }),
        node('p', { text: source.sectionPath || '正文' }), links,
      ]));
    }
    if (!state.sources.length) list.append(node('p', { text: '当前回答没有可展示的来源。' }));
    $('#drawer-backdrop').hidden = false;
    $('#source-drawer').classList.add('open');
    $('#source-drawer').setAttribute('aria-hidden', 'false');
    $('#close-drawer').focus();
  }
  function closeSources() {
    $('#source-drawer').classList.remove('open');
    $('#source-drawer').setAttribute('aria-hidden', 'true');
    $('#drawer-backdrop').hidden = true;
  }

  async function ask(question) {
    const button = $('#ask-button');
    button.disabled = true;
    button.textContent = '正在检索全文…';
    $('#answer').replaceChildren(node('p', { className: 'answer-placeholder', text: '正在查找相关证据并校验来源，请稍候。' }));
    try {
      const response = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
      const payload = await response.json();
      if (!response.ok) throw Object.assign(new Error(payload.error || '问答服务暂不可用'), { code: payload.code });
      renderAnswer(payload);
      saveQuestion(question);
    } catch (error) {
      const guidance = error.code === 'MISSING_API_KEY' ? '尚未配置 DeepSeek API Key。请在启动服务的终端设置 DEEPSEEK_API_KEY 后重新启动。' : error.message;
      $('#answer').replaceChildren(node('h2', { text: '暂时无法生成回答' }), node('p', { className: 'answer-placeholder', text: guidance }));
    } finally {
      button.disabled = false;
      button.textContent = '基于全文回答';
    }
  }

  async function checkHealth() {
    const status = $('#api-status');
    try {
      const health = await (await fetch('/api/health')).json();
      status.textContent = health.deepseekConfigured ? `${health.model} 已连接` : 'DeepSeek 待配置';
      status.classList.add(health.deepseekConfigured ? 'online' : 'offline');
    } catch {
      status.textContent = '请通过本地服务启动';
      status.classList.add('offline');
    }
  }

  function initFilters() {
    fillSelect('#publisher-filter', unique(articles.map((item) => item.publisher)));
    fillSelect('#category-filter', Array.isArray(window.ARTICLE_TOPICS) ? window.ARTICLE_TOPICS : unique(articles.map((item) => item.category?.primary)));
    fillSelect('#priority-filter', unique(articles.map((item) => item.priority)));
    const params = new URLSearchParams(location.search);
    for (const [key, selector] of [['publisher', '#publisher-filter'], ['date', '#date-filter'], ['category', '#category-filter'], ['priority', '#priority-filter'], ['q', '#keyword-filter']]) if (params.has(key)) $(selector).value = params.get(key);
    if (params.get('sort') === 'score') $('#sort-control').value = 'score';
    $('#filter-form').addEventListener('input', filterArticles);
    $('#filter-form').addEventListener('reset', () => setTimeout(filterArticles));
    $('#sort-control').addEventListener('change', () => $('#article-results').scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  $('#article-count').textContent = String(articles.length || 469);
  $('#question-form').addEventListener('submit', (event) => { event.preventDefault(); const question = $('#question').value.trim(); if (question) ask(question); });
  $('#load-more').addEventListener('click', () => { state.visible += 30; renderArticles(); });
  $('#close-drawer').addEventListener('click', closeSources);
  $('#drawer-backdrop').addEventListener('click', closeSources);
  $('#article-dialog .dialog-close').addEventListener('click', () => $('#article-dialog').close());
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSources(); });
  initFilters();
  filterArticles();
  renderHistory();
  checkHealth();
})();
