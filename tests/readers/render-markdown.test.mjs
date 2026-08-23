import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../../src/readers/render-markdown.mjs';

test('renders the approved Markdown structures', () => {
  const html = renderMarkdown(`# 标题

正文含 **加粗**、*强调*、\`代码\` 和 [官网](https://example.com/a?q=1&x=2)。

1. 第一项
2. 第二项

- 甲
- 乙

> 引用内容

\`\`\`js
const x = '<tag>';
\`\`\``);
  assert.match(html, /<h1>标题<\/h1>/);
  assert.match(html, /<strong>加粗<\/strong>/);
  assert.match(html, /<em>强调<\/em>/);
  assert.match(html, /<code>代码<\/code>/);
  assert.match(html, /<ol>[\s\S]*<li>第一项<\/li>/);
  assert.match(html, /<ul>[\s\S]*<li>甲<\/li>/);
  assert.match(html, /<blockquote>[\s\S]*引用内容/);
  assert.match(html, /<pre><code class="language-js">const x = &#39;&lt;tag&gt;&#39;;/);
  assert.match(html, /href="https:\/\/example\.com\/a\?q=1&amp;x=2" target="_blank" rel="noreferrer"/);
});

test('keeps local links same-tab and strips unsafe link targets', () => {
  const html = renderMarkdown('[目录](#part) [归档](../a.html) [坏链接](javascript:alert(1))');
  assert.match(html, /href="#part"/);
  assert.match(html, /href="\.\.\/a\.html"/);
  assert.doesNotMatch(html, /target="_blank"[^>]+#part/);
  assert.doesNotMatch(html, /javascript:/i);
  assert.match(html, /坏链接/);
});

test('escapes hostile raw HTML and rejects blank input', () => {
  const hostile = renderMarkdown('# 标题\n\n<script>alert(1)</script>\n\n[x](javascript:alert(2))');
  assert.doesNotMatch(hostile, /<script|javascript:/i);
  assert.match(hostile, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(hostile, /onclick=|onerror=/i);
  assert.throws(() => renderMarkdown('  \n\n '), /Chinese Markdown rendered empty/);
});

test('cleans common extraction noise without changing the Markdown source', () => {
  const html = renderMarkdown(`- [](https://example.com/# "Share")

已保存到 [个人收藏](https://example.com/saved)[

下载报告](https://example.com/report.pdf)`);
  assert.doesNotMatch(html, /\[\]\(|Share/);
  assert.doesNotMatch(html, /<li>\s*<\/li>/);
  assert.doesNotMatch(html, /收藏<\/a>\[/);
  assert.match(html, /<a href="https:\/\/example\.com\/report\.pdf"[^>]*>下载报告<\/a>/);
});
