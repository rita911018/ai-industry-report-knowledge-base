import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { auditArchive } from '../src/audit/archive-audit.mjs';

test('audits complete unique article artifacts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archive-audit-'));
  const article = path.join(root, 'Radar', 'articles', '001-a');
  await mkdir(article, { recursive: true });
  await writeFile(path.join(article, 'metadata.json'), JSON.stringify({ id: 'a', status: 'downloaded', sourceUrl: 'https://example.com/a' }));
  await writeFile(path.join(article, '原始网页.html'), '<html>source</html>');
  await writeFile(path.join(article, '英文原文.md'), '# Title\n\nValue 42%.\n\nhttps://example.com/a');
  await writeFile(path.join(article, '中文全文.md'), '# 标题\n\n数值 42%。\n\nhttps://example.com/a');
  const result = await auditArchive(root, { expected: 1, verifyTranslations: true });
  assert.equal(result.valid, true);
  assert.equal(result.articles, 1);
});

test('reports missing artifacts and count drift', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archive-audit-'));
  const result = await auditArchive(root, { expected: 1 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('Expected 1')));
});
