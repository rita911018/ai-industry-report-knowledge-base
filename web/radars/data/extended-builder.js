(() => {
  'use strict';

  const MATRIX_POSITIONS = [
    [88, 12], [68, 16], [82, 30], [58, 36], [42, 24], [28, 12],
    [48, 46], [38, 58], [25, 42], [18, 66], [10, 82], [8, 32],
  ];
  const SCORES = {
    P0: { businessValue: 26, processFit: 18, readiness: 13, evidence: 13, riskControl: 14 },
    P1: { businessValue: 23, processFit: 15, readiness: 11, evidence: 11, riskControl: 14 },
    P2: { businessValue: 19, processFit: 12, readiness: 9, evidence: 9, riskControl: 11 },
    P3: { businessValue: 22, processFit: 8, readiness: 6, evidence: 5, riskControl: 7 },
  };

  function scenarioPriority(index) {
    if (index < 3) return 'P0';
    if (index < 18) return 'P1';
    if (index < 23) return 'P2';
    return 'P3';
  }

  function confidence(priority, source) {
    if (priority === 'P0' && source.evidenceType !== '供应商观点') return { level: 'high', reason: '研究依据与企业公开实践相互补充，但收益仍需用本企业基线复验。' };
    if (priority === 'P3') return { level: 'middle', reason: '风险边界有明确治理依据，但不同司法辖区和业务情境仍需专项评估。' };
    return { level: 'middle', reason: '公开资料支持方向判断；具体效果多为企业或供应商自报，不能直接外推。' };
  }

  function buildScenario(config, scenario, index, sourceById) {
    const number = String(index + 1).padStart(2, '0');
    const priority = scenario.priority || scenarioPriority(index);
    const dimensions = SCORES[priority];
    const research = sourceById.get(scenario.researchId);
    const caseSource = sourceById.get(scenario.caseId);
    const secondaryResearch = sourceById.get(scenario.secondaryResearchId || config.defaultSecondaryResearchId);
    const evidenceIds = priority === 'P0'
      ? [...new Set([research.id, secondaryResearch.id, caseSource.id])]
      : [...new Set([research.id, caseSource.id])];
    const matrixRank = index < 12 ? index + 1 : null;
    const matrix = matrixRank ? MATRIX_POSITIONS[matrixRank - 1] : [12 + ((index * 17) % 76), 18 + ((index * 23) % 70)];
    const redLine = priority === 'P3';
    return {
      id: `${config.id}-${number}`,
      number,
      title: scenario.title,
      shortTitle: scenario.shortTitle,
      priority,
      category: scenario.category,
      risk: scenario.risk,
      problem: [
        `${scenario.focus}目前依赖人工经验和分散规则，响应慢且难以稳定复制。`,
        `${scenario.inputs}分散在不同系统、文档或团队，业务人员难以及时形成同一版本的判断。`,
        `高峰期、长尾任务和“${scenario.exception}”等例外会放大遗漏、返工与服务不一致。`,
      ],
      aiValue: [
        `在权限范围内连接${scenario.inputs}，形成可追溯的任务上下文。`,
        `持续识别与“${scenario.focus}”有关的模式、异常和待办，并说明触发原因。`,
        `生成“${scenario.output}”的建议草稿、备选方案及其业务影响，供负责人选择。`,
        `对低置信度、规则冲突和“${scenario.exception}”自动暂停，转交具名人员复核。`,
      ],
      value: priority === 'P0' ? 5 : priority === 'P1' ? 4.5 : priority === 'P2' ? 4 : 3.5,
      feasibility: priority === 'P0' ? 4.5 : priority === 'P1' ? 4 : priority === 'P2' ? 3.5 : 1.5,
      matrix: { x: matrix[0], y: matrix[1] },
      matrixEligible: !redLine,
      matrixRank,
      confidence: confidence(priority, research),
      humanHandoff: `当模型无法给出证据、触发“${scenario.exception}”或动作会影响客户、员工、供应商、现金或合规时，由${scenario.owner || '具名业务负责人'}审批后再执行。`,
      evidenceWindow: research.evidenceWindow || 'current',
      sourceFacts: [
        { sourceId: research.id, text: research.fact, locator: research.locator },
        { sourceId: caseSource.id, text: caseSource.fact, locator: caseSource.locator },
      ],
      acceptanceMetrics: [
        `${scenario.kpi}较试点前四周基线改善至少 10%，并披露样本量与异常值处理。`,
        `人工复核一次通过率达到 90%，所有修改均记录原因并可追溯到来源。`,
        `触发“${scenario.exception}”的任务 100% 转交具名负责人，未发生未经批准的自动动作。`,
      ],
      scorecard: {
        dimensions: { ...dimensions },
        total: Object.values(dimensions).reduce((sum, score) => sum + score, 0),
        rationale: `${scenario.focus}的业务影响和流程频率较明确；排序同时考虑数据就绪、证据强度与风险可控性。`,
        prerequisite: `确认${scenario.inputs}的数据责任人、合法用途、基线口径、人工复核人与回退流程。`,
        redLine,
      },
      evidenceIds,
      companyCases: [{
        company: caseSource.company,
        summary: caseSource.caseSummary,
        sourceId: caseSource.id,
        caseType: caseSource.caseType || '公司披露',
        caveat: caseSource.caveat,
        market: caseSource.market || '中国',
        measurementBasis: caseSource.measurementBasis || '企业或供应商公开披露，非独立增量实验。',
      }],
      ...(config.id === 'finance' ? { domainBoundary: 'corporate-finance' } : {}),
    };
  }

  window.buildExtendedRadar = function buildExtendedRadar(config) {
    const sourceById = new Map(config.sources.map((source) => [source.id, source]));
    const scenarios = config.scenarios.map((scenario, index) => buildScenario(config, scenario, index, sourceById));
    const p0 = scenarios.filter((scenario) => scenario.priority === 'P0');
    return {
      schemaVersion: '2.0',
      id: config.id,
      title: config.title,
      eyebrow: config.eyebrow,
      updatedAt: config.updatedAt,
      coreJudgment: config.coreJudgment,
      scenarioCount: scenarios.length,
      p0Count: p0.length,
      categoryLabels: config.categoryLabels,
      scenarios,
      pilots: p0.slice(0, 3).map((scenario, index) => ({
        id: `${config.id}-pilot-${index + 1}`,
        scenarioId: scenario.id,
        label: `优先启动 ${String(index + 1).padStart(2, '0')}`,
        title: scenario.title,
        scope: `选一个业务单元，用历史样本离线评测两周，再开展 8–12 周受控试点；只开放建议与草稿，不开放不可逆动作。`,
        acceptance: scenario.acceptanceMetrics.join(' '),
      })),
      sources: config.sources,
    };
  };
})();
