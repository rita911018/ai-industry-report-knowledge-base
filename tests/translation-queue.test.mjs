import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectSourceLanguage, scanTranslationQueue } from '../src/translation/queue.mjs';

test('detects English and Chinese archive sources', () => {
  assert.equal(detectSourceLanguage('A complete English article about artificial intelligence and organizations.'), 'en');
  assert.equal(detectSourceLanguage('这是一篇关于人工智能和组织转型的完整中文文章。'), 'zh');
});

test('marks nonempty but structurally incomplete translations invalid', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'translation-queue-'));
  const article = path.join(root, 'Radar', 'articles', '001-a');
  await mkdir(article, { recursive: true });
  await writeFile(path.join(article, 'metadata.json'), JSON.stringify({ id: 'a', publisher: 'BCG', archiveIndex: 1, radarTitle: 'Radar' }));
  await writeFile(path.join(article, '英文原文.md'), '# Title\n\nValue 25 and https://example.com.');
  await writeFile(path.join(article, '中文全文.md'), '# 标题\n\n缺少数字和网址。');
  const [entry] = await scanTranslationQueue(root);
  assert.equal(entry.status, 'invalid');
  assert.match(entry.validationError, /Missing/);
});
