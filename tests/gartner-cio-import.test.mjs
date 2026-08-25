import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from '../src/readers/render-markdown.mjs';
import { verifyTranslation } from '../src/translation/verify-translation.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const articleDirectory = path.join(
  repoRoot,
  'work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report',
);
const expectedPdfSha256 = '189a969d299c8080d5fccb11dec6f0b5229d8aec99661f939c138c111d911e2e';
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function section(markdown, heading, nextHeading) {
  const start = markdown.indexOf(heading);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const end = nextHeading ? markdown.indexOf(nextHeading, start + heading.length) : markdown.length;
  return markdown.slice(start, end === -1 ? markdown.length : end);
}

function assertActionPlanDetails(markdown, label, plans) {
  plans.forEach((plan, index) => {
    const number = index + 1;
    const content = section(markdown, `## ${label} ${number}`, number < plans.length ? `## ${label} ${number + 1}` : undefined);
    plan.steps.forEach((step) => assert.match(content, new RegExp(`^\\| \\d+\\. ${escapeRegExp(step)} \\|`, 'm')));
    assert.ok(content.includes(plan.outcome), `${label} ${number} missing representative outcome`);
    assert.ok(content.includes(plan.action), `${label} ${number} missing representative action`);
  });
}

function assertLeadershipRows(markdown, label, groups) {
  groups.forEach((expectedGroups, index) => {
    const number = index + 1;
    const content = section(markdown, `## ${label} ${number}`, number < groups.length ? `## ${label} ${number + 1}` : undefined);
    expectedGroups.forEach((group) => assert.ok(content.includes(`| ${group} |`), `${label} ${number} missing ${group}`));
  });
}

test('archives the complete Gartner 2H26 CIO report foundation', async () => {
  for (const [name, filePath] of Object.entries(files)) {
    const content = await readFile(filePath);
    assert.ok(content.length > 0, `${name} must exist and be nonempty`);
  }

  assert.equal(await sha256(files.pdf), expectedPdfSha256, 'archived PDF must match the immutable source digest');
  if (process.env.GARTNER_CIO_SOURCE_PDF) {
    assert.equal(await sha256(files.pdf), await sha256(process.env.GARTNER_CIO_SOURCE_PDF), 'opt-in source PDF comparison failed');
  }

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
  assert.equal(metadata.provenance.sourceFile, '/Users/rita/Downloads/cio-report-h2-2026.pdf');
  assert.match(metadata.provenance.extractionBasis, /PDF extraction/i);
  assert.match(metadata.provenance.visualVerification, /page/i);
  assert.equal(metadata.provenance.originalArtifact, '原始报告.pdf');

  const english = await readFile(files.english, 'utf8');
  const chinese = await readFile(files.chinese, 'utf8');
  assert.equal(metadata.snapshotSha256, await sha256(files.pdf));
  assert.equal(metadata.englishMarkdownSha256, await sha256(files.english));
  assert.equal(metadata.chineseMarkdownSha256, await sha256(files.chinese));
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
  assertActionPlanDetails(english, 'Sample Action Plan', [
    { steps: ['Define enterprise strategy and ambition', 'Determine future scenarios for EA', 'Transform the EA operating model', 'Modernize EA products and services', 'Achieve EA success by enabling rapid business adaptation'], outcome: "A clarified understanding of your organization's strategy and vision.", action: 'Strategic Planning Toolkit' },
    { steps: ['Align operating model vision to business value', 'Design operating model elements', 'Implement operating model changes', 'Implement rightsourcing and shared services', 'Manage and optimize operating model performance'], outcome: 'A resilient foundation designed to withstand disruption', action: 'AI Use Case Insights' },
    { steps: ['Define business-outcome-aligned platform strategy', 'Architect for modular, composable platforms', 'Assess market and select vendor relationships', 'Implement enterprise platforms', 'Establish governance for continuous value realization'], outcome: 'A flexible foundation that reduces legacy debt', action: 'Proposal Review' },
    { steps: ['Define an AI-driven talent strategy', 'Assess future-readiness of the workforce', 'Design organizational balance of technology and human resources', 'Scale human readiness for AI', 'Evolve human-AI workforce agility'], outcome: 'Clear visibility into current workforce capabilities', action: 'AI Maturity Assessment' },
  ]);
  assertActionPlanDetails(chinese, '行动计划示例', [
    { steps: ['明确企业战略和愿景', '确定企业架构的未来情景', '转型企业架构运营模式', '实现企业架构产品和服务现代化', '通过业务快速适应实现企业架构成功'], outcome: '清晰理解组织的战略与愿景。', action: '战略规划工具包' },
    { steps: ['将运营模式愿景与业务价值对齐', '设计运营模式要素', '实施运营模式变革', '优化寻源策略与共享服务', '管理并优化运营模式绩效'], outcome: '建立能够承受中断', action: 'AI Use Case Insights' },
    { steps: ['制定与业务成果对齐的平台战略', '设计模块化、可组合的平台', '评估市场并选择供应商关系', '实施企业平台', '建立持续实现价值的治理机制'], outcome: '建立灵活的基础，减少遗留技术债', action: 'Proposal Review' },
    { steps: ['制定 AI 驱动的人才战略', '评估员工队伍面向未来的准备度', '设计技术与人力资源之间的组织平衡', '大规模提升员工面向 AI 的准备度', '提升人机协作员工队伍的敏捷性'], outcome: '清楚掌握当前员工队伍能力', action: 'AI 成熟度评估' },
  ]);
  assert.equal(sectionCount(english, 'Essential Leadership Roles'), 4);
  assert.equal(sectionCount(chinese, '关键领导角色'), 4);
  assertLeadershipRows(english, 'Essential Leadership Roles', [
    ['Executive leadership', 'Data and analytics', 'Security', 'Application development', 'Vendor management'],
    ['Executive leadership', 'Security', 'Operations', 'Procurement and vendor management', 'Data and analytics', 'HR and workforce'],
    ['Security', 'Executive leadership', 'Application development', 'Investment and value oversight', 'Change management', 'Vendor management'],
    ['IT leadership', 'Tech professionals', 'IT management', 'Human resources', 'Vendor management'],
  ]);
  assertLeadershipRows(chinese, '关键领导角色', [
    ['企业领导层', '数据与分析', '安全', '应用开发', '供应商管理'],
    ['企业领导层', '安全', '运营', '采购与供应商管理', '数据与分析', '人力资源与员工队伍'],
    ['安全', '企业领导层', '应用开发', '投资与价值监督', '变革管理', '供应商管理'],
    ['IT 领导层', '技术专业人员', 'IT 管理层', '人力资源', '供应商管理'],
  ]);
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
  assert.ok(chinese.includes('新兴技术评估目标涵盖四项活动：'));
  assert.ok(chinese.includes('完整领导角色体系'));
  assert.ok(chinese.includes('Gartner 根据每年 **510,000+** 次客户互动积累的洞察设计会议议程。'));

  const readerHtml = renderMarkdown(chinese);
  assert.equal((readerHtml.match(/<table>/g) || []).length, 8, 'Gartner reader must contain eight semantic tables');
  assert.equal((readerHtml.match(/<thead>/g) || []).length, 8);
  assert.equal((readerHtml.match(/<tbody>/g) || []).length, 8);
  const tableLabels = [...readerHtml.matchAll(/class="table-scroll"[^>]+aria-label="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(tableLabels.length, 8, 'each Gartner table must have an accessible name');
  assert.equal(new Set(tableLabels).size, 8, 'Gartner table accessible names must be unique');
  tableLabels.forEach((label) => assert.ok(label.trim(), 'Gartner table accessible names must be nonempty'));
  assert.doesNotMatch(readerHtml, /<p>\| (?:步骤|领导群体) \|/);
  assert.doesNotMatch(readerHtml, /target="<em>|<em>blank|_blank<\/em>|rel=<em>/);

  const wrapper = await readFile(files.wrapper, 'utf8');
  assert.ok(wrapper.includes('href="./原始报告.pdf"'));
  assert.ok(wrapper.includes(officialUrl));
  assert.doesNotMatch(wrapper, /<(?:script|iframe|object|embed)\b/i);
  assert.doesNotMatch(wrapper, /\son[a-z]+\s*=/i);

  assert.equal(verifyTranslation(english, chinese).ok, true);
});

test('adds the Gartner report as the canonical 470th knowledge-library record', async () => {
  const ledger = JSON.parse(await readFile(path.join(repoRoot, 'work/normalized/articles.json'), 'utf8'));
  const matches = ledger.filter((article) => article.id === 'gartner-cio-report-h2-2026');
  assert.equal(ledger.length, 470);
  assert.equal(matches.length, 1);
  assert.equal(ledger.at(-1).id, 'gartner-cio-report-h2-2026', 'Gartner must be appended without reordering the original records');

  const article = matches[0];
  assert.deepEqual({
    schemaVersion: article.schemaVersion,
    id: article.id,
    archiveIndex: article.archiveIndex,
    radarTitle: article.radarTitle,
    publisher: article.publisher,
    sourceUrl: article.sourceUrl,
    canonicalUrl: article.canonicalUrl,
    titleOriginal: article.titleOriginal,
    titleZh: article.titleZh,
    publishedAt: article.publishedAt,
    documentType: article.documentType,
    authorRaw: article.authorRaw,
  }, {
    schemaVersion: '1.0.0',
    id: 'gartner-cio-report-h2-2026',
    archiveIndex: 1,
    radarTitle: 'Gartner CIO Report · 2H26',
    publisher: 'Gartner',
    sourceUrl: officialUrl,
    canonicalUrl: officialUrl,
    titleOriginal: '2H26 The CIO Report',
    titleZh: 'Gartner 2026 下半年 CIO 报告',
    publishedAt: '2026-08-15',
    documentType: 'Report',
    authorRaw: 'Gartner',
  });
  assert.deepEqual(article.category, {
    primary: '技术、数据与架构',
    secondary: ['AI 战略与价值', '组织、人才与工作', '治理、风险与安全'],
    taxonomyVersion: 'zh-management-v1',
  });
  assert.deepEqual(article.tags, {
    topics: ['技术、数据与架构', 'AI 战略与价值', '组织、人才与工作', '治理、风险与安全'],
    geography: ['全球'],
    horizon: ['未来6–18个月'],
    domains: ['Enterprise Architecture', 'Operating Model', 'Legacy Modernization', 'Human-AI Collaboration', 'AI Transformation'],
  });
  assert.equal(article.priority, 'must-read');
  assert.deepEqual(article.score, {
    total: 92,
    dimensions: { content: 28, impact: 24, relevance: 22, evidence: 18 },
    sourceScale: 100,
    tier: 'high',
  });
  assert.equal(article.confidence.level, 'high');
  assert.match(article.confidence.reason, /官方 PDF/);
  assert.match(article.confidence.reason, /完整本地归档/);
  assert.deepEqual(article.coreView, {
    original: null,
    zh: 'Gartner 将 2026 年下半年 CIO 议程归纳为四项相互关联的任务：以 AI、云和边缘计算重构企业架构，增强 IT 运营韧性，分阶段现代化遗留系统，并建立可持续的人机协作与技能提升机制。',
  });
  assert.equal(article.evidence.length, 4);
  const evidenceText = article.evidence.map((item) => `${item.statementOriginal}\n${item.statementZh}`).join('\n');
  for (const fact of ['50%', '85%', '24%', '2028', '30%', '90%', '2029', '51%', '56%', '40%']) assert.ok(evidenceText.includes(fact), `missing evidence fact ${fact}`);
  assert.deepEqual(article.evidence.map((item) => item.locator), [
    'PDF pages 3–6',
    'PDF pages 7–10',
    'PDF pages 11–14',
    'PDF pages 15–18',
  ]);
  assert.ok(article.impactZh?.length > 20);
  assert.ok(article.implicationZh?.length > 20);
  assert.deepEqual(article.provenance, {
    sourceFile: 'work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/原始报告.pdf',
    extractionBasis: 'local_pdf_fulltext_verified',
    pageCount: 22,
    pdfSha256: expectedPdfSha256,
  });

  const packageJson = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.match(packageJson.scripts.readers, /--expected 470(?:\s|$)/);
  assert.match(packageJson.scripts['verify:readers'], /--expected 470(?:\s|$)/);
  for (const relativePath of ['web/index.html', 'web/app.js', 'web/chat-widget.js']) {
    const runtime = await readFile(path.join(repoRoot, relativePath), 'utf8');
    assert.match(runtime, /470/, `${relativePath} must expose the new live count`);
  }
});

test('publishes the Gartner reader and searchable generated artifacts', async () => {
  const reader = await readFile(path.join(articleDirectory, '中文全文.html'), 'utf8');
  assert.match(reader, /Gartner 2026 下半年 CIO 报告/);
  assert.match(reader, new RegExp(escapeRegExp(officialUrl)));

  const corpus = JSON.parse(await readFile(path.join(repoRoot, 'work/knowledge/corpus.json'), 'utf8'));
  assert.equal(corpus.length, 470);
  const corpusMatches = corpus.filter((article) => article.id === 'gartner-cio-report-h2-2026');
  assert.equal(corpusMatches.length, 1);
  assert.ok(corpusMatches[0].chunks.length > 0);
  assert.deepEqual(corpusMatches[0].localPaths, {
    chinese: '/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/中文全文.html',
    chineseMarkdown: '/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/中文全文.md',
    original: '/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/英文原文.md',
    snapshot: '/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/原始网页.html',
  });

  const browserScript = await readFile(path.join(repoRoot, 'web/data/articles.js'), 'utf8');
  const browserArticles = JSON.parse(browserScript.replace(/^window\.ARTICLE_INDEX = /, '').replace(/;\s*$/, ''));
  assert.equal(browserArticles.length, 470);
  const browserMatches = browserArticles.filter((article) => article.id === 'gartner-cio-report-h2-2026');
  assert.equal(browserMatches.length, 1);
  assert.ok(browserMatches[0].chunkCount > 0);
  assert.equal(browserMatches[0].localPaths.chinese, corpusMatches[0].localPaths.chinese);
});
