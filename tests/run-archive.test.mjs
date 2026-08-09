import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runArchiveRecords } from '../src/archive/run-archive.mjs';

test('persists each result and skips matching downloaded records on resume', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'archive-state-'));
  const statePath = path.join(root, 'state.json');
  const records = [
    { id: 'a', sourceUrl: 'https://example.com/a' },
    { id: 'b', sourceUrl: 'https://example.com/b' }
  ];
  const calls = [];
  const processRecord = async (record) => {
    calls.push(record.id);
    return { status: 'downloaded', snapshotSha256: `hash-${record.id}` };
  };

  await runArchiveRecords(records, { statePath, processRecord, concurrency: 2 });
  await runArchiveRecords(records, { statePath, processRecord, concurrency: 2 });

  assert.deepEqual(calls.sort(), ['a', 'b']);
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  assert.equal(state.records.a.status, 'downloaded');
  assert.equal(state.records.b.sourceUrl, 'https://example.com/b');
});
