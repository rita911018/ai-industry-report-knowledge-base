import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../../web/radars/', import.meta.url);

test('knowledge homepage links to the explicit radar directory index', async () => {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /href="radars\/index\.html"[^>]*>AI机会雷达<\/a>/);
});

const domains = ['legal', 'hr', 'retail', 'supply-chain', 'finance', 'marketing'];

test('radar directory exposes all six domains as full-page destinations', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/class="radar-directory-link"/g) || []).length, domains.length);
  for (const domain of domains) assert.match(html, new RegExp(`href="${domain}\\.html"`));
  assert.match(html, /返回知识库/);
  assert.match(html, /<p class="directory-lede">在你的行业，发现 AI 机会。<\/p>/);
  assert.doesNotMatch(html, /完整场景库用于发现机会/);
});

for (const domain of domains) {
  test(`${domain} page is offline, accessible, and has a useful no-script fallback`, async () => {
    const html = await readFile(new URL(`${domain}.html`, root), 'utf8');
    assert.match(html, /id="radar-app"/);
    assert.match(html, /id="radar-error"[^>]+aria-live="assertive"/);
    assert.match(html, /返回雷达目录/);
    assert.match(html, /返回知识库/);
    assert.match(html, new RegExp(`data/${domain}\\.js`));
    if (!['legal', 'hr'].includes(domain)) assert.match(html, /data\/extended-builder\.js/);
    assert.match(html, /radar\.js/);
    assert.match(html, /<noscript>[\s\S]+核心判断[\s\S]+AI 能解决哪些业务问题[\s\S]+建议优先启动的 3 个场景[\s\S]+证据/);
    assert.doesNotMatch(html, /90 天路线图|治理门槛|五家 Insight Radar/);
    assert.doesNotMatch(html, /iframe|DEEPSEEK|api\/ask/i);
  });
}

test('shared radar styles cover focus, mobile, reduced motion, and print', async () => {
  const css = await readFile(new URL('radar.css', root), 'utf8');
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*390px\)/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s+print/);
  assert.match(css, /\.scenario-detail[^{]*\{[^}]*display:\s*block\s*!important/);
  assert.match(css, /\.directory-hero h1\s*\{[^}]*font-size:\s*clamp\(56px,\s*6\.5vw,\s*96px\)/s);
  assert.match(css, /\.directory-lede\s*\{[^}]*font-size:\s*24px/s);
  assert.match(css, /@media\s*\(max-width:\s*390px\)[\s\S]*\.directory-hero h1\s*\{[^}]*font-size:\s*48px/s);
  assert.match(css, /@media\s*\(max-width:\s*390px\)[\s\S]*\.directory-lede\s*\{[^}]*font-size:\s*18px/s);
  assert.match(css, /\.radar-toc-panel\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /@media\s*\(min-width:\s*1100px\)[\s\S]*\.radar-toc-trigger[^}]*display:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*1099px\)[\s\S]*\.radar-toc-panel[^}]*transform:\s*translateX\(-/s);
  assert.match(css, /body\.radar-toc-open[\s\S]*overflow:\s*hidden/s);
  assert.match(css, /@media\s+print[\s\S]*\.radar-toc-panel[\s\S]*display:\s*none\s*!important/s);
  assert.match(css, /@media\s+print[\s\S]*\.radar-detail-page #radar-app \.radar-shell\s*\{[^}]*width:\s*100%\s*!important[^}]*margin-inline:\s*auto\s*!important/s);
  assert.match(css, /@media\s*\(max-width:\s*1099px\)[\s\S]*\.radar-toc-panel\s*\{[^}]*height:\s*100vh[^}]*height:\s*100dvh[^}]*visibility:\s*hidden[^}]*pointer-events:\s*none/s);
  assert.match(css, /body\.radar-toc-open \.radar-toc-panel\s*\{[^}]*visibility:\s*visible[^}]*pointer-events:\s*auto/s);
  assert.match(css, /@media\s*\(min-width:\s*1100px\)[\s\S]*\.radar-toc-panel\s*\{[^}]*transform:\s*none[^}]*visibility:\s*visible[^}]*pointer-events:\s*auto/s);
  assert.match(css, /@media\s+print[\s\S]*body\s*\{[^}]*overflow:\s*visible\s*!important/s);
});
