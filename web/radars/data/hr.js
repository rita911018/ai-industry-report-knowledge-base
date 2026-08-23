(() => {
  const deepFreeze = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
    return value;
  };

  const hrRadar = {
    id: 'hr',
    title: '人力资源 AI 机会雷达',
    eyebrow: 'PEOPLE · DECISION RADAR',
    updatedAt: '2026-08-23',
    coreJudgment: '优先增强员工服务、技能流动与学习闭环；越接近个人生计的决定，越不能把责任交给模型。',
    scenarioCount: 12,
    p0Count: 3,
    categoryLabels: {
      service: '员工服务', skills: '技能与学习', lifecycle: '人才全周期', planning: '组织规划', listening: '员工洞察', highrisk: '高风险决策',
    },
    scenarios: [
      {
        id: 'hr-01', number: '01', title: '用 AI 即时回答 HR 政策问题，并把复杂个案转给对的人', priority: 'P0', category: 'service', value: 5, feasibility: 5, matrix: { x: 91, y: 8 },
        problem: '政策问题和服务请求分散在邮件、即时通信和多个入口，回答口径不一致，复杂个案转交缓慢。',
        aiValue: '基于已批准政策回答高频问题，显示来源、版本和生效日期；识别请求类型、创建工单，并把敏感或例外个案转给具名 HR 负责人。',
        risk: '过期政策、权限错误或忽略地区和员工类型差异，会产生错误承诺。复杂个案不能被“高自助率”目标拦在人工服务之外。',
        evidenceIds: ['hr-src-07', 'hr-src-08', 'hr-case-01', 'hr-case-04'],
        companyCases: [
          { company: 'IBM', summary: 'AskHR 用生成式 AI 回答政策问题、按 HR 领域分流，并由人工顾问处理复杂需求。', sourceId: 'hr-case-01', caseType: '公司披露', caveat: 'IBM 是方案提供者也是内部使用者，成效为公司自报。' },
          { company: 'Robinhood', summary: '把 IT、HR 等员工服务统一到一个对话入口，以 AI 处理常规请求并路由工作流。', sourceId: 'hr-case-04', caseType: '客户案例', caveat: '结果由 ServiceNow 客户案例发布，70% 指所有员工请求而非 HR 单一口径。' },
        ],
      },
      {
        id: 'hr-02', number: '02', title: '用 AI 看清员工技能，并匹配内部岗位和项目', priority: 'P0', category: 'skills', value: 5, feasibility: 4, matrix: { x: 72, y: 10 },
        problem: '职位名称不能反映真实技能，员工能力和内部机会不可见，关键技能供需难以量化。',
        aiValue: '从岗位、项目和员工自述中提取技能，建立可校正的技能画像，解释为什么某人适合某个岗位、项目或导师机会。',
        risk: '不完整经历、代理变量和历史机会差异会形成错误画像并固化不公平。员工必须能查看和纠正画像，经理与 HR 复核匹配。',
        evidenceIds: ['hr-src-04', 'hr-src-05', 'hr-src-06', 'hr-case-02'],
        companyCases: [
          { company: 'Seagate', summary: '用 AI 驱动的内部人才市场 Career Discovery 匹配员工、岗位、短期项目和导师机会。', sourceId: 'hr-case-02', caseType: '客户案例', caveat: 'ROI 和参与率由供应商客户故事披露，需按本企业基线重算。' },
        ],
      },
      {
        id: 'hr-03', number: '03', title: '用 AI 为不同岗位定制学习路径和工作辅导', priority: 'P0', category: 'skills', value: 4.5, feasibility: 4.5, matrix: { x: 82, y: 19 },
        problem: '统一课程难对应岗位任务和能力缺口，员工会使用工具却不一定具备委派、判断和验证能力。',
        aiValue: '诊断岗位任务和学习需要，推荐微课程、练习和任务内辅导，跟踪技能迁移而不是只记录“课程完成”。',
        risk: '把使用频率当能力、把个性化建议直接用于绩效会扭曲学习行为并损害信任。员工与经理共同确认发展目标，学习数据不得自动决定晋升。',
        evidenceIds: ['hr-src-01', 'hr-src-02', 'hr-src-03', 'hr-case-03'],
        companyCases: [
          { company: 'IBM', summary: '在 Your Learning 平台中使用 Watson AI 生成个性化学习推荐。', sourceId: 'hr-case-03', caseType: '公司披露', caveat: '2020 年年报披露了使用方式和平均学习时数，但未证明 AI 单独造成学习成效。' },
        ],
      },
      {
        id: 'hr-04', number: '04', title: '用 AI 自动准备入职、调岗、离职和证明文件', priority: 'P1', category: 'lifecycle', value: 4.5, feasibility: 4.5, matrix: { x: 77, y: 25 },
        problem: '员工生命周期文件重复、字段多且跨系统，漏项会影响薪酬、权限、合规和员工体验。',
        aiValue: '按受控模板准备文件、抽取并校验字段、提醒审批和归档；系统写入或流程生效前保留人工确认。',
        risk: '身份、薪酬、日期或地域条款错误会产生工资、税务、权限和劳动风险。关键变动必须由具名 HR 审批后生效。',
        evidenceIds: ['hr-src-07', 'hr-src-10', 'hr-case-01', 'hr-case-04'],
        companyCases: [
          { company: 'IBM', summary: 'AskHR 可生成就业证明信、发起员工调动并在后端系统执行经过设计的 HR 事务。', sourceId: 'hr-case-01', caseType: '公司披露', caveat: 'IBM 自用案例不代表所有地区劳动流程都可直接复制。' },
          { company: 'Robinhood', summary: '用统一平台协调 IT 与 HR 入职工作流，使新并购团队能更快上线。', sourceId: 'hr-case-04', caseType: '客户案例', caveat: '案例未把入职提速完全归因于 AI，标准化知识和流程是前提。' },
        ],
      },
      {
        id: 'hr-05', number: '05', title: '用 AI 起草职位、寻找候选人并辅助结构化面试', priority: 'P1', category: 'lifecycle', value: 4.5, feasibility: 3.5, matrix: { x: 60, y: 22 },
        problem: '职位描述沿用历史要求，寻源和沟通耗时，面试标准不一致且证据分散。',
        aiValue: '按岗位任务生成职位和结构化问题草案，辅助候选人触达、安排和初筛，并把录音、文字和量表证据交给招聘人员复核。',
        risk: '历史数据、学校或经历等代理变量可能造成群体不利影响。AI 不得直接发出录用决定，候选人应知情并能选择替代流程，具名招聘负责人作最终判断。',
        evidenceIds: ['hr-src-04', 'hr-src-06', 'hr-src-10', 'hr-case-05', 'hr-case-06', 'hr-case-10'],
        companyCases: [
          { company: 'ABB', summary: '在印度试点语音筛选 Agent，由生成式 AI 从职位描述起草问题，招聘人员复核录音、文字、评分理由并可覆盖建议。', sourceId: 'hr-case-05', caseType: '客户案例', caveat: '结果来自供应商故事，且仍处于特定市场试点阶段。' },
          { company: 'SASR Workforce Solutions', summary: '用 AI 自动安排面试并进行语音预筛，同时明确 AI 不能代表公司作录用决定。', sourceId: 'hr-case-06', caseType: '客户案例', caveat: '高流动、高量招聘场景的结果未必适用于专业岗位。' },
        ],
      },
      {
        id: 'hr-06', number: '06', title: '用 AI 拆解岗位任务，预测人力和技能缺口', priority: 'P1', category: 'planning', value: 5, feasibility: 3.5, matrix: { x: 56, y: 7 },
        problem: '传统编制按岗位和历史比例外推，难以反映 AI 对任务组合、技能需求和管理跨度的变化。',
        aiValue: '拆解岗位任务，模拟增强与自动化情景，连接人才供给、技能缺口和转岗路径，帮助领导看到工作如何重构。',
        risk: '把情景当预测、忽略采用摩擦和业务增长会导致过度裁减或技能断层。必须显示假设和误差，由业务与 HR 共同批准资源决定。',
        evidenceIds: ['hr-src-04', 'hr-src-05', 'hr-src-07', 'hr-case-07'],
        companyCases: [
          { company: 'PepsiCo', summary: '在亚太 14 个国家统一人员数据，用 workforce intelligence 支持面向 2030 的战略人力规划。', sourceId: 'hr-case-07', caseType: '客户案例', caveat: '公开案例证明了数据驱动规划，未披露岗位任务自动拆解的独立准确率。' },
        ],
      },
      {
        id: 'hr-07', number: '07', title: '用 AI 帮助经理重组团队工作并推动员工采用', priority: 'P1', category: 'planning', value: 4.5, feasibility: 3.5, matrix: { x: 63, y: 30 },
        problem: '管理者缺少时间和方法把 AI 转化为团队工作设计，工具部署与真实采用、角色和责任脱节。',
        aiValue: '让经理用自然语言查询组织数据，识别团队任务、角色接口和采用障碍，并把建议转成可验证的工作重构实验。',
        risk: '模型建议会忽略关系、权力和本地背景，也可能被误作个体监控或绩效证据。人员沟通、团队设计和资源配置由具名经理负责。',
        evidenceIds: ['hr-src-01', 'hr-src-09', 'hr-src-10', 'hr-case-08'],
        companyCases: [
          { company: 'Ascension、HD Supply 与 Unisys', summary: '作为 Visier Vee 早期采用者，用对话式 AI 让 HR、业务和一线经理更容易查询人员数据并参与产品校准。', sourceId: 'hr-case-08', caseType: '客户案例', caveat: '属于早期采用项目，主要证明访问与采用，不等于 AI 能自主完成团队设计。' },
        ],
      },
      {
        id: 'hr-08', number: '08', title: '用 AI 读懂员工反馈，找出敬业度和体验问题', priority: 'P2', category: 'listening', value: 4, feasibility: 3.5, matrix: { x: 58, y: 39 },
        problem: '员工反馈量大且非结构化，人工编码慢，跨时间和团队的主题变化不容易发现。',
        aiValue: '在匿名、聚合前提下归纳主题和情绪，抽样展示代表性原文，并把趋势和行动项连接起来。',
        risk: '小群体切片、原文访问和个人情绪推断会造成重识别、报复担忧和寒蝉效应。必须设最小样本，不得把个人情绪标签用于人员决定。',
        evidenceIds: ['hr-src-07', 'hr-src-09', 'hr-case-09'],
        companyCases: [],
      },
      {
        id: 'hr-09', number: '09', title: '用 AI 整理绩效证据并给出职业发展选项', priority: 'P2', category: 'lifecycle', value: 4.5, feasibility: 3, matrix: { x: 49, y: 26 },
        problem: '绩效反馈受近因和主观偏差影响，职业路径不透明，经理难持续给出高质量发展建议。',
        aiValue: '整理已批准的工作证据，提示反馈结构和缺失信息，并推荐透明的岗位、项目、学习和导师选项。',
        risk: '证据不全、经理偏见和语言风格差异会被模型放大成貌似客观的评价。员工需要查看和申诉渠道，具名经理对绩效和发展决定负责。',
        evidenceIds: ['hr-src-03', 'hr-src-06', 'hr-src-08', 'hr-case-02'],
        companyCases: [
          { company: 'Seagate', summary: '用内部人才市场向员工展示岗位、项目和导师机会，帮助员工围绕技能差距规划职业发展。', sourceId: 'hr-case-02', caseType: '客户案例', caveat: '案例支持职业选项和匹配，不支持让 AI 自动给出绩效评级。' },
        ],
      },
      {
        id: 'hr-10', number: '10', title: '用 AI 预警团队流失和关键人才短缺', priority: 'P2', category: 'planning', value: 4, feasibility: 3, matrix: { x: 45, y: 43 },
        problem: '组织问题常在离职后才暴露，关键岗位、技能和人才供需缺口缺少前瞻信号。',
        aiValue: '在群体层面解释流失和供需驱动，连接组织、财务与技能信号，为岗位、管理、学习和保留行动提供预警。',
        risk: '相关性被误当因果，个人风险分数会触发隐性惩罚和自证循环。HR 只在聚合层面制定干预，并验证行动是否改善结果。',
        evidenceIds: ['hr-src-04', 'hr-src-05', 'hr-src-09', 'hr-case-10'],
        companyCases: [
          { company: 'Sunstate Equipment', summary: '用 Visier workforce AI 分析流失、加班和业务表现的关联，并采取保留行动。', sourceId: 'hr-case-10', caseType: '客户案例', caveat: '50% 流失改善由供应商案例披露，且不能证明单一 AI 因果。' },
        ],
      },
      {
        id: 'hr-11', number: '11', title: '用 AI 监测员工行为与情绪（高风险，默认不做）', priority: 'P3', category: 'highrisk', value: 3.5, feasibility: 2, matrix: { x: 28, y: 50 },
        problem: '远程和数字化工作让管理者希望获得更细信号，但“能测量”不等于“有意义、合法或合理”。',
        aiValue: '在极少数明确、合法且比例适当的安全或流程诊断中，聚合信号可能有有限价值；个人级情绪或生产率推断不稳定。',
        risk: '默认不立项。持续监控会侵犯隐私、误判残障或文化差异，改变员工行为并削弱心理安全；不得用于个体惩罚。',
        evidenceIds: ['hr-src-02', 'hr-src-09'],
        companyCases: [],
      },
      {
        id: 'hr-12', number: '12', title: '让 AI 决定录用、晋升、调薪或解雇（禁止）', priority: 'P3', category: 'highrisk', value: 4.5, feasibility: 1, matrix: { x: 14, y: 20 },
        problem: '组织希望提高决定速度和一致性，但错误会直接影响个人权利、生计和组织信任。',
        aiValue: '只能整理经授权的证据、显示缺失信息和提出待核问题，不能执行或作最终就业决定。',
        risk: '禁止 AI 自主录用、晋升、调薪或解雇。偏差、代理变量和不可解释推断会造成系统性不利影响；必须由具名人员作最终决定、记录依据并提供申诉。',
        evidenceIds: ['hr-src-04', 'hr-src-06', 'hr-src-10', 'hr-case-11'],
        companyCases: [
          { company: 'Amazon', summary: '曾开发用于给求职者简历评分的内部机器学习工具，因对女性产生偏差而停止该实验。', sourceId: 'hr-case-11', caseType: '警示案例', caveat: 'Reuters 报道称该工具未被用于最终评估候选人；此处只作为“不要自动决定”的警示。' },
        ],
      },
    ],
    pilots: [
      { id: 'hr-pilot-a', label: '优先启动 01 · 服务', title: 'HR 政策问答与分流', scope: '覆盖 30–50 个高频问题和 5–8 类请求；只用生效政策，复杂个案顺畅转人工。', acceptance: '答案有据率、首次解决率、转人工准确率、处理时间和员工满意度。' },
      { id: 'hr-pilot-b', label: '优先启动 02 · 技能', title: '岗位技能图谱与内部匹配', scope: '选择一个业务职能，建立员工可查看和纠正的技能画像，匹配内部项目或岗位。', acceptance: '画像准确率、员工纠正率、内部匹配率、技能缺口关闭率和群体公平差异。' },
      { id: 'hr-pilot-c', label: '优先启动 03 · 学习', title: '岗位化学习与 AI 辅导', scope: '选择一个明确岗位族，提供学习路径、练习和任务内辅导，不用模型输出评价个人。', acceptance: '任务质量、节省时间、技能迁移、完成率和使用者信任。' },
    ],
    sources: [
      { id: 'hr-src-01', title: 'AI at Work: Strategy Matters More Than Tools', publisher: 'BCG', url: 'https://www.bcg.com/publications/2026/ai-at-work-why-strategy-matters-more-than-tools', evidenceType: '企业调查与管理研究', limitation: '相关性和自报结果不能单独证明因果。' },
      { id: 'hr-src-02', title: 'When Everyone Uses AI, Companies Risk Losing Critical Skills', publisher: 'BCG', url: 'https://www.bcg.com/publications/2026/when-everyone-uses-ai-companies-risk-critical-skills', evidenceType: '管理研究', limitation: '技能退化风险需要按岗位和使用方式在本企业验证。' },
      { id: 'hr-src-03', title: 'Anthropic Education Report: The AI Fluency Index', publisher: 'Anthropic', url: 'https://www.anthropic.com/research/AI-fluency-index', evidenceType: '使用研究与能力框架', limitation: '平台行为样本不能代表全部员工和企业环境。' },
      { id: 'hr-src-04', title: 'Labor market impacts of AI: A new measure and early evidence', publisher: 'Anthropic', url: 'https://www.anthropic.com/research/labor-market-impacts', evidenceType: '劳动力市场早期研究', limitation: '早期暴露与使用指标不是岗位损失或个人绩效的因果预测。' },
      { id: 'hr-src-05', title: 'Agents, robots, and us: How AI reshapes work and skills in Europe', publisher: 'McKinsey', url: 'https://www.mckinsey.com/mgi/our-research/agents-robots-and-us-how-ai-reshapes-work-and-skills-in-europe', evidenceType: '情景建模', limitation: '区域情景和自动化潜力不等于企业实际采用。' },
      { id: 'hr-src-06', title: 'Rethinking early-career talent in the agentic organization', publisher: 'McKinsey', url: 'https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-organization-blog/rethinking-early-career-talent-in-the-agentic-organization', evidenceType: '管理分析', limitation: '组织建议需结合行业、岗位和人才供给验证。' },
      { id: 'hr-src-07', title: 'How AI is reshaping workflows and redefining jobs', publisher: 'MIT Sloan', url: 'https://mitsloan.mit.edu/ideas-made-to-matter/how-ai-reshaping-workflows-and-redefining-jobs', evidenceType: '研究综述', limitation: '跨组织研究不能替代本地任务和流程分析。' },
      { id: 'hr-src-08', title: 'How organizations can capture value from digital colleagues', publisher: 'MIT Sloan', url: 'https://mitsloan.mit.edu/ideas-made-to-matter/how-organizations-can-capture-value-digital-colleagues', evidenceType: '企业调查与研究分析', limitation: '样本规模和成熟组织占比限制普遍化。' },
      { id: 'hr-src-09', title: 'Is Your AI Transformation Forgetting the Front Line?', publisher: 'Bain', url: 'https://www.bain.com/insights/is-your-ai-transformation-forgetting-the-front-line/', evidenceType: '管理研究', limitation: '管理框架需要用一线采用与业务结果实测。' },
      { id: 'hr-src-10', title: 'Mobilizing the Organization in the Agent Economy', publisher: 'Bain', url: 'https://www.bain.com/insights/mobilizing-the-organization-in-the-agent-economy/', evidenceType: '管理研究', limitation: '前瞻性组织建议不是自主人员决策的安全证明。' },
      { id: 'hr-case-01', title: 'IBM · AskHR', publisher: 'IBM', url: 'https://www.ibm.com/case-studies/ibm-askhr', evidenceType: '公司自用案例', limitation: 'IBM 同时是技术提供者，结果为公司披露且会随配置变化。' },
      { id: 'hr-case-02', title: 'Gloat · Seagate Talent Marketplace', publisher: 'Gloat', url: 'https://gloat.com/resources/seagate-unlocking-careers-with-gloats-talent-marketplace/', evidenceType: '供应商客户案例', limitation: 'ROI、工时和参与率由供应商客户故事披露。' },
      { id: 'hr-case-03', title: 'IBM 2020 Annual Report · Your Learning', publisher: 'IBM', url: 'https://www.ibm.com/investor/att/pdf/IBM_Annual_Report_2020.pdf', evidenceType: '公司正式披露', limitation: '披露使用方式与学习时数，但未隔离 AI 对学习成效的因果贡献。' },
      { id: 'hr-case-04', title: 'ServiceNow · Robinhood', publisher: 'ServiceNow', url: 'https://www.servicenow.com/customers/robinhood.html', evidenceType: '供应商客户案例', limitation: '服务成效跨 IT、HR 等多个职能，不是 HR 单一效果。' },
      { id: 'hr-case-05', title: 'Phenom · ABB Recruiting Voice Agent', publisher: 'Phenom', url: 'https://www.phenom.com/blog/blueprint-ai-agent-rollouts-recruiting', evidenceType: '供应商客户案例', limitation: '特定市场试点，完成率和准确率口径由供应商发布。' },
      { id: 'hr-case-06', title: 'Phenom · SASR Talent Acquisition', publisher: 'Phenom', url: 'https://www.phenom.com/blog/ai-experimentation-talent-acquisition', evidenceType: '供应商客户案例', limitation: '高量招聘案例不能直接外推到专业和高影响岗位。' },
      { id: 'hr-case-07', title: 'Visier · PepsiCo APAC Workforce Planning', publisher: 'Visier', url: 'https://www.visier.com/blog/workforce-intelligence-lessons-from-talent-management-director-apac-pepsico/', evidenceType: '供应商客户案例', limitation: '主要支持数据驱动规划，不是岗位任务自动化准确率验证。' },
      { id: 'hr-case-08', title: 'Visier · Vee Early Adopters', publisher: 'Visier', url: 'https://www.visier.com/customers/vee-customer-stories/', evidenceType: '供应商客户案例', limitation: '早期采用者结果侧重访问和采用，尚非长期业务成效。' },
      { id: 'hr-case-09', title: 'Qualtrics · Kroger Employee Listening', publisher: 'Qualtrics', url: 'https://www.qualtrics.com/customers/kroger/', evidenceType: '员工倾听流程案例', limitation: '公开案例支持持续员工倾听，但未披露 AI 主题分析的具体使用与成效。' },
      { id: 'hr-case-10', title: 'Visier · Sunstate Equipment', publisher: 'Visier', url: 'https://www.visier.com/customers/sunstate-equipment/', evidenceType: '供应商客户案例', limitation: '流失改善为客户故事结果，不能证明单一 AI 因果。' },
      { id: 'hr-case-11', title: 'Reuters · Amazon Recruiting Tool Warning', publisher: 'Reuters / Investing.com', url: 'https://www.investing.com/news/stock-market-news/amazon-scraps-secret-ai-recruiting-tool-that-showed-bias-against-women-1637988', evidenceType: '高可信媒体警示案例', limitation: '报道基于知情人士；工具为内部实验且未用于最终候选人评估。' },
    ],
  };

  window.OPPORTUNITY_RADAR_DATA = deepFreeze(hrRadar);
})();
