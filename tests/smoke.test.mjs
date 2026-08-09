import test from 'node:test';
import assert from 'node:assert/strict';
import { PROJECT_SCHEMA_VERSION } from '../src/schema/article-record.mjs';

test('archive schema version is fixed', () => {
  assert.equal(PROJECT_SCHEMA_VERSION, '1.0.0');
});
