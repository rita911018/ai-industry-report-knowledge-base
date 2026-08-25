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
  assert.equal(classifyNoiseBlock('- Print'), null);
  assert.equal(classifyNoiseBlock('[源码](https://example.com/tools/print.mjs)'), null);
  assert.equal(classifyNoiseBlock('[Print](https://example.com/research/article)'), null);
  assert.equal(classifyNoiseBlock('[Print](https://example.com/print-history)'), null);
  assert.equal(classifyNoiseBlock('[Print](./print)'), null);
  assert.equal(classifyNoiseBlock('[Print](https://example.com/print "Print this article")'), null);
  assert.equal(classifyNoiseBlock('[Print](https://example.com/print)'), 'save_share_print');
  assert.equal(classifyNoiseBlock('这是正文。\n\nShare'), null);
});

test('retains ambiguous standalone UI links and flags them for review', () => {
  const markdown = '[Print](./print)';
  const cleaned = cleanBaseline(markdown);
  const risks = scanChineseStyle(markdown, {});

  assert.equal(cleaned.markdown, markdown);
  assert.deepEqual(cleaned.removals, []);
  assert.ok(risks.some(({ code, block }) => code === 'possible_webpage_ui' && block === markdown));
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
  assert.equal(missingNumber.errors.filter((message) => /numeric token.*42/i.test(message)).length, 1);

  const missingUrl = captureFailure(before.replace('https://example.com/report', 'report-source'));
  assert.ok(missingUrl.errors.some((message) => /URL.*https:\/\/example\.com\/report/i.test(message)));
  assert.ok(missingUrl.issues.some(({ code, line, item }) => code === 'missing_url' && line === 3 && item === 'https://example.com/report'));
  assert.equal(missingUrl.errors.filter((message) => /URL.*https:\/\/example\.com\/report/i.test(message)).length, 1);
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
  assert.equal(issue?.item, '2 "乙"');
  assert.deepEqual(issue?.details?.missingColumns, [{ index: 2, label: '乙' }]);
  assert.match(issue?.message || '', /column.*2 "乙"/i);
});

test('reports locations from the original pre-edit article after earlier noise removal', () => {
  const mappedOriginal = `# Report

Print

## Evidence

English context.`;
  const mappedBefore = `# 报告

Print

## 证据

中文内容。`;
  const report = captureCustomFailure({
    original: mappedOriginal,
    before: mappedBefore,
    polished: '# 报告\n\n中文内容。',
  });

  const issue = report.issues.find(({ code }) => code === 'missing_heading');
  assert.equal(issue?.item, '## 证据');
  assert.equal(issue?.line, 5);
});

test('matches repeated tables by content and order before reporting the deleted first table', () => {
  const repeatedTableOriginal = `# Report

English context.

| Category A | Value |
| --- | --- |
| Alpha | High |

Between tables.

| Category B | Value |
| --- | --- |
| Beta | Low |`;
  const repeatedTableBefore = `# 报告

中文背景。

| 甲类 | 数值 |
| --- | --- |
| 甲 | 高 |

表格之间的说明。

| 乙类 | 数值 |
| --- | --- |
| 乙 | 低 |`;
  const repeatedTablePolished = `# 报告

中文背景。

表格之间的说明。

| 乙类 | 数值 |
| --- | --- |
| 乙 | 低 |`;
  const report = captureCustomFailure({
    original: repeatedTableOriginal,
    before: repeatedTableBefore,
    polished: repeatedTablePolished,
  });

  const issue = report.issues.find(({ code }) => code === 'missing_table');
  assert.equal(issue?.item, '| 甲类 | 数值 |');
  assert.equal(issue?.line, 5);
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

test('fails when relative, mailto, or tel Markdown links lose link structure', () => {
  const linkBefore = `# 联系与指南

请查看[指南](./guide.md)，或[发送邮件](mailto:editor@example.com)，也可[致电](tel:+861012345678)。`;
  const linkPolished = `# 联系与指南

请查看指南，或发送邮件，也可致电。`;
  const report = captureCustomFailure({
    original: '# Contact and guide\n\nEnglish context.',
    before: linkBefore,
    polished: linkPolished,
  });

  const missingLinks = report.issues.filter(({ code }) => code === 'missing_markdown_link');
  assert.deepEqual(missingLinks.map(({ item }) => item), [
    '[指南](./guide.md)',
    '[发送邮件](mailto:editor@example.com)',
    '[致电](tel:+861012345678)',
  ]);
});

test('fails when an HTTP Markdown link is flattened to a bare URL', () => {
  const linkBefore = '# 资料\n\n请阅读[完整报告](https://example.com/report)。';
  const linkPolished = '# 资料\n\n请阅读 https://example.com/report。';
  const report = captureCustomFailure({
    original: '# Source\n\nRead https://example.com/report.',
    before: linkBefore,
    polished: linkPolished,
  });

  assert.ok(report.issues.some(({ code, item }) => code === 'missing_markdown_link' && item === '[完整报告](https://example.com/report)'));
});

test('preserves reference-style links, images, and their definitions', () => {
  const referenceBefore = `# 资料

请查看[指南][guide]。

![图][chart]

[guide]: ./guide.md
[chart]: ./chart.png`;
  const variants = [
    {
      polished: referenceBefore.replace('[指南][guide]', '指南'),
      code: 'missing_reference_link',
      item: '[指南][guide]',
    },
    {
      polished: referenceBefore.replace('![图][chart]', '图'),
      code: 'missing_reference_image',
      item: '![图][chart]',
    },
    {
      polished: referenceBefore.replace('[chart]: ./chart.png', ''),
      code: 'missing_link_definition',
      item: '[chart]: ./chart.png',
    },
  ];

  for (const variant of variants) {
    const report = captureCustomFailure({
      original: '# Source\n\nEnglish context.',
      before: referenceBefore,
      polished: variant.polished,
    });
    assert.ok(
      report.issues.some(({ code, item }) => code === variant.code && item === variant.item),
      `${variant.code}: ${report.errors.join('; ')}`,
    );
  }
});

test('extracts and preserves empty-alt inline and reference images', () => {
  const inlineBefore = '# 图表\n\n![](./inline-chart.png)';
  const inlineReport = captureCustomFailure({
    original: '# Chart\n\nEnglish context.',
    before: inlineBefore,
    polished: '# 图表\n\n[chart](./inline-chart.png)',
  });
  assert.ok(inlineReport.issues.some(({ code, item }) => code === 'missing_image' && item === '![](./inline-chart.png)'));

  const referenceBefore = '# 图表\n\n![][chart]\n\n[chart]: ./reference-chart.png';
  const referenceReport = captureCustomFailure({
    original: '# Chart\n\nEnglish context.',
    before: referenceBefore,
    polished: '# 图表\n\n[chart]: ./reference-chart.png',
  });
  assert.ok(referenceReport.issues.some(({ code, item }) => code === 'missing_reference_image' && item === '![][chart]'));
});

test('treats inline and reference Markdown forms with the same destination as equivalent', () => {
  const inlineBefore = `# 资料

[报告](./report.md)

![图](./chart.png)`;
  const referencePolished = `# 资料

[研究报告][report]

![研究图][chart]

[report]: ./report.md
[chart]: ./chart.png`;
  const inlineToReference = verifyPolishedChinese({
    original: '# Materials\n\nEnglish context.',
    before: inlineBefore,
    polished: referencePolished,
    glossary: {},
  });
  assert.equal(inlineToReference.ok, true);
  assert.deepEqual(inlineToReference.issues, []);

  const referenceBefore = `# 资料

[报告][report]

![图][chart]

[report]: ./report.md
[chart]: ./chart.png`;
  const inlinePolished = `# 资料

[研究报告](./report.md)

![研究图](./chart.png)`;
  const referenceToInline = verifyPolishedChinese({
    original: '# Materials\n\nEnglish context.',
    before: referenceBefore,
    polished: inlinePolished,
    glossary: {},
  });
  assert.equal(referenceToInline.ok, true);
  assert.deepEqual(referenceToInline.issues, []);
});

test('uses matching fences and indented-code protection for style and structure extraction', () => {
  const protectedMarkdown = `# 标题

\`\`\`\`markdown
## 伪标题

- Print

[伪链接](./fake.md)

该代理执行,很好!!

\`\`\`

Share
\`\`\`\`

    ## 缩进伪标题
    - Print
    该代理执行,很好!!

~~~~text
## 波浪伪标题

- Print

[波浪伪链接](./tilde.md)
~~~~

## 真实标题

- 真实项

[真实指南](./guide.md)`;
  const risks = scanChineseStyle(protectedMarkdown, {
    agent: { preferred: '智能体', prohibited: ['代理'] },
  });
  assert.deepEqual(risks.map(({ code }) => code), []);

  const polished = `# 标题

\`\`\`\`markdown
code rewritten
\`\`\`\`

    code rewritten

~~~~text
code rewritten
~~~~

## 真实标题

- 真实项

真实指南`;
  const report = captureCustomFailure({
    original: '# Source\n\nEnglish context.\n\n## Real heading\n\n- Real item\n\nGuide.',
    before: protectedMarkdown,
    polished,
  });
  assert.deepEqual(
    report.issues.filter(({ code }) => /heading|list_item|markdown_link/.test(code)).map(({ code, item }) => ({ code, item })),
    [{ code: 'missing_markdown_link', item: '[真实指南](./guide.md)' }],
  );
});

test('fails when percent and per-mille qualifiers drift despite the same number', () => {
  const report = captureCustomFailure({
    original: '# Rate\n\nThe rate was 42%.',
    before: '# 比例\n\n该比例为 42%。',
    polished: '# 比例\n\n该比例为 42‰。',
  });

  assert.ok(report.issues.some(({ code, item }) => code === 'missing_factual_qualifier' && item === '42%'));
});

test('fails when Chinese currency-scale or unit qualifiers are removed', () => {
  const report = captureCustomFailure({
    original: '# Facts\n\nInvestment was 42 million dollars and distance was 42 km.',
    before: '# 事实\n\n投资额为 42 百万美元，距离为 42 公里。',
    polished: '# 事实\n\n投资额为 42，距离为 42。',
  });

  assert.deepEqual(
    report.issues.filter(({ code }) => code === 'missing_factual_qualifier').map(({ item }) => item),
    ['42 百万美元', '42 公里'],
  );
});

test('fails when English-adjacent currency or data-unit qualifiers are removed', () => {
  const report = captureCustomFailure({
    original: '# Facts\n\nRevenue was $42 million and capacity was 5 GB.',
    before: '# 事实\n\n收入为 $42 million，容量为 5 GB。',
    polished: '# 事实\n\n收入为 42，容量为 5。',
  });

  assert.deepEqual(
    report.issues.filter(({ code }) => code === 'missing_factual_qualifier').map(({ item }) => item),
    ['$42 million', '5 GB'],
  );
});

test('allows equivalent Chinese and English-adjacent factual unit forms', () => {
  const report = verifyPolishedChinese({
    original: '# Facts\n\nInvestment was 42 million dollars and distance was 5 kilometers.',
    before: '# 事实\n\n投资额为 42 million dollars，距离为 5 kilometers。',
    polished: '# 事实\n\n投资额为 42 百万美元，距离为 5 公里。',
    glossary: {},
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.issues, []);
});

test('allows bounded same-clause reordering of unit and currency qualifiers', () => {
  const report = verifyPolishedChinese({
    original: '# Facts\n\nDistance was 42 km; budget was 42 dollars.',
    before: '# 事实\n\n距离为 42 公里；预算为 42 美元。',
    polished: '# 事实\n\n以公里计，距离为 42；以美元计，预算为 42。',
    glossary: {},
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.issues, []);
});

test('allows repeated equal values with distinct qualifiers to reorder within one sentence', () => {
  const report = verifyPolishedChinese({
    original: '# Facts\n\nRevenue was 42 dollars; distance was 42 km.',
    before: '# 事实\n\n收入为 42 美元；距离为 42 公里。',
    polished: '# 事实\n\n距离为 42 公里；收入为 42 美元。',
    glossary: {},
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.issues, []);
});

test('allows repeated equal values with distinct qualifiers to reorder sentences within a paragraph', () => {
  const report = verifyPolishedChinese({
    original: '# Facts\n\nRevenue was 42 dollars. Distance was 42 km.',
    before: '# 事实\n\n收入为 42 美元。距离为 42 公里。',
    polished: '# 事实\n\n距离为 42 公里。收入为 42 美元。',
    glossary: {},
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.issues, []);
});

test('does not satisfy two distinct repeated-value facts by duplicating one qualifier', () => {
  const report = captureCustomFailure({
    original: '# Facts\n\nRevenue was 42 dollars; distance was 42 km.',
    before: '# 事实\n\n收入为 42 美元；距离为 42 公里。',
    polished: '# 事实\n\n收入甲为 42 美元；收入乙为 42 美元。',
  });

  assert.ok(report.issues.some(({ code, item }) => code === 'missing_factual_qualifier' && item === '42 公里'));
});

test('does not let the same value and unit in a later paragraph mask an earlier loss', () => {
  const report = captureCustomFailure({
    original: '# Facts\n\nPrimary distance was 42 km.\n\nSecondary distance was 42 km.',
    before: '# 事实\n\n主要距离为 42 公里。\n\n次要距离为 42 公里。',
    polished: '# 事实\n\n主要距离为 42。\n\n次要距离为 42 公里。',
  });

  assert.ok(report.issues.some(({ code, line, item }) => (
    code === 'missing_factual_qualifier' && line === 3 && item === '42 公里'
  )));
});

test('does not let a later unrelated paragraph unit mask an earlier dropped qualifier', () => {
  const report = captureCustomFailure({
    original: '# Facts\n\nDistance was 42 km.\n\nThe sample contained 42 items.',
    before: '# 事实\n\n距离为 42 公里。\n\n样本数为 42。',
    polished: '# 事实\n\n距离为 42。\n\n样本数为 42 公里。',
  });

  assert.ok(report.issues.some(({ code, item }) => code === 'missing_factual_qualifier' && item === '42 公里'));
});

test('does not associate a detached qualifier across an ASCII sentence boundary', () => {
  const report = captureCustomFailure({
    original: '# Facts\n\nDistance was 42 km.',
    before: '# 事实\n\n距离为 42 公里。',
    polished: '# 事实\n\n距离为 42. 公里是下一句讨论的单位。',
  });

  assert.ok(report.issues.some(({ code, item }) => code === 'missing_factual_qualifier' && item === '42 公里'));
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
