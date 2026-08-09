import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTranslationQueue } from './queue.mjs';
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
      for (let start = 0; start < paragraph.length; start += maxCharacters) chunks.push(paragraph.slice(start, start + maxCharacters));
      continue;
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxCharacters) { flush(); current = paragraph; }
    else current = candidate;
  }
  flush();
  return chunks;
}

function parseArguments(argv) {
  const options = { archive: 'work/archive', model: 'gpt-5.4-mini', maxCharacters: 12_000, limit: Infinity };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--archive') options.archive = argv[++index];
    else if (argv[index] === '--publisher') options.publisher = argv[++index];
    else if (argv[index] === '--max-chars') options.maxCharacters = Number(argv[++index]);
    else if (argv[index] === '--limit') options.limit = Number(argv[++index]);
    else if (argv[index] === '--model') options.model = argv[++index];
  }
  return options;
}

async function atomicJson(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const projectRoot = process.cwd();
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'direct-output-schema.json');
  const outputRoot = path.join(projectRoot, 'work', 'translation-direct-output');
  await mkdir(outputRoot, { recursive: true });
  const entries = (await scanTranslationQueue(path.resolve(options.archive)))
    .filter((entry) => entry.sourceLanguage === 'en' && entry.status !== 'complete' && (!options.publisher || entry.publisher === options.publisher))
    .slice(0, options.limit);
  const state = { startedAt: new Date().toISOString(), publisher: options.publisher || null, model: options.model, planned: entries.length, complete: 0, records: [] };
  const suffix = (options.publisher || 'all').toLowerCase().replace(/[^a-z0-9]+/g, '-');
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
      let translation;
      let errorMessage = '';
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await invokeCodex({ source: sourceChunk, model: options.model, schemaPath, outputPath, repair: errorMessage });
        translation = parseDirectTranslation(await readFile(outputPath, 'utf8')).trimEnd();
        try { verifyTranslation(sourceChunk, translation); errorMessage = ''; break; }
        catch (error) { errorMessage = error.message; console.log(`  chunk ${chunkIndex + 1}/${chunks.length} attempt ${attempt} failed: ${errorMessage}`); }
      }
      if (errorMessage) throw new Error(`Chunk ${chunkIndex + 1} failed after repair: ${entry.id}: ${errorMessage}`);
      translations.push(translation);
      console.log(`  chunk ${chunkIndex + 1}/${chunks.length} verified`);
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
