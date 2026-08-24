(() => {
  const sources = [
    { id: 'fixture-research-a', title: '研究证据 A', publisher: '研究机构 A', evidenceType: '行业研究', limitation: '仅用于验证数据结构。', url: 'https://example.com/research-a' },
    { id: 'fixture-research-b', title: '研究证据 B', publisher: '研究机构 B', evidenceType: '行业研究', limitation: '仅用于验证数据结构。', url: 'https://example.org/research-b' },
    { id: 'fixture-case-cn-a', title: '中国企业案例 A', publisher: '中国企业甲', evidenceType: '公司披露', limitation: '企业自述，需结合独立证据。', url: 'https://example.cn/case-a' },
    { id: 'fixture-case-cn-b', title: '中国企业案例 B', publisher: '中国企业乙', evidenceType: '公司披露', limitation: '企业自述，需结合独立证据。', url: 'https://example.cn/case-b' },
  ];

  const scenarios = Array.from({ length: 24 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const priority = index < 3 ? 'P0' : 'P1';
    const dimensions = priority === 'P0'
      ? { businessValue: 26, processFit: 18, readiness: 13, evidence: 13, riskControl: 14 }
      : { businessValue: 23, processFit: 15, readiness: 11, evidence: 11, riskControl: 10 };
    const caseSourceId = index % 2 === 0 ? 'fixture-case-cn-a' : 'fixture-case-cn-b';
    const company = index % 2 === 0 ? '中国企业甲' : '中国企业乙';
    return {
      id: `fixture-${number}`,
      number,
      title: `用 AI 解决第 ${number} 个可验证业务问题`,
      shortTitle: `验证场景${number}`,
      priority,
      category: '测试流程',
      risk: '必须由具名业务负责人复核关键输出，并保留审计记录。',
      problem: ['信息分散导致处理时间过长。', '重复劳动挤占高价值工作时间。', '缺少一致标准导致结果难以复核。'],
      aiValue: ['统一接入结构化与非结构化数据。', '自动生成带证据的建议草稿。', '识别异常并转交具名负责人。', '记录输入、输出和人工修改以便审计。'],
      value: priority === 'P0' ? 5 : 4,
      feasibility: priority === 'P0' ? 4.5 : 4,
      matrix: { x: 55 + (index % 6) * 6, y: 60 + (index % 5) * 6 },
      matrixEligible: index < 12,
      matrixRank: index < 12 ? index + 1 : null,
      confidence: { level: index < 3 ? 'high' : 'middle', reason: '存在研究证据和企业案例，但落地效果仍需在本组织验证。' },
      humanHandoff: '涉及例外、低置信度或高影响决策时，转交具名业务负责人审批。',
      evidenceWindow: 'current',
      sourceFacts: [
        { sourceId: 'fixture-research-a', text: '研究指出该流程适合以人机协同方式自动化。', locator: '第 2 节：流程机会' },
        { sourceId: 'fixture-research-b', text: '第二项研究提供独立的价值和风险证据。', locator: '图 3：价值与风险' },
      ],
      acceptanceMetrics: ['平均处理时间下降至少 20%。', '人工复核通过率达到 90%。', '高风险输出 100% 转交具名负责人。'],
      scorecard: {
        dimensions,
        total: Object.values(dimensions).reduce((sum, score) => sum + score, 0),
        rationale: '按统一五维标准评估价值、适配度、就绪度、证据和风险可控性。',
        prerequisite: '先完成数据权限、样本基线和人工复核责任人的确认。',
        redLine: false,
      },
      evidenceIds: ['fixture-research-a', 'fixture-research-b', caseSourceId],
      companyCases: [{
        company,
        summary: '企业已在相近流程中披露人机协同应用。',
        sourceId: caseSourceId,
        caseType: '公司披露',
        caveat: '披露未提供完整对照实验，不能直接外推收益。',
        market: '中国',
      }],
    };
  });

  window.OPPORTUNITY_RADAR_DATA = {
    schemaVersion: '2.0',
    id: 'fixture',
    title: '扩展雷达测试数据',
    eyebrow: 'EXTENDED RADAR FIXTURE',
    updatedAt: '2026-08-24',
    coreJudgment: '用于验证完整场景库、矩阵筛选和证据约束。',
    categoryLabels: { test: '测试流程' },
    scenarioCount: scenarios.length,
    p0Count: scenarios.filter((scenario) => scenario.priority === 'P0').length,
    scenarios,
    pilots: scenarios.slice(0, 3).map((scenario, index) => ({
      id: `fixture-pilot-${index + 1}`,
      scenarioId: scenario.id,
      label: `优先启动 ${index + 1}`,
      title: scenario.title,
      scope: '在一个受控团队内开展 8–12 周试点。',
      acceptance: '达到场景验收指标且未触发风险红线。',
    })),
    sources,
  };
})();
