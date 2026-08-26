(() => {
  'use strict';
  const articles = Array.isArray(window.ARTICLE_INDEX) ? window.ARTICLE_INDEX : [];
  const byId = new Map(articles.map((article) => [article.id, article]));
  const state = { visible: 30, filtered: articles };
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
    const pdfLink = links.get('pdf');
    if (article.localPaths?.pdf) {
      pdfLink.href = article.localPaths.pdf;
      pdfLink.hidden = false;
    } else {
      pdfLink.removeAttribute('href');
      pdfLink.hidden = true;
    }
    links.get('official').href = article.sourceUrl;
    dialog.showModal();
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

  $('#load-more').addEventListener('click', () => { state.visible += 30; renderArticles(); });
  $('#article-dialog .dialog-close').addEventListener('click', () => $('#article-dialog').close());
  initFilters();
  filterArticles();
  window.KnowledgeChat.init({ endpoint: '/api/ask' });
})();
