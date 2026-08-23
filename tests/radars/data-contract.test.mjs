import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRadarFile, validateRadarData } from '../../web/radars/validate-data.mjs';

const radarRoot = fileURLToPath(new URL('../../web/radars/', import.meta.url));

test('validator rejects an incomplete radar', () => {
  assert.throws(() => validateRadarData({ id: 'broken' }, { radarRoot }), /title/);
});

for (const domain of ['legal', 'hr']) {
  test(`${domain} radar satisfies the shared contract`, async () => {
    const data = await loadRadarFile(`${radarRoot}/data/${domain}.js`);
    const result = validateRadarData(data, { radarRoot });
    assert.deepEqual(result, { id: domain, scenarios: 12, p0: 3, pilots: 3 });
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
    assert.ok(new Set(chinaCases.map((item) => item.company)).size >= 2, `${domain} needs at least two Chinese companies`);
  });
}

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
  ]);
});

test('hr radar preserves the approved scenarios and high-impact decision boundary', async () => {
  const hr = await loadRadarFile(`${radarRoot}/data/hr.js`);
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
  assert.deepEqual(hr.scenarios.map(({ title, priority, value, feasibility }) => [title, priority, value, feasibility]), expectedScenarios);
  assert.match(hr.scenarios[11].risk, /禁止.*具名人员/);
  assert.equal(new Set(hr.scenarios.flatMap((item) => item.evidenceIds)).size >= 10, true);
});
