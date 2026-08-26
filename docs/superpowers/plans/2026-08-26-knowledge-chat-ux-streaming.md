# Knowledge Chat UX and Safe Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a compact structured knowledge-chat drawer with local small talk, Enter-to-send, explicit progress, validated NDJSON streaming, friendly fallbacks, and simplified source links.

**Architecture:** Extend the validated model contract with 2–4 structured sections while retaining hidden claims for source verification. Add a backward-compatible `POST /api/ask/stream` NDJSON endpoint that emits progress immediately and only emits answer sections after complete validation. The browser consumes that stream through a small dedicated parser and renders sections plus a compact deduplicated source list.

**Tech Stack:** Node.js ESM, built-in HTTP server and Web Streams, browser DOM APIs, vanilla CSS, Node test runner, JSDOM.

---

## File map

- `src/server/validate-answer.mjs`: validate structured sections and continue deriving sources only from cited claims.
- `src/server/llm-client.mjs`: require the structured section contract from Qwen/DeepSeek.
- `src/server/app-server.mjs`: add the safe NDJSON streaming route and event writer.
- `web/ndjson-stream.js`: incremental NDJSON decoder independent from chat UI.
- `web/chat-widget.js`: chat state machine, local small talk, structured rendering, retry, and simplified source actions.
- `web/index.html`: compact chat markup, remove history and reader archive link, load the stream parser.
- `web/styles.css`: compact typography, structured answer and sticky composer styles.
- `tests/server/validate-answer.test.mjs`, `tests/server/llm-client.test.mjs`, `tests/server/app-server.test.mjs`: server contract tests.
- `tests/web/ndjson-stream.test.mjs`, `tests/web/chat-widget.test.mjs`, `tests/web/static-contract.test.mjs`: parser, behavior, DOM, and CSS tests.

### Task 1: Structured validated answer contract

**Files:**
- Modify: `tests/server/validate-answer.test.mjs`
- Modify: `tests/server/llm-client.test.mjs`
- Modify: `src/server/validate-answer.mjs`
- Modify: `src/server/llm-client.mjs`

- [ ] **Step 1: Write failing section-validation tests**

Add a valid payload with:

```js
sections: [
  { heading: '核心结论', body: '先建立人工监督。' },
  { heading: '建议动作', items: ['从单一流程试点', '记录纠错原因'] },
]
```

Assert it is preserved. Add table-driven failures for fewer than 2 or more than 4 sections, blank headings, both `body` and `items`, neither field, blank body, empty items, and non-string items. Extend the LLM prompt test to require the exact `sections` example and “2–4 个栏目”.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/server/validate-answer.test.mjs tests/server/llm-client.test.mjs
```

Expected: failures because sections are neither required nor validated and the prompt lacks the new contract.

- [ ] **Step 3: Implement section validation and prompt contract**

In `validate-answer.mjs`, call a helper before insufficient handling:

```js
function validateSections(sections, insufficient) {
  if (insufficient && (sections === undefined || sections.length === 0)) return [];
  if (!Array.isArray(sections) || sections.length < 2 || sections.length > 4) {
    throw new Error('sections must contain 2 to 4 items');
  }
  return sections.map((section) => {
    requireString(section?.heading, 'section.heading');
    const hasBody = typeof section.body === 'string';
    const hasItems = Array.isArray(section.items);
    if (hasBody === hasItems) throw new Error('section requires exactly one of body or items');
    if (hasBody) {
      requireString(section.body, 'section.body');
      return { heading: section.heading.trim(), body: section.body.trim() };
    }
    if (!section.items.length || section.items.some((item) => typeof item !== 'string' || !item.trim())) {
      throw new Error('section.items must contain nonempty strings');
    }
    return { heading: section.heading.trim(), items: section.items.map((item) => item.trim()) };
  });
}
```

Return normalized sections with the validated answer. Update the system prompt example to include `sections`, request 2–4 short, question-specific headings, and retain claims/citations for audit.

- [ ] **Step 4: Verify GREEN**

Run the same command. Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/validate-answer.mjs src/server/llm-client.mjs tests/server/validate-answer.test.mjs tests/server/llm-client.test.mjs
git commit -m "feat: validate structured knowledge answers"
```

### Task 2: Safe NDJSON streaming endpoint

**Files:**
- Modify: `tests/server/app-server.test.mjs`
- Modify: `src/server/app-server.mjs`

- [ ] **Step 1: Write failing route tests**

Add a helper that reads `response.body` with `TextDecoder`, splits newline-delimited JSON, and asserts:

```js
assert.match(response.headers.get('content-type'), /^application\/x-ndjson/);
assert.deepEqual(events.map((event) => `${event.type}:${event.stage || ''}`), [
  'status:retrieving',
  'status:generating',
  'status:validating',
  'answer_start:',
  'section:',
  'section:',
  'sources:',
  'done:',
]);
```

Assert the streamed sections equal the validated model payload; sources come from cited evidence; no API key or endpoint appears in the stream. Add cases for insufficient retrieval and an `askImpl` exception, each ending with visible `insufficient` or `error` followed by `done`.

- [ ] **Step 2: Verify RED**

```bash
node --test tests/server/app-server.test.mjs
```

Expected: `/api/ask/stream` returns 404.

- [ ] **Step 3: Implement NDJSON event helpers**

Add:

```js
function openNdjson(res) {
  res.writeHead(200, {
    'content-type': 'application/x-ndjson; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
}

function ndjson(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}
```

Factor the existing retrieval/evidence mapping into local helpers so `/api/ask` and `/api/ask/stream` share identical evidence. In the stream route emit retrieving before search, generating before `askImpl`, validating before `validateAnswer`, then `answer_start`, one event per section, sources, and done. Catch route-local exceptions and emit only:

```js
{ type: 'error', message: '刚刚没能完成回答，请再试一次。' }
{ type: 'done' }
```

For insufficient retrieval emit the approved learning message, empty sources, then done.

- [ ] **Step 4: Verify GREEN and legacy compatibility**

```bash
node --test tests/server/app-server.test.mjs tests/server/validate-answer.test.mjs
```

Expected: stream and legacy ask tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/app-server.mjs tests/server/app-server.test.mjs
git commit -m "feat: stream validated knowledge answers"
```

### Task 3: Incremental NDJSON browser parser

**Files:**
- Create: `web/ndjson-stream.js`
- Create: `tests/web/ndjson-stream.test.mjs`

- [ ] **Step 1: Write failing parser tests**

Evaluate the browser script in JSDOM and feed a `ReadableStream` where:

- one JSON line is split across two byte chunks;
- two JSON lines share one byte chunk;
- the final valid JSON line has no trailing newline;
- a malformed line rejects without leaking its raw contents into the user-facing error.

Use the intended API:

```js
const seen = [];
await window.NdjsonStream.read(response, (event) => seen.push(event));
assert.deepEqual(seen, expectedEvents);
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/web/ndjson-stream.test.mjs
```

Expected: file or global API is missing.

- [ ] **Step 3: Implement the focused parser**

Expose only `window.NdjsonStream.read`. Use `response.body.getReader()`, `TextDecoder.decode(value, { stream: true })`, a string buffer, and line parsing. Flush the decoder and parse a nonempty trailing buffer at EOF. Throw `new Error('问答响应格式无效')` on malformed JSON.

- [ ] **Step 4: Verify GREEN**

Run the same command. Expected: all parser tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/ndjson-stream.js tests/web/ndjson-stream.test.mjs
git commit -m "feat: parse streamed knowledge events"
```

### Task 4: Compact structured chat UI

**Files:**
- Modify: `tests/web/static-contract.test.mjs`
- Modify: `tests/web/chat-widget.test.mjs`
- Modify: `web/index.html`
- Modify: `web/chat-widget.js`
- Modify: `web/styles.css`

- [ ] **Step 1: Write failing static and interaction tests**

Static assertions must require:

- `ndjson-stream.js` loaded before `chat-widget.js`;
- button text `提问` and visible `Enter 发送 · Shift + Enter 换行`;
- no `question-history` and no `source-reader-original`;
- compact answer typography at no more than 16px body and 20px answer headings;
- mobile drawer remains full viewport without horizontal overflow.

Interaction tests must use a streamed response fixture and assert:

- status messages appear in event order;
- two structured sections render as headings and paragraph/list;
- claims and limitations are absent from visible text;
- sources render once with 中文全文, 官网原文, and optional PDF only;
- no “打开原文归档” appears in the chat or source reader;
- greetings, ability, thanks, and goodbye never fetch the stream endpoint;
- Enter submits once while Shift+Enter and composing Enter do not;
- insufficient and stream error show approved messages and restore the `提问` button;
- retry sends the same question once.

- [ ] **Step 2: Verify RED**

```bash
node --test tests/web/static-contract.test.mjs tests/web/chat-widget.test.mjs
```

Expected: failures for old markup, old `/api/ask` JSON flow, history, source archive links, large type, claim rendering, and missing retry.

- [ ] **Step 3: Update markup**

Remove `#question-history`, the privacy note, and `#source-reader-original`. Add:

```html
<div class="ask-actions">
  <span class="submit-hint">Enter 发送 · Shift + Enter 换行</span>
  <button id="ask-button" type="submit">提问</button>
</div>
<script src="ndjson-stream.js"></script>
<script src="chat-widget.js"></script>
```

Keep the safe iframe sandbox, Chinese link, PDF link, and official link unchanged.

- [ ] **Step 4: Replace history and claim rendering with a state machine**

Delete `HISTORY_KEY`, `storedQuestions`, `renderHistory`, and `saveQuestion`. Expand `smallTalkReply` for greetings, capabilities, thanks, and goodbye. Add event handling functions:

```js
function renderSection(section) {
  const block = node('section', { className: 'answer-section' }, [node('h3', { text: section.heading })]);
  if (section.body) block.append(node('p', { text: section.body }));
  else {
    const list = node('ul');
    for (const item of section.items) list.append(node('li', { text: item }));
    block.append(list);
  }
  answer.append(block);
}

function setProgress(message) {
  answer.replaceChildren(node('p', { className: 'answer-progress', text: message }));
}

function renderSources(sources) {
  if (!sources.length) return;
  const list = node('section', { className: 'chat-source-list', attrs: { 'aria-label': '参考来源' } }, [
    node('h3', { text: '参考来源' }),
  ]);
  for (const source of sources) list.append(sourceCard(source));
  answer.append(list);
}

function renderFailure(message, { retry = false } = {}) {
  const children = [node('p', { className: 'answer-fallback', text: message })];
  if (retry) {
    const retryButton = node('button', { className: 'text-button', text: '重新提问', attrs: { type: 'button' } });
    retryButton.addEventListener('click', () => ask(state.lastQuestion));
    children.push(retryButton);
  }
  answer.replaceChildren(...children);
}

function handleStreamEvent(event) {
  if (event.type === 'status') setProgress(event.message);
  else if (event.type === 'answer_start') answer.replaceChildren();
  else if (event.type === 'section') renderSection(event.section);
  else if (event.type === 'sources') renderSources(event.sources || []);
  else if (event.type === 'insufficient') renderFailure(event.message);
  else if (event.type === 'error') renderFailure(event.message, { retry: true });
}
```

`ask(question)` must call `/api/ask/stream`, pass the response to `NdjsonStream.read`, never show claims or limitations, and restore input/button in `finally`. Button busy text may be `处理中…`, but must return to `提问`.

- [ ] **Step 5: Apply compact CSS**

Use the existing token palette. Set answer body/source text to 14–15px, answer section headings to 15–18px, drawer title around 22–24px, line-height 1.65–1.75, fewer borders, compact source rows, sticky composer, and a restrained three-dot progress indicator. Preserve reduced-motion and 390px layout behavior.

- [ ] **Step 6: Verify GREEN**

```bash
node --test tests/web/ndjson-stream.test.mjs tests/web/static-contract.test.mjs tests/web/chat-widget.test.mjs
```

Expected: all parser, static, and interaction tests pass.

- [ ] **Step 7: Commit**

```bash
git add web/index.html web/chat-widget.js web/styles.css tests/web/static-contract.test.mjs tests/web/chat-widget.test.mjs
git commit -m "feat: simplify streaming knowledge chat"
```

### Task 5: Full verification and Desktop deployment

**Files:**
- Deploy exact changed production files to `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/`

- [ ] **Step 1: Run focused and full automated verification**

```bash
node --test tests/server/validate-answer.test.mjs tests/server/llm-client.test.mjs tests/server/app-server.test.mjs tests/web/ndjson-stream.test.mjs tests/web/static-contract.test.mjs tests/web/chat-widget.test.mjs
npm test
node web/radars/validate-data.mjs
git diff --check
```

Expected: zero failures, radar validator lists all six domains, and diff check is clean.

- [ ] **Step 2: Deploy exact production files**

```bash
rsync -a src/server/validate-answer.mjs src/server/llm-client.mjs src/server/app-server.mjs "/Users/rita/Desktop/AI行业报告/AI行业报告知识库/src/server/"
rsync -a web/index.html web/chat-widget.js web/ndjson-stream.js web/styles.css "/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/"
```

Compare every source/deployed pair with `cmp -s` before restart.

- [ ] **Step 3: Restart the local service safely**

Resolve the exact PID listening on 4318 and verify its working directory before stopping it. Restart only the product service from the Desktop product directory using its existing launcher or server command. Confirm `/api/health` returns 200 and model `qwen3.8-max`.

- [ ] **Step 4: Verify live user flows**

In the actual browser:

1. “你好” returns locally without a server ask request.
2. Enter submits; Shift+Enter inserts a newline.
3. A knowledge question immediately shows three progress stages, then 2–4 structured sections and compact sources.
4. No visible claim list, limitations, history, privacy note, or original archive action remains.
5. An unsupported question shows the approved learning message.
6. Temporarily simulated stream failure shows retry and never leaves the button disabled.
7. Chinese reader opens on the left; official and PDF links remain safe.
8. Desktop and 390px mobile layouts have no horizontal overflow.

- [ ] **Step 5: Final repository check and completion notification**

```bash
git status --short
git log -6 --oneline
```

Only pre-existing untracked `.superpowers/` and `tmp/` may remain. Play the configured bird notification after all checks pass.
