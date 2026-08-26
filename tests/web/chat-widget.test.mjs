import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const webRoot = new URL('../../web/', import.meta.url);
const html = await readFile(new URL('index.html', webRoot), 'utf8');
const parserScript = await readFile(new URL('ndjson-stream.js', webRoot), 'utf8');
const chatScript = await readFile(new URL('chat-widget.js', webRoot), 'utf8');

const source = {
  chunkId: 'a:001', publisher: 'BCG', titleZh: '智能体治理', titleOriginal: 'Agent governance',
  publishedAt: '2026-08-01', sectionPath: '治理 › 人工监督', sourceUrl: 'https://example.com/official',
  localPaths: {
    chinese: '/archive/a/中文全文.html', original: '/archive/a/英文原文.md',
    snapshot: '/archive/a/原始网页.html', pdf: '/archive/a/原始报告.pdf',
  },
};

const successEvents = [
  { type: 'status', stage: 'retrieving', message: '正在检索归档全文…' },
  { type: 'status', stage: 'generating', message: '正在组织回答…' },
  { type: 'status', stage: 'validating', message: '正在核验来源…' },
  { type: 'answer_start', answer: '应先建立人工监督和审计。' },
  { type: 'section', section: { heading: '核心结论', body: '应先建立人工监督和审计。' } },
  { type: 'section', section: { heading: '建议动作', items: ['先试点', '记录纠错原因'] } },
  { type: 'sources', sources: [source] },
  { type: 'done' },
];

function jsonResponse(body) {
  return { ok: true, status: 200, json: async () => structuredClone(body) };
}

function streamResponse(events) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        await Promise.resolve();
      }
      controller.close();
    },
  }), { status: 200, headers: { 'content-type': 'application/x-ndjson' } });
}

async function bootWidget({
  health = { llmConfigured: true, provider: 'qwen', model: 'qwen3.8-max' },
  streamFactory = () => streamResponse(successEvents),
} = {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://127.0.0.1:4318/' });
  dom.window.TextDecoder = TextDecoder;
  const calls = [];
  dom.window.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/health') return jsonResponse(health);
    if (url === '/api/ask/stream') return streamFactory(calls.filter((call) => call.url === '/api/ask/stream').length);
    throw new Error(`Unexpected URL: ${url}`);
  };
  dom.window.eval(parserScript);
  dom.window.eval(chatScript);
  dom.window.KnowledgeChat.init();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  return { dom, document: dom.window.document, calls };
}

async function settle(dom, document) {
  for (let count = 0; count < 20 && document.querySelector('#ask-button').disabled; count += 1) {
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  }
}

async function submitQuestion(dom, document, question) {
  document.querySelector('#question').value = question;
  document.querySelector('#question-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await settle(dom, document);
}

test('renders structured streamed sections and compact traceable sources', async () => {
  const { dom, document, calls } = await bootWidget();
  document.querySelector('#knowledge-chat-button').click();
  assert.equal(document.querySelector('#knowledge-chat-drawer').hidden, false);
  assert.match(document.querySelector('#api-status').textContent, /千问.*qwen3\.8-max.*已连接/);

  await submitQuestion(dom, document, '如何治理智能体？');
  const text = document.querySelector('#answer').textContent;
  assert.match(text, /核心结论.*人工监督.*建议动作.*先试点/s);
  assert.doesNotMatch(text, /边界：|当前证据主要来自/);
  assert.equal(document.querySelectorAll('.answer-section').length, 2);
  assert.equal(document.querySelectorAll('.chat-source-card').length, 1);
  assert.equal(document.querySelectorAll('[data-source-id="a:001"]').length, 1);
  assert.match(text, /参考来源.*BCG.*智能体治理/s);
  assert.doesNotMatch(text, /打开原文归档|原文归档/);
  assert.equal(calls.filter((call) => call.url === '/api/ask/stream').length, 1);

  document.querySelector('[data-source-id="a:001"]').click();
  assert.equal(document.querySelector('#source-reader').hidden, false);
  assert.equal(document.querySelector('#source-reader-frame').getAttribute('src'), '/archive/a/中文全文.html');
  assert.equal(document.querySelector('#source-reader-pdf').getAttribute('href'), '/archive/a/原始报告.pdf');
  assert.equal(document.querySelector('#source-reader-official').getAttribute('href'), 'https://example.com/official');
  assert.equal(document.querySelector('#source-reader-original'), null);
  const cardLinks = [...document.querySelectorAll('.chat-source-card a')].map((link) => link.textContent);
  assert.deepEqual(cardLinks, ['原始报告 PDF', '官网原文']);
  dom.window.close();
});

test('answers common small talk locally without calling the stream endpoint', async () => {
  const { dom, document, calls } = await bootWidget();
  for (const [question, expected] of [
    ['你好', /可以检索 470 篇/],
    ['你能做什么？', /比较不同机构观点/],
    ['谢谢', /不客气/],
    ['再见', /下次可以直接问/],
  ]) {
    await submitQuestion(dom, document, question);
    assert.match(document.querySelector('#answer').textContent, expected);
  }
  assert.equal(calls.filter((call) => call.url === '/api/ask/stream').length, 0);
  dom.window.close();
});

test('Enter submits once while Shift+Enter and composing Enter preserve editing', async () => {
  const first = await bootWidget();
  first.document.querySelector('#question').value = '如何治理智能体？';
  first.document.querySelector('#question').dispatchEvent(new first.dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true,
  }));
  await settle(first.dom, first.document);
  assert.equal(first.calls.filter((call) => call.url === '/api/ask/stream').length, 1);
  first.dom.window.close();

  for (const eventInit of [{ key: 'Enter', shiftKey: true }, { key: 'Enter', isComposing: true }]) {
    const current = await bootWidget();
    current.document.querySelector('#question').value = '保留输入';
    current.document.querySelector('#question').dispatchEvent(new current.dom.window.KeyboardEvent('keydown', {
      ...eventInit, bubbles: true, cancelable: true,
    }));
    await new Promise((resolve) => current.dom.window.setTimeout(resolve, 0));
    assert.equal(current.calls.filter((call) => call.url === '/api/ask/stream').length, 0);
    current.dom.window.close();
  }
});

test('shows learning and retry responses instead of silently failing', async () => {
  const insufficient = await bootWidget({ streamFactory: () => streamResponse([
    { type: 'status', stage: 'retrieving', message: '正在检索归档全文…' },
    { type: 'insufficient', message: '这个问题我还在学习，目前归档资料不足以给出可靠结论。你可以换个问法，或先问我现有报告中的观点。' },
    { type: 'done' },
  ]) });
  await submitQuestion(insufficient.dom, insufficient.document, '宋代瓷器');
  assert.match(insufficient.document.querySelector('#answer').textContent, /我还在学习/);
  assert.equal(insufficient.document.querySelector('#ask-button').textContent, '提问');
  insufficient.dom.window.close();

  const failed = await bootWidget({ streamFactory: (attempt) => streamResponse(attempt === 1 ? [
    { type: 'status', stage: 'retrieving', message: '正在检索归档全文…' },
    { type: 'error', message: '刚刚没能完成回答，请再试一次。' },
    { type: 'done' },
  ] : successEvents) });
  await submitQuestion(failed.dom, failed.document, '如何治理智能体？');
  assert.match(failed.document.querySelector('#answer').textContent, /刚刚没能完成回答/);
  const retry = [...failed.document.querySelectorAll('#answer button')].find((button) => button.textContent === '重新提问');
  assert.ok(retry);
  retry.click();
  await settle(failed.dom, failed.document);
  assert.equal(failed.calls.filter((call) => call.url === '/api/ask/stream').length, 2);
  assert.match(failed.document.querySelector('#answer').textContent, /核心结论/);
  assert.equal(failed.document.querySelector('#ask-button').disabled, false);
  failed.dom.window.close();
});

test('HTTP and malformed-stream failures restore the composer with retry', async () => {
  for (const streamFactory of [
    () => new Response('service unavailable', { status: 503 }),
    () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{bad}\n')); controller.close(); } })),
  ]) {
    const current = await bootWidget({ streamFactory });
    await submitQuestion(current.dom, current.document, '如何治理智能体？');
    assert.match(current.document.querySelector('#answer').textContent, /刚刚没能完成回答/);
    assert.equal(current.document.querySelector('#ask-button').disabled, false);
    assert.ok([...current.document.querySelectorAll('#answer button')].some((button) => button.textContent === '重新提问'));
    current.dom.window.close();
  }
});
