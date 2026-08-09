import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
        state.records[record.id] = {
          id: record.id,
          sourceUrl: record.sourceUrl,
          status: 'failed',
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
