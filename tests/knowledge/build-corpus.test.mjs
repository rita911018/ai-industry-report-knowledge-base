import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildCorpus, loadArchiveRecords } from '../../src/knowledge/build-corpus.mjs';

const fixture = {
  id: 'mck-1',
  archiveIndex: 1,
  radarTitle: 'fixture',
  publisher: 'McKinsey',
  sourceUrl: 'https://www.mckinsey.com/a',
  canonicalUrl: 'https://www.mckinsey.com/a',
  titleOriginal: 'A',
  titleZh: '甲',
  publishedAt: '2026-03-01',
  category: { primary: 'strategy', secondary: [] },
  tags: { topics: ['agent'], geography: [], horizon: [], domains: [] },
  priority: 'must-read',
  score: { total: 90, dimensions: { content: 32 }, sourceScale: 100 },
  confidence: { level: 'high', reason: 'Traceable evidence' },
  coreView: { original: 'Core finding.', zh: '核心结论。' },
  evidence: [{ statementOriginal: 'Evidence one.', statementZh: '证据一。', locator: 'Section 1' }],
  impactZh: '影响。',
  implicationZh: '启示。',
  provenance: { sourceFile: '/fixture.html', elementId: 'mck-1', extractionBasis: 'radar_html' },
  translationMarkdown: '# 甲\n\n第一段。\n\n## 细节\n\n第二段。',
  localPaths: { chinese: '/archive/中文全文.html', chineseMarkdown: '/archive/中文全文.md', original: '/archive/英文原文.md' },
};

test('chunks inherit auditable provenance', () => {
  const [article] = buildCorpus([fixture]);
  assert.equal(article.chunks[0].articleId, 'mck-1');
  assert.equal(article.chunks[0].sourceUrl, 'https://www.mckinsey.com/a');
  assert.match(article.chunks[0].chunkId, /^mck-1:/);
  assert.equal(article.chunks[0].localPaths.chinese, '/archive/中文全文.html');
  assert.equal(article.chunks[0].localPaths.chineseMarkdown, '/archive/中文全文.md');
});

test('archive records expose HTML for readers and Markdown for search', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'corpus-reader-paths-'));
  const articleDir = path.join(root, 'Radar', 'articles', '001-a');
  const ledgerPath = path.join(root, 'ledger.json');
  await mkdir(articleDir, { recursive: true });
  await writeFile(ledgerPath, JSON.stringify([fixture]));
  await writeFile(path.join(articleDir, 'metadata.json'), JSON.stringify({
    id: fixture.id,
    category: { primary: 'legacy-english-topic', secondary: [] },
  }));
  await writeFile(path.join(articleDir, '中文全文.md'), fixture.translationMarkdown);
  await writeFile(path.join(articleDir, '英文原文.md'), '# A');
  await writeFile(path.join(articleDir, '原始报告.pdf'), 'fixture pdf');

  const [record] = await loadArchiveRecords({ ledgerPath, archiveRoot: root });
  assert.deepEqual(record.localPaths, {
    chinese: '/archive/Radar/articles/001-a/中文全文.html',
    chineseMarkdown: '/archive/Radar/articles/001-a/中文全文.md',
    original: '/archive/Radar/articles/001-a/英文原文.md',
    snapshot: '/archive/Radar/articles/001-a/原始网页.html',
    metadata: '/archive/Radar/articles/001-a/metadata.json',
    pdf: '/archive/Radar/articles/001-a/原始报告.pdf',
  });
  assert.deepEqual(record.category, fixture.category, 'canonical ledger metadata must override archived legacy metadata');
});

test('does not expose an unavailable optional PDF path', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'corpus-no-pdf-path-'));
  const articleDir = path.join(root, 'Radar', 'articles', '001-a');
  const ledgerPath = path.join(root, 'ledger.json');
  await mkdir(articleDir, { recursive: true });
  await writeFile(ledgerPath, JSON.stringify([fixture]));
  await writeFile(path.join(articleDir, 'metadata.json'), JSON.stringify({ id: fixture.id }));
  await writeFile(path.join(articleDir, '中文全文.md'), fixture.translationMarkdown);
  await writeFile(path.join(articleDir, '英文原文.md'), '# A');

  const [record] = await loadArchiveRecords({ ledgerPath, archiveRoot: root });
  assert.equal(record.localPaths.pdf, undefined);
  assert.equal(record.localPaths.metadata, '/archive/Radar/articles/001-a/metadata.json');
});

test('heading-aware chunks retain section paths and overlap long content', () => {
  const long = `${'人工智能治理需要责任边界。'.repeat(140)}\n\n${'组织应建立审计机制。'.repeat(140)}`;
  const [article] = buildCorpus([{ ...fixture, translationMarkdown: `# 甲\n\n## 治理\n\n${long}` }], { targetCharacters: 900, overlapCharacters: 100 });
  assert.ok(article.chunks.length > 2);
  assert.ok(article.chunks.every((chunk) => chunk.sectionPath.includes('治理')));
  assert.ok(article.chunks.every((chunk) => chunk.fingerprint.length === 64));
});
