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

test('keeps external anchor attributes intact when URLs contain underscores', () => {
  const html = renderMarkdown('[YouTube](https://www.youtube.com/channel/UCSNX50LYGXWV_e5UWZGPGbw)');
  assert.equal(html, '<p><a href="https://www.youtube.com/channel/UCSNX50LYGXWV_e5UWZGPGbw" target="_blank" rel="noreferrer">YouTube</a></p>');
  assert.doesNotMatch(html, /target="<em>|<em>blank|rel=<em>|_blank<\/em>/);
});

test('renders formatted link labels safely without parsing nested links', () => {
  const html = renderMarkdown(`[**加粗链接**](https://example.com/a_b)
[*强调*](https://example.com/em)
[\`代码\`](https://example.com/code)
[<img src=x onerror=alert(1)>](https://example.com/safe)
[外层 [内层](https://inner.example)](https://outer.example)`);

  assert.match(html, /<a href="https:\/\/example\.com\/a_b" target="_blank" rel="noreferrer"><strong>加粗链接<\/strong><\/a>/);
  assert.match(html, /<a href="https:\/\/example\.com\/em" target="_blank" rel="noreferrer"><em>强调<\/em><\/a>/);
  assert.match(html, /<a href="https:\/\/example\.com\/code" target="_blank" rel="noreferrer"><code>代码<\/code><\/a>/);
  assert.match(html, /<a href="https:\/\/example\.com\/safe" target="_blank" rel="noreferrer">&lt;img src=x onerror=alert\(1\)&gt;<\/a>/);
  assert.doesNotMatch(html, /<img|href="https:\/\/outer\.example"|<a[^>]*>(?:(?!<\/a>)[\s\S])*<a/);
  assert.equal((html.match(/href="https:\/\/inner\.example"/g) || []).length, 1);
  assert.doesNotMatch(html, /target="<em>|<em>blank|rel=<em>|_blank<\/em>/);
});

test('renders GFM pipe tables as semantic, scrollable and safe HTML', () => {
  const html = renderMarkdown(`| 步骤 | Gartner 支持的行动 |
| --- | --- |
| 1. 评估 | [查看工具](https://example.com/a_b_c)<br>- 第一项<br>- 第二项 |
| 2. 验证 | <img src=x onerror=alert(1)> |`);

  assert.match(html, /^<div class="table-scroll" role="region" aria-label="数据表 1" tabindex="0"><table>/);
  assert.match(html, /<thead><tr><th>步骤<\/th><th>Gartner 支持的行动<\/th><\/tr><\/thead>/);
  assert.match(html, /<tbody><tr><td>1\. 评估<\/td><td><a href="https:\/\/example\.com\/a_b_c" target="_blank" rel="noreferrer">查看工具<\/a><br>- 第一项<br>- 第二项<\/td><\/tr>/);
  assert.match(html, /<tr><td>2\. 验证<\/td><td>&lt;img src=x onerror=alert\(1\)&gt;<\/td><\/tr><\/tbody><\/table><\/div>$/);
  assert.doesNotMatch(html, /<p>\| 步骤 \|/);
  assert.equal((html.match(/<br>/g) || []).length, 2);
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

test('removes malformed card wrappers and empty image placeholders from reading pages', () => {
  const html = renderMarkdown(`正文

[

![](https://example.com/cover.png)

保留的卡片说明

](https://example.com/story)[](https://example.com/# "保存")`);
  assert.match(html, /正文/);
  assert.match(html, /保留的卡片说明/);
  assert.doesNotMatch(html, /<p>\[<\/p>|图：|<p><\/p>|\]\(https:/);
});
