import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { archiveRecord, runArchiveRecords } from '../src/archive/run-archive.mjs';

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

test('classifies permanent access denial as blocked', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'archive-state-'));
  const error = new Error('HTTP 403');
  error.status = 403;
  const state = await runArchiveRecords(
    [{ id: 'blocked', sourceUrl: 'https://example.com/blocked' }],
    {
      statePath: path.join(root, 'state.json'),
      processRecord: async () => { throw error; },
    },
  );
  assert.equal(state.records.blocked.status, 'blocked');
});

test('archives a fetched page through extraction and deterministic writing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'archive-pipeline-'));
  const html = await readFile(new URL('./fixtures/sources/bcg.html', import.meta.url), 'utf8');
  const record = {
    schemaVersion: '1.0.0', id: 'bcg-pipeline', radarTitle: 'BCG Radar', publisher: 'BCG',
    sourceUrl: 'https://www.bcg.com/publications/example', canonicalUrl: 'https://www.bcg.com/publications/example',
    titleOriginal: 'The Cost of Caution with AI Investments', titleZh: null, priority: 'must-read',
    score: { total: 9, dimensions: null, sourceScale: 10 },
    provenance: { sourceFile: '/tmp/radar.html', elementId: 'x', extractionBasis: 'radar_html' },
  };
  const result = await archiveRecord(record, {
    root,
    index: 1,
    fetchPageImpl: async () => ({ body: html, status: 200, attempts: 1, finalUrl: record.sourceUrl, contentType: 'text/html', retrievedAt: new Date().toISOString() }),
  });
  assert.equal(result.status, 'downloaded');
  assert.equal(result.extractionStatus, 'extracted');
  assert.match(await readFile(path.join(root, 'BCG Radar/articles/001-the-cost-of-caution-with-ai-investments/英文原文.md'), 'utf8'), /Turn investment into business value/);
});
