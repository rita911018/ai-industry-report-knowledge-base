import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const webRoot = new URL('../../web/', import.meta.url);
const html = await readFile(new URL('index.html', webRoot), 'utf8');
const script = await readFile(new URL('chat-widget.js', webRoot), 'utf8');

const askResponse = {
  answer: '应先建立人工监督和审计。',
  claims: [{ text: '智能体治理需要人工监督。', kind: 'source_fact', citations: ['a:001'] }],
  limitations: ['当前证据主要来自管理咨询资料。'],
  insufficient: false,
  sources: [{
    chunkId: 'a:001',
    publisher: 'BCG',
    titleZh: '智能体治理',
    titleOriginal: 'Agent governance',
    publishedAt: '2026-08-01',
    sectionPath: '治理 › 人工监督',
    sourceUrl: 'https://example.com/official',
    localPaths: {
      chinese: '/archive/a/中文全文.html',
      original: '/archive/a/英文原文.md',
      snapshot: '/archive/a/原始网页.html',
    },
  }],
};

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => structuredClone(body) };
}

async function bootWidget({ health = { llmConfigured: true, provider: 'qwen', model: 'qwen-plus' }, answer = askResponse } = {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://127.0.0.1:4318/' });
  const calls = [];
  dom.window.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/health') return response(health);
    if (url === '/api/ask') return response(answer);
    throw new Error(`Unexpected URL: ${url}`);
  };
  dom.window.eval(script);
  dom.window.KnowledgeChat.init({ endpoint: '/api/ask' });
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  return { dom, document: dom.window.document, calls };
}

async function submitQuestion(dom, document, question) {
  document.querySelector('#question').value = question;
  document.querySelector('#question-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
}

test('opens the drawer, renders cited sources, and reads Chinese full text on the left', async () => {
  const { dom, document, calls } = await bootWidget();

  document.querySelector('#knowledge-chat-button').click();
  assert.equal(document.querySelector('#knowledge-chat-drawer').hidden, false);
  assert.equal(document.querySelector('#knowledge-chat-button').getAttribute('aria-expanded'), 'true');
  assert.match(document.querySelector('#api-status').textContent, /千问.*qwen-plus.*已连接/);

  await submitQuestion(dom, document, '如何治理智能体？');
  assert.match(document.querySelector('#answer').textContent, /应先建立人工监督和审计/);
  const sourceButton = document.querySelector('[data-source-id="a:001"]');
  assert.ok(sourceButton);
  sourceButton.click();

  assert.equal(document.querySelector('#source-reader').hidden, false);
  assert.equal(document.querySelector('#source-reader-frame').getAttribute('src'), '/archive/a/中文全文.html');
  assert.equal(document.querySelector('#source-reader-original').getAttribute('href'), '/archive/a/原始网页.html');
  assert.equal(document.querySelector('#source-reader-official').getAttribute('href'), 'https://example.com/official');
  assert.equal(calls.filter((call) => call.url === '/api/ask').length, 1);

  document.querySelector('#source-reader-close').click();
  assert.equal(document.querySelector('#source-reader').hidden, true);
  assert.match(document.querySelector('#answer').textContent, /应先建立人工监督和审计/);
  dom.window.close();
});

test('shows generic model setup guidance without breaking article browsing', async () => {
  const missing = { error: '尚未配置问答模型 API Key', code: 'MISSING_API_KEY' };
  const { dom, document } = await bootWidget({ health: { llmConfigured: false, provider: null, model: null }, answer: missing });
  dom.window.fetch = async (url) => url === '/api/health'
    ? response({ llmConfigured: false, provider: null, model: null })
    : response(missing, { ok: false, status: 503 });

  document.querySelector('#knowledge-chat-button').click();
  await submitQuestion(dom, document, '如何治理智能体？');

  assert.match(document.querySelector('#api-status').textContent, /问答模型待配置/);
  assert.match(document.querySelector('#answer').textContent, /服务器环境变量/);
  assert.ok(document.querySelector('#article-results'));
  dom.window.close();
});
