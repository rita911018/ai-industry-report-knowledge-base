(() => {
  'use strict';

  const HISTORY_KEY = 'ai-report-questions';
  const $ = (selector) => document.querySelector(selector);

  function node(tag, options = {}, children = []) {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.attrs) for (const [key, value] of Object.entries(options.attrs)) element.setAttribute(key, value);
    for (const child of children) if (child) element.append(child);
    return element;
  }

  function storedQuestions() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  function providerName(provider) {
    if (provider === 'qwen') return '千问';
    if (provider === 'deepseek') return 'DeepSeek';
    return '问答模型';
  }

  function normalizeMessage(value) {
    return String(value || '').trim().toLowerCase().replace(/[\s，。！？!?、,.]+/g, '');
  }

  function smallTalkReply(value) {
    const message = normalizeMessage(value);
    if (/^(你好|您好|嗨|hi|hello|早上好|下午好|晚上好)$/.test(message)) {
      return { title: '你好', text: '你好！我可以检索 470 篇归档文章、比较不同机构观点、解释 AI 机会场景，并提供文章来源与原文链接。' };
    }
    if (/^(你是谁|你能干什么|你会什么|能做什么|怎么用|如何使用)$/.test(message)) {
      return { title: '我能帮你做什么', text: '我可以检索 470 篇归档文章、比较不同机构观点、解释 AI 机会场景，并在知识回答中标注文章来源与原文链接。' };
    }
    if (/^(谢谢|感谢|多谢|辛苦了|thankyou|thanks)$/.test(message)) {
      return { title: '不客气', text: '不客气。你可以继续追问某篇文章、某个机构观点，或一个具体 AI 机会场景。' };
    }
    if (/^(再见|拜拜|回头见|bye|goodbye)$/.test(message)) {
      return { title: '再见', text: '再见。下次可以直接问我报告观点、证据来源或行业 AI 机会。' };
    }
    return null;
  }

  function init({ endpoint = '/api/ask' } = {}) {
    const button = $('#knowledge-chat-button');
    const drawer = $('#knowledge-chat-drawer');
    const closeButton = $('#knowledge-chat-close');
    const heading = $('#chat-heading');
    const form = $('#question-form');
    const questionInput = $('#question');
    const askButton = $('#ask-button');
    const answer = $('#answer');
    const historyBox = $('#question-history');
    const status = $('#api-status');
    const reader = $('#source-reader');
    const readerFrame = $('#source-reader-frame');
    const readerHeading = $('#source-reader-title');
    const readerPublisher = $('#source-reader-publisher');
    const readerSection = $('#source-reader-section');
    const readerChinese = $('#source-reader-chinese');
    const readerOriginal = $('#source-reader-original');
    const readerPdf = $('#source-reader-pdf');
    const readerOfficial = $('#source-reader-official');
    const readerClose = $('#source-reader-close');
    const readerBack = $('#source-reader-back');
    if (!button || !drawer || drawer.dataset.initialized === 'true') return;
    drawer.dataset.initialized = 'true';

    const state = { sources: [], returnFocus: null, busy: false };

    function renderTextAnswer(title, text) {
      state.sources = [];
      answer.replaceChildren(
        node('h2', { text: title }),
        node('p', { className: 'answer-lead', text }),
      );
    }

    function closeReader({ restoreFocus = true } = {}) {
      reader.hidden = true;
      reader.setAttribute('aria-hidden', 'true');
      if (restoreFocus && state.returnFocus?.isConnected) state.returnFocus.focus();
    }

    function setDrawerOpen(open) {
      drawer.hidden = !open;
      drawer.setAttribute('aria-hidden', String(!open));
      button.setAttribute('aria-expanded', String(open));
      if (open) heading.focus();
      else {
        closeReader({ restoreFocus: false });
        button.focus();
      }
    }

    function setLink(link, href) {
      if (href) {
        link.href = href;
        link.hidden = false;
      } else {
        link.removeAttribute('href');
        link.hidden = true;
      }
    }

    function openReader(source, trigger) {
      const chinese = source.localPaths?.chinese;
      if (!chinese) return;
      state.returnFocus = trigger;
      readerPublisher.textContent = `${source.publisher || '来源'} · ${source.publishedAt ? String(source.publishedAt).slice(0, 10) : '日期未列出'}`;
      readerHeading.textContent = source.titleZh || source.titleOriginal || '来源全文';
      readerSection.textContent = source.sectionPath ? `引用位置：${source.sectionPath}` : '引用位置：正文';
      setLink(readerChinese, chinese);
      const original = source.localPaths?.snapshot || source.localPaths?.original;
      setLink(readerOriginal, original);
      readerOriginal.dataset.inline = source.localPaths?.snapshot ? 'true' : 'false';
      setLink(readerPdf, source.localPaths?.pdf);
      setLink(readerOfficial, source.sourceUrl);
      readerFrame.setAttribute('src', chinese);
      reader.hidden = false;
      reader.setAttribute('aria-hidden', 'false');
      readerHeading.focus();
    }

    function sourceButton(source, label, className = 'source-chip') {
      const sourceControl = node('button', {
        className,
        text: label,
        attrs: { type: 'button', 'data-source-id': source?.chunkId || '' },
      });
      if (!source?.localPaths?.chinese) sourceControl.disabled = true;
      else sourceControl.addEventListener('click', () => openReader(source, sourceControl));
      return sourceControl;
    }

    function sourceCard(source) {
      const card = node('article', { className: 'chat-source-card' });
      card.append(
        node('p', { className: 'eyebrow', text: `${source.publisher || '来源'} · ${source.publishedAt ? String(source.publishedAt).slice(0, 10) : '日期未列出'}` }),
        node('h3', { text: source.titleZh || source.titleOriginal || source.chunkId }),
        node('p', { className: 'chat-source-section', text: source.sectionPath || '正文' }),
      );
      const actions = node('div', { className: 'source-links' });
      actions.append(sourceButton(source, '左侧阅读中文全文', 'text-button source-read-button'));
      if (source.localPaths?.pdf) actions.append(node('a', { text: '打开原始报告 PDF', attrs: { href: source.localPaths.pdf, target: '_blank', rel: 'noreferrer' } }));
      const archive = source.localPaths?.snapshot || source.localPaths?.original;
      if (archive) actions.append(node('a', { text: '打开原文归档', attrs: { href: archive, target: '_blank' } }));
      if (source.sourceUrl) actions.append(node('a', { text: '访问官网原文', attrs: { href: source.sourceUrl, target: '_blank', rel: 'noreferrer' } }));
      card.append(actions);
      return card;
    }

    function renderAnswer(payload) {
      state.sources = Array.isArray(payload.sources) ? payload.sources : [];
      const sourceMap = new Map(state.sources.map((source) => [source.chunkId, source]));
      answer.replaceChildren(
        node('h2', { text: payload.insufficient ? '资料范围说明' : '基于归档全文的回答' }),
        node('p', { className: 'answer-lead', text: payload.answer || '' }),
      );
      for (const claim of payload.claims || []) {
        const claimBlock = node('div', { className: `claim ${claim.kind === 'analysis' ? 'analysis' : ''}` }, [node('p', { text: claim.text })]);
        const citations = node('div', { className: 'claim-citations' });
        for (const sourceId of claim.citations || []) {
          const source = sourceMap.get(sourceId);
          citations.append(sourceButton(source, source ? `${source.publisher} · ${source.sectionPath || '正文'}` : sourceId));
        }
        claimBlock.append(citations);
        answer.append(claimBlock);
      }
      if (payload.limitations?.length) answer.append(node('p', { className: 'limitations', text: `边界：${payload.limitations.join('；')}` }));
      if (state.sources.length) {
        const sourceList = node('section', { className: 'chat-source-list', attrs: { 'aria-label': '回答来源' } }, [node('h3', { text: `文章来源 · ${state.sources.length}` })]);
        for (const source of state.sources) sourceList.append(sourceCard(source));
        answer.append(sourceList);
      }
    }

    function renderHistory() {
      historyBox.replaceChildren();
      for (const question of storedQuestions()) {
        const historyButton = node('button', { text: question, attrs: { type: 'button' } });
        historyButton.addEventListener('click', () => {
          questionInput.value = question;
          questionInput.focus();
        });
        historyBox.append(historyButton);
      }
    }

    function saveQuestion(question) {
      const next = [question, ...storedQuestions().filter((item) => item !== question)].slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      renderHistory();
    }

    async function ask(question) {
      const localReply = smallTalkReply(question);
      if (localReply) {
        renderTextAnswer(localReply.title, localReply.text);
        return;
      }
      if (state.busy) return;
      state.busy = true;
      askButton.disabled = true;
      askButton.textContent = '正在检索全文…';
      answer.replaceChildren(node('p', { className: 'answer-placeholder', text: '正在查找相关证据并校验来源，请稍候。' }));
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question }),
        });
        const payload = await response.json();
        if (!response.ok) throw Object.assign(new Error(payload.error || '问答服务暂不可用'), { code: payload.code });
        renderAnswer(payload);
        saveQuestion(question);
      } catch (error) {
        const guidance = error.code === 'MISSING_API_KEY'
          ? '尚未配置问答模型。请在启动服务的服务器环境变量中设置供应商、模型与 API Key 后重新启动。'
          : error.message;
        answer.replaceChildren(
          node('h2', { text: '暂时无法生成回答' }),
          node('p', { className: 'answer-placeholder', text: guidance }),
        );
      } finally {
        state.busy = false;
        askButton.disabled = false;
        askButton.textContent = '基于全文回答';
      }
    }

    async function checkHealth() {
      status.classList.remove('online', 'offline');
      try {
        const response = await fetch('/api/health');
        const health = await response.json();
        if (health.llmConfigured) {
          status.textContent = `${providerName(health.provider)} · ${health.model} 已连接`;
          status.classList.add('online');
        } else {
          status.textContent = '问答模型待配置 · 文章浏览不受影响';
          status.classList.add('offline');
        }
      } catch {
        status.textContent = '请通过本地服务启动 · 文章浏览不受影响';
        status.classList.add('offline');
      }
    }

    button.addEventListener('click', () => setDrawerOpen(drawer.hidden));
    closeButton.addEventListener('click', () => setDrawerOpen(false));
    readerClose.addEventListener('click', () => closeReader());
    readerBack.addEventListener('click', () => closeReader());
    readerChinese.addEventListener('click', (event) => {
      if (!readerChinese.getAttribute('href')) return;
      event.preventDefault();
      readerFrame.setAttribute('src', readerChinese.getAttribute('href'));
    });
    readerOriginal.addEventListener('click', (event) => {
      if (readerOriginal.dataset.inline !== 'true') return;
      event.preventDefault();
      readerFrame.setAttribute('src', readerOriginal.getAttribute('href'));
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const question = questionInput.value.trim();
      if (question) ask(question);
    });
    questionInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      if (!state.busy) form.requestSubmit();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!reader.hidden) closeReader();
      else if (!drawer.hidden) setDrawerOpen(false);
    });

    renderTextAnswer('你好', '你好！我可以检索 470 篇归档文章、比较不同机构观点、解释 AI 机会场景，并提供文章来源与原文链接。');
    renderHistory();
    checkHealth();
  }

  window.KnowledgeChat = { init };
})();
