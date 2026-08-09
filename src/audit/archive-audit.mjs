import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyTranslation } from '../translation/verify-translation.mjs';

async function collectMetadata(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await collectMetadata(full));
    else if (entry.name === 'metadata.json') found.push(full);
  }
  return found;
}

async function nonempty(filePath) {
  try { return (await stat(filePath)).size > 0; } catch { return false; }
}

export async function auditArchive(root, { expected, verifyTranslations = false } = {}) {
  const errors = [];
  let metadataPaths = [];
  try { metadataPaths = await collectMetadata(root); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (Number.isFinite(expected) && metadataPaths.length !== expected) errors.push(`Expected ${expected} articles, found ${metadataPaths.length}`);
  const ids = new Set();
  const urls = new Set();
  const byPublisher = {};
  let verifiedTranslations = 0;
  for (const metadataPath of metadataPaths) {
    let metadata;
    try { metadata = JSON.parse(await readFile(metadataPath, 'utf8')); }
    catch { errors.push(`Invalid metadata JSON: ${metadataPath}`); continue; }
    const directory = path.dirname(metadataPath);
    const label = metadata.id || directory;
    if (!metadata.id || ids.has(metadata.id)) errors.push(`Missing or duplicate article id: ${label}`);
    ids.add(metadata.id);
    const canonical = metadata.canonicalUrl || metadata.sourceUrl;
    if (!canonical || urls.has(canonical)) errors.push(`Missing or duplicate source URL: ${label}`);
    urls.add(canonical);
    if (metadata.status !== 'downloaded') errors.push(`Article is not downloaded: ${label}`);
    byPublisher[metadata.publisher || 'unknown'] = (byPublisher[metadata.publisher || 'unknown'] || 0) + 1;
    for (const filename of ['原始网页.html', '英文原文.md', '中文全文.md']) {
      if (!await nonempty(path.join(directory, filename))) errors.push(`Missing or empty ${filename}: ${label}`);
    }
    if (verifyTranslations && await nonempty(path.join(directory, '英文原文.md')) && await nonempty(path.join(directory, '中文全文.md'))) {
      try {
        verifyTranslation(await readFile(path.join(directory, '英文原文.md'), 'utf8'), await readFile(path.join(directory, '中文全文.md'), 'utf8'));
        verifiedTranslations += 1;
      } catch (error) { errors.push(`Translation validation failed for ${label}: ${error.message}`); }
    }
  }
  return { valid: errors.length === 0, articles: metadataPaths.length, uniqueIds: ids.size, uniqueUrls: urls.size, verifiedTranslations, byPublisher, errors };
}

function parseArgs(argv) {
  const options = { root: 'work/archive', verifyTranslations: true };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') options.root = argv[++i];
    else if (argv[i] === '--expected') options.expected = Number(argv[++i]);
    else if (argv[i] === '--out') options.out = argv[++i];
    else if (argv[i] === '--no-translation-check') options.verifyTranslations = false;
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await auditArchive(path.resolve(options.root), options);
  if (options.out) await writeFile(path.resolve(options.out), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
