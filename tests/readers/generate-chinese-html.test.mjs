import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateChineseReaders, verifyChineseReaders } from '../../src/readers/generate-chinese-html.mjs';

async function fixture(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chinese-reader-'));
  const articleDir = path.join(root, 'Radar', 'articles', '001-a');
  await mkdir(articleDir, { recursive: true });
  const metadata = { id: 'a', status: 'downloaded', titleZh: '中文标题', titleOriginal: 'English title', publisher: 'BCG', sourceUrl: 'https://example.com/a', ...overrides.metadata };
  await writeFile(path.join(articleDir, 'metadata.json'), JSON.stringify(metadata));
  if (!overrides.noMarkdown) await writeFile(path.join(articleDir, '中文全文.md'), overrides.markdown ?? '# 中文标题\n\n第一段。\n\n- 列表\n\n<div onclick="x">原始标签</div>');
  if (overrides.pdf === 'file') await writeFile(path.join(articleDir, '原始报告.pdf'), 'fixture pdf');
  if (overrides.pdf === 'directory') await mkdir(path.join(articleDir, '原始报告.pdf'));
  const ledgerPath = path.join(root, 'articles.json');
  const ledger = overrides.ledger ?? [{ ...metadata, coreView: { zh: '导读摘要。' }, category: { primary: 'AI 战略' }, priority: 'must-read' }];
  await writeFile(ledgerPath, JSON.stringify(ledger));
  return { root, articleDir, ledgerPath };
}

test('generates deterministic validated Chinese readers', async () => {
  const { root, articleDir, ledgerPath } = await fixture();
  assert.deepEqual(await generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 }), { expected: 1, generated: 1, verified: 1 });
  const filePath = path.join(articleDir, '中文全文.html');
  const first = await readFile(filePath, 'utf8');
  assert.deepEqual(await generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 }), { expected: 1, generated: 1, verified: 1 });
  assert.equal(await readFile(filePath, 'utf8'), first);
  assert.match(first, /中文标题/);
  assert.match(first, /BCG/);
  assert.match(first, /https:\/\/example\.com\/a/);
  assert.match(first, /<li>列表<\/li>/);
  assert.match(first, /&lt;div onclick=&quot;x&quot;&gt;/);
  assert.deepEqual(await verifyChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 }), { expected: 1, verified: 1 });
});

test('renders canonical ledger topics instead of archived legacy topics', async () => {
  const { root, articleDir, ledgerPath } = await fixture({
    metadata: { category: { primary: 'legacy-english-topic', secondary: [] } },
  });

  await generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 });
  const html = await readFile(path.join(articleDir, '中文全文.html'), 'utf8');

  assert.match(html, /AI 战略/);
  assert.doesNotMatch(html, /legacy-english-topic/);
});

test('links a regular archived PDF twice and verify requires both links', async () => {
  const { root, articleDir, ledgerPath } = await fixture({ pdf: 'file' });
  await generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 });
  const readerPath = path.join(articleDir, '中文全文.html');
  const html = await readFile(readerPath, 'utf8');
  const pdfLink = /href="原始报告\.pdf" target="_blank" rel="noreferrer">查看原始报告 PDF ↗<\/a>/g;
  assert.equal((html.match(pdfLink) || []).length, 2);
  await writeFile(readerPath, html.replace('</body>', '<a href="原始报告.pdf">extra PDF link</a></body>'));
  await assert.rejects(
    verifyChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 }),
    /Chinese reader has unexpected archived PDF links: a/,
  );
  await writeFile(readerPath, html.replace('查看原始报告 PDF ↗', 'PDF link removed'));
  await assert.rejects(
    verifyChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 }),
    /Chinese reader missing archived PDF links: a/,
  );
});

test('verify rejects any archived PDF link when no regular PDF exists', async () => {
  const { root, articleDir, ledgerPath } = await fixture();
  await generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 });
  const readerPath = path.join(articleDir, '中文全文.html');
  const html = await readFile(readerPath, 'utf8');
  await writeFile(readerPath, html.replace('</body>', '<a href="原始报告.pdf">unexpected PDF link</a></body>'));
  await assert.rejects(
    verifyChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 }),
    /Chinese reader has unexpected archived PDF links: a/,
  );
});

test('omits the PDF entry when the archived path is absent or not a regular file', async () => {
  for (const pdf of [undefined, 'directory']) {
    const { root, articleDir, ledgerPath } = await fixture({ pdf });
    await generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 });
    const html = await readFile(path.join(articleDir, '中文全文.html'), 'utf8');
    assert.doesNotMatch(html, /查看原始报告 PDF|href="原始报告\.pdf"/);
  }
});

test('treats only ENOENT as an absent PDF and rethrows other stat errors', async () => {
  const { root, articleDir, ledgerPath } = await fixture();
  const denied = Object.assign(new Error('permission denied'), { code: 'EACCES' });
  await assert.rejects(
    generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 1, statFile: async () => { throw denied; } }),
    (error) => error === denied,
  );
  await assert.rejects(stat(path.join(articleDir, '中文全文.html')));
});

for (const [label, overrides, pattern] of [
  ['missing Markdown', { noMarkdown: true }, /Missing Chinese Markdown: a/],
  ['blank Markdown', { markdown: ' \n ' }, /Chinese Markdown rendered empty/],
  ['missing ledger record', { ledger: [] }, /ledger\/archive ID mismatch/],
  ['missing title', { metadata: { titleZh: '' } }, /a.*titleZh/],
]) test(`rejects ${label} before a valid reader is left behind`, async () => {
  const { root, articleDir, ledgerPath } = await fixture(overrides);
  await assert.rejects(generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 1 }), pattern);
  await assert.rejects(stat(path.join(articleDir, '中文全文.html')));
});

test('rejects expected-count mismatch before writing', async () => {
  const { root, articleDir, ledgerPath } = await fixture();
  await assert.rejects(generateChineseReaders({ ledgerPath, archiveRoot: root, expected: 2 }), /Expected 2 archived articles, found 1/);
  await assert.rejects(stat(path.join(articleDir, '中文全文.html')));
});
