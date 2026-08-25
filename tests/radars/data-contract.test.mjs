import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRadarFile, validateRadarData } from '../../web/radars/validate-data.mjs';

const radarRoot = fileURLToPath(new URL('../../web/radars/', import.meta.url));

test('validator rejects an incomplete radar', () => {
  assert.throws(() => validateRadarData({ id: 'broken' }, { radarRoot }), /title/);
});

test('extended radar accepts 20–30 scenarios and ranks exactly 12 matrix points', async () => {
  const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
  const result = validateRadarData(data, { radarRoot });
  assert.equal(result.scenarioCount, 24);
  assert.equal(result.matrixCount, 12);
  assert.deepEqual(data.scenarios.filter((scenario) => scenario.matrixRank).map((scenario) => scenario.matrixRank), Array.from({ length: 12 }, (_, index) => index + 1));
});

test('extended radar rejects source facts without a precise locator', async () => {
  const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
  data.scenarios[0].sourceFacts[0].locator = '';
  assert.throws(() => validateRadarData(data, { radarRoot }), /sourceFacts\[0\]\.locator/);
});

test('extended radar rejects an invalid matrix rank', async () => {
  const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
  data.scenarios[0].matrixRank = 13;
  assert.throws(() => validateRadarData(data, { radarRoot }), /matrixRank/);
});

test('ranked libraries require an explicit matrixRank field', async () => {
  for (const mutateRank of [
    (scenario) => delete scenario.matrixRank,
    (scenario) => { scenario.matrixRank = undefined; },
  ]) {
    const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
    delete data.schemaVersion;
    data.libraryMode = 'ranked';
    mutateRank(data.scenarios[12]);
    assert.throws(() => validateRadarData(data, { radarRoot }), /matrixRank/);
  }
});

test('ranked legacy radar accepts ranked P3 red-line points without schema-v2-only fields', async () => {
  const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
  delete data.schemaVersion;
  data.libraryMode = 'ranked';
  for (const scenario of data.scenarios) {
    delete scenario.confidence;
    delete scenario.humanHandoff;
    delete scenario.evidenceWindow;
    delete scenario.acceptanceMetrics;
    delete scenario.sourceFacts;
  }
  data.scenarios[10].priority = 'P3';
  data.scenarios[10].scorecard.redLine = true;

  assert.deepEqual(validateRadarData(data, { radarRoot }), {
    id: 'fixture', scenarios: 24, p0: 3, pilots: 3, scenarioCount: 24, matrixCount: 12,
  });
});

test('schema-v2 radar rejects ranked P3 red-line points', async () => {
  const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
  data.scenarios[10].priority = 'P3';
  data.scenarios[10].scorecard.redLine = true;
  assert.throws(() => validateRadarData(data, { radarRoot }), /matrixRank cannot include a P3 or red-line scenario/);
});

test('validator accepts omitted, null, and leap-day source publishedAt dates', async () => {
  const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
  delete data.sources[0].publishedAt;
  data.sources[1].publishedAt = null;
  data.sources[2].publishedAt = '2024-02-29';
  assert.doesNotThrow(() => validateRadarData(data, { radarRoot }));
});

test('validator rejects invalid source publishedAt dates', async () => {
  for (const publishedAt of ['2026-02-30', '2100-02-29', '2026-13-01', '2026-04-31', '2026-2-1']) {
    const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
    data.sources[0].publishedAt = publishedAt;
    assert.throws(() => validateRadarData(data, { radarRoot }), /publishedAt/);
  }
});

test('extended P0 scenarios require evidence from two distinct publishers', async () => {
  const data = await loadRadarFile(fileURLToPath(new URL('./fixtures/extended-radar.js', import.meta.url)));
  data.scenarios[0].evidenceIds = ['fixture-research-a', 'fixture-case-cn-a'];
  data.sources.find((source) => source.id === 'fixture-case-cn-a').publisher = '研究机构 A';
  data.scenarios[0].sourceFacts = [{ sourceId: 'fixture-research-a', text: '单一发布方证据。', locator: '第 1 节' }];
  assert.throws(() => validateRadarData(data, { radarRoot }), /P0 requires evidence from at least two distinct publishers/);
});

test('legal radar satisfies the shared contract', async () => {
  const data = await loadRadarFile(`${radarRoot}/data/legal.js`);
  const result = validateRadarData(data, { radarRoot });
  assert.deepEqual(result, { id: 'legal', scenarios: 12, p0: 3, pilots: 3 });
  const sourceIds = new Set(data.sources.map((source) => source.id));
  for (const scenario of data.scenarios) {
    assert.match(scenario.title, /^(用 AI|让 AI)/);
    assert.ok(scenario.shortTitle.length >= 4 && scenario.shortTitle.length <= 14, `${scenario.id}.shortTitle`);
    assert.ok(Array.isArray(scenario.problem) && scenario.problem.length >= 3, `${scenario.id}.problem`);
    assert.ok(Array.isArray(scenario.aiValue) && scenario.aiValue.length >= 4, `${scenario.id}.aiValue`);
    assert.ok(scenario.problem.every((item) => item.trim()), `${scenario.id}.problem entries`);
    assert.ok(scenario.aiValue.every((item) => item.trim()), `${scenario.id}.aiValue entries`);
    assert.deepEqual(Object.keys(scenario.scorecard.dimensions).sort(), ['businessValue', 'evidence', 'processFit', 'readiness', 'riskControl']);
    assert.equal(Object.values(scenario.scorecard.dimensions).reduce((sum, score) => sum + score, 0), scenario.scorecard.total);
    assert.ok(scenario.scorecard.rationale.trim(), `${scenario.id}.scorecard.rationale`);
    assert.ok(scenario.scorecard.prerequisite.trim(), `${scenario.id}.scorecard.prerequisite`);
    assert.equal(typeof scenario.scorecard.redLine, 'boolean');
    assert.ok(Array.isArray(scenario.companyCases));
    for (const companyCase of scenario.companyCases) {
      for (const field of ['company', 'summary', 'sourceId', 'caseType', 'caveat', 'market']) assert.ok(companyCase[field]?.trim(), `${scenario.id}.${field}`);
      assert.ok(['中国', '国际'].includes(companyCase.market), `${scenario.id}.${companyCase.company}.market`);
      assert.ok(sourceIds.has(companyCase.sourceId), `${scenario.id} references ${companyCase.sourceId}`);
    }
  }
  const chinaCases = data.scenarios.flatMap((scenario) => scenario.companyCases).filter((item) => item.market === '中国');
  assert.ok(new Set(chinaCases.map((item) => item.company)).size >= 2, 'legal needs at least two Chinese companies');
});

test('hr radar satisfies the ranked-library contract', async () => {
  const hr = await loadRadarFile(`${radarRoot}/data/hr.js`);
  const result = validateRadarData(hr, { radarRoot });
  assert.deepEqual(result, { id: 'hr', scenarios: 20, p0: 3, pilots: 3, scenarioCount: 20, matrixCount: 12 });
  assert.equal(hr.libraryMode, 'ranked');
  assert.deepEqual(hr.scenarios.filter((scenario) => Number.isInteger(scenario.matrixRank)).map((scenario) => scenario.matrixRank), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(hr.scenarios.slice(12).length, 8);
  assert.ok(hr.scenarios.slice(12).every((scenario) => scenario.matrixRank === null));

  const expectedLowConfidence = {
    level: 'low',
    reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。',
  };
  const expectedHumanHandoff = '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。';
  for (const scenario of hr.scenarios.slice(12)) {
    assert.deepEqual(scenario.confidence, expectedLowConfidence, `${scenario.id}.confidence`);
    assert.equal(scenario.humanHandoff, expectedHumanHandoff, `${scenario.id}.humanHandoff`);
    assert.equal(scenario.evidenceWindow, 'current', `${scenario.id}.evidenceWindow`);
    assert.ok(Array.isArray(scenario.sourceFacts) && scenario.sourceFacts.length >= 2, `${scenario.id}.sourceFacts`);
    assert.ok(Array.isArray(scenario.acceptanceMetrics) && scenario.acceptanceMetrics.length === 4, `${scenario.id}.acceptanceMetrics`);
    assert.ok(scenario.acceptanceMetrics.some((metric) => /(准确|正确|质量|完整|一致)/.test(metric)), `${scenario.id}.acceptanceMetrics accuracy/quality`);
    assert.ok(scenario.acceptanceMetrics.some((metric) => /人工复核.*(修改|变更|覆盖|退回|调整)/.test(metric)), `${scenario.id}.acceptanceMetrics review changes`);
    assert.ok(scenario.acceptanceMetrics.some((metric) => /(周转时间|处理时间|时长|周期)/.test(metric)), `${scenario.id}.acceptanceMetrics turnaround`);
    assert.ok(scenario.acceptanceMetrics.some((metric) => /(未经授权|未授权).*(自动|不可逆).*(次数|数量|为\s*0)/.test(metric)), `${scenario.id}.acceptanceMetrics unauthorized actions`);
    assert.equal(scenario.matrixEligible, false, `${scenario.id}.matrixEligible`);
    assert.equal(Object.hasOwn(scenario, 'matrixRank'), true, `${scenario.id}.matrixRank must be explicit`);
    assert.equal(scenario.matrixRank, null, `${scenario.id}.matrixRank`);
    for (const [index, fact] of scenario.sourceFacts.entries()) {
      assert.ok(scenario.evidenceIds.includes(fact.sourceId), `${scenario.id}.sourceFacts[${index}].sourceId`);
      assert.ok(fact.text?.trim(), `${scenario.id}.sourceFacts[${index}].text`);
      assert.ok(fact.locator?.trim(), `${scenario.id}.sourceFacts[${index}].locator`);
    }
  }
  const attendanceRisk = hr.scenarios.find((scenario) => scenario.id === 'hr-13')?.risk ?? '';
  assert.match(attendanceRisk, /模型推断.*不得直接写入薪酬/);
  assert.match(attendanceRisk, /有争议的记录.*规则冲突.*低置信度结果/);
  assert.match(attendanceRisk, /必须转交具名 HR 复核/);

  const sourceIds = new Set(hr.sources.map((source) => source.id));
  const sourceById = new Map(hr.sources.map((source) => [source.id, source]));
  for (const scenario of hr.scenarios) {
    assert.match(scenario.title, /^(用 AI|让 AI)/);
    assert.ok(scenario.shortTitle.length >= 4 && scenario.shortTitle.length <= 14, `${scenario.id}.shortTitle`);
    assert.ok(Array.isArray(scenario.problem) && scenario.problem.length >= 3, `${scenario.id}.problem`);
    assert.ok(Array.isArray(scenario.aiValue) && scenario.aiValue.length >= 4, `${scenario.id}.aiValue`);
    assert.ok(scenario.problem.every((item) => item.trim()), `${scenario.id}.problem entries`);
    assert.ok(scenario.aiValue.every((item) => item.trim()), `${scenario.id}.aiValue entries`);
    assert.deepEqual(Object.keys(scenario.scorecard.dimensions).sort(), ['businessValue', 'evidence', 'processFit', 'readiness', 'riskControl']);
    assert.equal(Object.values(scenario.scorecard.dimensions).reduce((sum, score) => sum + score, 0), scenario.scorecard.total);
    assert.ok(scenario.scorecard.rationale.trim(), `${scenario.id}.scorecard.rationale`);
    assert.ok(scenario.scorecard.prerequisite.trim(), `${scenario.id}.scorecard.prerequisite`);
    assert.equal(typeof scenario.scorecard.redLine, 'boolean');
    assert.ok(Array.isArray(scenario.companyCases));
    assert.ok(
      scenario.evidenceIds.some((sourceId) => /^\d{4}-\d{2}-\d{2}$/.test(sourceById.get(sourceId)?.publishedAt ?? '')),
      `${scenario.id} needs at least one dated evidence source`,
    );
    for (const companyCase of scenario.companyCases) {
      for (const field of ['company', 'summary', 'sourceId', 'caseType', 'caveat', 'market']) assert.ok(companyCase[field]?.trim(), `${scenario.id}.${field}`);
      assert.ok(['中国', '国际'].includes(companyCase.market), `${scenario.id}.${companyCase.company}.market`);
      assert.ok(sourceIds.has(companyCase.sourceId), `${scenario.id} references ${companyCase.sourceId}`);
    }
  }
  const chinaCases = hr.scenarios.flatMap((scenario) => scenario.companyCases).filter((item) => item.market === '中国');
  assert.ok(new Set(chinaCases.map((item) => item.company)).size >= 2, 'hr needs at least two Chinese companies');
});

test('hr radar records exact publication dates for the core research sources', async () => {
  const hr = await loadRadarFile(`${radarRoot}/data/hr.js`);
  assert.equal(hr.updatedAt, '2026-08-26');
  assert.deepEqual(
    Object.fromEntries(hr.sources.filter((source) => /^hr-src-(0[1-9]|10)$/.test(source.id)).map((source) => [source.id, source.publishedAt])),
    {
      'hr-src-01': '2026-06-03',
      'hr-src-02': '2026-06-17',
      'hr-src-03': '2026-02-23',
      'hr-src-04': '2026-03-05',
      'hr-src-05': '2026-05-12',
      'hr-src-06': '2026-05-18',
      'hr-src-07': '2026-04-22',
      'hr-src-08': '2026-07-27',
      'hr-src-09': '2026-07-08',
      'hr-src-10': '2026-06-17',
    },
  );
  assert.equal(hr.sources.find((source) => source.id === 'hr-src-01')?.title, 'AI at Work: Strategy Matters More Than Tools');
});

test('hr compliance and relations additions preserve official and method-source provenance', async () => {
  const hr = await loadRadarFile(`${radarRoot}/data/hr.js`);
  const expectedSources = [
    ['hr-src-16', '用人单位职工申报年度缴费工资', '国家税务总局浙江省税务局', 'https://zhejiang.chinatax.gov.cn/art/2025/10/31/art_26351_644153.html', '政府办事指南', '2025-10-31', '仅适用浙江省用人单位年度缴费工资申报；不支持 AI 成效、准确率或自动申报结论。'],
    ['hr-src-17', '2025住房公积金年度缴存基数申报常见问题解答', '北京住房公积金管理中心', 'https://gjj.beijing.gov.cn/web/zwfw5/1747335/1747336/743669918/', '政府办事指南', '2025-06-20', '仅适用北京 2025–2026 住房公积金年度；不可外推到其他地区，不支持 AI 自动提交。'],
    ['hr-src-18', 'Making a formal offer — Settlement agreements', 'Acas', 'https://www.acas.org.uk/settlement-agreements/making-a-formal-offer', '专业机构指引', '2026-03-25', '仅适用英国和解协议语境，不能作为中国劳动协议效力依据；未提供 AI 起草准确率。'],
    ['hr-src-19', '白云区劳动人事争议仲裁申请材料清单', '广州市白云区人力资源和社会保障局', 'https://www.by.gov.cn/gzjg/qrlzyhshbzj/zcgg/cjgg/content/post_10451075.html', '政府仲裁材料指南', '2025-09-17', '仅为广州市白云区地方立案材料要求，不是全国统一规则；不支持 AI 作出证据可采性判断。'],
    ['hr-src-20', 'How CoCounsel Legal gives litigators back 6 weeks a year', 'Thomson Reuters', 'https://legal.thomsonreuters.com/blog/how-cocounsel-legal-gives-litigators-back-6-weeks-a-year/', '供应商产品方法说明', '2026-05-05', '供应商自述，只支持诉讼材料时间线和文档分析工作流；非劳动争议证据，也无独立准确率，不引用其效率数字。'],
  ];
  assert.deepEqual(
    hr.sources.filter((source) => expectedSources.some(([id]) => id === source.id)).map((source) => [source.id, source.title, source.publisher, source.url, source.evidenceType, source.publishedAt, source.limitation]),
    expectedSources,
  );

  const sourceById = new Map(hr.sources.map((source) => [source.id, source]));
  for (const scenario of hr.scenarios.slice(12)) {
    assert.ok(
      scenario.sourceFacts.some((fact) => {
        const source = sourceById.get(fact.sourceId);
        return fact.sourceId !== 'hr-src-11' && !/(客户案例|公司案例)/.test(source?.evidenceType ?? '') && fact.locator?.trim();
      }),
      `${scenario.id} needs a locatable non-WorkBuddy method or official source`,
    );
  }
});

test('legal radar preserves the attachment scenarios, scores, and sources', async () => {
  const legal = await loadRadarFile(`${radarRoot}/data/legal.js`);
  const expectedScenarios = [
    ['用 AI 审查标准合同、生成条款并标出偏离', 'P0', 5, 5],
    ['用 AI 回答法务常见问题并自动分流复杂请求', 'P0', 4.5, 5],
    ['用 AI 盘点存量合同并提醒续约与履约风险', 'P0', 5, 4],
    ['用 AI 查法规和案例并起草法律文件初稿', 'P1', 4, 4.5],
    ['用 AI 处理隐私请求并维护数据合规记录', 'P1', 4.5, 4],
    ['用 AI 审核外部律师账单并辅助选择律所', 'P1', 4, 4.5],
    ['用 AI 从海量材料中找出诉讼和调查关键证据', 'P2', 5, 3.5],
    ['用 AI 追踪法规变化并映射到内部控制', 'P2', 4.5, 3.5],
    ['用 AI 审阅并购材料并快速发现交易风险', 'P2', 4.5, 3.5],
    ['用 AI 管理专利商标组合、申请材料和期限', 'P2', 4, 3.5],
    ['用 AI 辅助诉讼策略和谈判，但不替律师判断', 'P3', 4, 3],
    ['让 AI 自主谈判或签合同（禁止）', 'P3', 4.5, 1.5],
  ];
  assert.deepEqual(legal.scenarios.map(({ title, priority, value, feasibility }) => [title, priority, value, feasibility]), expectedScenarios);
  assert.deepEqual(legal.sources.map((source) => source.url), [
    'https://www.luminance.com/customers/how-luminances-legal-grade-ai-is-transforming-trench-groups-contract-activity/',
    'https://www.icertis.com/customers/customer-stories/alpla-transforms-legal-operations-and-risk-management-with-icertis-generative-ai/',
    'https://ironcladapp.com/customers/signifyd-ai',
    'https://joseflegal.com/case-studies/how-bupas-legal-team-sparked-company-wide-innovation-with-self-service-tools/',
    'https://legal.thomsonreuters.com/en/insights/case-studies/turbocharging-legal-tasks-with-cocounsel-generative-ai',
    'https://mena.thomsonreuters.com/en/customer-stories/salik-cocounsel.html',
    'https://www.relativity.com/resources/customers/kroll-relativity-air-for-review/',
    'https://www.onetrust.com/customers/wipro/',
    'https://brightflag.com/resources/smbc-outside-counsel-management/',
    'https://www.persuit.com/customer-stories/customer-story-1',
    'https://www.anaqua.com/de/resource/microsoft-futureproofs-ip-management-with-anaqua/',
    'https://www.harvey.ai/customers/repsol',
    'https://help.aliyun.com/zh/model-studio/tongyi-farui/',
    'https://enablement.microsoft.com/en-gb/scenario-library/legal/',
    'https://www.bcg.com/publications/2026/ai-is-turning-m-and-a-into-a-high-impact-learning-machine',
    'https://www.litera.com/newslinks/litera-cvent-case-study',
    'https://www-file.huawei.com/admin/asset/v1/pro/view/289d675031044bf7adc1ca35f2225e03.pdf',
    'https://www.cctc.cn/xwzx/qydt/2025/104301.shtml',
  ]);
});

test('hr radar preserves the approved scenarios and high-impact decision boundary', async () => {
  const hr = await loadRadarFile(`${radarRoot}/data/hr.js`);
  assert.deepEqual(Object.keys(hr.categoryLabels), ['service', 'skills', 'lifecycle', 'planning', 'listening', 'payroll', 'compliance', 'relations', 'highrisk']);
  const expectedScenarios = [
    ['用 AI 即时回答 HR 政策问题，并把复杂个案转给对的人', 'P0', 5, 5],
    ['用 AI 看清员工技能，并匹配内部岗位和项目', 'P0', 5, 4],
    ['用 AI 为不同岗位定制学习路径和工作辅导', 'P0', 4.5, 4.5],
    ['用 AI 自动准备入职、调岗、离职和证明文件', 'P1', 4.5, 4.5],
    ['用 AI 起草职位、寻找候选人并辅助结构化面试', 'P1', 4.5, 3.5],
    ['用 AI 拆解岗位任务，预测人力和技能缺口', 'P1', 5, 3.5],
    ['用 AI 帮助经理重组团队工作并推动员工采用', 'P1', 4.5, 3.5],
    ['用 AI 读懂员工反馈，找出敬业度和体验问题', 'P2', 4, 3.5],
    ['用 AI 整理绩效证据并给出职业发展选项', 'P2', 4.5, 3],
    ['用 AI 预警团队流失和关键人才短缺', 'P2', 4, 3],
    ['用 AI 监测员工行为与情绪（高风险，默认不做）', 'P3', 3.5, 2],
    ['让 AI 决定录用、晋升、调薪或解雇（禁止）', 'P3', 4.5, 1],
  ];
  assert.deepEqual(hr.scenarios.slice(0, 12).map(({ title, priority, value, feasibility }) => [title, priority, value, feasibility]), expectedScenarios);
  assert.deepEqual(
    hr.scenarios.slice(0, 12).map(({ id, number, matrix, matrixRank, scorecard }) => [id, number, matrix, matrixRank, scorecard.total]),
    [
      ['hr-01', '01', { x: 90, y: 8 }, 1, 94],
      ['hr-02', '02', { x: 68, y: 8 }, 2, 87],
      ['hr-03', '03', { x: 82, y: 20 }, 3, 87],
      ['hr-04', '04', { x: 66, y: 32 }, 4, 78],
      ['hr-05', '05', { x: 58, y: 20 }, 5, 70],
      ['hr-06', '06', { x: 46, y: 8 }, 6, 72],
      ['hr-07', '07', { x: 88, y: 32 }, 7, 68],
      ['hr-08', '08', { x: 68, y: 44 }, 8, 64],
      ['hr-09', '09', { x: 44, y: 32 }, 9, 61],
      ['hr-10', '10', { x: 46, y: 44 }, 10, 58],
      ['hr-11', '11', { x: 24, y: 56 }, 11, 50],
      ['hr-12', '12', { x: 12, y: 26 }, 12, 55],
    ],
  );
  assert.match(hr.scenarios[11].risk, /禁止.*具名人员/);
  assert.equal(new Set(hr.scenarios.flatMap((item) => item.evidenceIds)).size >= 10, true);
});

test('hr radar preserves the ranked-library boundary scenarios and evidence guardrails', async () => {
  const hr = await loadRadarFile(`${radarRoot}/data/hr.js`);
  assert.deepEqual(
    hr.scenarios.slice(12).map(({
      id,
      title,
      category,
      shortTitle,
      priority,
      value,
      feasibility,
      scorecard,
      evidenceIds,
      companyCases,
    }) => ({
      id,
      title,
      category,
      shortTitle,
      priority,
      value,
      feasibility,
      dimensions: scorecard?.dimensions,
      total: scorecard?.total,
      evidenceIds,
      companyCaseSourceIds: companyCases.map(({ sourceId }) => sourceId),
    })),
    [
      {
        id: 'hr-13',
        title: '用 AI 清洗考勤数据并识别异常记录',
        category: 'payroll',
        shortTitle: '考勤清洗检查',
        priority: 'P1',
        value: 4.5,
        feasibility: 4.5,
        dimensions: { businessValue: 26, processFit: 18, readiness: 12, evidence: 8, riskControl: 13 },
        total: 77,
        evidenceIds: ['hr-src-11', 'hr-src-15', 'hr-case-13'],
        companyCaseSourceIds: ['hr-case-13'],
      },
      {
        id: 'hr-14',
        title: '用 AI 生成工资初算表和计算公式，但不执行发薪',
        category: 'payroll',
        shortTitle: '工资初算草稿',
        priority: 'P2',
        value: 4,
        feasibility: 3,
        dimensions: { businessValue: 25, processFit: 16, readiness: 10, evidence: 6, riskControl: 5 },
        total: 62,
        evidenceIds: ['hr-src-11', 'hr-src-15', 'hr-case-14'],
        companyCaseSourceIds: ['hr-case-14'],
      },
      {
        id: 'hr-15',
        title: '用 AI 复核薪资波动、缺项和计算异常',
        category: 'payroll',
        shortTitle: '薪资异常复核',
        priority: 'P1',
        value: 4.5,
        feasibility: 4,
        dimensions: { businessValue: 24, processFit: 18, readiness: 11, evidence: 9, riskControl: 11 },
        total: 73,
        evidenceIds: ['hr-src-11', 'hr-src-12'],
        companyCaseSourceIds: [],
      },
      {
        id: 'hr-16',
        title: '用 AI 回答社保公积金问题，并引用属地政策',
        category: 'compliance',
        shortTitle: '社保政策问答',
        priority: 'P1',
        value: 4,
        feasibility: 4,
        dimensions: { businessValue: 22, processFit: 17, readiness: 10, evidence: 8, riskControl: 12 },
        total: 69,
        evidenceIds: ['hr-src-11', 'hr-src-14', 'hr-case-13'],
        companyCaseSourceIds: ['hr-case-13'],
      },
      {
        id: 'hr-17',
        title: '用 AI 准备社保增减员、基数调整和申报清单',
        category: 'compliance',
        shortTitle: '社保申报清单',
        priority: 'P2',
        value: 4,
        feasibility: 3.5,
        dimensions: { businessValue: 20, processFit: 16, readiness: 10, evidence: 7, riskControl: 8 },
        total: 61,
        evidenceIds: ['hr-src-11', 'hr-case-13', 'hr-src-16', 'hr-src-17'],
        companyCaseSourceIds: ['hr-case-13'],
      },
      {
        id: 'hr-18',
        title: '用 AI 起草员工关系沟通方案和协议初稿',
        category: 'relations',
        shortTitle: '员工关系初稿',
        priority: 'P2',
        value: 3.5,
        feasibility: 3,
        dimensions: { businessValue: 18, processFit: 14, readiness: 9, evidence: 6, riskControl: 7 },
        total: 54,
        evidenceIds: ['hr-src-11', 'hr-case-12', 'hr-src-18'],
        companyCaseSourceIds: ['hr-case-12'],
      },
      {
        id: 'hr-19',
        title: '用 AI 整理劳动争议事实、证据和事件时间线',
        category: 'relations',
        shortTitle: '争议证据时间线',
        priority: 'P2',
        value: 4,
        feasibility: 3,
        dimensions: { businessValue: 20, processFit: 15, readiness: 9, evidence: 7, riskControl: 8 },
        total: 59,
        evidenceIds: ['hr-src-11', 'hr-case-12', 'hr-src-19', 'hr-src-20'],
        companyCaseSourceIds: ['hr-case-12'],
      },
      {
        id: 'hr-20',
        title: '用 AI 检查人事制度、表单版本、签字和到期风险',
        category: 'compliance',
        shortTitle: '人事文档风险',
        priority: 'P1',
        value: 4.5,
        feasibility: 4,
        dimensions: { businessValue: 23, processFit: 17, readiness: 11, evidence: 9, riskControl: 14 },
        total: 74,
        evidenceIds: ['hr-src-11', 'hr-src-13', 'hr-case-14'],
        companyCaseSourceIds: ['hr-case-14'],
      },
    ],
  );

  const source11 = hr.sources.find((source) => source.id === 'hr-src-11');
  assert.equal(source11?.url, 'https://mp.weixin.qq.com/s/-8a1_8-ifOsFP_JP-1RAuw');
  assert.equal(source11?.evidenceType, '个人实务流程示例');
  assert.equal(source11?.publishedAt, '2026-08-21');
  assert.match(source11?.limitation ?? '', /没有.*独立.*效果评估|未提供.*独立.*效果评估/);
  assert.match(source11?.limitation ?? '', /没有.*样本|未提供.*样本/);
  assert.match(source11?.limitation ?? '', /没有.*对照组|未提供.*对照组|没有.*控制组|未提供.*控制组/);
  assert.match(source11?.limitation ?? '', /没有.*审计.*指标|未提供.*审计.*指标/);

  assert.equal(
    hr.scenarios.flatMap((scenario) => scenario.companyCases).some((companyCase) => companyCase.sourceId === 'hr-src-11'),
    false,
  );
  const workBuddyPublisher = source11?.publisher;
  for (const scenario of hr.scenarios.filter((item) => item.priority === 'P0' && item.evidenceIds.includes('hr-src-11'))) {
    const nonWorkBuddyEvidenceIds = scenario.evidenceIds.filter((evidenceId) => evidenceId !== 'hr-src-11');
    assert.ok(nonWorkBuddyEvidenceIds.length >= 1, `${scenario.id} needs non-WorkBuddy evidence`);
    assert.ok(
      nonWorkBuddyEvidenceIds.some((evidenceId) => hr.sources.find((source) => source.id === evidenceId)?.publisher !== workBuddyPublisher),
      `${scenario.id} needs at least one non-WorkBuddy publisher`,
    );
  }
  assert.match(hr.scenarios.find((scenario) => scenario.id === 'hr-14')?.risk ?? '', /(不得|不能|禁止).*发薪/);
  assert.match(hr.scenarios.find((scenario) => scenario.id === 'hr-17')?.risk ?? '', /(不得|不能|禁止).*自动.*(提交|申报)/);
  assert.match(hr.scenarios.find((scenario) => scenario.id === 'hr-18')?.risk ?? '', /(?=.*(须|需|必须|应当))(?=.*(法务|律师))(?=.*(复核|审核))/);
  assert.match(hr.scenarios.find((scenario) => scenario.id === 'hr-18')?.risk ?? '', /具名 HR 与法务或律师共同复核/);

  const expectedLocators = [
    ['hr-13', 'hr-case-13', '一体共享，让数据多跑腿'],
    ['hr-16', 'hr-case-13', '一体共享，让数据多跑腿'],
    ['hr-17', 'hr-case-13', '一体共享，让数据多跑腿'],
    ['hr-15', 'hr-src-11', '第三个工作流：考勤+工资核算'],
    ['hr-17', 'hr-src-11', '第二个工作流：人员全生命周期管理；第四个工作流：社保公积金业务操作'],
    ['hr-18', 'hr-src-11', '第五个工作流：员工关系处理'],
    ['hr-19', 'hr-src-11', '第五个工作流：员工关系处理'],
    ['hr-17', 'hr-src-16', '七、申请条件；九、申请材料目录；十一、办理基本流程'],
    ['hr-17', 'hr-src-17', '三、由谁办理年度缴存基数申报；四、如何办理“年度缴存基数申报”；五、如何合并申报“五险一金”缴存基数'],
    ['hr-18', 'hr-src-18', 'Putting the agreement in writing; Getting independent advice'],
    ['hr-19', 'hr-src-19', '白云区劳动人事争议仲裁申请材料清单第 4–5 项；文书填写说明第 2 项'],
    ['hr-19', 'hr-src-20', 'Timeline creation drops from hours to minutes; Document review accelerates from days to under an hour'],
  ];
  for (const [scenarioId, sourceId, locator] of expectedLocators) {
    const scenario = hr.scenarios.find((item) => item.id === scenarioId);
    assert.equal(scenario?.sourceFacts.find((fact) => fact.sourceId === sourceId)?.locator, locator, `${scenarioId}.${sourceId}.locator`);
  }
});
