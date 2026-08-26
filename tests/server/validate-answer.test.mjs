import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAnswer } from '../../src/server/validate-answer.mjs';

const evidence = [{ chunkId: 'a:001', articleId: 'a', titleZh: '标题', publisher: 'BCG', sourceUrl: 'https://example.com', localPaths: { chinese: '/a.md' }, sectionPath: '结论' }];

const valid = {
  answer: '回答',
  sections: [
    { heading: '核心结论', body: '先建立人工监督。' },
    { heading: '建议动作', items: ['从单一流程试点', '记录纠错原因'] },
  ],
  claims: [{ text: '事实', kind: 'source_fact', citations: ['a:001'] }],
  limitations: [],
  insufficient: false,
};

test('accepts cited claims and enriches sources', () => {
  const result = validateAnswer(valid, evidence);
  assert.equal(result.sources[0].publisher, 'BCG');
  assert.equal(result.claims[0].citations[0], 'a:001');
  assert.deepEqual(result.sections, valid.sections);
});

test('rejects unknown or missing citations and duplicate source IDs', () => {
  assert.throws(() => validateAnswer({ ...valid, claims: [{ text: 'x', kind: 'source_fact', citations: ['bad:001'] }] }, evidence), /Unknown citation/);
  assert.throws(() => validateAnswer({ ...valid, claims: [{ text: 'x', kind: 'source_fact', citations: [] }] }, evidence), /requires citations/);
  assert.throws(() => validateAnswer({ ...valid, claims: [{ text: 'x', kind: 'analysis', citations: ['a:001', 'a:001'] }] }, evidence), /Duplicate citation/);
});

test('requires two to four well-formed answer sections', () => {
  const invalidSections = [
    [],
    [{ heading: '只有一节', body: '不够。' }],
    Array.from({ length: 5 }, (_, index) => ({ heading: `栏目${index}`, body: '内容' })),
    [{ heading: ' ', body: '内容' }, valid.sections[1]],
    [{ heading: '冲突', body: '内容', items: ['项目'] }, valid.sections[1]],
    [{ heading: '缺内容' }, valid.sections[1]],
    [{ heading: '空正文', body: ' ' }, valid.sections[1]],
    [{ heading: '空列表', items: [] }, valid.sections[0]],
    [{ heading: '坏列表', items: ['正常', ' '] }, valid.sections[0]],
  ];
  for (const sections of invalidSections) {
    assert.throws(() => validateAnswer({ ...valid, sections }, evidence));
  }
});

test('allows an explicit insufficient-evidence response without sources', () => {
  const result = validateAnswer({ answer: '资料不足。', claims: [], limitations: ['现有资料不支持该问题'], insufficient: true }, evidence);
  assert.deepEqual(result.sources, []);
  assert.deepEqual(result.sections, []);
});
