import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTranslationQueue } from './queue.mjs';
import { filterTranslationEntries } from './run-codex-batches.mjs';
import { invokeCodex, parseDirectTranslation } from './run-codex-direct.mjs';
import { verifyTranslation } from './verify-translation.mjs';

export function splitMarkdownForTranslation(source, maxCharacters = 12_000) {
  const normalized = source.replace(/\r\n/g, '\n').trimEnd();
  const paragraphs = normalized.split('\n\n');
  const chunks = [];
  let current = '';
  const flush = () => { if (current) chunks.push(current); current = ''; };
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxCharacters) {
      flush();
      const protectedSpans = [
        ...paragraph.matchAll(/https?:\/\/[^\s)>\]"']+/g),
        ...paragraph.matchAll(/\d+(?:[.,]\d+)*(?:%|‰)?/g),
      ].map((match) => ({ start: match.index, end: match.index + match[0].length }));
      let start = 0;
      while (start < paragraph.length) {
        let end = Math.min(start + maxCharacters, paragraph.length);
        let extended = true;
        while (extended && end < paragraph.length) {
          extended = false;
          for (const span of protectedSpans) {
            if (span.start < end && end < span.end) {
              end = span.end;
              extended = true;
            }
          }
        }
        chunks.push(paragraph.slice(start, end));
        start = end;
      }
      continue;
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxCharacters) { flush(); current = paragraph; }
    else current = candidate;
  }
  flush();
  return chunks;
}

export function verifyChunkTranslation(source, translation) {
  return verifyTranslation(source, translation, { minimumChineseRatio: 0.05, excludeUrlsFromChineseRatio: true });
}

export function parseChunkedArguments(argv) {
  const options = { archive: 'work/archive', model: 'gpt-5.4-mini', maxCharacters: 12_000, limit: Infinity };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--archive') options.archive = argv[++index];
    else if (argv[index] === '--publisher') options.publisher = argv[++index];
    else if (argv[index] === '--max-chars') options.maxCharacters = Number(argv[++index]);
    else if (argv[index] === '--limit') options.limit = Number(argv[++index]);
    else if (argv[index] === '--model') options.model = argv[++index];
    else if (argv[index] === '--min-index') options.minIndex = Number(argv[++index]);
    else if (argv[index] === '--max-index') options.maxIndex = Number(argv[++index]);
  }
  return options;
}

async function atomicJson(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

async function translateVerifiedChunk({ sourceChunk, model, schemaPath, outputPath, label, depth = 0 }) {
  let validationError = '';
  let existingInvalid = false;
  try {
    const existing = parseDirectTranslation(await readFile(outputPath, 'utf8')).trimEnd();
    verifyChunkTranslation(sourceChunk, existing);
    console.log(`  ${label} reused`);
    return existing;
  } catch (error) {
    existingInvalid = error.code !== 'ENOENT';
    validationError = error.message;
  }
  let hasSubOutput = false;
  if (existingInvalid) {
    try { await readFile(outputPath.replace(/\.json$/, '-s1.json'), 'utf8'); hasSubOutput = true; } catch {}
  }
  if (!existingInvalid || !hasSubOutput) {
    const maxAttempts = sourceChunk.length <= 4_000 ? 4 : 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await invokeCodex({ source: sourceChunk, model, schemaPath, outputPath, repair: validationError });
      const translation = parseDirectTranslation(await readFile(outputPath, 'utf8')).trimEnd();
      try {
        verifyChunkTranslation(sourceChunk, translation);
        console.log(`  ${label} verified`);
        return translation;
      } catch (error) {
        validationError = error.message;
        console.log(`  ${label} attempt ${attempt} failed: ${validationError}`);
      }
    }
  }
  if (sourceChunk.length <= 800 || depth >= 5) throw new Error(`${label} failed after repair: ${validationError}`);
  const subchunks = splitMarkdownForTranslation(sourceChunk, Math.ceil(sourceChunk.length / 2));
  if (subchunks.length < 2) throw new Error(`${label} could not be split after failure: ${validationError}`);
  console.log(`  ${label} splitting into ${subchunks.length} smaller chunks`);
  const translations = [];
  for (let index = 0; index < subchunks.length; index += 1) {
    const subOutput = outputPath.replace(/\.json$/, `-s${index + 1}.json`);
    translations.push(await translateVerifiedChunk({ sourceChunk: subchunks[index], model, schemaPath, outputPath: subOutput, label: `${label}.${index + 1}`, depth: depth + 1 }));
  }
  const combined = translations.join('\n\n');
  verifyChunkTranslation(sourceChunk, combined);
  return combined;
}

async function main() {
  const options = parseChunkedArguments(process.argv.slice(2));
  const projectRoot = process.cwd();
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'direct-output-schema.json');
  const outputRoot = path.join(projectRoot, 'work', 'translation-direct-output');
  await mkdir(outputRoot, { recursive: true });
  const entries = filterTranslationEntries(
    (await scanTranslationQueue(path.resolve(options.archive)))
      .filter((entry) => entry.sourceLanguage === 'en' && entry.status !== 'complete'),
    options,
  ).slice(0, options.limit);
  const state = { startedAt: new Date().toISOString(), publisher: options.publisher || null, model: options.model, planned: entries.length, complete: 0, records: [] };
  const rangeSuffix = options.minIndex !== undefined || options.maxIndex !== undefined
    ? `-${options.minIndex ?? 'first'}-${options.maxIndex ?? 'last'}`
    : '';
  const suffix = `${(options.publisher || 'all').toLowerCase().replace(/[^a-z0-9]+/g, '-')}${rangeSuffix}`;
  const statePath = path.join(projectRoot, 'work', `translation-chunked-state-${suffix}.json`);
  for (let articleIndex = 0; articleIndex < entries.length; articleIndex += 1) {
    const entry = entries[articleIndex];
    const source = await readFile(entry.sourcePath, 'utf8');
    const chunks = splitMarkdownForTranslation(source, options.maxCharacters);
    const translations = [];
    console.log(`[${articleIndex + 1}/${entries.length}] ${entry.publisher} ${entry.archiveIndex}: ${source.length} chars in ${chunks.length} chunks`);
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      const sourceChunk = chunks[chunkIndex];
      const outputPath = path.join(outputRoot, `${entry.id}-${String(chunkIndex + 1).padStart(3, '0')}.json`);
      const translation = await translateVerifiedChunk({
        sourceChunk, model: options.model, schemaPath, outputPath,
        label: `chunk ${chunkIndex + 1}/${chunks.length}`,
      });
      translations.push(translation);
    }
    const translation = `${translations.join('\n\n')}\n`;
    verifyTranslation(source, translation);
    await writeFile(entry.targetPath, translation, 'utf8');
    state.complete += 1; state.records.push(entry.id); state.updatedAt = new Date().toISOString();
    await atomicJson(statePath, state);
    console.log('  article verified');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
