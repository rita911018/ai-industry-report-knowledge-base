import assert from 'node:assert/strict';
import test from 'node:test';
import { parseWebVtt } from '../src/archive/enrich-bain-thin.mjs';

test('turns WebVTT cues into a readable deduplicated transcript', () => {
  const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nWelcome to the report.\n\n00:00:02.000 --> 00:00:04.000\nWelcome to the report.\nToday we discuss M&A.\n\n00:00:04.000 --> 00:00:06.000\n<v Speaker>Three priorities matter.</v>`;
  assert.equal(
    parseWebVtt(vtt),
    'Welcome to the report.\n\nToday we discuss M&A.\n\nThree priorities matter.',
  );
});
