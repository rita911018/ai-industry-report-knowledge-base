import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTranslationBatches, filterTranslationEntries, parseTranslationArguments } from '../src/translation/run-codex-batches.mjs';

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

test('filters translation entries to an inclusive archive index range', () => {
  const entries = [
    { id: 'b1', publisher: 'Bain', archiveIndex: 1 },
    { id: 'b2', publisher: 'Bain', archiveIndex: 2 },
    { id: 'b3', publisher: 'Bain', archiveIndex: 3 },
    { id: 'm2', publisher: 'MIT', archiveIndex: 2 },
  ];

  assert.deepEqual(
    filterTranslationEntries(entries, { publisher: 'Bain', minIndex: 2, maxIndex: 3 }).map((entry) => entry.id),
    ['b2', 'b3'],
  );
});

test('parses archive index range arguments', () => {
  const options = parseTranslationArguments(['--publisher', 'Bain', '--min-index', '71', '--max-index', '140']);
  assert.equal(options.publisher, 'Bain');
  assert.equal(options.minIndex, 71);
  assert.equal(options.maxIndex, 140);
});
