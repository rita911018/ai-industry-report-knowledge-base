import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyNoiseBlock,
  cleanBaseline,
  scanChineseStyle,
  verifyPolishedChinese,
} from '../../src/editorial/chinese-quality.mjs';

test('classifies only isolated whole webpage-noise blocks', () => {
  const cases = new Map([
    ['Save It For Later', 'save_share_print'],
    ['Share', 'save_share_print'],
    ['Print', 'save_share_print'],
    ['Subscribe', 'subscribe_newsletter'],
    ['Progress:', 'progress_widget'],
    ['en', 'cookie_language'],
  ]);

  for (const [block, expected] of cases) {
    assert.equal(classifyNoiseBlock(block), expected, block);
  }

  assert.equal(classifyNoiseBlock('企业需要分享经验'), null);
  assert.equal(classifyNoiseBlock('`print(value)`'), null);
  assert.equal(classifyNoiseBlock('    Print'), null);
  assert.equal(classifyNoiseBlock('[源码](https://example.com/tools/print.mjs)'), null);
  assert.equal(classifyNoiseBlock('这是正文。\n\nShare'), null);
});

test('cleanBaseline removes classified blocks while preserving all non-noise Markdown', () => {
  const markdown = `# 报告

企业在 2026 年需要分享经验，详见 [源码](https://example.com/tools/print.mjs)。

- 结论一
- 结论二

| 指标 | 数值 |
| --- | --- |
| 收入 | 42 |

![趋势图](https://example.com/chart.png)

注释[^note]。

[^note]: 数据截至 2026 年。

Save It For Later

Share

Print

Subscribe

Progress:

en

Share`;
  const expected = `# 报告

企业在 2026 年需要分享经验，详见 [源码](https://example.com/tools/print.mjs)。

- 结论一
- 结论二

| 指标 | 数值 |
| --- | --- |
| 收入 | 42 |

![趋势图](https://example.com/chart.png)

注释[^note]。

[^note]: 数据截至 2026 年。`;

  const cleaned = cleanBaseline(markdown);

  assert.equal(cleaned.markdown, expected);
  assert.equal(cleaned.removals.length, 7);
  assert.deepEqual(
    cleaned.removals.map(({ code }) => code),
    [
      'save_share_print',
      'save_share_print',
      'save_share_print',
      'subscribe_newsletter',
      'progress_widget',
      'cookie_language',
      'save_share_print',
    ],
  );
  for (const removal of cleaned.removals) {
    assert.match(removal.originalBlockHash, /^[a-f0-9]{64}$/);
    assert.equal(removal.count >= 1, true);
    assert.equal(removal.occurrence >= 1, true);
  }
  const shares = cleaned.removals.filter((removal) => removal.originalBlock === 'Share');
  assert.deepEqual(shares.map(({ occurrence, count }) => [occurrence, count]), [[1, 2], [2, 2]]);
});

test('cleanBaseline preserves blank-line-separated noise labels inside matching fenced code', () => {
  const markdown = `# 代码示例

\`\`\`\`text
保留代码

Print

Share

\`\`\`

en
\`\`\`\`

Subscribe

~~~text
Progress:

en

Print
~~~

正文结束。`;
  const expected = `# 代码示例

\`\`\`\`text
保留代码

Print

Share

\`\`\`

en
\`\`\`\`

~~~text
Progress:

en

Print
~~~

正文结束。`;

  const cleaned = cleanBaseline(markdown);

  assert.equal(cleaned.markdown, expected);
  assert.deepEqual(cleaned.removals.map(({ code, originalBlock }) => ({ code, originalBlock })), [
    { code: 'subscribe_newsletter', originalBlock: 'Subscribe' },
  ]);
});

const original = `# Result

Revenue grew in 2026. See [source](https://example.com/report).

## Details

- First item
- Second item

| Metric | Value | Source |
| --- | --- | --- |
| Revenue | 42 | Report |

![Chart](https://example.com/chart.png)

Explanation[^note].

[^note]: Data current in 2026.`;

const before = `# 结果

收入在 2026 年增长，详见 [来源](https://example.com/report)。

## 细节

- 第一项
- 第二项

| 指标 | 数值 | 来源 |
| --- | --- | --- |
| 收入 | 42 | 报告 |

![趋势图](https://example.com/chart.png)

说明文字[^note]。

[^note]: 数据截至 2026 年。`;

function captureFailure(polished) {
  try {
    verifyPolishedChinese({ original, before, polished, glossary: {} });
  } catch (error) {
    assert.ok(error.report, 'failure includes a machine-readable report');
    return error.report;
  }
  assert.fail('expected verification to fail');
}

function captureCustomFailure(input) {
  try {
    verifyPolishedChinese({ ...input, glossary: {} });
  } catch (error) {
    assert.ok(error.report, 'failure includes a machine-readable report');
    return error.report;
  }
  assert.fail('expected verification to fail');
}

test('verifyPolishedChinese preserves existing translation invariants with exact diagnostics', () => {
  const missingNumber = captureFailure(before.replace('| 收入 | 42 | 报告 |', '| 收入 | 四十二 | 报告 |'));
  assert.ok(missingNumber.errors.some((message) => /numeric token.*42/i.test(message)));
  assert.ok(missingNumber.issues.some(({ code, line, item }) => code === 'missing_numeric_token' && line === 12 && item === '42'));

  const missingUrl = captureFailure(before.replace('https://example.com/report', 'report-source'));
  assert.ok(missingUrl.errors.some((message) => /URL.*https:\/\/example\.com\/report/i.test(message)));
  assert.ok(missingUrl.issues.some(({ code, line, item }) => code === 'missing_url' && line === 3 && item === 'https://example.com/report'));
});

test('verifyPolishedChinese identifies the exact missing Markdown structure', () => {
  const cases = [
    {
      label: 'heading',
      polished: before.replace('## 细节\n\n', ''),
      expected: /heading.*line 5.*## 细节/i,
    },
    {
      label: 'list item',
      polished: before.replace('- 第二项\n', ''),
      expected: /list item.*line 8.*第二项/i,
    },
    {
      label: 'table column',
      polished: before
        .replace('| 指标 | 数值 | 来源 |', '| 指标 | 数值 |')
        .replace('| --- | --- | --- |', '| --- | --- |')
        .replace('| 收入 | 42 | 报告 |', '| 收入 | 42 |'),
      expected: /table.*line 10.*column.*3/i,
    },
    {
      label: 'image',
      polished: before.replace('![趋势图](https://example.com/chart.png)', '[趋势图](https://example.com/chart.png)'),
      expected: /image.*line 14.*!\[趋势图\]/i,
    },
    {
      label: 'footnote',
      polished: before
        .replace('说明文字[^note]。', '说明文字（见注）。')
        .replace('[^note]: 数据截至 2026 年。', '数据截至 2026 年。'),
      expected: /footnote.*line 16.*\[\^note\]/i,
    },
  ];

  for (const { label, polished, expected } of cases) {
    const { errors } = captureFailure(polished);
    assert.ok(errors.some((message) => expected.test(message)), `${label}: ${errors.join('; ')}`);
  }
});

test('reports the first deleted same-level heading instead of the retained later heading', () => {
  const repeatedOriginal = `# Report

English context.

## First section

First explanation.

## Second section

Second explanation.`;
  const repeatedBefore = `# 报告

中文背景。

## 第一节

第一段说明。

## 第二节

第二段说明。`;
  const report = captureCustomFailure({
    original: repeatedOriginal,
    before: repeatedBefore,
    polished: repeatedBefore.replace('## 第一节\n\n', ''),
  });

  const issue = report.issues.find(({ code }) => code === 'missing_heading');
  assert.equal(issue?.item, '## 第一节');
  assert.equal(issue?.line, 5);
});

test('reports the first deleted same-shape list item instead of the retained later item', () => {
  const repeatedOriginal = `# Report

English context.

- First item
- Second item`;
  const repeatedBefore = `# 报告

中文背景。

- 第一项
- 第二项`;
  const report = captureCustomFailure({
    original: repeatedOriginal,
    before: repeatedBefore,
    polished: repeatedBefore.replace('- 第一项\n', ''),
  });

  const issue = report.issues.find(({ code }) => code === 'missing_list_item');
  assert.equal(issue?.item, '- 第一项');
  assert.equal(issue?.line, 5);
});

test('reports the deleted interior table column by its baseline header', () => {
  const tableOriginal = `# Report

English context.

| A | B | C |
| --- | --- | --- |
| Left | Middle | Right |`;
  const tableBefore = `# 报告

中文背景。

| 甲 | 乙 | 丙 |
| --- | --- | --- |
| 左 | 中 | 右 |`;
  const tablePolished = `# 报告

中文背景。

| 甲 | 丙 |
| --- | --- |
| 左 | 右 |`;
  const report = captureCustomFailure({ original: tableOriginal, before: tableBefore, polished: tablePolished });

  const issue = report.issues.find(({ code }) => code === 'missing_table_column');
  assert.deepEqual(issue?.item, ['2 "乙"']);
  assert.match(issue?.message || '', /column.*2 "乙"/i);
});

test('allows editorial wording changes when heading and list structure remains complete', () => {
  const wordingOriginal = `# Report

English context.

## First section

- First item
- Second item

## Second section

English conclusion.`;
  const wordingBefore = `# 旧标题

中文背景。

## 旧章节甲

- 旧要点甲
- 旧要点乙

## 旧章节乙

中文结论。`;
  const wordingPolished = `# 新报告标题

经过润色的中文背景。

## 全新的开篇

- 重写后的第一个要点
- 重写后的第二个要点

## 全新的收束章节

经过润色的中文结论。`;

  const report = verifyPolishedChinese({
    original: wordingOriginal,
    before: wordingBefore,
    polished: wordingPolished,
    glossary: {},
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.issues, []);
});

test('verifyPolishedChinese does not require classified noise or its URL to survive', () => {
  const noisyOriginal = `${original}\n\n[Print](https://example.com/print)`;
  const noisyBefore = `${before}\n\n[Print](https://example.com/print)`;

  const report = verifyPolishedChinese({
    original: noisyOriginal,
    before: noisyBefore,
    polished: before,
    glossary: {},
  });

  assert.equal(report.ok, true);
  assert.equal(report.removals.before.length, 1);
  assert.equal(report.removals.original.length, 1);
});

test('scanChineseStyle reports glossary, UI-word, punctuation, and repetition risks without rewriting', () => {
  const markdown = '# 标题\n\n该代理将执行任务,结果很好!!\n\nShare';
  const glossary = {
    agent: { preferred: '智能体', prohibited: ['代理'] },
  };

  const risks = scanChineseStyle(markdown, glossary);

  assert.deepEqual(
    new Set(risks.map(({ code }) => code)),
    new Set(['prohibited_glossary_variant', 'isolated_english_ui', 'mixed_english_punctuation', 'repeated_punctuation']),
  );
  assert.ok(risks.every(({ message, line }) => message && line >= 1));
  assert.equal(markdown, '# 标题\n\n该代理将执行任务,结果很好!!\n\nShare');
});

test('abnormal shortening and expansion are review risks, not automatic failures', () => {
  const baseline = `# 标题\n\n${'这是需要保留的中文内容。'.repeat(12)}`;
  const variants = [
    '# 标题\n\n这是简短的中文内容。',
    `# 标题\n\n${'这是详细扩展的中文内容。'.repeat(24)}`,
  ];

  for (const polished of variants) {
    const report = verifyPolishedChinese({
      original: '# Title\n\nEnglish source.',
      before: baseline,
      polished,
      glossary: {},
    });
    assert.equal(report.ok, true);
    assert.ok(report.risks.some(({ code }) => code === 'abnormal_length_change'));
    assert.equal(report.needsReview, true);
  }
});
