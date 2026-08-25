import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const guideUrl = new URL('../../docs/editorial/chinese-style-guide.md', import.meta.url);

test('Chinese editorial style guide defines the required editing contract', () => {
  const guide = readFileSync(guideUrl, 'utf8');

  const requiredSections = [
    '忠实性',
    '中文语序',
    '术语表',
    '专名',
    '数字与单位',
    '标点与空格',
    '引语',
    '网页噪音',
    '禁止事项',
    '来源差异',
  ];

  for (const section of requiredSections) {
    assert.match(guide, new RegExp(`^## ${section}$`, 'm'), `missing section: ${section}`);
  }

  const glossary = guide.split(/^## 术语表$/m)[1]?.split(/^## /m)[0] ?? '';
  const requiredTerms = [
    'agent',
    'agentic',
    'generative AI',
    'foundation model',
    'operating model',
    'workflow',
    'use case',
    'governance',
    'resilience',
    'upskilling',
    'reskilling',
  ];

  for (const term of requiredTerms) {
    assert.ok(glossary.toLowerCase().includes(term.toLowerCase()), `missing glossary term: ${term}`);
  }

  assert.match(guide, /忠实性与完整性优先于文采/);
  assert.match(guide, /段内[^\n]*拆句/);
  assert.match(guide, /不得跨段移动论点/);
  assert.match(guide, /品牌名不强制翻译/);
  assert.match(guide, /中文（English）/);
  assert.match(guide, /中文全角标点/);
  assert.match(guide, /中文与英文、数字之间留空格/);
  assert.match(guide, /保留必要的来源归属与图表口吻/);
  assert.match(guide, /不保留英文语法结构/);

  for (const code of [
    'save_share_print',
    'subscribe_newsletter',
    'cookie_language',
    'progress_widget',
    'duplicate_navigation',
  ]) {
    assert.match(guide, new RegExp(`\\b${code}\\b`), `missing noise category: ${code}`);
  }

  assert.match(guide, /整块删除/);
  assert.match(guide, /完整正文句[^\n]*不得仅凭关键词删除/);
});
