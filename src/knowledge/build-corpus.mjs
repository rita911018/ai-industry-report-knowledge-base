import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TARGET = 1_500;
const DEFAULT_OVERLAP = 150;

function fingerprint(value) {
  return createHash('sha256').update(value).digest('hex');
}

function splitMarkdown(markdown, targetCharacters, overlapCharacters) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let headings = [];
  let body = [];
  const flush = () => {
    const content = body.join('\n').trim();
    if (content) sections.push({ sectionPath: headings.join(' › ') || '正文', content });
    body = [];
  };
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) { body.push(line); continue; }
    flush();
    const level = match[1].length;
    headings = [...headings.slice(0, level - 1), match[2].trim()];
  }
  flush();

  const chunks = [];
  for (const section of sections) {
    if (section.content.length <= targetCharacters) {
      chunks.push(section);
      continue;
    }
    let start = 0;
    while (start < section.content.length) {
      let end = Math.min(start + targetCharacters, section.content.length);
      if (end < section.content.length) {
        const boundary = Math.max(
          section.content.lastIndexOf('\n\n', end),
          section.content.lastIndexOf('。', end),
          section.content.lastIndexOf('. ', end),
        );
        if (boundary > start + Math.floor(targetCharacters * 0.6)) end = boundary + 1;
      }
      const content = section.content.slice(start, end).trim();
      if (content) chunks.push({ sectionPath: section.sectionPath, content });
      if (end >= section.content.length) break;
      start = Math.max(start + 1, end - overlapCharacters);
    }
  }
  return chunks;
}

export function buildCorpus(records, { targetCharacters = DEFAULT_TARGET, overlapCharacters = DEFAULT_OVERLAP } = {}) {
  return records.map((record) => {
    const sections = splitMarkdown(record.translationMarkdown || '', targetCharacters, overlapCharacters);
    const article = {
      id: record.id,
      archiveIndex: record.archiveIndex,
      radarTitle: record.radarTitle,
      publisher: record.publisher,
      sourceUrl: record.sourceUrl,
      canonicalUrl: record.canonicalUrl || record.sourceUrl,
      titleOriginal: record.titleOriginal,
      titleZh: record.titleZh || record.titleOriginal,
      publishedAt: record.publishedAt,
      documentType: record.documentType || null,
      category: record.category,
      tags: record.tags,
      priority: record.priority,
      score: record.score,
      confidence: record.confidence,
      coreView: record.coreView,
      evidence: record.evidence,
      impactZh: record.impactZh,
      implicationZh: record.implicationZh,
      provenance: record.provenance,
      localPaths: record.localPaths,
    };
    article.chunks = sections.map((section, index) => ({
      chunkId: `${record.id}:${String(index + 1).padStart(3, '0')}`,
      articleId: record.id,
      publisher: record.publisher,
      titleOriginal: record.titleOriginal,
      titleZh: record.titleZh || record.titleOriginal,
      publishedAt: record.publishedAt,
      category: record.category,
      tags: record.tags,
      priority: record.priority,
      score: record.score,
      confidence: record.confidence,
      sourceUrl: record.sourceUrl,
      canonicalUrl: record.canonicalUrl || record.sourceUrl,
      localPaths: record.localPaths,
      sectionPath: section.sectionPath,
      content: section.content,
      fingerprint: fingerprint(section.content),
    }));
    return article;
  });
}

async function walkMetadata(root) {
  const found = new Map();
  const walk = async (directory) => {
    const entries = await (await import('node:fs/promises')).readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name === 'metadata.json') {
        const metadata = JSON.parse(await readFile(full, 'utf8'));
        found.set(metadata.id, { metadata, directory: path.dirname(full) });
      }
    }
  };
  await walk(root);
  return found;
}

export async function loadArchiveRecords({ ledgerPath, archiveRoot }) {
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  const sourceRecords = Array.isArray(ledger) ? ledger : ledger.articles;
  const archive = await walkMetadata(archiveRoot);
  return Promise.all(sourceRecords.map(async (record) => {
    const saved = archive.get(record.id);
    if (!saved) throw new Error(`Missing archived record: ${record.id}`);
    const translationPath = path.join(saved.directory, '中文全文.md');
    const originalPath = path.join(saved.directory, '英文原文.md');
    const relativeDirectory = path.relative(archiveRoot, saved.directory).split(path.sep).join('/');
    return {
      ...saved.metadata,
      ...record,
      translationMarkdown: await readFile(translationPath, 'utf8'),
      localPaths: {
        chinese: `/archive/${relativeDirectory}/中文全文.html`,
        chineseMarkdown: `/archive/${relativeDirectory}/中文全文.md`,
        original: `/archive/${relativeDirectory}/英文原文.md`,
        snapshot: `/archive/${relativeDirectory}/原始网页.html`,
      },
    };
  }));
}

export function browserMetadata(corpus) {
  return corpus.map(({ chunks, evidence, provenance, ...article }) => ({
    ...article,
    summary: article.coreView?.zh || chunks[0]?.content.slice(0, 220) || '',
    evidenceCount: evidence?.length || 0,
    chunkCount: chunks.length,
  }));
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--ledger') options.ledgerPath = argv[++i];
    else if (argv[i] === '--archive') options.archiveRoot = argv[++i];
    else if (argv[i] === '--out') options.outPath = argv[++i];
    else if (argv[i] === '--browser') options.browserPath = argv[++i];
    else if (argv[i] === '--verify') options.verifyPath = argv[++i];
  }
  return options;
}

async function verifyCorpus(filePath) {
  const corpus = JSON.parse(await readFile(filePath, 'utf8'));
  const ids = new Set();
  for (const article of corpus) {
    if (!article.sourceUrl || !article.localPaths?.chinese || !article.chunks.length) throw new Error(`Incomplete corpus article: ${article.id}`);
    for (const chunk of article.chunks) {
      if (ids.has(chunk.chunkId)) throw new Error(`Duplicate chunk: ${chunk.chunkId}`);
      ids.add(chunk.chunkId);
    }
  }
  return { articles: corpus.length, chunks: ids.size, valid: true };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.verifyPath) {
    console.log(JSON.stringify(await verifyCorpus(path.resolve(options.verifyPath)), null, 2));
    return;
  }
  for (const key of ['ledgerPath', 'archiveRoot', 'outPath', 'browserPath']) {
    if (!options[key]) throw new Error(`Missing --${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace('-path', '')}`);
  }
  const records = await loadArchiveRecords({ ledgerPath: path.resolve(options.ledgerPath), archiveRoot: path.resolve(options.archiveRoot) });
  const corpus = buildCorpus(records);
  await mkdir(path.dirname(path.resolve(options.outPath)), { recursive: true });
  await mkdir(path.dirname(path.resolve(options.browserPath)), { recursive: true });
  await writeFile(path.resolve(options.outPath), `${JSON.stringify(corpus, null, 2)}\n`);
  await writeFile(path.resolve(options.browserPath), `window.ARTICLE_INDEX = ${JSON.stringify(browserMetadata(corpus))};\n`);
  console.log(JSON.stringify({ articles: corpus.length, chunks: corpus.reduce((sum, article) => sum + article.chunks.length, 0) }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
