import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { verifyTranslation } from '../src/translation/verify-translation.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const articleDirectory = path.join(
  repoRoot,
  'work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report',
);
const sourcePdf = '/Users/rita/Downloads/cio-report-h2-2026.pdf';
const officialUrl = 'https://www.gartner.com/en/chief-information-officer/products/gartner-for-cios';

const files = {
  metadata: path.join(articleDirectory, 'metadata.json'),
  english: path.join(articleDirectory, '英文原文.md'),
  chinese: path.join(articleDirectory, '中文全文.md'),
  wrapper: path.join(articleDirectory, '原始网页.html'),
  pdf: path.join(articleDirectory, '原始报告.pdf'),
};

async function sha256(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

function sectionCount(markdown, label) {
  return (markdown.match(new RegExp(`^## ${label} \\d+$`, 'gm')) || []).length;
}

function occurrenceCount(text, literal) {
  return text.split(literal).length - 1;
}

function assertFourFiveStepPlans(markdown, label) {
  const starts = [...markdown.matchAll(new RegExp(`^## ${label} \\d+$`, 'gm'))];
  assert.equal(starts.length, 4, `${label} count`);
  starts.forEach((start, index) => {
    const end = starts[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(start.index, end);
    for (let step = 1; step <= 5; step += 1) {
      assert.match(section, new RegExp(`^\\| ${step}\\.`, 'm'), `${label} ${index + 1} missing step ${step}`);
    }
  });
}

test('archives the complete Gartner 2H26 CIO report foundation', async () => {
  for (const [name, filePath] of Object.entries(files)) {
    const content = await readFile(filePath);
    assert.ok(content.length > 0, `${name} must exist and be nonempty`);
  }

  assert.equal(await sha256(files.pdf), await sha256(sourcePdf), 'archived PDF must be byte-identical');

  const metadata = JSON.parse(await readFile(files.metadata, 'utf8'));
  assert.equal(metadata.id, 'gartner-cio-report-h2-2026');
  assert.equal(metadata.publisher, 'Gartner');
  assert.equal(metadata.archiveIndex, 1);
  assert.equal(metadata.radarTitle, 'Gartner CIO Report · 2H26');
  assert.equal(metadata.titleOriginal, '2H26 The CIO Report');
  assert.equal(metadata.titleZh, 'Gartner 2026 下半年 CIO 报告');
  assert.equal(metadata.publishedAt, '2026-08-15');
  assert.equal(metadata.documentType, 'Report');
  assert.equal(metadata.sourceUrl, officialUrl);
  assert.equal(metadata.canonicalUrl, officialUrl);
  assert.equal(metadata.provenance.sourceFile, sourcePdf);
  assert.match(metadata.provenance.extractionBasis, /PDF extraction/i);
  assert.match(metadata.provenance.visualVerification, /page/i);
  assert.equal(metadata.provenance.originalArtifact, '原始报告.pdf');

  const english = await readFile(files.english, 'utf8');
  const chinese = await readFile(files.chinese, 'utf8');
  const keyNumbers = ['50%', '73%', '85%', '24%', '70%', '30%', '90%', '20%', '48%', '51%', '56%', '40%'];
  for (const token of keyNumbers) {
    assert.ok(english.includes(token), `English missing ${token}`);
    assert.ok(chinese.includes(token), `Chinese missing ${token}`);
  }

  const englishQuestions = [
    'What emerging technologies should we prioritize to future-proof our enterprise architecture?',
    'How can we make our IT operating model more resilient to economic, geopolitical or supply chain disruptions?',
    'How do we modernize legacy systems without disrupting business operations?',
    'How do we organize human-AI teams, build employee resilience and upskill our talent without disrupting operations?',
  ];
  const chineseQuestions = [
    '应优先布局哪些新兴技术，才能让企业架构面向未来？',
    '如何提升 IT 运营模式的韧性，以应对经济、地缘政治或供应链中断？',
    '如何在不干扰业务运营的前提下实现遗留系统现代化？',
    '如何组织人机协作团队、增强员工韧性并提升人才技能，同时不影响运营？',
  ];
  englishQuestions.forEach((question) => assert.ok(english.includes(question), `English missing question: ${question}`));
  chineseQuestions.forEach((question) => assert.ok(chinese.includes(question), `Chinese missing question: ${question}`));

  const pageSevenQuestion = 'How can we make our IT operating model more resilient against economic, geopolitical or supply chain disruptions?';
  const pageSevenQuestionZh = '如何增强 IT 运营模式抵御经济、地缘政治或供应链中断的韧性？';
  assert.equal(occurrenceCount(english, englishQuestions[1]), 1, 'page 2 question must use "resilient to" once');
  assert.equal(occurrenceCount(english, pageSevenQuestion), 1, 'page 7 question must use "resilient against" once');
  assert.equal(occurrenceCount(chinese, chineseQuestions[1]), 1, 'Chinese page 2 and page 7 questions must remain distinct');
  assert.equal(occurrenceCount(chinese, pageSevenQuestionZh), 1, 'Chinese page 7 question must reflect "resilient against"');

  assert.ok(english.includes('[Gartner Score for CIOs](https://www.gartner.com/en/information-technology/research/gartner-it-score-for-cios) to measure critical activities'));
  assert.ok(chinese.includes('[Gartner Score for CIOs（面向 CIO 的 Gartner 评分）](https://www.gartner.com/en/information-technology/research/gartner-it-score-for-cios)衡量关键活动'));
  assert.ok(english.includes('[CIO Score](https://www.gartner.com/en/information-technology/research/it-budget-and-efficiency-benchmark)'));
  assert.ok(chinese.includes('[CIO Score（CIO 评分）](https://www.gartner.com/en/information-technology/research/it-budget-and-efficiency-benchmark)'));

  assert.ok(english.includes("**Don't miss out**"));
  assert.ok(english.includes("View the Gartner conference calendar today and find one that's right for you."));
  assert.ok(chinese.includes('**不要错过**'));
  assert.ok(chinese.includes('立即查看 Gartner 大会日历，找到适合你的会议。'));

  assert.equal(sectionCount(english, 'Gartner Answer'), 4);
  assert.equal(sectionCount(chinese, 'Gartner 解答'), 4);
  assertFourFiveStepPlans(english, 'Sample Action Plan');
  assertFourFiveStepPlans(chinese, '行动计划示例');
  assert.equal(sectionCount(english, 'Essential Leadership Roles'), 4);
  assert.equal(sectionCount(chinese, '关键领导角色'), 4);
  for (const markdown of [english, chinese]) {
    assert.doesNotMatch(markdown, /Follow Us on LinkedIn/);
    assert.doesNotMatch(markdown, /^.*Gartner for CIOs.*Follow Us on LinkedIn.*Become a Client.*$/m);
    assert.doesNotMatch(markdown, /The CIO Report\s+\d+\s*$/m);
  }
  assert.equal(occurrenceCount(english, '[Become a Client]('), 1, 'page 22 CTA must appear exactly once');
  assert.equal(occurrenceCount(chinese, '[成为 Gartner 客户]('), 1, 'Chinese page 22 CTA must appear exactly once');
  for (const url of [
    'https://www.linkedin.com/showcase/gartner-for-it-leaders/',
    'https://x.com/Gartner_inc',
    'https://www.youtube.com/channel/UCSNX50LYGXWV_e5UWZGPGbw',
  ]) {
    assert.ok(english.includes(url), `English missing page 22 social link: ${url}`);
    assert.ok(chinese.includes(url), `Chinese missing page 22 social link: ${url}`);
  }

  const wrapper = await readFile(files.wrapper, 'utf8');
  assert.ok(wrapper.includes('href="./原始报告.pdf"'));
  assert.ok(wrapper.includes(officialUrl));
  assert.doesNotMatch(wrapper, /<(?:script|iframe|object|embed)\b/i);
  assert.doesNotMatch(wrapper, /\son[a-z]+\s*=/i);

  assert.equal(verifyTranslation(english, chinese).ok, true);
});
