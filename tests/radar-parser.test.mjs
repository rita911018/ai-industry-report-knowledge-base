import test from 'node:test';
import assert from 'node:assert/strict';
import { INPUT_RADARS } from '../src/config/input-radars.mjs';
import { parseRadarFile, parseAllRadars } from '../src/radar/parse-radars.mjs';

test('parses all five radars into 418 unique records', async () => {
  const records = await parseAllRadars(INPUT_RADARS);
  assert.equal(records.length, 418);
  assert.equal(new Set(records.map((record) => record.id)).size, 418);
  assert.equal(new Set(records.map((record) => record.sourceUrl)).size, 418);
  assert.deepEqual(
    INPUT_RADARS.map((radar) => records.filter((record) => record.publisher === radar.publisher).length),
    [116, 25, 29, 38, 210]
  );
});

test('preserves the BCG 10-point source score without inventing dimensions', async () => {
  const [record] = await parseRadarFile(INPUT_RADARS[0]);
  assert.equal(record.id, 'bcg-1');
  assert.equal(record.titleOriginal, 'The Cost of Caution with AI Investments');
  assert.equal(record.titleZh, '人工智能投资的谨慎成本');
  assert.equal(record.score.total, 8);
  assert.equal(record.score.sourceScale, 10);
  assert.equal(record.score.dimensions, null);
  assert.equal(record.sourceUrl, 'https://www.bcg.com/publications/2026/building-business-value-with-ai-investment');
  assert.equal(record.evidence.length, 1);
});

test('parses bilingual weighted scores and traceable evidence', async () => {
  const [anthropic] = await parseRadarFile(INPUT_RADARS[1]);
  assert.equal(anthropic.score.total, 96);
  assert.equal(anthropic.confidence.level, 'high');
  assert.match(anthropic.sourceUrl, /^https:\/\/www\.anthropic\.com\//);

  const [mckinsey] = await parseRadarFile(INPUT_RADARS[2]);
  assert.deepEqual(mckinsey.score.dimensions, { content: 35, impact: 25, relevance: 23, evidence: 15 });
  assert.equal(mckinsey.score.total, 98);
  assert.equal(mckinsey.evidence.length, 2);
  assert.match(mckinsey.evidence[0].locator, /methodology/i);
});

test('parses MIT and Bain source-specific structures', async () => {
  const [mit] = await parseRadarFile(INPUT_RADARS[3]);
  assert.deepEqual(mit.score.dimensions, { content: 34, impact: 24, relevance: 25, evidence: 14 });
  assert.equal(mit.evidence.length, 2);
  assert.match(mit.coreView.zh, /数字同事/);

  const [bain] = await parseRadarFile(INPUT_RADARS[4]);
  assert.deepEqual(bain.score.dimensions, { content: 34, impact: 24, relevance: 25, evidence: 13 });
  assert.equal(bain.score.total, 96);
  assert.match(bain.implicationZh, /Data Office/);
  assert.match(bain.sourceUrl, /^https:\/\/www\.bain\.com\//);
});
