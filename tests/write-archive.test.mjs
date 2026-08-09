import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeArticleArchive, writeSourceManifests } from '../src/archive/write-archive.mjs';

const record = {
  schemaVersion: '1.0.0',
  id: 'bcg-example',
  radarTitle: 'BCG Insight Radar · 2026-W31 · Static',
  publisher: 'BCG',
  sourceUrl: 'https://www.bcg.com/publications/example',
  canonicalUrl: 'https://www.bcg.com/publications/example',
  titleOriginal: 'AI / Data: What?',
  titleZh: '人工智能与数据',
  priority: 'must-read',
  score: { total: 9.4, dimensions: null, sourceScale: 10 },
  provenance: { sourceFile: '/tmp/radar.html', elementId: 'item-1', extractionBasis: 'radar_html' },
};

const page = {
  body: '<!doctype html><html><body><article>Official page</article></body></html>',
  status: 200,
  attempts: 1,
  finalUrl: record.sourceUrl,
  contentType: 'text/html; charset=utf-8',
  retrievedAt: '2026-08-09T10:00:00.000Z',
};

const extracted = {
  status: 'extracted',
  markdown: '# AI / Data: What?\n\nComplete English article.',
  contentHtml: '<h1>AI / Data: What?</h1><p>Complete English article.</p>',
  headingCount: 1,
  paragraphCount: 1,
  characterCount: 47,
  extractionMethod: 'selector:main article',
  title: 'AI / Data: What?',
  byline: 'BCG',
  publishedAt: '2026-07-30',
};

test('writes deterministic auditable archive files and source manifests', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archive-writer-'));
  const first = await writeArticleArchive({ root, record, index: 7, page, extracted });

  assert.equal(first.directory.endsWith('/articles/007-ai-data-what'), true);
  const originalHtml = await readFile(path.join(first.directory, '原始网页.html'), 'utf8');
  const english = await readFile(path.join(first.directory, '英文原文.md'), 'utf8');
  const metadata = JSON.parse(await readFile(path.join(first.directory, 'metadata.json'), 'utf8'));
  assert.equal(originalHtml, page.body);
  assert.match(english, /Complete English article/);
  assert.match(metadata.snapshotSha256, /^[a-f0-9]{64}$/);
  assert.equal(metadata.sourceUrl, record.sourceUrl);
  assert.equal(metadata.radarTitle, record.radarTitle);
  assert.equal(metadata.status, 'downloaded');
  assert.equal(metadata.files.originalHtml, `${record.radarTitle}/articles/007-ai-data-what/原始网页.html`);
  assert.equal(metadata.files.englishMarkdown, `${record.radarTitle}/articles/007-ai-data-what/英文原文.md`);

  const translationPath = path.join(first.directory, '中文全文.md');
  await writeFile(translationPath, '# 已有完整翻译\n', 'utf8');
  const second = await writeArticleArchive({ root, record, index: 7, page, extracted });
  assert.equal(second.directory, first.directory);
  assert.equal(await readFile(translationPath, 'utf8'), '# 已有完整翻译\n');

  const manifest = await writeSourceManifests({ root, radarTitle: record.radarTitle });
  assert.equal(manifest.records.length, 1);
  assert.equal(manifest.records[0].id, record.id);
  assert.match(await readFile(manifest.csvPath, 'utf8'), /bcg-example/);
  assert.match(await readFile(manifest.jsonPath, 'utf8'), /snapshotSha256/);
});
