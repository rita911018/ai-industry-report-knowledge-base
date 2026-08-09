import assert from 'node:assert/strict';
import test from 'node:test';
import { createSearchIndex, searchCorpus } from '../../src/knowledge/search.mjs';

const chunks = [
  { chunkId: 'a:001', articleId: 'a', publisher: 'Anthropic', titleZh: '智能体治理', titleOriginal: 'Agent governance', sectionPath: '治理', content: '智能体 agent governance 需要人工监督、审计和清晰的责任边界。', sourceUrl: 'https://a.example' },
  { chunkId: 'b:001', articleId: 'b', publisher: 'BCG', titleZh: '人工智能投资', titleOriginal: 'AI investment', sectionPath: '价值', content: '人工智能投资可提升利润率和资本回报。', sourceUrl: 'https://b.example' },
  { chunkId: 'c:001', articleId: 'c', publisher: 'MIT', titleZh: '组织中的智能体', titleOriginal: 'Agents in organizations', sectionPath: '管理', content: '组织采用智能体时需要治理、问责和持续评估。', sourceUrl: 'https://c.example' },
];

test('retrieves bilingual evidence and respects publisher filters', () => {
  const index = createSearchIndex(chunks);
  const result = searchCorpus(index, '如何治理 AI agent？');
  assert.equal(result.insufficient, false);
  assert.equal(result.results[0].articleId, 'a');
  const filtered = searchCorpus(index, '智能体治理', { publishers: ['MIT'] });
  assert.deepEqual(filtered.results.map((item) => item.publisher), ['MIT']);
});

test('returns insufficient for unrelated questions', () => {
  const result = searchCorpus(createSearchIndex(chunks), '宋代瓷器烧制温度');
  assert.equal(result.insufficient, true);
  assert.deepEqual(result.results, []);
});
