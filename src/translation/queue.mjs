import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function detectSourceLanguage(text) {
  const chinese = (text.match(/[\p{Script=Han}]/gu) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return chinese > latin * 0.4 ? 'zh' : 'en';
}

async function metadataFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await metadataFiles(filePath));
    else if (entry.name === 'metadata.json') found.push(filePath);
  }
  return found;
}

export async function scanTranslationQueue(archiveRoot) {
  const entries = [];
  for (const metadataPath of await metadataFiles(archiveRoot)) {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    const directory = path.dirname(metadataPath);
    const sourcePath = path.join(directory, '英文原文.md');
    const targetPath = path.join(directory, '中文全文.md');
    const source = await readFile(sourcePath, 'utf8');
    let translation = '';
    try { translation = await readFile(targetPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    entries.push({
      id: metadata.id,
      radarTitle: metadata.radarTitle,
      publisher: metadata.publisher,
      archiveIndex: metadata.archiveIndex,
      titleOriginal: metadata.titleOriginal,
      titleZh: metadata.titleZh,
      sourceUrl: metadata.sourceUrl,
      sourceLanguage: detectSourceLanguage(source),
      sourceCharacters: source.length,
      sourcePath,
      targetPath,
      status: translation.trim() ? 'complete' : 'pending',
    });
  }
  return entries.sort((a, b) => a.radarTitle.localeCompare(b.radarTitle) || a.archiveIndex - b.archiveIndex);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const archiveIndex = process.argv.indexOf('--archive');
  const archiveRoot = path.resolve(archiveIndex === -1 ? 'work/archive' : process.argv[archiveIndex + 1]);
  scanTranslationQueue(archiveRoot).then(async (entries) => {
    const queue = {
      generatedAt: new Date().toISOString(),
      total: entries.length,
      pending: entries.filter((entry) => entry.status === 'pending').length,
      complete: entries.filter((entry) => entry.status === 'complete').length,
      entries,
    };
    await writeFile(path.join(process.cwd(), 'work', 'translation-queue.json'), `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ total: queue.total, pending: queue.pending, complete: queue.complete }, null, 2));
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
