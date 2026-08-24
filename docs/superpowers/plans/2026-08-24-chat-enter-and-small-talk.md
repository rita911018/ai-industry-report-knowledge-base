# Chat Enter and Small Talk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Enter-to-submit, Shift+Enter-to-newline, a useful welcome message, and deterministic lightweight small talk to the shared knowledge chat drawer.

**Architecture:** Keep all behavior in the existing `web/chat-widget.js` component. A pure small-talk classifier returns fixed local responses; all other questions continue through the existing `/api/ask` retrieval and citation flow. Keyboard submission reuses the form submit event and a shared busy guard.

**Tech Stack:** Browser JavaScript, HTML form events, JSDOM, Node.js test runner.

---

### Task 1: Lock the conversational behavior with failing tests

**Files:**
- Modify: `tests/web/chat-widget.test.mjs`

- [ ] **Step 1: Add welcome and local-small-talk tests**

Add tests that open the drawer, assert the welcome copy, submit `你好` and `你能干什么`, and verify that the response describes archive search while `calls.filter(({ url }) => url === '/api/ask')` remains empty.

```js
test('welcomes the user and answers supported small talk without calling the model', async () => {
  const { dom, document, calls } = await bootWidget();
  document.querySelector('#knowledge-chat-button').click();
  assert.match(document.querySelector('#answer').textContent, /你好.*469 篇归档文章/s);
  await submitQuestion(dom, document, '你好');
  assert.match(document.querySelector('#answer').textContent, /文章来源.*原文链接/s);
  await submitQuestion(dom, document, '你能干什么？');
  assert.match(document.querySelector('#answer').textContent, /比较不同机构观点/);
  assert.equal(calls.filter((call) => call.url === '/api/ask').length, 0);
  dom.window.close();
});
```

- [ ] **Step 2: Add keyboard behavior tests**

Dispatch a cancelable `KeyboardEvent` on `#question`. Assert Enter causes one `/api/ask` request, Shift+Enter causes none, and composing Enter causes none.

```js
test('Enter submits once while Shift+Enter and composing Enter preserve editing', async () => {
  const first = await bootWidget();
  first.document.querySelector('#question').value = '如何治理智能体？';
  first.document.querySelector('#question').dispatchEvent(new first.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await new Promise((resolve) => first.dom.window.setTimeout(resolve, 0));
  await new Promise((resolve) => first.dom.window.setTimeout(resolve, 0));
  assert.equal(first.calls.filter((call) => call.url === '/api/ask').length, 1);
  first.dom.window.close();

  for (const eventInit of [{ key: 'Enter', shiftKey: true }, { key: 'Enter', isComposing: true }]) {
    const current = await bootWidget();
    current.document.querySelector('#question').value = '保留输入';
    current.document.querySelector('#question').dispatchEvent(new current.dom.window.KeyboardEvent('keydown', { ...eventInit, bubbles: true, cancelable: true }));
    await new Promise((resolve) => current.dom.window.setTimeout(resolve, 0));
    assert.equal(current.calls.filter((call) => call.url === '/api/ask').length, 0);
    current.dom.window.close();
  }
});
```

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/web/chat-widget.test.mjs`

Expected: FAIL because the initial welcome text, local small-talk routing, and input keydown handler do not exist.

- [ ] **Step 4: Commit the failing tests**

```bash
git add tests/web/chat-widget.test.mjs
git commit -m "test: define conversational chat shortcuts"
```

### Task 2: Implement welcome, local small talk, and keyboard submission

**Files:**
- Modify: `web/chat-widget.js`
- Test: `tests/web/chat-widget.test.mjs`

- [ ] **Step 1: Add pure small-talk classification**

Near the existing provider helper, add normalization and four deterministic response groups. Unsupported text returns `null`.

```js
function normalizeMessage(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s，。！？!?、,.]+/g, '');
}

function smallTalkReply(value) {
  const message = normalizeMessage(value);
  if (/^(你好|您好|嗨|hi|hello|早上好|下午好|晚上好)$/.test(message)) return { title: '你好', text: '你好！我可以检索 469 篇归档文章、比较不同机构观点、解释 AI 机会场景，并提供文章来源与原文链接。' };
  if (/^(你是谁|你能干什么|你会什么|能做什么|怎么用|如何使用)$/.test(message)) return { title: '我能帮你做什么', text: '我可以检索 469 篇归档文章、比较不同机构观点、解释 AI 机会场景，并在知识回答中标注文章来源与原文链接。' };
  if (/^(谢谢|感谢|多谢|辛苦了|thankyou|thanks)$/.test(message)) return { title: '不客气', text: '不客气。你可以继续追问某篇文章、某个机构观点，或一个具体 AI 机会场景。' };
  if (/^(再见|拜拜|回头见|bye|goodbye)$/.test(message)) return { title: '再见', text: '再见。下次可以直接问我报告观点、证据来源或行业 AI 机会。' };
  return null;
}
```

- [ ] **Step 2: Render the welcome and local responses**

Add a small text renderer, call it during initialization, and short-circuit `ask()` when `smallTalkReply(question)` returns a response. Do not save small talk in question history.

```js
function renderTextAnswer(title, text) {
  state.sources = [];
  answer.replaceChildren(
    node('h2', { text: title }),
    node('p', { className: 'answer-lead', text }),
  );
}

const localReply = smallTalkReply(question);
if (localReply) {
  renderTextAnswer(localReply.title, localReply.text);
  return;
}
```

Initialize with:

```js
renderTextAnswer('你好', '你好！我可以检索 469 篇归档文章、比较不同机构观点、解释 AI 机会场景，并提供文章来源与原文链接。');
```

- [ ] **Step 3: Add a busy guard and Enter handling**

Extend state with `busy: false`. Set it before the network request and clear it in `finally`. Add an input keydown listener that ignores Shift+Enter and IME composition, prevents the default newline for plain Enter, and calls `form.requestSubmit()` only when not busy.

```js
questionInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!state.busy) form.requestSubmit();
});
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/web/chat-widget.test.mjs`

Expected: all chat-widget tests pass.

- [ ] **Step 5: Run the full suite**

Run: `npm test`

Expected: 138 tests pass with no failures. Tests that bind loopback may require running outside the filesystem sandbox.

- [ ] **Step 6: Commit**

```bash
git add web/chat-widget.js tests/web/chat-widget.test.mjs
git commit -m "feat: add conversational chat shortcuts"
```

### Task 3: Deploy and verify the desktop knowledge base

**Files:**
- Copy: `web/chat-widget.js`
- Destination: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/chat-widget.js`

- [ ] **Step 1: Sync the shared widget**

Run:

```bash
rsync -a web/chat-widget.js /Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/chat-widget.js
```

- [ ] **Step 2: Restart the desktop service**

Stop the current 4318 process, source the server-only `.env.local`, and launch `src/server/app-server.mjs` again so the user keeps the configured provider.

- [ ] **Step 3: Verify in the browser**

At `http://127.0.0.1:4318/`, verify:

- opening the drawer shows the welcome message;
- `你好` produces a local response and no network model error;
- Enter submits a knowledge question;
- Shift+Enter keeps a newline;
- the console contains no errors.

- [ ] **Step 4: Confirm repository state**

Run: `git status --short`

Expected: only the pre-existing untracked `.superpowers/` directory remains.
