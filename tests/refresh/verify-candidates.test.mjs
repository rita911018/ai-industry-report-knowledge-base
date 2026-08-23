import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCandidateLedger, validateCandidateLedger } from '../../src/refresh/verify-candidates.mjs';

const fixture = {
  run: { officialDomains: ['example.com'] },
  coverage: { discovered: 2, included: 1, excluded: 1, failed: 0 },
  candidates: [
    { publisher: 'BCG', url: 'https://example.com/new', publishedAt: '2026-08-01', status: 'included', reason: 'new' },
    { publisher: 'BCG', url: 'https://example.com/old', status: 'excluded', reason: 'old' },
  ],
};

test('validates a closed unique official-domain candidate ledger', () => {
  assert.equal(validateCandidateLedger(fixture), true);
  assert.throws(() => validateCandidateLedger({ ...fixture, coverage: { ...fixture.coverage, included: 2 } }), /Coverage mismatch/);
  assert.throws(() => validateCandidateLedger({ ...fixture, candidates: [...fixture.candidates, fixture.candidates[0]] }), /Duplicate candidate URL/);
});

test('inspects included pages while preserving excluded decisions', async () => {
  const result = await inspectCandidateLedger(fixture, {
    concurrency: 2,
    fetchPageImpl: async (url) => ({ body: '<main><h1>Verified title</h1><time datetime="2026-08-01"></time><p>Useful evidence '.repeat(40) + '</p></main>', finalUrl: url, status: 200, retrievedAt: '2026-08-23T00:00:00Z' }),
  });
  assert.equal(result.coverage.included, 1);
  assert.equal(result.candidates[0].inspection.titleOriginal, 'Verified title');
  assert.equal(result.candidates[0].inspection.pagePublishedAt, '2026-08-01');
  assert.equal(result.candidates[1].inspection, undefined);
});

test('records blocked official pages for explicit fallback instead of aborting the run', async () => {
  const result = await inspectCandidateLedger(fixture, {
    fetchPageImpl: async () => { const error = new Error('HTTP 403'); error.status = 403; throw error; },
  });
  assert.equal(result.candidates[0].inspection.status, 'failed');
  assert.equal(result.candidates[0].inspection.httpStatus, 403);
  assert.match(result.candidates[0].inspection.error, /HTTP 403/);
});
