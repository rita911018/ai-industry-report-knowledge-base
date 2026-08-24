# Global Knowledge Chat and Switchable LLM Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move full-text Q&A into a floating right drawer with a left Chinese-source reader, and let the server use either DeepSeek or Qwen through one validated interface.

**Architecture:** Server configuration and upstream calls are separated from retrieval and answer validation. The browser gets a standalone chat widget that owns drawer/session/source-reader state, while the existing article app owns only library filtering and article dialogs. The homepage hero becomes a wide horizontal introduction rather than a three-column Q&A workspace.

**Tech Stack:** Node.js HTTP server, OpenAI-compatible Chat Completions HTTP, browser JavaScript, JSDOM, node:test, HTML/CSS.

---

### Task 1: Provider-neutral configuration

**Files:**
- Create: `src/server/llm-config.mjs`
- Create: `tests/server/llm-config.test.mjs`

- [ ] **Step 1: Write failing configuration tests**

```js
test('loads Qwen only from server environment', () => {
  const config = loadLlmConfig({ LLM_PROVIDER: 'qwen', LLM_API_KEY: 'secret', LLM_MODEL: 'qwen-plus', LLM_BASE_URL: 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1' });
  assert.equal(config.provider, 'qwen');
  assert.equal(config.endpoint, 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions');
});
test('supports legacy DeepSeek configuration and rejects unsafe Qwen URLs', () => {
  assert.equal(loadLlmConfig({ DEEPSEEK_API_KEY: 'x' }).provider, 'deepseek');
  assert.throws(() => loadLlmConfig({ LLM_PROVIDER: 'qwen', LLM_API_KEY: 'x', LLM_MODEL: 'qwen-plus' }), /LLM_BASE_URL/);
  assert.throws(() => loadLlmConfig({ LLM_PROVIDER: 'qwen', LLM_API_KEY: 'x', LLM_MODEL: 'qwen-plus', LLM_BASE_URL: 'http://127.0.0.1:9000' }), /official HTTPS/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/server/llm-config.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement config parsing**

```js
export function loadLlmConfig(env = process.env) {
  const legacy = !env.LLM_PROVIDER && env.DEEPSEEK_API_KEY;
  const provider = env.LLM_PROVIDER || (legacy ? 'deepseek' : null);
  if (!provider) return { configured: false, provider: null, model: null, legacy: false };
  if (!['deepseek', 'qwen'].includes(provider)) throw Object.assign(new Error(`Unsupported LLM provider: ${provider}`), { code: 'INVALID_LLM_CONFIG' });
  const apiKey = env.LLM_API_KEY || (legacy ? env.DEEPSEEK_API_KEY : '');
  const model = env.LLM_MODEL || (provider === 'deepseek' ? env.DEEPSEEK_MODEL || 'deepseek-v4-flash' : 'qwen-plus');
  const base = provider === 'deepseek' ? (env.LLM_BASE_URL || 'https://api.deepseek.com') : env.LLM_BASE_URL;
  if (!base) throw Object.assign(new Error('Qwen requires LLM_BASE_URL'), { code: 'INVALID_LLM_CONFIG' });
  const url = new URL(base);
  const qwenHost = url.hostname === 'dashscope.aliyuncs.com' || url.hostname.endsWith('.maas.aliyuncs.com');
  if (url.protocol !== 'https:' || (provider === 'qwen' && !qwenHost)) throw Object.assign(new Error('Qwen requires an official HTTPS Model Studio URL'), { code: 'INVALID_LLM_CONFIG' });
  return { configured: Boolean(apiKey), provider, apiKey, model, endpoint: `${url.href.replace(/\/$/, '')}/chat/completions`, legacy };
}
```

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/server/llm-config.test.mjs`

Expected: all configuration tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/llm-config.mjs tests/server/llm-config.test.mjs
git commit -m "feat: configure switchable LLM providers"
```

### Task 2: Unified upstream LLM client

**Files:**
- Create: `src/server/llm-client.mjs`
- Modify: `src/server/deepseek-client.mjs`
- Create: `tests/server/llm-client.test.mjs`
- Modify: `tests/server/deepseek-client.test.mjs`

- [ ] **Step 1: Write failing DeepSeek and Qwen request tests**

```js
test('Qwen uses JSON mode with thinking disabled', async () => {
  let body;
  await askLlm({ question: '问题', evidence: [{ chunkId: 'a:1', content: '证据' }], config: qwenConfig, fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return jsonResponse(validAnswer); } });
  assert.equal(body.model, 'qwen-plus');
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(body.enable_thinking, false);
});
test('DeepSeek does not send Qwen-only parameters', async () => {
  let body;
  await askLlm({ question: '问题', evidence: [], config: deepseekConfig, fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return jsonResponse(validAnswer); } });
  assert.equal('enable_thinking' in body, false);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/server/llm-client.test.mjs`

Expected: FAIL because `askLlm` is unavailable.

- [ ] **Step 3: Implement unified request and stable error codes**

```js
export async function askLlm({ question, evidence, config, fetchImpl = fetch, timeoutMs = 90_000 }) {
  if (!config?.configured) throw coded('Question-answering model is not configured', 'MISSING_API_KEY');
  const body = { model: config.model, temperature: 0.1, response_format: { type: 'json_object' }, messages: buildMessages(question, evidence) };
  if (config.provider === 'qwen') body.enable_thinking = false;
  const response = await fetchWithTimeout(config.endpoint, { method: 'POST', headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs, fetchImpl);
  if (!response.ok) throw upstreamError(response.status, config.provider);
  const payload = await response.json();
  return JSON.parse(payload.choices[0].message.content);
}
```

Keep `askDeepSeek` as a compatibility wrapper that calls `askLlm` with a DeepSeek config.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/server/llm-client.test.mjs tests/server/deepseek-client.test.mjs`

Expected: all client tests pass and no error message exposes the test API key.

- [ ] **Step 5: Commit**

```bash
git add src/server/llm-client.mjs src/server/deepseek-client.mjs tests/server/llm-client.test.mjs tests/server/deepseek-client.test.mjs
git commit -m "feat: call DeepSeek and Qwen through one client"
```

### Task 3: Integrate generic model health and prevent browser overrides

**Files:**
- Modify: `src/server/app-server.mjs`
- Modify: `tests/server/app-server.test.mjs`

- [ ] **Step 1: Write failing server integration tests**

```js
test('health reports provider without exposing credentials', async () => {
  await withServer({ llmConfig: { configured: true, provider: 'qwen', model: 'qwen-plus', apiKey: 'never-print' } }, async (base) => {
    const health = await fetch(`${base}/api/health`).then((r) => r.json());
    assert.deepEqual({ configured: health.llmConfigured, provider: health.provider, model: health.model }, { configured: true, provider: 'qwen', model: 'qwen-plus' });
    assert.doesNotMatch(JSON.stringify(health), /never-print/);
  });
});
test('ask ignores client model and base URL overrides', async () => {
  const serverConfig = { configured: true, provider: 'qwen', model: 'qwen-plus', apiKey: 'server-key', endpoint: 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions' };
  let captured;
  await withServer({ llmConfig: serverConfig, askImpl: async ({ config }) => { captured = config; return { answer: '回答', claims: [{ text: '证据', kind: 'source_fact', citations: ['a:001'] }], limitations: [], insufficient: false }; } }, async (base) => {
    await fetch(`${base}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'AI 治理', model: 'attacker-model', baseUrl: 'http://127.0.0.1:9' }) });
  });
  assert.equal(captured, serverConfig);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/server/app-server.test.mjs`

Expected: FAIL because generic LLM health fields do not exist.

- [ ] **Step 3: Replace DeepSeek-specific server parameters**

Use `loadLlmConfig()` at startup, inject `llmConfig` and `askImpl = askLlm`, return `{ llmConfigured, provider, model, deepseekConfigured }` from health, and call `askImpl({ question, evidence, config: llmConfig })`. Do not pass `body.model`, `body.baseUrl`, or any client credential.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/server/app-server.test.mjs tests/server/llm-*.test.mjs`

Expected: all server and LLM tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/app-server.mjs tests/server/app-server.test.mjs
git commit -m "feat: expose provider-neutral question answering"
```

### Task 4: Wide knowledge hero and chat widget markup

**Files:**
- Modify: `web/index.html`
- Create: `web/chat-widget.js`
- Modify: `tests/web/static-contract.test.mjs`

- [ ] **Step 1: Write failing static contracts**

```js
assert.doesNotMatch(html, /class="ask-console"/);
assert.doesNotMatch(html, /问报告，<br>/);
assert.match(html, /id="knowledge-chat-button"/);
assert.match(html, /id="knowledge-chat-drawer"/);
assert.match(html, /id="source-reader"/);
assert.match(html, /<script src="chat-widget\.js"><\/script>/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/web/static-contract.test.mjs`

Expected: FAIL because the old inline Q&A workspace is still present.

- [ ] **Step 3: Replace the hero and add semantic widget containers**

```html
<section class="knowledge-hero" aria-labelledby="knowledge-heading">
  <p class="eyebrow">Grounded research assistant</p>
  <h1 id="knowledge-heading">问报告，也问证据。</h1>
  <p>答案只基于已归档全文，并逐条标注出处。</p>
</section>
<button id="knowledge-chat-button" class="knowledge-chat-button" type="button" aria-label="问整个知识库" aria-expanded="false">✦</button>
<aside id="knowledge-chat-drawer" class="knowledge-chat-drawer" role="dialog" aria-modal="false" aria-labelledby="chat-heading" aria-hidden="true">
  <button id="knowledge-chat-close" type="button" aria-label="关闭全局问答">×</button>
  <h2 id="chat-heading">问整个知识库</h2>
  <p id="chat-status" aria-live="polite">正在检查问答模型…</p>
  <form id="question-form"><label for="question">向 469 篇全文提问</label><textarea id="question" name="question" required></textarea><button id="ask-button" type="submit">基于全文回答</button></form>
  <div id="answer" aria-live="polite"></div>
  <div id="question-history" aria-label="最近问题"></div>
</aside>
<section id="source-reader" class="source-reader" aria-hidden="true"><iframe id="source-reader-frame" title="中文全文阅读器"></iframe></section>
```

Move the question form, answer, history and status elements into the drawer. Add source-reader controls for Chinese full text, local snapshot, official source and close/back.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/web/static-contract.test.mjs`

Expected: static page contract passes.

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/chat-widget.js tests/web/static-contract.test.mjs
git commit -m "feat: add global knowledge chat workspace"
```

### Task 5: Chat and source-reader behavior

**Files:**
- Modify: `web/chat-widget.js`
- Modify: `web/app.js`
- Create: `tests/web/chat-widget.test.mjs`

- [ ] **Step 1: Write failing JSDOM interaction tests**

```js
test('opens chat, renders cited sources, and opens Chinese full text on the left', async () => {
  const { document, fetchCalls } = await bootWidget({ askResponse });
  document.querySelector('#knowledge-chat-button').click();
  assert.equal(document.querySelector('#knowledge-chat-drawer').getAttribute('aria-hidden'), 'false');
  submitQuestion(document, '未来半年最值得关注什么？');
  await nextTick();
  document.querySelector('[data-source-id="a:001"]').click();
  assert.equal(document.querySelector('#source-reader').getAttribute('aria-hidden'), 'false');
  assert.match(document.querySelector('#source-reader-frame').src, /中文全文\.html/);
  assert.equal(fetchCalls.length, 1);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/web/chat-widget.test.mjs`

Expected: FAIL because widget initialization and source-reader state are not implemented.

- [ ] **Step 3: Implement drawer/session/source behavior**

Expose `window.KnowledgeChat.init({ endpoint: '/api/ask' })`; reuse the current safe DOM builders; keep the current question and rendered answer in memory; persist only the five recent question strings; render source cards with Chinese, snapshot, and official links; set the iframe to `source.localPaths.chinese` by default; return focus to the triggering source on reader close and to the floating button on drawer close.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/web/chat-widget.test.mjs tests/web/static-contract.test.mjs`

Expected: all widget tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/chat-widget.js web/app.js tests/web/chat-widget.test.mjs
git commit -m "feat: preserve cited chat and source reading state"
```

### Task 6: Responsive layout and visual regression contracts

**Files:**
- Modify: `web/styles.css`
- Modify: `tests/web/static-contract.test.mjs`

- [ ] **Step 1: Add failing responsive CSS contracts**

```js
assert.match(css, /\.knowledge-hero[^}]*min-width/);
assert.match(css, /\.knowledge-chat-drawer[^}]*width:\s*min\(520px,\s*44vw\)/);
assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.knowledge-chat-drawer[^}]*width:\s*100vw/);
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/web/static-contract.test.mjs`

Expected: FAIL because new layout rules are absent.

- [ ] **Step 3: Add the confirmed desktop/tablet/mobile layout**

Use a wide hero with `h1 { text-wrap: balance; }`, no hard `<br>`, a 70% minimum content share at 768px+, a fixed 520px/44vw desktop drawer, left reader using the remaining viewport, and full-screen mobile drawer/reader with a “返回回答” control. Keep the floating button clear of the scrollbar and “显示更多” button.

- [ ] **Step 4: Verify all tests and browser widths**

Run: `npm test`

Expected: zero failures. Then inspect 1440px, 902px and 390px widths: title horizontal at 902px, drawer 520px at 1440px, and no horizontal overflow at 390px.

- [ ] **Step 5: Commit**

```bash
git add web/styles.css tests/web/static-contract.test.mjs
git commit -m "feat: finish responsive knowledge chat layout"
```
