import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRefreshRecords } from '../../src/refresh/build-records.mjs';

test('builds unique scored records only for included candidates', () => {
  const candidates = {
    run: { id: '2026-08-23' },
    candidates: [
      { publisher: 'BCG', url: 'https://www.bcg.com/publications/2026/new-ai', publishedAt: '2026-08-20', status: 'included', reason: 'New measured enterprise evidence' },
      { publisher: 'BCG', url: 'https://www.bcg.com/publications/2026/old-ai', status: 'excluded', reason: 'old' },
    ],
  };
  const inspections = { candidates: [{ url: candidates.candidates[0].url, inspection: { status: 'verified', titleOriginal: 'New AI evidence' } }] };
  const overrides = { [candidates.candidates[0].url]: { titleZh: '新的 AI 证据' } };
  const existing = [{ id: 'bcg-old', publisher: 'BCG', radarTitle: 'BCG Radar', archiveIndex: 4, sourceUrl: 'https://www.bcg.com/old' }];
  const [record] = buildRefreshRecords({ candidates, inspections, overrides, existing });
  assert.equal(record.titleOriginal, 'New AI evidence');
  assert.equal(record.titleZh, '新的 AI 证据');
  assert.equal(record.archiveIndex, 5);
  assert.equal(record.score.total, Object.values(record.score.dimensions).reduce((sum, value) => sum + value, 0));
  assert.match(record.id, /^bcg-/);
});

test('requires verified or editorial titles and complete Chinese title overrides', () => {
  const candidate = { publisher: 'McKinsey', url: 'https://www.mckinsey.com/new-ai', publishedAt: '2026-08-20', status: 'included', reason: 'new' };
  assert.throws(() => buildRefreshRecords({ candidates: { run: { id: 'x' }, candidates: [candidate] }, inspections: { candidates: [] }, overrides: {}, existing: [] }), /Missing editorial override/);
});
