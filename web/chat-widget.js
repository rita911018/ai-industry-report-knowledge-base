(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);

  function node(tag, options = {}, children = []) {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.attrs) for (const [key, value] of Object.entries(options.attrs)) element.setAttribute(key, value);
    for (const child of children) if (child) element.append(child);
    return element;
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
    if (/^(你是谁|你能干什么|你能做什么|你会什么|能做什么|怎么用|如何使用)$/.test(message)) {
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

  function init({ endpoint = '/api/ask/stream' } = {}) {
    const button = $('#knowledge-chat-button');
    const drawer = $('#knowledge-chat-drawer');
    const closeButton = $('#knowledge-chat-close');
    const heading = $('#chat-heading');
    const form = $('#question-form');
    const questionInput = $('#question');
    const askButton = $('#ask-button');
    const answer = $('#answer');
    const status = $('#api-status');
    const reader = $('#source-reader');
    const readerFrame = $('#source-reader-frame');
    const readerHeading = $('#source-reader-title');
    const readerPublisher = $('#source-reader-publisher');
    const readerSection = $('#source-reader-section');
    const readerChinese = $('#source-reader-chinese');
    const readerPdf = $('#source-reader-pdf');
    const readerOfficial = $('#source-reader-official');
    const readerClose = $('#source-reader-close');
    const readerBack = $('#source-reader-back');
    if (!button || !drawer || drawer.dataset.initialized === 'true') return;
    drawer.dataset.initialized = 'true';

    const state = {
      sources: [], returnFocus: null, busy: false, lastQuestion: '', streamDone: false, failureRendered: false,
    };

    function questionNode() {
      return node('p', { className: 'chat-question', text: state.lastQuestion });
    }

    function renderTextAnswer(title, text) {
      state.sources = [];
      const children = [];
      if (state.lastQuestion) children.push(questionNode());
      children.push(node('section', { className: 'answer-section' }, [
        node('h3', { text: title }),
        node('p', { text }),
      ]));
      answer.replaceChildren(...children);
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
      setLink(readerPdf, source.localPaths?.pdf);
      setLink(readerOfficial, source.sourceUrl);
      readerFrame.setAttribute('src', chinese);
      reader.hidden = false;
      reader.setAttribute('aria-hidden', 'false');
      readerHeading.focus();
    }

    function sourceButton(source) {
      const control = node('button', {
        className: 'text-button source-read-button',
        text: '中文全文',
        attrs: { type: 'button', 'data-source-id': source?.chunkId || '' },
      });
      if (!source?.localPaths?.chinese) control.disabled = true;
      else control.addEventListener('click', () => openReader(source, control));
      return control;
    }

    function sourceCard(source) {
      const card = node('article', { className: 'chat-source-card' });
      card.append(
        node('p', { className: 'eyebrow', text: `${source.publisher || '来源'} · ${source.publishedAt ? String(source.publishedAt).slice(0, 10) : '日期未列出'}` }),
        node('h4', { text: source.titleZh || source.titleOriginal || source.chunkId }),
        node('p', { className: 'chat-source-section', text: source.sectionPath || '正文' }),
      );
      const actions = node('div', { className: 'source-links' }, [sourceButton(source)]);
      if (source.localPaths?.pdf) actions.append(node('a', { text: '原始报告 PDF', attrs: { href: source.localPaths.pdf, target: '_blank', rel: 'noreferrer' } }));
      if (source.sourceUrl) actions.append(node('a', { text: '官网原文', attrs: { href: source.sourceUrl, target: '_blank', rel: 'noreferrer' } }));
      card.append(actions);
      return card;
    }

    function renderSection(section) {
      const block = node('section', { className: 'answer-section' }, [node('h3', { text: section.heading })]);
      if (section.body) block.append(node('p', { text: section.body }));
      else {
        const list = node('ul');
        for (const item of section.items || []) list.append(node('li', { text: item }));
        block.append(list);
      }
      answer.append(block);
    }

    function setProgress(message) {
      answer.replaceChildren(
        questionNode(),
        node('p', { className: 'answer-progress', text: message }),
      );
    }

    function renderSources(sources) {
      state.sources = Array.isArray(sources) ? sources : [];
      if (!state.sources.length) return;
      const sourceList = node('section', { className: 'chat-source-list', attrs: { 'aria-label': '参考来源' } }, [
        node('h3', { text: '参考来源' }),
      ]);
      for (const source of state.sources) sourceList.append(sourceCard(source));
      answer.append(sourceList);
    }

    function renderFailure(message, { retry = false } = {}) {
      state.failureRendered = true;
      const children = [questionNode(), node('p', { className: 'answer-fallback', text: message })];
      if (retry) {
        const retryButton = node('button', { className: 'text-button retry-question', text: '重新提问', attrs: { type: 'button' } });
        retryButton.addEventListener('click', () => ask(state.lastQuestion));
        children.push(retryButton);
      }
      answer.replaceChildren(...children);
    }

    function handleStreamEvent(event) {
      if (event.type === 'status') setProgress(event.message);
      else if (event.type === 'answer_start') answer.replaceChildren(questionNode());
      else if (event.type === 'section') renderSection(event.section);
      else if (event.type === 'sources') renderSources(event.sources);
      else if (event.type === 'insufficient') renderFailure(event.message);
      else if (event.type === 'error') renderFailure(event.message || '刚刚没能完成回答，请再试一次。', { retry: true });
      else if (event.type === 'done') state.streamDone = true;
    }

    async function ask(question) {
      if (state.busy) return;
      state.lastQuestion = question;
      const localReply = smallTalkReply(question);
      if (localReply) {
        renderTextAnswer(localReply.title, localReply.text);
        return;
      }
      state.busy = true;
      state.streamDone = false;
      state.failureRendered = false;
      askButton.disabled = true;
      askButton.textContent = '处理中…';
      setProgress('正在发送问题…');
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question }),
        });
        if (!response.ok) throw new Error('stream request failed');
        await window.NdjsonStream.read(response, handleStreamEvent);
        if (!state.streamDone) throw new Error('stream ended early');
      } catch {
        if (!state.failureRendered) renderFailure('刚刚没能完成回答，请再试一次。', { retry: true });
      } finally {
        state.busy = false;
        askButton.disabled = false;
        askButton.textContent = '提问';
        questionInput.focus();
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
    checkHealth();
  }

  window.KnowledgeChat = { init };
})();
