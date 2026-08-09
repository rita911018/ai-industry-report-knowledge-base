import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { articleDirectoryPath } from './paths.mjs';

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function atomicWrite(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, content, 'utf8');
  await rename(temporaryPath, filePath);
}

async function createIfMissing(filePath, content = '') {
  try {
    await writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

function relativePortable(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

export async function writeArticleArchive({ root, record, index, page, extracted }) {
  const directory = articleDirectoryPath(root, record.radarTitle, index, record.titleOriginal);
  await mkdir(directory, { recursive: true });

  const paths = {
    originalHtml: path.join(directory, '原始网页.html'),
    englishMarkdown: path.join(directory, '英文原文.md'),
    chineseMarkdown: path.join(directory, '中文全文.md'),
    metadata: path.join(directory, 'metadata.json'),
  };
  const englishMarkdown = `${extracted.markdown.trim()}\n`;

  await atomicWrite(paths.originalHtml, page.body);
  await atomicWrite(paths.englishMarkdown, englishMarkdown);
  await createIfMissing(paths.chineseMarkdown);

  const metadata = {
    schemaVersion: record.schemaVersion,
    id: record.id,
    archiveIndex: index,
    radarTitle: record.radarTitle,
    publisher: record.publisher,
    sourceUrl: record.sourceUrl,
    canonicalUrl: record.canonicalUrl,
    finalUrl: page.finalUrl,
    titleOriginal: record.titleOriginal,
    titleZh: record.titleZh,
    byline: extracted.byline,
    publishedAt: extracted.publishedAt || record.publishedAt,
    priority: record.priority,
    score: record.score,
    tags: record.tags,
    category: record.category,
    provenance: record.provenance,
    status: 'downloaded',
    extractionStatus: extracted.status,
    extractionMethod: extracted.extractionMethod,
    headingCount: extracted.headingCount,
    paragraphCount: extracted.paragraphCount,
    characterCount: extracted.characterCount,
    http: {
      status: page.status,
      attempts: page.attempts,
      contentType: page.contentType,
      retrievedAt: page.retrievedAt,
    },
    snapshotSha256: sha256(page.body),
    englishMarkdownSha256: sha256(englishMarkdown),
    files: Object.fromEntries(
      Object.entries(paths).map(([key, filePath]) => [key, relativePortable(root, filePath)]),
    ),
  };

  await atomicWrite(paths.metadata, `${JSON.stringify(metadata, null, 2)}\n`);
  return { directory, metadata, status: metadata.status, snapshotSha256: metadata.snapshotSha256 };
}

function csvCell(value) {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function writeSourceManifests({ root, radarTitle }) {
  const radarDirectory = path.join(root, radarTitle);
  const articlesDirectory = path.join(radarDirectory, 'articles');
  const entries = await readdir(articlesDirectory, { withFileTypes: true });
  const records = [];

  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const metadataPath = path.join(articlesDirectory, entry.name, 'metadata.json');
    records.push(JSON.parse(await readFile(metadataPath, 'utf8')));
  }
  records.sort((a, b) => a.archiveIndex - b.archiveIndex);

  const jsonPath = path.join(radarDirectory, 'manifest.json');
  const csvPath = path.join(radarDirectory, 'manifest.csv');
  await atomicWrite(
    jsonPath,
    `${JSON.stringify({ radarTitle, count: records.length, generatedAt: new Date().toISOString(), records }, null, 2)}\n`,
  );

  const columns = [
    'archiveIndex',
    'id',
    'publisher',
    'titleOriginal',
    'titleZh',
    'sourceUrl',
    'finalUrl',
    'publishedAt',
    'priority',
    'status',
    'extractionStatus',
    'characterCount',
    'snapshotSha256',
    'englishMarkdownSha256',
    'files',
  ];
  const lines = [columns.map(csvCell).join(',')];
  for (const record of records) {
    lines.push(columns.map((column) => csvCell(record[column])).join(','));
  }
  await atomicWrite(csvPath, `${lines.join('\n')}\n`);

  return { records, jsonPath, csvPath };
}
