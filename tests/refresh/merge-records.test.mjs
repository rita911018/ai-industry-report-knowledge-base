import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeRecords } from '../../src/refresh/merge-records.mjs';

const record = (id, url) => ({ id, sourceUrl: url, canonicalUrl: url });

test('appends additions without changing existing order', () => {
  const existing = [record('one', 'https://example.com/one')];
  const additions = [record('two', 'https://example.com/two')];
  assert.deepEqual(mergeRecords(existing, additions).map((item) => item.id), ['one', 'two']);
});

test('rejects duplicate ids and canonical URLs', () => {
  const existing = [record('one', 'https://example.com/one')];
  assert.throws(() => mergeRecords(existing, [record('one', 'https://example.com/two')]), /Duplicate id/);
  assert.throws(() => mergeRecords(existing, [record('two', 'https://example.com/one/')]), /Duplicate URL/);
});
