import test from 'node:test';
import assert from 'node:assert/strict';
import { articleDirectoryName, articleDirectoryPath } from '../src/archive/paths.mjs';

test('creates stable safe numbered directories', () => {
  assert.equal(articleDirectoryName(7, 'AI / Data: What?'), '007-ai-data-what');
  assert.equal(articleDirectoryName(210, '中文标题'), '210-中文标题');
});

test('removes controls and caps long slugs', () => {
  const value = articleDirectoryName(1, `A\0B ${'x'.repeat(200)}`);
  assert.equal(value.startsWith('001-a-b-'), true);
  assert.equal([...value.slice(4)].length <= 96, true);
});

test('keeps the exact radar title as the parent directory', () => {
  assert.equal(
    articleDirectoryPath('/tmp/root', 'Anthropic 最近半年洞察雷达 | 2026-08-02', 1, 'Title'),
    '/tmp/root/Anthropic 最近半年洞察雷达 | 2026-08-02/articles/001-title'
  );
});
