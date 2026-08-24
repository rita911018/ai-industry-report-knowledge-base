import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../../web/', import.meta.url);

test('unified page exposes an accessible cited research workspace', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.match(html, /<form[^>]+id="question-form"/);
  assert.match(html, /<label[^>]+for="question"/);
  for (const id of ['publisher-filter', 'date-filter', 'category-filter', 'priority-filter']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /id="answer"[^>]+aria-live="polite"/);
  assert.match(html, /id="article-results"/);
  assert.match(html, /id="source-drawer"/);
  assert.match(html, /id="article-dialog"/);
  assert.match(html, /id="api-status"/);
  assert.match(html, /<nav[^>]+aria-label="主导航"/);
  assert.match(html, /href="radars\/index\.html"[^>]*>AI机会雷达<\/a>/);
  assert.match(html, /data-link="chinese"/);
  assert.match(html, /data-link="original"/);
  assert.match(html, /data-link="official"/);
  assert.match(html, /id="sort-control"/);
  assert.match(html, /value="date"[^>]*>最新发布/);
  assert.match(html, /value="score"[^>]*>评分最高/);
  assert.match(html, /<script src="data\/topics\.js"><\/script>/);
  assert.match(html, /<script src="article-utils\.js"><\/script>/);
});

test('assets include responsive, accessible and safe rendering contracts', async () => {
  const [css, js] = await Promise.all([readFile(new URL('styles.css', root), 'utf8'), readFile(new URL('app.js', root), 'utf8')]);
  assert.match(css, /@media\s*\(max-width:\s*390px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.match(js, /localStorage/);
  assert.match(js, /\/api\/ask/);
  assert.match(js, /ArticleUtils\.sortArticles/);
  assert.match(js, /params\.set\('sort'/);
  assert.match(js, /window\.ARTICLE_TOPICS/);
  assert.doesNotMatch(js, /SOURCE SCORE/);
});
