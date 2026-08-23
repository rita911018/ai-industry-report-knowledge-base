import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../../web/radars/', import.meta.url);

test('radar directory exposes exactly Legal and HR as full-page destinations', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/class="radar-directory-link"/g) || []).length, 2);
  assert.match(html, /href="legal\.html"/);
  assert.match(html, /href="hr\.html"/);
  assert.match(html, /返回知识库/);
});

for (const domain of ['legal', 'hr']) {
  test(`${domain} page is offline, accessible, and has a useful no-script fallback`, async () => {
    const html = await readFile(new URL(`${domain}.html`, root), 'utf8');
    assert.match(html, /id="radar-app"/);
    assert.match(html, /id="radar-error"[^>]+aria-live="assertive"/);
    assert.match(html, /返回雷达目录/);
    assert.match(html, /返回知识库/);
    assert.match(html, new RegExp(`data/${domain}\\.js`));
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
});
