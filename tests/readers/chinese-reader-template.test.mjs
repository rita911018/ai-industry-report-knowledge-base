import assert from 'node:assert/strict';
import test from 'node:test';
import { renderChineseReader } from '../../src/readers/chinese-reader-template.mjs';

const article = {
  id: 'a-1', titleZh: '中文标题', titleOriginal: 'English title', publisher: 'BCG', publishedAt: '2026-08-01',
  category: { primary: 'AI 战略' }, priority: 'must-read', coreView: { zh: '中文摘要。' }, sourceUrl: 'https://example.com/original',
};

test('renders one self-contained editorial reading page', () => {
  const html = renderChineseReader({ article, bodyHtml: '<h1>中文标题</h1><p>完整正文。</p>', returnHref: '/index.html' });
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/返回知识库/g) || []).length, 2);
  assert.equal((html.match(/查看官网原文/g) || []).length, 2);
  assert.match(html, /本地归档的完整中文译文/);
  assert.match(html, /中文摘要。/);
  assert.match(html, /max-width:\s*760px/);
  assert.match(html, /line-height:\s*1\.9/);
  assert.match(html, /\.table-scroll\{[^}]*overflow-x:auto/);
  assert.match(html, /\.article-body table\{[^}]*border-collapse:collapse/);
  assert.match(html, /@media\s*\(max-width:\s*390px\)/);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
  assert.match(html, /@media\s+print/);
  assert.doesNotMatch(html, /<script|<link\b|<img\b|<iframe/i);
  assert.doesNotMatch(html, /https?:\/\/[^"']+\.(?:css|woff|png|jpe?g)/i);
  assert.equal((html.match(/target="_blank" rel="noreferrer"/g) || []).length, 2);
});

test('omits absent optional metadata without empty labels', () => {
  const html = renderChineseReader({ article: { id: 'a-2', titleZh: '标题', publisher: 'MIT Sloan', sourceUrl: 'https://example.com' }, bodyHtml: '<p>正文</p>' });
  assert.doesNotMatch(html, /英文原标题|发布日期|文章类别|优先级/);
  assert.doesNotMatch(html, /查看原始报告 PDF|\.pdf/);
});

test('renders a safe archived PDF filename in both reader navigation bars', () => {
  const html = renderChineseReader({
    article,
    bodyHtml: '<p>正文</p>',
    pdfHref: '原始报告.pdf',
  });
  assert.equal((html.match(/href="原始报告\.pdf" target="_blank" rel="noreferrer">查看原始报告 PDF ↗<\/a>/g) || []).length, 2);
});

test('rejects unsafe archived PDF hrefs', () => {
  for (const pdfHref of ['javascript:alert(1)', '//evil.example/report.pdf', '../report.pdf', 'folder/report.pdf', 'report.pdf?download=1']) {
    assert.throws(() => renderChineseReader({ article, bodyHtml: '<p>正文</p>', pdfHref }), /a-1.*pdfHref/);
  }
});

test('rejects missing required article fields', () => {
  assert.throws(() => renderChineseReader({ article: { id: 'bad', publisher: 'BCG', sourceUrl: 'https://example.com' }, bodyHtml: '<p>正文</p>' }), /bad.*titleZh/);
  assert.throws(() => renderChineseReader({ article: { id: 'bad', titleZh: '标题', publisher: 'BCG', sourceUrl: 'javascript:x' }, bodyHtml: '<p>正文</p>' }), /bad.*sourceUrl/);
  assert.throws(() => renderChineseReader({ article: { id: 'bad', titleZh: '标题', publisher: 'BCG', sourceUrl: 'https://example.com' }, bodyHtml: '' }), /bad.*bodyHtml/);
});
