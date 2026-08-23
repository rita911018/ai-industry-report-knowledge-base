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
        id: 'legal-01', number: '01', title: '用 AI 审查标准合同、生成条款并标出偏离', priority: 'P0', category: 'contract', value: 5, feasibility: 5, matrix: { x: 90, y: 8 },
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
        id: 'legal-02', number: '02', title: '用 AI 回答法务常见问题并自动分流复杂请求', priority: 'P0', category: 'service', value: 4.5, feasibility: 5, matrix: { x: 80, y: 20 },
        problem: '请求散落在邮件和即时通信里，重复问题多，业务找不到有效政策，法务也无法量化需求与周转。',
        aiValue: '用对话入口识别意图、检索已批准政策和 Playbook、自动创建事项，并把复杂或高风险请求转给合适的法务人员。',
        risk: '过期政策、权限穿透和无依据回答会把服务效率问题升级为合规问题。只允许引用已批准且生效的内容，并显示来源和版本。',
        evidenceIds: ['legal-src-04', 'legal-src-14'],
        companyCases: [
          { company: 'Bupa', summary: '建立法务自助入口、合同工具和政策问答，帮助业务先自助处理常见请求。', sourceId: 'legal-src-04', caseType: '客户案例', caveat: '节省时间为单一客户及供应商披露。' },
        ],
      },
      {
        id: 'legal-03', number: '03', title: '用 AI 盘点存量合同并提醒续约与履约风险', priority: 'P0', category: 'contract', value: 5, feasibility: 4, matrix: { x: 68, y: 8 },
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
        id: 'legal-04', number: '04', title: '用 AI 查法规和案例并起草法律文件初稿', priority: 'P1', category: 'service', value: 4, feasibility: 4.5, matrix: { x: 84, y: 32 },
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
        id: 'legal-05', number: '05', title: '用 AI 处理隐私请求并维护数据合规记录', priority: 'P1', category: 'compliance', value: 4.5, feasibility: 4, matrix: { x: 58, y: 20 },
        problem: '数据主体请求需要跨系统找数、核验身份、删除或脱敏并完整留痕，还要满足法定时限。',
        aiValue: '把身份核验、数据发现、法律保留检查、脱敏和审计日志串成工作流，减少人工追踪和遗漏。',
        risk: '身份核验、法律保留或删除范围出错会造成隐私泄露、证据灭失或违规删除。隐私负责人必须批准检索、豁免、脱敏和删除规则。',
        evidenceIds: ['legal-src-08'],
        companyCases: [
          { company: 'Wipro', summary: '与 OneTrust 交付隐私请求自动化项目，供应商案例披露了周转时间和人工投入改善。', sourceId: 'legal-src-08', caseType: '客户案例', caveat: '结果来自供应商案例，且不能只归因于大模型。' },
        ],
      },
      {
        id: 'legal-06', number: '06', title: '用 AI 审核外部律师账单并辅助选择律所', priority: 'P1', category: 'operations', value: 4, feasibility: 4.5, matrix: { x: 90, y: 44 },
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
        id: 'legal-07', number: '07', title: '用 AI 从海量材料中找出诉讼和调查关键证据', priority: 'P2', category: 'disputes', value: 5, feasibility: 3.5, matrix: { x: 46, y: 8 },
        problem: '邮件、聊天和附件量巨大，人工首轮审阅昂贵且期限紧，同时还要保持低漏检和程序可辩护性。',
        aiValue: '按相关性和议题分类材料，配合聚类、分层抽样、统计验证和律师质检，缩小需要人工深审的范围。',
        risk: '漏检、特权材料泄露、不可复现筛选和证据链断裂会破坏可辩护性。eDiscovery 专家负责抽样验证，承办律师对提交和结论负责。',
        evidenceIds: ['legal-src-07'],
        companyCases: [
          { company: 'Kroll', summary: '在约 8 万份文档的项目中使用 Relativity aiR 辅助首轮审阅，案例报告高召回率和人工量下降。', sourceId: 'legal-src-07', caseType: '客户案例', caveat: '召回率依赖具体案件、抽样和标注设计。' },
        ],
      },
      {
        id: 'legal-08', number: '08', title: '用 AI 追踪法规变化并映射到内部控制', priority: 'P2', category: 'compliance', value: 4.5, feasibility: 3.5, matrix: { x: 68, y: 44 },
        problem: '跨地区监管变化快，从新规到法人、政策、流程和控制项的影响映射高度依赖人工。',
        aiValue: '持续监测权威法规源、做差异摘要并生成影响清单，帮助专家更快判断适用范围和需要调整的控制。',
        risk: '发布日期、适用范围和实施细则变化会造成误报、漏报或错误映射。系统只做发现和初筛，合规专家批准最终适用性与控制变更。',
        evidenceIds: ['legal-src-06', 'legal-src-14'],
        companyCases: [],
      },
      {
        id: 'legal-09', number: '09', title: '用 AI 审阅并购材料并快速发现交易风险', priority: 'P2', category: 'transaction', value: 4.5, feasibility: 3.5, matrix: { x: 60, y: 32 },
        problem: '数据室文件多、尽调时间短，合同、知识产权、合规和收入风险分散在不同工作流中，关键问题容易遗漏。',
        aiValue: '批量抽取条款、聚类风险、关联跨文件信息并生成红旗清单，让交易律师更快聚焦高影响问题和整合事项。',
        risk: '不完整数据室、实体解析错误和权限穿透会遗漏风险或泄露敏感信息。交易律师定义范围、复核红旗并对交易建议负责。',
        evidenceIds: ['legal-src-15', 'legal-src-16'],
        companyCases: [
          { company: 'Cvent', summary: '在高时限收购中使用 Litera Kira 审阅 360 份合同，支持交易决策和整合规划。', sourceId: 'legal-src-16', caseType: '客户案例', caveat: '单次交易结果受文件规模、时限和团队能力影响。' },
        ],
      },
      {
        id: 'legal-10', number: '10', title: '用 AI 管理专利商标组合、申请材料和期限', priority: 'P2', category: 'transaction', value: 4, feasibility: 3.5, matrix: { x: 46, y: 44 },
        problem: '专利和商标资料分散，申请、续展、期限和费用管理繁重，行政工作挤压组合战略判断。',
        aiValue: '自动归类文档、监控期限、辅助检索和起草，并用组合分析帮助专业人员决定申请、续展或放弃。',
        risk: '期限、权属、近似检索或分类错误可能直接造成权利损失。IP 专业人员必须批准申请、续展、放弃和组合价值判断。',
        evidenceIds: ['legal-src-11'],
        companyCases: [
          { company: 'Microsoft', summary: '用 Anaqua 管理知识产权流程，供应商案例称部分流程效率提升。', sourceId: 'legal-src-11', caseType: '客户案例', caveat: '流程效率不代表权利质量或组合价值。' },
        ],
      },
      {
        id: 'legal-11', number: '11', title: '用 AI 辅助诉讼策略和谈判，但不替律师判断', priority: 'P3', category: 'disputes', value: 4, feasibility: 3, matrix: { x: 38, y: 32 },
        problem: '法官、法院、对手方和历史案件规律难以整理，策略压力测试和相似案件研究耗时。',
        aiValue: '检索相似案件、整理数据模式、模拟反方论点并提示盲点，为承办律师提供更多情景而不是给出确定预测。',
        risk: '历史数据偏差和小样本会把相关性包装成确定性，诱导错误诉讼或和解策略。承办律师必须结合事实、法域和客户目标作最终判断。',
        evidenceIds: ['legal-src-12'],
        companyCases: [
          { company: 'Repsol', summary: '把 Harvey 用于包括诉讼情景分析在内的法律工作，但仍由内部法务作专业判断。', sourceId: 'legal-src-12', caseType: '客户案例', caveat: '部署范围不等于诉讼结果预测准确率。' },
        ],
      },
      {
        id: 'legal-12', number: '12', title: '让 AI 自主谈判或签合同（禁止）', priority: 'P3', category: 'transaction', value: 4.5, feasibility: 1.5, matrix: { x: 12, y: 20 },
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

  const scenarioEnhancements = {
    'legal-01': {
      shortTitle: '标准合同首审',
      problem: [
        'NDA、采购、营销和数据处理协议数量大，法务需要重复核对同一批风险点。',
        '业务提交格式、合同版本和谈判立场不一致，首审排队会拖慢销售、采购与项目启动。',
        '人工审查受经验和时间压力影响，容易漏掉责任上限、赔偿、知识产权或数据条款的偏离。',
      ],
      aiValue: [
        '读取获授权的合同正文、已批准模板、条款库和法务 Playbook，不接入无权限历史文件。',
        '逐条识别条款、比较标准立场、标出缺失与偏离，并按规则生成风险等级和替代文本。',
        '输出带原文锚点的风险清单、红线稿和待确认问题，方便法务逐项复核而不是重新通读。',
        '高风险、非标承诺和最终签署转交具名律师；用关键风险召回率、误报率、人工复核分钟数和首次通过率验收。',
      ],
      scorecard: { dimensions: { businessValue: 29, processFit: 19, readiness: 14, evidence: 14, riskControl: 18 }, total: 94, rationale: '高频、规则明确、输出可逐条复核，且已有多类企业实践。', prerequisite: '限定合同类型、版本化 Playbook、权限边界和具名签署责任。', redLine: false },
      extraEvidenceIds: ['legal-cn-01', 'legal-cn-02'],
      companyCases: [
        { company: '中国建设科技集团', summary: '集团将 DeepSeek 本地化用于合同审核，自动识别主体、金额和条款风险并生成结构化意见，仍采用“法务＋AI”双轮审查。', sourceId: 'legal-cn-02', caseType: '公司披露', caveat: '效率与成功率由集团自身披露，尚无独立审计，且依赖其模板、标注和系统集成。', market: '中国' },
        { company: '华为', summary: '华为公开材料称面向全球业务把万级合同的“写、读、审”环节智能化，作为内部多场景 AI 实践之一。', sourceId: 'legal-cn-01', caseType: '公司披露', caveat: '公开材料未给出合同审查准确率、人工复核比例或独立成效评估。', market: '中国' },
      ],
    },
    'legal-02': {
      shortTitle: '法务政策问答',
      problem: [
        '业务人员不知道应查哪份制度或找哪位法务，重复问题散落在邮件和聊天工具中。',
        '简单问题与高风险个案进入同一队列，法务无法按风险分流，也难统计真实需求。',
        '过期口径或不同人员的答复不一致，会形成错误行动、重复沟通和合规暴露。',
      ],
      aiValue: [
        '只检索已批准、标注生效日期和适用范围的政策、Playbook、模板与常见问答。',
        '识别用户意图和法人、地区、合同类型等关键条件，追问缺失信息并匹配处理路径。',
        '生成带来源、版本和原文链接的答复，同时自动创建事项并保留问答审计记录。',
        '复杂、敏感或低置信度请求转给对应法务；用答案有据率、转人工准确率、首次解决率和处理时长验收。',
      ],
      scorecard: { dimensions: { businessValue: 27, processFit: 19, readiness: 13, evidence: 12, riskControl: 18 }, total: 89, rationale: '高频重复请求适合检索增强，来源与转人工机制使结果可验证。', prerequisite: '建立生效政策目录、内容负责人、更新 SLA 和事项分流规则。', redLine: false },
    },
    'legal-03': {
      shortTitle: '存量合同盘点',
      problem: [
        '历史合同分散在共享盘、邮箱和多个系统，版本、签署状态和合同主体难以确认。',
        '续约、价格调整、责任上限、控制权变更和数据义务依靠人工台账，容易漏期或录错。',
        '管理层无法快速回答某类风险、义务或收入机会分布在哪些合同和法人中。',
      ],
      aiValue: [
        '读取经确认的合同全集、签署版本和字段金标准，先做去重、版本识别与权限校验。',
        '抽取合同主体、日期、金额、续约和重点条款，并以语义搜索聚合相似义务与偏离。',
        '输出可回链原文的合同台账、到期提醒、异常清单和组合风险看板。',
        '字段置信度不足或触发高风险规则时交法务复核；用字段准确率、条款召回率、漏期数和盘点工时验收。',
      ],
      scorecard: { dimensions: { businessValue: 29, processFit: 18, readiness: 12, evidence: 13, riskControl: 17 }, total: 89, rationale: '组合可见性价值高，抽取结果可抽样核验并直接触发人工工作流。', prerequisite: '先确认合同全集、唯一签署版本、字段定义和续约责任人。', redLine: false },
    },
    'legal-04': {
      shortTitle: '法律检索与起草',
      problem: [
        '跨法域法规、案例和监管材料分散，律师花大量时间定位权威且仍有效的法源。',
        '备忘录、函件和文书存在重复结构，但引用、事实和法域差异使人工起草仍然缓慢。',
        '遗漏引用、使用失效法条或把不同法域规则混用，会让看似完整的文件产生实质错误。',
      ],
      aiValue: [
        '在获授权的专业法律数据库、内部范本和案件材料中检索，不以开放网络摘要替代法源。',
        '围绕明确问题生成检索式、整理正反观点、核对引用状态并按模板起草结构化初稿。',
        '输出每项结论对应的法源链接、引用段落、适用法域和待核事实清单。',
        '具名律师逐条核验法源、事实和结论后发布；用有效引用率、漏引率、复核修改量和研究周期验收。',
      ],
      scorecard: { dimensions: { businessValue: 25, processFit: 17, readiness: 12, evidence: 12, riskControl: 12 }, total: 78, rationale: '研究与初稿提效明确，但幻觉和法域混淆要求高强度律师复核。', prerequisite: '接入权威法源、保存检索轨迹，并限定为研究和初稿辅助。', redLine: false },
    },
    'legal-05': {
      shortTitle: '隐私请求处理',
      problem: [
        '数据主体请求跨 CRM、HR、客服和文件系统，身份核验、查找、豁免判断与回复由多人串联。',
        '法定时限、法律保留和删除范围并行，手工跟踪容易漏系统、漏记录或超时。',
        '错误披露或错误删除会造成隐私泄露、证据灭失、监管处罚和客户信任损害。',
      ],
      aiValue: [
        '读取已核验身份、请求范围、数据目录、保留规则和各系统授权接口。',
        '拆解请求、定位候选记录、识别重复与敏感内容，并按规则标记可能的豁免和法律保留。',
        '输出数据清单、脱敏建议、系统完成状态、回复草稿和完整审计日志。',
        '隐私负责人批准检索范围、豁免、披露和删除；用按时完成率、漏检率、误披露数和人工触点验收。',
      ],
      scorecard: { dimensions: { businessValue: 25, processFit: 16, readiness: 11, evidence: 10, riskControl: 13 }, total: 75, rationale: '工作流可拆解且可留痕，但身份、保留和删除错误的后果较高。', prerequisite: '完成数据地图、身份核验规则、法律保留接口和删除审批链。', redLine: false },
    },
    'legal-06': {
      shortTitle: '律所账单审核',
      problem: [
        '外部律师账单行数多、描述不统一，法务运营需要逐行比对费率、预算和计费指南。',
        'RFP 报价、历史表现和事项结果分散，律所选择容易依赖印象而非可比证据。',
        '漏审会造成费用失控，机械扣减又可能伤害合作关系或把复杂工作误判为异常。',
      ],
      aiValue: [
        '读取获授权的账单、费率卡、计费指南、事项预算、RFP 和历史表现数据。',
        '分类账单行、检查费率与规则、发现重复或异常，并把报价按统一口径比较。',
        '输出带依据的异常清单、预算偏差、律所比较表和需补充说明的问题。',
        '法务运营复核扣减与评分，业务负责人批准最终选择；用异常确认率、复核时长、预算偏差和申诉率验收。',
      ],
      scorecard: { dimensions: { businessValue: 22, processFit: 18, readiness: 12, evidence: 13, riskControl: 13 }, total: 78, rationale: '结构化规则和账单数据成熟，异常可以人工确认，实施风险相对可控。', prerequisite: '统一费率卡、计费指南、事项编码和律所绩效口径。', redLine: false },
    },
    'legal-07': {
      shortTitle: '诉讼证据发现',
      problem: [
        '诉讼和调查材料可达数万至数百万份，人工首轮审阅成本高且期限刚性。',
        '相关性、议题、特权和个人信息判断需要一致编码，否则会漏交、误交或重复审阅。',
        '筛选过程若不可复现、抽样不足或证据链断裂，会影响程序可辩护性和案件策略。',
      ],
      aiValue: [
        '在法律保全和访问控制下读取已收集材料、编码手册、种子文档和律师标注样本。',
        '按相关性、议题和特权风险分类，做聚类、近重复识别和优先级排序。',
        '输出可复现的审阅批次、命中文档、模型理由、抽样结果和质检记录。',
        'eDiscovery 专家设置抽样与停止条件，承办律师批准提交；用召回率、精确率、特权误交数和审阅工时验收。',
      ],
      scorecard: { dimensions: { businessValue: 28, processFit: 16, readiness: 8, evidence: 12, riskControl: 8 }, total: 72, rationale: '潜在价值很高且已有案例，但数据治理、统计验证和程序可辩护性要求高。', prerequisite: '先完成法律保全、编码协议、特权规则、分层抽样与可复现审计。', redLine: false },
    },
    'legal-08': {
      shortTitle: '法规变化追踪',
      problem: [
        '不同国家、监管机构和行业规则更新频繁，团队难持续判断哪些变化与本企业有关。',
        '从新规到法人、产品、政策、流程和控制项的映射依赖少数专家，更新链条长。',
        '误报会消耗资源，漏报或错误适用则可能造成逾期整改与监管暴露。',
      ],
      aiValue: [
        '监测指定权威来源、适用地区、业务标签和现有控制库，并保存发布日期与版本。',
        '比较新旧文本、提取义务与截止日期，初步匹配受影响法人、产品和控制项。',
        '输出带原文差异的影响清单、责任人建议、待确认问题和整改跟踪项。',
        '合规专家确认适用性和控制变更；用有效预警率、漏报率、确认时长和按期关闭率验收。',
      ],
      scorecard: { dimensions: { businessValue: 24, processFit: 15, readiness: 8, evidence: 9, riskControl: 9 }, total: 65, rationale: '持续监测价值明确，但适用性判断和控制映射高度依赖上下文。', prerequisite: '建立权威来源清单、业务适用标签、控制库和专家确认工作流。', redLine: false },
    },
    'legal-09': {
      shortTitle: '并购尽调审阅',
      problem: [
        '交易数据室文件量大、命名混乱且持续新增，尽调窗口却很短。',
        '合同、知识产权、争议、合规和收入风险分散在不同文档，跨文件关系难人工追踪。',
        '关键红旗遗漏会影响估值、交割条件、陈述保证和整合计划，错误泄露也可能破坏交易。',
      ],
      aiValue: [
        '只读取交易授权范围内的数据室、尽调清单、风险标准和已确认的实体列表。',
        '批量抽取关键条款、实体和期限，聚类异常并关联同一合同族或风险主题。',
        '输出可回链文件的红旗清单、缺件清单、问询草稿和交割后整合事项。',
        '交易律师复核红旗与建议，权限管理员控制访问；用重点条款召回率、误报率、缺件发现数和审阅周期验收。',
      ],
      scorecard: { dimensions: { businessValue: 27, processFit: 15, readiness: 8, evidence: 10, riskControl: 8 }, total: 68, rationale: '高价值但时限、权限和文件完整性使落地条件明显高于日常合同审查。', prerequisite: '限定交易范围、完成权限隔离、实体清单和人工红旗复核机制。', redLine: false },
    },
    'legal-10': {
      shortTitle: '知识产权管理',
      problem: [
        '专利、商标、发明披露和官方往来分散，期限、权属与费用管理需要大量行政工作。',
        '检索、分类和组合分析口径不一致，专业人员难把时间集中在保护范围与商业价值判断。',
        '期限、权属或近似检索错误可能造成权利丧失、申请失败或不必要支出。',
      ],
      aiValue: [
        '读取授权的 IP 档案、官方期限、发明披露、分类体系和组合策略。',
        '归类文档、抽取期限与主体、辅助近似检索，并按模板准备申请或答复初稿。',
        '输出期限看板、缺失文件、检索候选、组合费用与需决策事项。',
        'IP 专业人员批准申请、续展、放弃和价值判断；用期限漏失数、字段准确率、复核时长和组合成本验收。',
      ],
      scorecard: { dimensions: { businessValue: 22, processFit: 16, readiness: 10, evidence: 10, riskControl: 10 }, total: 68, rationale: '行政与检索环节适合增强，但权利处分不可逆，必须由专业人员控制。', prerequisite: '统一权属数据、官方期限源、检索标准和不可逆操作审批。', redLine: false },
    },
    'legal-11': {
      shortTitle: '诉讼策略辅助',
      problem: [
        '历史案件、法官、法院和对手方信息分散，承办律师需要在高压下快速形成多种策略。',
        '相似案件样本往往小且事实差异大，人工容易受可得性和近期经验影响。',
        '把相关性当成结果预测可能诱导错误诉讼、和解或报价决定，并难向客户解释。',
      ],
      aiValue: [
        '读取已授权案件材料、权威裁判文书、内部复盘和明确的客户目标。',
        '检索相似案件、整理差异、模拟反方论点并列出策略假设与证据缺口。',
        '输出情景树、反方观点、待核事实和来源清单，不输出确定胜率或自动和解金额。',
        '承办律师对策略和客户建议负责；仅用盲点发现率、来源有效率和复核价值评估，不以案件结果训练自动决定。',
      ],
      scorecard: { dimensions: { businessValue: 22, processFit: 11, readiness: 9, evidence: 10, riskControl: 12 }, total: 64, rationale: '可用于观点压力测试，但历史偏差和小样本不支持自主预测或策略决定。', prerequisite: '限制为研究与反方模拟，禁止自动胜率、和解或诉讼策略决定。', redLine: true },
    },
    'legal-12': {
      shortTitle: '自主谈判签署',
      problem: [
        '谈判往返耗时，业务可能希望让系统直接接受条款以加快签约。',
        '价格、责任、赔偿、终止和数据承诺相互影响，单项看似合理也可能形成组合风险。',
        '错误接受或签署会立即形成不可逆义务，并可能超越授权、违反治理或损害交易关系。',
      ],
      aiValue: [
        '在授权范围内读取谈判历史、已批准立场、备选条款和签署权限矩阵。',
        '比较版本、准备谈判选项、提示偏离和模拟对方可能回应，但不代表企业接受条件。',
        '输出候选措辞、差异清单、授权检查和必须由人确认的承诺项。',
        '具名授权人员逐项批准并完成签署；系统只能验收建议质量和偏离检出，不能以自动成交率为目标。',
      ],
      scorecard: { dimensions: { businessValue: 24, processFit: 10, readiness: 8, evidence: 4, riskControl: 7 }, total: 53, rationale: '速度价值无法抵消不可逆承诺、授权越界和模型行为漂移风险。', prerequisite: '只允许辅助比较和起草，技术上禁止模型接受条款或调用签署动作。', redLine: true },
    },
  };

  legalRadar.sources.push(
    { id: 'legal-cn-01', title: '华为 · 万级合同写、读、审智能化实践', publisher: '华为', url: 'https://www-file.huawei.com/admin/asset/v1/pro/view/289d675031044bf7adc1ca35f2225e03.pdf', evidenceType: '公司正式披露', limitation: '材料披露应用范围，未提供独立准确率或人工复核比例。' },
    { id: 'legal-cn-02', title: '中国建科 · AI 智能合同审核', publisher: '中国建设科技集团', url: 'https://www.cctc.cn/xwzx/qydt/2025/104301.shtml', evidenceType: '公司正式披露', limitation: '效率、审核量和成功率均为集团自报，未见独立审计。' },
  );

  legalRadar.scenarios = legalRadar.scenarios.map((scenario) => {
    const { companyCases = [], extraEvidenceIds = [], ...enhancement } = scenarioEnhancements[scenario.id];
    return {
      ...scenario,
      ...enhancement,
      evidenceIds: [...scenario.evidenceIds, ...extraEvidenceIds],
      companyCases: [...scenario.companyCases, ...companyCases].map((companyCase) => ({ market: '国际', ...companyCase })),
    };
  });

  window.OPPORTUNITY_RADAR_DATA = deepFreeze(legalRadar);
})();
