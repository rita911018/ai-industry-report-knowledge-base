(() => {
  const deepFreeze = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
    return value;
  };

  const legalRadar = {
    id: 'legal',
    title: '企业法务 AI 机会雷达',
    eyebrow: 'LEGAL · DECISION RADAR',
    updatedAt: '2026-08-23',
    coreJudgment: '最佳切入点不是“替代律师”，而是把可验证、可逆、高频的工作先做成 AI 增强流程。',
    scenarioCount: 12,
    p0Count: 3,
    categoryLabels: {
      contract: '合同', service: '法务服务', compliance: '合规隐私', disputes: '诉讼调查', transaction: '交易与 IP', operations: '法务运营',
    },
    scenarios: [
      {
        id: 'legal-01', number: '01', title: '用 AI 审查标准合同、生成条款并标出偏离', priority: 'P0', category: 'contract', value: 5, feasibility: 5, matrix: { x: 91, y: 8 },
        problem: 'NDA、采购合同和 DPA 数量大，逐条审查慢、标准不一致，法务容易成为销售和采购流程的瓶颈。',
        aiValue: '识别条款并按法务 Playbook 做风险分级，生成替代条款和红线建议，把高风险内容升级人工。供应商案例显示，它能显著缩短首审时间并减少重复外部支出。',
        risk: '错误红线可能形成重大合同风险；案例成效多为供应商自报，不能直接当作本企业 ROI。法务负责人批准 Playbook，高风险条款、重大承诺和最终签署必须由具名律师确认。',
        evidenceIds: ['legal-src-01', 'legal-src-02', 'legal-src-03'],
        companyCases: [
          { company: 'Trench Group', summary: '用 Luminance 辅助合同审查和谈判，供应商案例称平均审查时间由约 150 分钟降至约 30 分钟。', sourceId: 'legal-src-01', caseType: '客户案例', caveat: '结果由供应商发布，未见独立审计。' },
          { company: 'ALPLA', summary: '用 Icertis 生成式 AI 改造合同和风险管理流程，案例称外部法律支出下降。', sourceId: 'legal-src-02', caseType: '客户案例', caveat: '费用结果依赖客户基线与合同组合。' },
          { company: 'Signifyd', summary: '在 Ironclad 合同流程中使用 AI 加快审查与协作。', sourceId: 'legal-src-03', caseType: '客户案例', caveat: '产品案例不能代表复杂战略合同的普遍效果。' },
        ],
      },
      {
        id: 'legal-02', number: '02', title: '用 AI 回答法务常见问题并自动分流复杂请求', priority: 'P0', category: 'service', value: 4.5, feasibility: 5, matrix: { x: 86, y: 18 },
        problem: '请求散落在邮件和即时通信里，重复问题多，业务找不到有效政策，法务也无法量化需求与周转。',
        aiValue: '用对话入口识别意图、检索已批准政策和 Playbook、自动创建事项，并把复杂或高风险请求转给合适的法务人员。',
        risk: '过期政策、权限穿透和无依据回答会把服务效率问题升级为合规问题。只允许引用已批准且生效的内容，并显示来源和版本。',
        evidenceIds: ['legal-src-04', 'legal-src-14'],
        companyCases: [
          { company: 'Bupa', summary: '建立法务自助入口、合同工具和政策问答，帮助业务先自助处理常见请求。', sourceId: 'legal-src-04', caseType: '客户案例', caveat: '节省时间为单一客户及供应商披露。' },
        ],
      },
      {
        id: 'legal-03', number: '03', title: '用 AI 盘点存量合同并提醒续约与履约风险', priority: 'P0', category: 'contract', value: 5, feasibility: 4, matrix: { x: 72, y: 11 },
        problem: '合同分散在不同系统，续约、责任上限、排他和违约金等义务难以盘点，容易造成到期遗漏和收入泄漏。',
        aiValue: '集中合同并抽取条款和元数据，支持语义搜索、续约提醒和风险看板，让团队能按主题快速盘点合同组合。',
        risk: '合同全集、版本唯一性或字段金标准不完整时，系统会遗漏义务并制造“已经盘清”的错觉。预警只能触发人工工作流，不能自动改变合同状态。',
        evidenceIds: ['legal-src-01', 'legal-src-02'],
        companyCases: [
          { company: 'ALPLA', summary: '在 Icertis 平台集中管理合同并用生成式 AI 支持合同风险识别。', sourceId: 'legal-src-02', caseType: '客户案例', caveat: '供应商案例未证明所有合同类型都能达到相同效果。' },
          { company: 'Trench Group', summary: '使用合同 AI 搜索和分析协议内容，支持更快识别风险与义务。', sourceId: 'legal-src-01', caseType: '客户案例', caveat: '结果来自供应商客户故事。' },
        ],
      },
      {
        id: 'legal-04', number: '04', title: '用 AI 查法规和案例并起草法律文件初稿', priority: 'P1', category: 'service', value: 4, feasibility: 4.5, matrix: { x: 81, y: 29 },
        problem: '法源检索耗时，跨法域研究困难，备忘录和法律文书重复起草，引用容易遗漏或失效。',
        aiValue: '在专业法律数据库中检索并定位引用，按模板生成研究摘要和文书初稿，让律师把时间集中在判断与复核。',
        risk: '幻觉、法域混淆、失效法条和遗漏引用可能造成貌似可信的错误意见。具名律师必须核对法源、适用法域和引用后才能发布。',
        evidenceIds: ['legal-src-05', 'legal-src-06', 'legal-src-12', 'legal-src-13'],
        companyCases: [
          { company: 'Century Communities', summary: '使用 CoCounsel 处理法律研究和起草类任务，案例报告部分任务时间明显缩短。', sourceId: 'legal-src-05', caseType: '客户案例', caveat: '任务速度不等于最终法律意见质量。' },
          { company: 'Salik', summary: '将 CoCounsel 用于法律研究、合同红线和治理审查。', sourceId: 'legal-src-06', caseType: '客户案例', caveat: '跨法域结论仍需当地律师复核。' },
          { company: 'Repsol', summary: '跨多个国家部署 Harvey，覆盖研究、起草、翻译和诉讼相关分析。', sourceId: 'legal-src-12', caseType: '客户案例', caveat: '部署范围不等于所有输出已经独立验证。' },
        ],
      },
      {
        id: 'legal-05', number: '05', title: '用 AI 处理隐私请求并维护数据合规记录', priority: 'P1', category: 'compliance', value: 4.5, feasibility: 4, matrix: { x: 68, y: 20 },
        problem: '数据主体请求需要跨系统找数、核验身份、删除或脱敏并完整留痕，还要满足法定时限。',
        aiValue: '把身份核验、数据发现、法律保留检查、脱敏和审计日志串成工作流，减少人工追踪和遗漏。',
        risk: '身份核验、法律保留或删除范围出错会造成隐私泄露、证据灭失或违规删除。隐私负责人必须批准检索、豁免、脱敏和删除规则。',
        evidenceIds: ['legal-src-08'],
        companyCases: [
          { company: 'Wipro', summary: '与 OneTrust 交付隐私请求自动化项目，供应商案例披露了周转时间和人工投入改善。', sourceId: 'legal-src-08', caseType: '客户案例', caveat: '结果来自供应商案例，且不能只归因于大模型。' },
        ],
      },
      {
        id: 'legal-06', number: '06', title: '用 AI 审核外部律师账单并辅助选择律所', priority: 'P1', category: 'operations', value: 4, feasibility: 4.5, matrix: { x: 76, y: 34 },
        problem: '账单逐行核对慢，收费规则执行不一致，律所报价难比较，预算和团队表现缺少透明度。',
        aiValue: '自动分类账单行、校验费率和计费指南、发现异常，并把 RFP 报价和历史表现放到同一比较视图。',
        risk: '费用异常不等于不当收费，历史数据还可能固化对律所的偏见。法务运营人员复核扣减、评价和最终律所选择。',
        evidenceIds: ['legal-src-09', 'legal-src-10'],
        companyCases: [
          { company: 'SMBC', summary: '用 Brightflag 管理外部律师支出并自动审核账单，案例披露了节省金额和人工小时。', sourceId: 'legal-src-09', caseType: '客户案例', caveat: '节省金额受原有费用规模和计费规则影响。' },
          { company: 'SAP', summary: '用 PERSUIT 规范法律服务采购和律所竞标比较。', sourceId: 'legal-src-10', caseType: '客户案例', caveat: '采购进度结果不保证其他组织复制。' },
        ],
      },
      {
        id: 'legal-07', number: '07', title: '用 AI 从海量材料中找出诉讼和调查关键证据', priority: 'P2', category: 'disputes', value: 5, feasibility: 3.5, matrix: { x: 58, y: 9 },
        problem: '邮件、聊天和附件量巨大，人工首轮审阅昂贵且期限紧，同时还要保持低漏检和程序可辩护性。',
        aiValue: '按相关性和议题分类材料，配合聚类、分层抽样、统计验证和律师质检，缩小需要人工深审的范围。',
        risk: '漏检、特权材料泄露、不可复现筛选和证据链断裂会破坏可辩护性。eDiscovery 专家负责抽样验证，承办律师对提交和结论负责。',
        evidenceIds: ['legal-src-07'],
        companyCases: [
          { company: 'Kroll', summary: '在约 8 万份文档的项目中使用 Relativity aiR 辅助首轮审阅，案例报告高召回率和人工量下降。', sourceId: 'legal-src-07', caseType: '客户案例', caveat: '召回率依赖具体案件、抽样和标注设计。' },
        ],
      },
      {
        id: 'legal-08', number: '08', title: '用 AI 追踪法规变化并映射到内部控制', priority: 'P2', category: 'compliance', value: 4.5, feasibility: 3.5, matrix: { x: 62, y: 23 },
        problem: '跨地区监管变化快，从新规到法人、政策、流程和控制项的影响映射高度依赖人工。',
        aiValue: '持续监测权威法规源、做差异摘要并生成影响清单，帮助专家更快判断适用范围和需要调整的控制。',
        risk: '发布日期、适用范围和实施细则变化会造成误报、漏报或错误映射。系统只做发现和初筛，合规专家批准最终适用性与控制变更。',
        evidenceIds: ['legal-src-06', 'legal-src-14'],
        companyCases: [],
      },
      {
        id: 'legal-09', number: '09', title: '用 AI 审阅并购材料并快速发现交易风险', priority: 'P2', category: 'transaction', value: 4.5, feasibility: 3.5, matrix: { x: 55, y: 27 },
        problem: '数据室文件多、尽调时间短，合同、知识产权、合规和收入风险分散在不同工作流中，关键问题容易遗漏。',
        aiValue: '批量抽取条款、聚类风险、关联跨文件信息并生成红旗清单，让交易律师更快聚焦高影响问题和整合事项。',
        risk: '不完整数据室、实体解析错误和权限穿透会遗漏风险或泄露敏感信息。交易律师定义范围、复核红旗并对交易建议负责。',
        evidenceIds: ['legal-src-15', 'legal-src-16'],
        companyCases: [
          { company: 'Cvent', summary: '在高时限收购中使用 Litera Kira 审阅 360 份合同，支持交易决策和整合规划。', sourceId: 'legal-src-16', caseType: '客户案例', caveat: '单次交易结果受文件规模、时限和团队能力影响。' },
        ],
      },
      {
        id: 'legal-10', number: '10', title: '用 AI 管理专利商标组合、申请材料和期限', priority: 'P2', category: 'transaction', value: 4, feasibility: 3.5, matrix: { x: 60, y: 39 },
        problem: '专利和商标资料分散，申请、续展、期限和费用管理繁重，行政工作挤压组合战略判断。',
        aiValue: '自动归类文档、监控期限、辅助检索和起草，并用组合分析帮助专业人员决定申请、续展或放弃。',
        risk: '期限、权属、近似检索或分类错误可能直接造成权利损失。IP 专业人员必须批准申请、续展、放弃和组合价值判断。',
        evidenceIds: ['legal-src-11'],
        companyCases: [
          { company: 'Microsoft', summary: '用 Anaqua 管理知识产权流程，供应商案例称部分流程效率提升。', sourceId: 'legal-src-11', caseType: '客户案例', caveat: '流程效率不代表权利质量或组合价值。' },
        ],
      },
      {
        id: 'legal-11', number: '11', title: '用 AI 辅助诉讼策略和谈判，但不替律师判断', priority: 'P3', category: 'disputes', value: 4, feasibility: 3, matrix: { x: 48, y: 31 },
        problem: '法官、法院、对手方和历史案件规律难以整理，策略压力测试和相似案件研究耗时。',
        aiValue: '检索相似案件、整理数据模式、模拟反方论点并提示盲点，为承办律师提供更多情景而不是给出确定预测。',
        risk: '历史数据偏差和小样本会把相关性包装成确定性，诱导错误诉讼或和解策略。承办律师必须结合事实、法域和客户目标作最终判断。',
        evidenceIds: ['legal-src-12'],
        companyCases: [
          { company: 'Repsol', summary: '把 Harvey 用于包括诉讼情景分析在内的法律工作，但仍由内部法务作专业判断。', sourceId: 'legal-src-12', caseType: '客户案例', caveat: '部署范围不等于诉讼结果预测准确率。' },
        ],
      },
      {
        id: 'legal-12', number: '12', title: '让 AI 自主谈判或签合同（禁止）', priority: 'P3', category: 'transaction', value: 4.5, feasibility: 1.5, matrix: { x: 20, y: 19 },
        problem: '看似能减少谈判往返和加快签约，但一个错误就可能直接形成价格、责任、赔偿或终止等不可逆承诺。',
        aiValue: '可以准备谈判方案、比较条款和生成草案，但不应代替企业接受条件、作出授权承诺或完成签署。',
        risk: '禁止 AI 自主接受条款或签署。所有价格、责任、赔偿、终止和签署必须由具名授权人员确认；模型升级还可能悄然改变谈判行为。',
        evidenceIds: ['legal-src-14'],
        companyCases: [],
      },
    ],
    pilots: [
      { id: 'legal-pilot-a', label: '优先启动 01 · 合同', title: '标准合同首审', scope: '从 NDA 和一类高频采购或营销合同开始，按已批准 Playbook 生成红线和替代条款。', acceptance: '关键风险召回率、误报率、首次通过率、每份合同人工复核分钟数。' },
      { id: 'legal-pilot-b', label: '优先启动 02 · 服务', title: '法务问答与分流', scope: '先覆盖 30–50 个高频问题；答案必须显示来源、版本和生效日期，复杂请求转人工。', acceptance: '答案有据率、正确率、转人工率、重复问询下降和业务满意度。' },
      { id: 'legal-pilot-c', label: '优先启动 03 · 数据', title: '存量合同风险盘点', scope: '选择一个法人或合同族，抽取续约、责任、赔偿、排他、数据处理和控制权变更。', acceptance: '字段准确率、条款召回率、发现的风险或收入机会、盘点工时下降。' },
    ],
    sources: [
      { id: 'legal-src-01', title: 'Luminance · Trench Group', publisher: 'Luminance', url: 'https://www.luminance.com/customers/how-luminances-legal-grade-ai-is-transforming-trench-groups-contract-activity/', evidenceType: '供应商客户案例', limitation: '结果由供应商发布，未见独立审计。' },
      { id: 'legal-src-02', title: 'Icertis · ALPLA', publisher: 'Icertis', url: 'https://www.icertis.com/customers/customer-stories/alpla-transforms-legal-operations-and-risk-management-with-icertis-generative-ai/', evidenceType: '供应商客户案例', limitation: '费用结果依赖客户基线与合同组合。' },
      { id: 'legal-src-03', title: 'Ironclad · Signifyd', publisher: 'Ironclad', url: 'https://ironcladapp.com/customers/signifyd-ai', evidenceType: '供应商客户案例', limitation: '产品案例不能代表复杂合同的普遍效果。' },
      { id: 'legal-src-04', title: 'Josef · Bupa', publisher: 'Josef', url: 'https://joseflegal.com/case-studies/how-bupas-legal-team-sparked-company-wide-innovation-with-self-service-tools/', evidenceType: '供应商客户案例', limitation: '节省时间为单一客户自报。' },
      { id: 'legal-src-05', title: 'Thomson Reuters · Century Communities', publisher: 'Thomson Reuters', url: 'https://legal.thomsonreuters.com/en/insights/case-studies/turbocharging-legal-tasks-with-cocounsel-generative-ai', evidenceType: '供应商客户案例', limitation: '任务级速度不等于最终法律意见质量。' },
      { id: 'legal-src-06', title: 'Thomson Reuters · Salik', publisher: 'Thomson Reuters', url: 'https://mena.thomsonreuters.com/en/customer-stories/salik-cocounsel.html', evidenceType: '供应商客户案例', limitation: '跨法域结论仍须当地律师复核。' },
      { id: 'legal-src-07', title: 'Relativity · Kroll', publisher: 'Relativity', url: 'https://www.relativity.com/resources/customers/kroll-relativity-air-for-review/', evidenceType: '供应商客户案例', limitation: '召回率依赖该案件语料、抽样和标注设计。' },
      { id: 'legal-src-08', title: 'OneTrust · Wipro / Retail', publisher: 'OneTrust', url: 'https://www.onetrust.com/customers/wipro/', evidenceType: '供应商客户案例', limitation: '工作流成效不能归因于大模型单一因素。' },
      { id: 'legal-src-09', title: 'Brightflag · SMBC', publisher: 'Brightflag', url: 'https://brightflag.com/resources/smbc-outside-counsel-management/', evidenceType: '供应商客户案例', limitation: '节省金额受费用规模与计费规则影响。' },
      { id: 'legal-src-10', title: 'PERSUIT · SAP', publisher: 'PERSUIT', url: 'https://www.persuit.com/customer-stories/customer-story-1', evidenceType: '供应商客户案例', limitation: '采购进度结果不保证其他组织复制。' },
      { id: 'legal-src-11', title: 'Anaqua · Microsoft IP', publisher: 'Anaqua', url: 'https://www.anaqua.com/de/resource/microsoft-futureproofs-ip-management-with-anaqua/', evidenceType: '供应商客户案例', limitation: '流程效率不代表权利质量或组合价值。' },
      { id: 'legal-src-12', title: 'Harvey · Repsol', publisher: 'Harvey', url: 'https://www.harvey.ai/customers/repsol', evidenceType: '供应商客户案例', limitation: '部署范围与使用方向不等于诉讼预测准确率。' },
      { id: 'legal-src-13', title: '阿里云 · 通义法睿', publisher: '阿里云', url: 'https://help.aliyun.com/zh/model-studio/tongyi-farui/', evidenceType: '产品文档', limitation: '能力说明不是客户成效或独立准确率评测。' },
      { id: 'legal-src-14', title: 'Microsoft · Legal Copilot Scenarios', publisher: 'Microsoft', url: 'https://enablement.microsoft.com/en-gb/scenario-library/legal/', evidenceType: '场景指南', limitation: '建议场景需要本地政策、权限和评测验证。' },
      { id: 'legal-src-15', title: 'BCG · AI in M&A', publisher: 'BCG', url: 'https://www.bcg.com/publications/2026/ai-is-turning-m-and-a-into-a-high-impact-learning-machine', evidenceType: '管理研究', limitation: '跨案例管理推演不是单一企业的审计结果。' },
      { id: 'legal-src-16', title: 'Litera · Cvent Due Diligence', publisher: 'Litera', url: 'https://www.litera.com/newslinks/litera-cvent-case-study', evidenceType: '供应商客户案例', limitation: '单次交易案例受文件规模、时限和团队能力影响。' },
    ],
  };

  window.OPPORTUNITY_RADAR_DATA = deepFreeze(legalRadar);
})();
