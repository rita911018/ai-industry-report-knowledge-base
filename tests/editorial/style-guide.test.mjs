import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const guideUrl = new URL('../../docs/editorial/chinese-style-guide.md', import.meta.url);
const guide = readFileSync(guideUrl, 'utf8');

function getSection(markdown, heading) {
  const lines = markdown.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, `missing section: ${heading}`);

  const nextHeading = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, nextHeading === -1 ? undefined : nextHeading).join('\n');
}

function parseMarkdownTable(section) {
  return section
    .split('\n')
    .filter((line) => /^\s*\|.*\|\s*$/.test(line))
    .map((line) => line.trim().slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)))
    .map((row) => row.map((cell) => cell.replace(/^`(.*)`$/, '$1')));
}

test('Chinese editorial style guide defines the required versioned contract', () => {
  assert.match(guide, /^# [^\n]*v1[^\n]*$/m, 'the H1 must identify the guide as v1');

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

  assert.match(guide, /忠实性与完整性优先于文采/);
  assert.match(guide, /段内[^\n]*拆句/);
  assert.match(guide, /不得跨段移动论点/);
  assert.match(guide, /品牌名不强制翻译/);
  assert.match(guide, /中文（English）/);
  assert.match(guide, /中文全角标点/);
  assert.match(guide, /中文与英文、数字之间留空格/);
  assert.match(guide, /保留必要的来源归属与图表口吻/);
  assert.match(guide, /不保留英文语法结构/);
});

test('glossary contains every required term as an exact table key', () => {
  const glossaryRows = parseMarkdownTable(getSection(guide, '术语表'));
  assert.deepEqual(glossaryRows[0]?.slice(0, 2), ['英文', '默认中文']);

  const glossaryKeys = new Set(glossaryRows.slice(1).map(([key]) => key.toLowerCase()));
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
    assert.ok(glossaryKeys.has(term.toLowerCase()), `missing glossary table key: ${term}`);
  }
});

test('web noise section defines exact complete-block categories and safeguard', () => {
  const noiseSection = getSection(guide, '网页噪音');
  const noiseRows = parseMarkdownTable(noiseSection);
  assert.deepEqual(noiseRows[0], ['代码', '可删除的完整块']);

  const noiseCategories = new Map(noiseRows.slice(1).map(([code, description]) => [code, description]));

  for (const code of [
    'save_share_print',
    'subscribe_newsletter',
    'cookie_language',
    'progress_widget',
    'duplicate_navigation',
  ]) {
    assert.ok(noiseCategories.has(code), `missing complete-block noise category: ${code}`);
    assert.ok(noiseCategories.get(code), `missing description for noise category: ${code}`);
  }

  assert.match(noiseSection, /整块删除/);
  assert.match(noiseSection, /完整正文句[^\n]*不得仅凭关键词删除/);
});
