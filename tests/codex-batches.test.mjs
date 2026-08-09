import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTranslationBatches } from '../src/translation/run-codex-batches.mjs';

test('keeps publisher order and respects item and character batch limits', () => {
  const entries = [
    { id: 'b1', publisher: 'Bain', archiveIndex: 1, sourceCharacters: 60 },
    { id: 'a2', publisher: 'Anthropic', archiveIndex: 2, sourceCharacters: 40 },
    { id: 'a1', publisher: 'Anthropic', archiveIndex: 1, sourceCharacters: 40 },
    { id: 'b2', publisher: 'Bain', archiveIndex: 2, sourceCharacters: 60 },
  ];
  const batches = buildTranslationBatches(entries, { maxCharacters: 100, maxItems: 2 });
  assert.deepEqual(batches.map((batch) => batch.map((entry) => entry.id)), [['a1', 'a2'], ['b1'], ['b2']]);
});
