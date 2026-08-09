import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTranslationQueue } from './queue.mjs';
import { verifyTranslation } from './verify-translation.mjs';

const PUBLISHER_ORDER = ['BCG', 'Anthropic', 'McKinsey', 'MIT', 'Bain'];

export function buildTranslationBatches(entries, { maxCharacters = 100_000, maxItems = 10 } = {}) {
  const publisherRank = new Map(PUBLISHER_ORDER.map((publisher, index) => [publisher, index]));
  const ordered = [...entries].sort((a, b) =>
    (publisherRank.get(a.publisher) ?? 99) - (publisherRank.get(b.publisher) ?? 99) ||
    a.archiveIndex - b.archiveIndex,
  );
  const batches = [];
  let current = [];
  let characters = 0;
  for (const entry of ordered) {
    const publisherChanged = current.length && current[0].publisher !== entry.publisher;
    const exceeds = current.length && (current.length >= maxItems || characters + entry.sourceCharacters > maxCharacters);
    if (publisherChanged || exceeds) {
      batches.push(current);
      current = [];
      characters = 0;
    }
    current.push(entry);
    characters += entry.sourceCharacters;
  }
  if (current.length) batches.push(current);
  return batches;
}

function parseArguments(argv) {
  const options = { archive: 'work/archive', maxCharacters: 100_000, maxItems: 10, limitBatches: Infinity, model: 'gpt-5.4-mini' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--archive') options.archive = argv[++index];
    else if (argv[index] === '--publisher') options.publisher = argv[++index];
    else if (argv[index] === '--max-chars') options.maxCharacters = Number(argv[++index]);
    else if (argv[index] === '--max-items') options.maxItems = Number(argv[++index]);
    else if (argv[index] === '--limit-batches') options.limitBatches = Number(argv[++index]);
    else if (argv[index] === '--model') options.model = argv[++index];
  }
  return options;
}

function batchPrompt(batch) {
  const pairs = batch.map((entry, index) => `${index + 1}. SOURCE: ${entry.sourcePath}\n   TARGET: ${entry.targetPath}`).join('\n');
  return `你是 Codex 中文全文翻译执行器。这只是总任务的中间批次，不要播放通知声音。请逐一处理下面所有文件对，不得提前结束：\n\n${pairs}\n\n对每个 SOURCE：读取全文，将全部内容逐段完整翻译成简体中文并写入对应 TARGET。翻译所有标题、段落、列表、表格、脚注、图注和来源说明；保持 Markdown 层级、段落数量和顺序；所有 URL 必须原样保留；所有数字、百分比、日期、币种符号、单位、型号和视频 ID 必须原样保留（中文表述可附带原文数字单位）；专有名词可用“中文（English）”；不得摘要、删节、合并段落、扩写观点或添加代码围栏。只修改列出的 TARGET 文件。完成前检查每个 TARGET 均非空。`;
}

function repairPrompt(failures) {
  const items = failures.map((failure, index) => `${index + 1}. SOURCE: ${failure.entry.sourcePath}\n   TARGET: ${failure.entry.targetPath}\n   VALIDATION ERRORS: ${failure.error}`).join('\n');
  return `这是总翻译任务的校验修复批次，不要播放通知声音。以下译文未通过完整性校验：\n\n${items}\n\n逐一读取 SOURCE 与 TARGET，修复 TARGET。保持完整逐段中文翻译，不得摘要；补回所有缺失标题、段落、URL 与原样数字标记。只修改列出的 TARGET，直到全部错误消失。`;
}

async function runCodex({ projectRoot, model, prompt, logPath }) {
  await mkdir(path.dirname(logPath), { recursive: true });
  const log = createWriteStream(logPath, { flags: 'a' });
  return new Promise((resolve, reject) => {
    const child = spawn('codex', [
      'exec', '--ephemeral', '--ignore-user-config', '-m', model,
      '-c', 'model_reasoning_effort="low"', '-C', projectRoot,
      '--sandbox', 'workspace-write', prompt,
    ], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on('error', reject);
    child.on('close', (code) => {
      log.end();
      if (code === 0) resolve();
      else reject(new Error(`Codex exited with code ${code}; see ${logPath}`));
    });
  });
}

async function validationFailures(batch) {
  const failures = [];
  for (const entry of batch) {
    try {
      const source = await readFile(entry.sourcePath, 'utf8');
      const translation = await readFile(entry.targetPath, 'utf8');
      verifyTranslation(source, translation);
    } catch (error) {
      failures.push({ entry, error: error.message });
    }
  }
  return failures;
}

async function atomicJson(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const projectRoot = process.cwd();
  const archiveRoot = path.resolve(options.archive);
  let entries = await scanTranslationQueue(archiveRoot);
  for (const entry of entries.filter((item) => item.sourceLanguage === 'zh' && item.status !== 'complete')) {
    await writeFile(entry.targetPath, await readFile(entry.sourcePath, 'utf8'), 'utf8');
  }
  entries = await scanTranslationQueue(archiveRoot);
  const pending = entries.filter((entry) => entry.sourceLanguage === 'en' && entry.status !== 'complete' && (!options.publisher || entry.publisher === options.publisher));
  const batches = buildTranslationBatches(pending, options).slice(0, options.limitBatches);
  const stateSuffix = (options.publisher || 'all').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const statePath = path.join(projectRoot, 'work', `translation-run-state-${stateSuffix}.json`);
  const state = { startedAt: new Date().toISOString(), model: options.model, plannedBatches: batches.length, completedBatches: 0, translated: 0, records: [] };

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const label = `${String(index + 1).padStart(3, '0')}-${batch[0].publisher.toLowerCase()}-${batch[0].archiveIndex}-${batch.at(-1).archiveIndex}`;
    const logPath = path.join(projectRoot, 'work', 'translation-logs', `${label}.log`);
    console.log(`[${index + 1}/${batches.length}] translating ${batch.length} ${batch[0].publisher} article(s), ${batch.reduce((sum, item) => sum + item.sourceCharacters, 0)} source characters`);
    let failures;
    if (batch.every((entry) => entry.status === 'invalid')) {
      failures = await validationFailures(batch);
      console.log(`[${index + 1}/${batches.length}] resuming ${failures.length} existing invalid translation(s)`);
      await runCodex({ projectRoot, model: options.model, prompt: repairPrompt(failures), logPath });
      failures = await validationFailures(batch);
    } else {
      await runCodex({ projectRoot, model: options.model, prompt: batchPrompt(batch), logPath });
      failures = await validationFailures(batch);
    }
    for (let repairAttempt = 1; failures.length && repairAttempt <= 3; repairAttempt += 1) {
      console.log(`[${index + 1}/${batches.length}] repair ${repairAttempt}/3 for ${failures.length} validation failure(s)`);
      await runCodex({ projectRoot, model: options.model, prompt: repairPrompt(failures), logPath });
      failures = await validationFailures(batch);
    }
    if (failures.length) throw new Error(`Batch ${label} still has validation failures: ${failures.map((item) => `${item.entry.id}: ${item.error}`).join(' | ')}`);
    state.completedBatches += 1;
    state.translated += batch.length;
    state.records.push(...batch.map((entry) => entry.id));
    state.updatedAt = new Date().toISOString();
    await atomicJson(statePath, state);
    console.log(`[${index + 1}/${batches.length}] verified`);
  }

  const refreshed = await scanTranslationQueue(archiveRoot);
  await atomicJson(path.join(projectRoot, 'work', 'translation-queue.json'), {
    generatedAt: new Date().toISOString(), total: refreshed.length,
    pending: refreshed.filter((entry) => entry.status !== 'complete').length,
    complete: refreshed.filter((entry) => entry.status === 'complete').length,
    entries: refreshed,
  });
  console.log(JSON.stringify({ batches: state.completedBatches, translated: state.translated, remaining: refreshed.filter((entry) => entry.status !== 'complete').length }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
