import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const webRoot = new URL('../../web/', import.meta.url);
const html = await readFile(new URL('index.html', webRoot), 'utf8');
const script = await readFile(new URL('app.js', webRoot), 'utf8');

function article(id, localPaths) {
  return {
    id,
    publisher: 'Gartner',
    publishedAt: '2026-08-15',
    titleZh: `标题 ${id}`,
    titleOriginal: `Title ${id}`,
    summary: '摘要',
    sourceUrl: `https://example.com/${id}`,
    localPaths,
    category: { primary: '技术、数据与架构' },
    chunkCount: 1,
  };
}

function bootApp() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://127.0.0.1:4318/' });
  dom.window.ARTICLE_INDEX = [
    article('with-pdf', { chinese: '/archive/a/中文全文.html', original: '/archive/a/英文原文.md', pdf: '/archive/a/原始报告.pdf' }),
    article('without-pdf', { chinese: '/archive/b/中文全文.html', original: '/archive/b/英文原文.md' }),
  ];
  dom.window.ARTICLE_TOPICS = [];
  dom.window.ArticleUtils = {
    sortArticles: (items) => items,
    scoreText: () => '未评分',
  };
  dom.window.KnowledgeChat = { init() {} };
  dom.window.HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function close() { this.open = false; };
  dom.window.eval(script);
  return { dom, document: dom.window.document };
}

test('article dialog shows an archived PDF and clears it for the next article without one', () => {
  const { dom, document } = bootApp();
  document.querySelector('[data-article-id="with-pdf"]').click();
  const pdfLink = document.querySelector('[data-link="pdf"]');
  assert.ok(pdfLink);
  assert.equal(pdfLink.textContent, '打开原始报告 PDF');
  assert.equal(pdfLink.hidden, false);
  assert.equal(pdfLink.getAttribute('href'), '/archive/a/原始报告.pdf');
  assert.equal(pdfLink.getAttribute('target'), '_blank');
  assert.equal(pdfLink.getAttribute('rel'), 'noreferrer');

  document.querySelector('[data-article-id="without-pdf"]').click();
  assert.equal(pdfLink.hidden, true);
  assert.equal(pdfLink.hasAttribute('href'), false);
  dom.window.close();
});
