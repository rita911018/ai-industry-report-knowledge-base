import { access, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from './render-markdown.mjs';
import { renderChineseReader } from './chinese-reader-template.mjs';

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

export async function collectArchivedArticles(archiveRoot) {
  const found = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name === 'metadata.json') {
        let metadata;
        try { metadata = JSON.parse(await readFile(full, 'utf8')); }
        catch { throw new Error(`Invalid metadata JSON: ${full}`); }
        found.push({ directory: path.dirname(full), metadataPath: full, metadata, markdownPath: path.join(path.dirname(full), '中文全文.md') });
      }
    }
  };
  await walk(archiveRoot);
  return found.sort((a, b) => a.directory.localeCompare(b.directory, 'zh-CN'));
}

function firstMeaningfulParagraph(markdown) {
  for (const block of markdown.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const text = block.trim();
    if (!text || /^#{1,6}\s/.test(text) || /^!\[/.test(text) || /^\d{4}[ 年-]/.test(text)) continue;
    const cleaned = text.replace(/^[-*>\d.\s]+/, '').replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`#]/g, '').trim();
    if (cleaned.length >= 20) return cleaned.slice(0, 260);
  }
  return '';
}

function mergedArticle(archived, ledgerRecord, markdown) {
  const article = { ...archived.metadata, ...ledgerRecord };
  const summary = ledgerRecord?.coreView?.zh || archived.metadata?.coreView?.zh || firstMeaningfulParagraph(markdown);
  if (summary) article.coreView = { ...(ledgerRecord?.coreView || archived.metadata?.coreView || {}), zh: summary };
  return article;
}

async function prepareReader(archived, ledgerRecord) {
  const id = archived.metadata?.id || archived.directory;
  if (!await exists(archived.markdownPath)) throw new Error(`Missing Chinese Markdown: ${id}`);
  const markdown = await readFile(archived.markdownPath, 'utf8');
  const bodyHtml = renderMarkdown(markdown);
  const article = mergedArticle(archived, ledgerRecord, markdown);
  const html = renderChineseReader({ article, bodyHtml, returnHref: '/' });
  return { article, html, outputPath: path.join(archived.directory, '中文全文.html') };
}

export async function validateChineseReader(filePath, article) {
  const html = await readFile(filePath, 'utf8');
  if ((await stat(filePath)).size === 0 || !/<article class="article-body">[\s\S]+<\/article>/.test(html)) throw new Error(`Empty Chinese reader: ${article.id}`);
  for (const value of [article.titleZh, article.publisher, article.sourceUrl]) if (!html.includes(String(value).replaceAll('&', '&amp;'))) throw new Error(`Chinese reader missing required metadata for ${article.id}`);
  if (!/<meta charset="utf-8">/i.test(html)) throw new Error(`Chinese reader missing UTF-8 declaration: ${article.id}`);
  if (/<\s*(script|iframe|object|embed)\b|<[^>]+\son\w+\s*=|javascript:/i.test(html)) throw new Error(`Unsafe Chinese reader: ${article.id}`);
  return true;
}

export async function generateChineseReader({ archived, ledgerRecord }) {
  const prepared = await prepareReader(archived, ledgerRecord);
  const temporaryPath = `${prepared.outputPath}.tmp`;
  try {
    await writeFile(temporaryPath, prepared.html, 'utf8');
    await rename(temporaryPath, prepared.outputPath);
    await validateChineseReader(prepared.outputPath, prepared.article);
    return prepared.outputPath;
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

async function loadCollection({ ledgerPath, archiveRoot, expected }) {
  const ledgerJson = JSON.parse(await readFile(ledgerPath, 'utf8'));
  const ledger = Array.isArray(ledgerJson) ? ledgerJson : ledgerJson.articles;
  const archived = await collectArchivedArticles(archiveRoot);
  if (Number.isFinite(expected) && archived.length !== expected) throw new Error(`Expected ${expected} archived articles, found ${archived.length}`);
  const ledgerById = new Map(ledger.map((record) => [record.id, record]));
  const archiveIds = new Set(archived.map((item) => item.metadata?.id));
  if (ledgerById.size !== archived.length || archived.some((item) => !ledgerById.has(item.metadata?.id)) || ledger.some((item) => !archiveIds.has(item.id))) throw new Error('ledger/archive ID mismatch');
  return { archived, ledgerById, expected: Number.isFinite(expected) ? expected : archived.length };
}

export async function generateChineseReaders(options) {
  const collection = await loadCollection(options);
  const prepared = [];
  for (const archived of collection.archived) prepared.push(await prepareReader(archived, collection.ledgerById.get(archived.metadata.id)));
  let generated = 0;
  for (let index = 0; index < collection.archived.length; index += 1) {
    await generateChineseReader({ archived: collection.archived[index], ledgerRecord: collection.ledgerById.get(collection.archived[index].metadata.id) });
    generated += 1;
  }
  return { expected: collection.expected, generated, verified: generated };
}

export async function verifyChineseReaders(options) {
  const collection = await loadCollection(options);
  let verified = 0;
  for (const archived of collection.archived) {
    const markdown = await readFile(archived.markdownPath, 'utf8');
    const article = mergedArticle(archived, collection.ledgerById.get(archived.metadata.id), markdown);
    await validateChineseReader(path.join(archived.directory, '中文全文.html'), article);
    verified += 1;
  }
  return { expected: collection.expected, verified };
}

function parseArgs(argv) {
  const options = { verify: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--ledger') options.ledgerPath = argv[++index];
    else if (argv[index] === '--archive') options.archiveRoot = argv[++index];
    else if (argv[index] === '--expected') options.expected = Number(argv[++index]);
    else if (argv[index] === '--verify') options.verify = true;
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.ledgerPath || !options.archiveRoot) throw new Error('Missing --ledger or --archive');
  const args = { ledgerPath: path.resolve(options.ledgerPath), archiveRoot: path.resolve(options.archiveRoot), expected: options.expected };
  console.log(JSON.stringify(options.verify ? await verifyChineseReaders(args) : await generateChineseReaders(args), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
