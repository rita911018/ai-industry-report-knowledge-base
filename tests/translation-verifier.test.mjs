import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyTranslation } from '../src/translation/verify-translation.mjs';

test('accepts a structurally complete Chinese translation with preserved invariants', () => {
  const source = '# Result\n\nRevenue rose 17.5% to $2.4 billion on March 19, 2026.\n\n## Source\n\nRead [the report](https://example.com/report).';
  const translation = '# 结果\n\n收入增长 17.5%，达到 $2.4 billion，日期为 2026 年 3 月 19 日。\n\n## 来源\n\n请阅读[报告](https://example.com/report)。';
  const report = verifyTranslation(source, translation);
  assert.equal(report.ok, true);
  assert.deepEqual(report.errors, []);
});

test('rejects numeric drift', () => {
  const source = '# Result\n\nRevenue rose 17.5% to $2.4 billion.';
  const translation = '# 结果\n\n收入增长 15.7%，达到 24 亿美元。';
  assert.throws(() => verifyTranslation(source, translation), /17\.5%/);
});

test('rejects missing headings and source URLs', () => {
  const source = '# Main\n\nText.\n\n## Evidence\n\nSee https://example.com/evidence.';
  const translation = '# 主要内容\n\n中文正文足够长，但删除了证据章节和链接，因此不能算完整翻译。';
  assert.throws(() => verifyTranslation(source, translation), /heading|https:\/\/example\.com\/evidence/i);
});
