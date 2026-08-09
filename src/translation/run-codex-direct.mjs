import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTranslationQueue } from './queue.mjs';
import { verifyTranslation } from './verify-translation.mjs';

export function directTranslationPrompt(source, repair = '') {
  return `你是 Codex 中文全文翻译器。直接返回符合 JSON Schema 的结果，不要调用工具，不要解释。\n\n将 SOURCE 的全部内容完整逐段翻译为简体中文。必须翻译所有标题、段落、列表、表格、脚注、图注和来源说明；保持 Markdown 层级、段落数量和顺序；所有 URL 原样保留；所有数字、百分比、日期、币种符号、单位、型号与视频 ID 原样保留；不得摘要、删节、合并段落、扩写或添加代码围栏。translation 字段只包含完整译文。${repair ? `\n\n上次完整性校验失败，必须重点修复：${repair}` : ''}\n\n<SOURCE>\n${source}\n</SOURCE>`;
}

export function parseDirectTranslation(value) {
  const parsed = JSON.parse(value);
  if (typeof parsed.translation !== 'string' || !parsed.translation.trim()) throw new Error('Codex returned an empty translation');
  return parsed.translation.trimEnd() + '\n';
}

function parseArguments(argv) {
  const options = { archive: 'work/archive', model: 'gpt-5.4-mini', limit: Infinity };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--archive') options.archive = argv[++index];
    else if (argv[index] === '--publisher') options.publisher = argv[++index];
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

async function invokeCodex({ source, model, schemaPath, outputPath, projectRoot, repair }) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn('codex', [
      'exec', '--ephemeral', '--ignore-user-config', '--skip-git-repo-check',
      '-m', model, '-c', 'model_reasoning_effort="low"', '--sandbox', 'read-only',
      '--output-schema', schemaPath, '--output-last-message', outputPath, '-',
    ], { cwd: '/private/tmp', stdio: ['pipe', 'ignore', 'pipe'] });
    let errorText = '';
    child.stderr.on('data', (chunk) => { errorText += chunk; if (errorText.length > 20_000) errorText = errorText.slice(-20_000); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Codex direct translation exited ${code}: ${errorText.slice(-2000)}`)));
    child.stdin.end(directTranslationPrompt(source, repair));
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const projectRoot = process.cwd();
  const archiveRoot = path.resolve(options.archive);
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'direct-output-schema.json');
  let entries = await scanTranslationQueue(archiveRoot);
  for (const entry of entries.filter((item) => item.sourceLanguage === 'zh' && item.status === 'pending')) await writeFile(entry.targetPath, await readFile(entry.sourcePath, 'utf8'), 'utf8');
  entries = await scanTranslationQueue(archiveRoot);
  const pending = entries.filter((entry) => entry.sourceLanguage === 'en' && entry.status === 'pending' && (!options.publisher || entry.publisher === options.publisher)).slice(0, options.limit);
  const statePath = path.join(projectRoot, 'work', 'translation-direct-state.json');
  const state = { startedAt: new Date().toISOString(), model: options.model, planned: pending.length, complete: 0, records: [] };
  for (let index = 0; index < pending.length; index += 1) {
    const entry = pending[index];
    const source = await readFile(entry.sourcePath, 'utf8');
    const outputPath = path.join(projectRoot, 'work', 'translation-direct-output', `${entry.id}.json`);
    console.log(`[${index + 1}/${pending.length}] ${entry.publisher} ${entry.archiveIndex}: ${entry.sourceCharacters} chars`);
    let repair = '';
    let valid = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await invokeCodex({ source, model: options.model, schemaPath, outputPath, projectRoot, repair });
      const translation = parseDirectTranslation(await readFile(outputPath, 'utf8'));
      await writeFile(entry.targetPath, translation, 'utf8');
      try { verifyTranslation(source, translation); valid = true; break; }
      catch (error) { repair = error.message; console.log(`  attempt ${attempt} failed validation: ${repair}`); }
    }
    if (!valid) throw new Error(`Direct translation failed validation after repair: ${entry.id}`);
    state.complete += 1; state.records.push(entry.id); state.updatedAt = new Date().toISOString();
    await atomicJson(statePath, state);
    console.log('  verified');
  }
  const refreshed = await scanTranslationQueue(archiveRoot);
  await atomicJson(path.join(projectRoot, 'work', 'translation-queue.json'), { generatedAt: new Date().toISOString(), total: refreshed.length, pending: refreshed.filter((entry) => entry.status === 'pending').length, complete: refreshed.filter((entry) => entry.status === 'complete').length, entries: refreshed });
  console.log(JSON.stringify({ translated: state.complete, remaining: refreshed.filter((entry) => entry.status === 'pending').length }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
