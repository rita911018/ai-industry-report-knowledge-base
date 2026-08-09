import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractArticle } from './extract-article.mjs';
import { fetchPage } from './fetch-page.mjs';
import { writeArticleArchive, writeSourceManifests } from './write-archive.mjs';

async function readState(statePath) {
  try {
    return JSON.parse(await readFile(statePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    return { version: 1, updatedAt: null, records: {} };
  }
}

export async function archiveRecord(
  record,
  { root, index, fetchPageImpl = fetchPage },
) {
  const page = await fetchPageImpl(record.sourceUrl);
  const extracted = extractArticle({
    html: page.body,
    url: page.finalUrl || record.sourceUrl,
    publisher: record.publisher,
  });
  const written = await writeArticleArchive({ root, record, index, page, extracted });
  return {
    status: written.status,
    snapshotSha256: written.snapshotSha256,
    extractionStatus: extracted.status,
    characterCount: extracted.characterCount,
    archiveDirectory: path.relative(root, written.directory).split(path.sep).join('/'),
  };
}

async function writeState(statePath, state) {
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, statePath);
}

function alreadyDownloaded(record, savedRecord) {
  return (
    savedRecord?.status === 'downloaded' &&
    savedRecord.sourceUrl === record.sourceUrl &&
    Boolean(savedRecord.snapshotSha256)
  );
}

export async function runArchiveRecords(
  records,
  { statePath, processRecord, concurrency = 3 },
) {
  const state = await readState(statePath);
  state.version = 1;
  state.records ||= {};

  const pending = records.filter(
    (record) => !alreadyDownloaded(record, state.records[record.id]),
  );
  let cursor = 0;
  let writeQueue = Promise.resolve();

  const persist = () => {
    state.updatedAt = new Date().toISOString();
    writeQueue = writeQueue.then(() => writeState(statePath, state));
    return writeQueue;
  };

  async function worker() {
    while (cursor < pending.length) {
      const record = pending[cursor];
      cursor += 1;

      try {
        const result = await processRecord(record);
        state.records[record.id] = {
          id: record.id,
          sourceUrl: record.sourceUrl,
          ...result,
          updatedAt: new Date().toISOString(),
        };
      } catch (error) {
        const blocked = [401, 403, 451].includes(error?.status);
        state.records[record.id] = {
          id: record.id,
          sourceUrl: record.sourceUrl,
          status: blocked ? 'blocked' : 'failed',
          httpStatus: Number.isInteger(error?.status) ? error.status : null,
          error: error instanceof Error ? error.message : String(error),
          updatedAt: new Date().toISOString(),
        };
      }

      await persist();
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, pending.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  await writeQueue;

  if (pending.length === 0) {
    await persist();
  }

  return state;
}

function parseArguments(argv) {
  const options = { concurrency: 3, retryStatus: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--concurrency') options.concurrency = Number(argv[++index]);
    else if (argv[index] === '--retry-status') options.retryStatus = argv[++index];
    else if (argv[index] === '--root') options.root = path.resolve(argv[++index]);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 12) {
    throw new Error('--concurrency must be an integer from 1 to 12');
  }
  return options;
}

function archiveIndexes(records) {
  const counts = new Map();
  return new Map(
    records.map((record) => {
      const next = (counts.get(record.radarTitle) || 0) + 1;
      counts.set(record.radarTitle, next);
      return [record.id, next];
    }),
  );
}

async function runCli() {
  const options = parseArguments(process.argv.slice(2));
  const projectRoot = process.cwd();
  const archiveRoot = options.root || path.join(projectRoot, 'work', 'archive');
  const statePath = path.join(projectRoot, 'work', 'archive-state.json');
  const records = JSON.parse(await readFile(path.join(projectRoot, 'work', 'normalized', 'articles.json'), 'utf8'));
  const indexes = archiveIndexes(records);
  let selectedRecords = records;

  if (options.retryStatus) {
    const priorState = await readState(statePath);
    selectedRecords = records.filter(
      (record) => priorState.records?.[record.id]?.status === options.retryStatus,
    );
  }

  const state = await runArchiveRecords(selectedRecords, {
    statePath,
    concurrency: options.concurrency,
    processRecord: (record) => archiveRecord(record, {
      root: archiveRoot,
      index: indexes.get(record.id),
    }),
  });

  for (const radarTitle of [...new Set(records.map((record) => record.radarTitle))]) {
    try {
      await writeSourceManifests({ root: archiveRoot, radarTitle });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const summary = Object.values(state.records).reduce((counts, record) => {
    counts[record.status] = (counts[record.status] || 0) + 1;
    if (record.extractionStatus) {
      const key = `extraction:${record.extractionStatus}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, {});
  console.log(JSON.stringify({ total: Object.keys(state.records).length, selected: selectedRecords.length, summary }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
