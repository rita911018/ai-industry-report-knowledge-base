import test from 'node:test';
import assert from 'node:assert/strict';
import { INPUT_RADARS } from '../src/config/input-radars.mjs';

test('five radar counts total 418', () => {
  assert.equal(INPUT_RADARS.length, 5);
  assert.equal(INPUT_RADARS.reduce((sum, item) => sum + item.expectedCount, 0), 418);
  assert.deepEqual(INPUT_RADARS.map((item) => item.expectedCount), [116, 25, 29, 38, 210]);
});

test('folder titles match each HTML title exactly', () => {
  assert.deepEqual(INPUT_RADARS.map((item) => item.title), [
    'BCG Insight Radar · 2026-W31 · Static',
    'Anthropic 最近半年洞察雷达 | 2026-08-02',
    'McKinsey 最近半年洞察雷达 | 2026-08-02',
    'MIT AI Management Insight Radar · 2026-08-04',
    'Bain Six-Month Insight Radar · 2026-08-02'
  ]);
});
