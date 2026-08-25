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
    updatedAt: '2026-08-26',
    coreJudgment: '优先增强员工服务、技能流动与学习闭环；越接近个人生计的决定，越不能把责任交给模型。',
    libraryMode: 'ranked',
    scenarioCount: 20,
    p0Count: 3,
    categoryLabels: {
      service: '员工服务', skills: '技能与学习', lifecycle: '人才全周期', planning: '组织规划', listening: '员工洞察',
      payroll: '考勤与薪酬', compliance: '社保与人事合规', relations: '员工关系', highrisk: '高风险决策',
    },
    scenarios: [
      {
        id: 'hr-01', number: '01', title: '用 AI 即时回答 HR 政策问题，并把复杂个案转给对的人', priority: 'P0', category: 'service', value: 5, feasibility: 5, matrix: { x: 90, y: 8 },
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
        id: 'hr-02', number: '02', title: '用 AI 看清员工技能，并匹配内部岗位和项目', priority: 'P0', category: 'skills', value: 5, feasibility: 4, matrix: { x: 68, y: 8 },
        problem: '职位名称不能反映真实技能，员工能力和内部机会不可见，关键技能供需难以量化。',
        aiValue: '从岗位、项目和员工自述中提取技能，建立可校正的技能画像，解释为什么某人适合某个岗位、项目或导师机会。',
        risk: '不完整经历、代理变量和历史机会差异会形成错误画像并固化不公平。员工必须能查看和纠正画像，经理与 HR 复核匹配。',
        evidenceIds: ['hr-src-04', 'hr-src-05', 'hr-src-06', 'hr-case-02'],
        companyCases: [
          { company: 'Seagate', summary: '用 AI 驱动的内部人才市场 Career Discovery 匹配员工、岗位、短期项目和导师机会。', sourceId: 'hr-case-02', caseType: '客户案例', caveat: 'ROI 和参与率由供应商客户故事披露，需按本企业基线重算。' },
        ],
      },
      {
        id: 'hr-03', number: '03', title: '用 AI 为不同岗位定制学习路径和工作辅导', priority: 'P0', category: 'skills', value: 4.5, feasibility: 4.5, matrix: { x: 82, y: 20 },
        problem: '统一课程难对应岗位任务和能力缺口，员工会使用工具却不一定具备委派、判断和验证能力。',
        aiValue: '诊断岗位任务和学习需要，推荐微课程、练习和任务内辅导，跟踪技能迁移而不是只记录“课程完成”。',
        risk: '把使用频率当能力、把个性化建议直接用于绩效会扭曲学习行为并损害信任。员工与经理共同确认发展目标，学习数据不得自动决定晋升。',
        evidenceIds: ['hr-src-01', 'hr-src-02', 'hr-src-03', 'hr-case-03'],
        companyCases: [
          { company: 'IBM', summary: '在 Your Learning 平台中使用 Watson AI 生成个性化学习推荐。', sourceId: 'hr-case-03', caseType: '公司披露', caveat: '2020 年年报披露了使用方式和平均学习时数，但未证明 AI 单独造成学习成效。' },
        ],
      },
      {
        id: 'hr-04', number: '04', title: '用 AI 自动准备入职、调岗、离职和证明文件', priority: 'P1', category: 'lifecycle', value: 4.5, feasibility: 4.5, matrix: { x: 66, y: 32 },
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
        id: 'hr-05', number: '05', title: '用 AI 起草职位、寻找候选人并辅助结构化面试', priority: 'P1', category: 'lifecycle', value: 4.5, feasibility: 3.5, matrix: { x: 58, y: 20 },
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
        id: 'hr-06', number: '06', title: '用 AI 拆解岗位任务，预测人力和技能缺口', priority: 'P1', category: 'planning', value: 5, feasibility: 3.5, matrix: { x: 46, y: 8 },
        problem: '传统编制按岗位和历史比例外推，难以反映 AI 对任务组合、技能需求和管理跨度的变化。',
        aiValue: '拆解岗位任务，模拟增强与自动化情景，连接人才供给、技能缺口和转岗路径，帮助领导看到工作如何重构。',
        risk: '把情景当预测、忽略采用摩擦和业务增长会导致过度裁减或技能断层。必须显示假设和误差，由业务与 HR 共同批准资源决定。',
        evidenceIds: ['hr-src-04', 'hr-src-05', 'hr-src-07', 'hr-case-07'],
        companyCases: [
          { company: 'PepsiCo', summary: '在亚太 14 个国家统一人员数据，用 workforce intelligence 支持面向 2030 的战略人力规划。', sourceId: 'hr-case-07', caseType: '客户案例', caveat: '公开案例证明了数据驱动规划，未披露岗位任务自动拆解的独立准确率。' },
        ],
      },
      {
        id: 'hr-07', number: '07', title: '用 AI 帮助经理重组团队工作并推动员工采用', priority: 'P1', category: 'planning', value: 4.5, feasibility: 3.5, matrix: { x: 88, y: 32 },
        problem: '管理者缺少时间和方法把 AI 转化为团队工作设计，工具部署与真实采用、角色和责任脱节。',
        aiValue: '让经理用自然语言查询组织数据，识别团队任务、角色接口和采用障碍，并把建议转成可验证的工作重构实验。',
        risk: '模型建议会忽略关系、权力和本地背景，也可能被误作个体监控或绩效证据。人员沟通、团队设计和资源配置由具名经理负责。',
        evidenceIds: ['hr-src-01', 'hr-src-09', 'hr-src-10', 'hr-case-08'],
        companyCases: [
          { company: 'Ascension、HD Supply 与 Unisys', summary: '作为 Visier Vee 早期采用者，用对话式 AI 让 HR、业务和一线经理更容易查询人员数据并参与产品校准。', sourceId: 'hr-case-08', caseType: '客户案例', caveat: '属于早期采用项目，主要证明访问与采用，不等于 AI 能自主完成团队设计。' },
        ],
      },
      {
        id: 'hr-08', number: '08', title: '用 AI 读懂员工反馈，找出敬业度和体验问题', priority: 'P2', category: 'listening', value: 4, feasibility: 3.5, matrix: { x: 68, y: 44 },
        problem: '员工反馈量大且非结构化，人工编码慢，跨时间和团队的主题变化不容易发现。',
        aiValue: '在匿名、聚合前提下归纳主题和情绪，抽样展示代表性原文，并把趋势和行动项连接起来。',
        risk: '小群体切片、原文访问和个人情绪推断会造成重识别、报复担忧和寒蝉效应。必须设最小样本，不得把个人情绪标签用于人员决定。',
        evidenceIds: ['hr-src-07', 'hr-src-09', 'hr-case-09'],
        companyCases: [],
      },
      {
        id: 'hr-09', number: '09', title: '用 AI 整理绩效证据并给出职业发展选项', priority: 'P2', category: 'lifecycle', value: 4.5, feasibility: 3, matrix: { x: 44, y: 32 },
        problem: '绩效反馈受近因和主观偏差影响，职业路径不透明，经理难持续给出高质量发展建议。',
        aiValue: '整理已批准的工作证据，提示反馈结构和缺失信息，并推荐透明的岗位、项目、学习和导师选项。',
        risk: '证据不全、经理偏见和语言风格差异会被模型放大成貌似客观的评价。员工需要查看和申诉渠道，具名经理对绩效和发展决定负责。',
        evidenceIds: ['hr-src-03', 'hr-src-06', 'hr-src-08', 'hr-case-02'],
        companyCases: [
          { company: 'Seagate', summary: '用内部人才市场向员工展示岗位、项目和导师机会，帮助员工围绕技能差距规划职业发展。', sourceId: 'hr-case-02', caseType: '客户案例', caveat: '案例支持职业选项和匹配，不支持让 AI 自动给出绩效评级。' },
        ],
      },
      {
        id: 'hr-10', number: '10', title: '用 AI 预警团队流失和关键人才短缺', priority: 'P2', category: 'planning', value: 4, feasibility: 3, matrix: { x: 46, y: 44 },
        problem: '组织问题常在离职后才暴露，关键岗位、技能和人才供需缺口缺少前瞻信号。',
        aiValue: '在群体层面解释流失和供需驱动，连接组织、财务与技能信号，为岗位、管理、学习和保留行动提供预警。',
        risk: '相关性被误当因果，个人风险分数会触发隐性惩罚和自证循环。HR 只在聚合层面制定干预，并验证行动是否改善结果。',
        evidenceIds: ['hr-src-04', 'hr-src-05', 'hr-src-09', 'hr-case-10'],
        companyCases: [
          { company: 'Sunstate Equipment', summary: '用 Visier workforce AI 分析流失、加班和业务表现的关联，并采取保留行动。', sourceId: 'hr-case-10', caseType: '客户案例', caveat: '50% 流失改善由供应商案例披露，且不能证明单一 AI 因果。' },
        ],
      },
      {
        id: 'hr-11', number: '11', title: '用 AI 监测员工行为与情绪（高风险，默认不做）', priority: 'P3', category: 'highrisk', value: 3.5, feasibility: 2, matrix: { x: 24, y: 56 },
        problem: '远程和数字化工作让管理者希望获得更细信号，但“能测量”不等于“有意义、合法或合理”。',
        aiValue: '在极少数明确、合法且比例适当的安全或流程诊断中，聚合信号可能有有限价值；个人级情绪或生产率推断不稳定。',
        risk: '默认不立项。持续监控会侵犯隐私、误判残障或文化差异，改变员工行为并削弱心理安全；不得用于个体惩罚。',
        evidenceIds: ['hr-src-02', 'hr-src-09'],
        companyCases: [],
      },
      {
        id: 'hr-12', number: '12', title: '让 AI 决定录用、晋升、调薪或解雇（禁止）', priority: 'P3', category: 'highrisk', value: 4.5, feasibility: 1, matrix: { x: 12, y: 26 },
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
      { id: 'hr-src-01', title: 'AI at Work: Strategy Matters More Than Tools', publisher: 'BCG', url: 'https://www.bcg.com/publications/2026/ai-at-work-why-strategy-matters-more-than-tools', evidenceType: '企业调查与管理研究', publishedAt: '2026-06-03', limitation: '相关性和自报结果不能单独证明因果。' },
      { id: 'hr-src-02', title: 'When Everyone Uses AI, Companies Risk Losing Critical Skills', publisher: 'BCG', url: 'https://www.bcg.com/publications/2026/when-everyone-uses-ai-companies-risk-critical-skills', evidenceType: '管理研究', publishedAt: '2026-06-17', limitation: '技能退化风险需要按岗位和使用方式在本企业验证。' },
      { id: 'hr-src-03', title: 'Anthropic Education Report: The AI Fluency Index', publisher: 'Anthropic', url: 'https://www.anthropic.com/research/AI-fluency-index', evidenceType: '使用研究与能力框架', publishedAt: '2026-02-23', limitation: '平台行为样本不能代表全部员工和企业环境。' },
      { id: 'hr-src-04', title: 'Labor market impacts of AI: A new measure and early evidence', publisher: 'Anthropic', url: 'https://www.anthropic.com/research/labor-market-impacts', evidenceType: '劳动力市场早期研究', publishedAt: '2026-03-05', limitation: '早期暴露与使用指标不是岗位损失或个人绩效的因果预测。' },
      { id: 'hr-src-05', title: 'Agents, robots, and us: How AI reshapes work and skills in Europe', publisher: 'McKinsey', url: 'https://www.mckinsey.com/mgi/our-research/agents-robots-and-us-how-ai-reshapes-work-and-skills-in-europe', evidenceType: '情景建模', publishedAt: '2026-05-12', limitation: '区域情景和自动化潜力不等于企业实际采用。' },
      { id: 'hr-src-06', title: 'Rethinking early-career talent in the agentic organization', publisher: 'McKinsey', url: 'https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-organization-blog/rethinking-early-career-talent-in-the-agentic-organization', evidenceType: '管理分析', publishedAt: '2026-05-18', limitation: '组织建议需结合行业、岗位和人才供给验证。' },
      { id: 'hr-src-07', title: 'How AI is reshaping workflows and redefining jobs', publisher: 'MIT Sloan', url: 'https://mitsloan.mit.edu/ideas-made-to-matter/how-ai-reshaping-workflows-and-redefining-jobs', evidenceType: '研究综述', publishedAt: '2026-04-22', limitation: '跨组织研究不能替代本地任务和流程分析。' },
      { id: 'hr-src-08', title: 'How organizations can capture value from digital colleagues', publisher: 'MIT Sloan', url: 'https://mitsloan.mit.edu/ideas-made-to-matter/how-organizations-can-capture-value-digital-colleagues', evidenceType: '企业调查与研究分析', publishedAt: '2026-07-27', limitation: '样本规模和成熟组织占比限制普遍化。' },
      { id: 'hr-src-09', title: 'Is Your AI Transformation Forgetting the Front Line?', publisher: 'Bain', url: 'https://www.bain.com/insights/is-your-ai-transformation-forgetting-the-front-line/', evidenceType: '管理研究', publishedAt: '2026-07-08', limitation: '管理框架需要用一线采用与业务结果实测。' },
      { id: 'hr-src-10', title: 'Mobilizing the Organization in the Agent Economy', publisher: 'Bain', url: 'https://www.bain.com/insights/mobilizing-the-organization-in-the-agent-economy/', evidenceType: '管理研究', publishedAt: '2026-06-17', limitation: '前瞻性组织建议不是自主人员决策的安全证明。' },
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

  const scenarioEnhancements = {
    'hr-01': {
      shortTitle: 'HR政策问答',
      problem: [
        '员工不知道应查哪份制度、在哪个系统办理，HR 服务台反复回答休假、福利、证明和流程问题。',
        '地区、用工类型和员工状态不同，同一问题需要不同口径，错误答复会造成返工和员工不信任。',
        '简单问答与敏感个案进入同一队列，HR 无法按风险分流，也缺少需求量和周转时间数据。',
      ],
      aiValue: [
        '只读取获授权且标注地区、员工类型、版本、生效日期和内容负责人的政策、知识库与流程目录。',
        '识别问题意图和适用条件，追问缺失信息，检索依据并判断可自助解决还是应创建工单。',
        '输出带政策原文、版本和办理入口的答案，同时生成结构化工单和对话审计记录。',
        '薪酬、劳动关系、健康和低置信度个案转具名 HR；用有据率、首次解决率、转人工准确率、处理时长和满意度验收。',
      ],
      scorecard: { dimensions: { businessValue: 29, processFit: 20, readiness: 14, evidence: 14, riskControl: 17 }, total: 94, rationale: '问题高频、知识范围可控、答案可回链，且人工分流机制清晰。', prerequisite: '建立政策目录、内容负责人、更新 SLA、权限过滤和敏感个案路由。', redLine: false },
      extraEvidenceIds: ['hr-cn-01', 'hr-src-11'],
      companyCases: [
        { company: '通威集团', summary: '金蝶披露通威集团建设 HR 智能服务助理，以自然语言交互替代传统菜单，用于员工服务入口。', sourceId: 'hr-cn-01', caseType: '客户案例', caveat: '来源为供应商产品页，未披露独立准确率、人工转接率或长期员工体验结果。', market: '中国' },
      ],
    },
    'hr-02': {
      shortTitle: '技能画像匹配',
      problem: [
        '职位名称和履历不能反映员工真实技能，项目经验、学习和潜力信息分散在多个系统。',
        '内部岗位、短期项目和导师机会对员工不可见，团队一边外部招聘、一边闲置内部能力。',
        '历史机会差异和自述不完整会让画像偏向表达更充分的人群，并固化原有不公平。',
      ],
      aiValue: [
        '读取员工同意使用的履历、项目、学习记录、岗位任务和已校准技能词典。',
        '抽取并归一技能，显示推断依据和置信度，匹配岗位、项目、学习或导师机会。',
        '输出员工可查看和纠正的技能画像、匹配理由、缺口和可行动的发展选项。',
        '员工确认画像，经理与 HR 复核匹配；用画像准确率、纠正率、内部匹配率、技能缺口关闭率和群体差异验收。',
      ],
      scorecard: { dimensions: { businessValue: 29, processFit: 17, readiness: 12, evidence: 13, riskControl: 16 }, total: 87, rationale: '内部流动和技能供需价值高，但员工纠正、数据完整性和公平校准是前提。', prerequisite: '统一技能词典、取得员工知情与纠正机制，并禁止画像直接决定任用。', redLine: false },
      extraEvidenceIds: ['hr-cn-01'],
      companyCases: [
        { company: '海信集团', summary: '金蝶披露海信集团上线 20 多个 AI 场景，用于员工智能服务体验与人才供应全链路提效。', sourceId: 'hr-cn-01', caseType: '客户案例', caveat: '来源为供应商汇总披露，未逐项公布技能匹配模型、准确率或公平性评估。', market: '中国' },
      ],
    },
    'hr-03': {
      shortTitle: '岗位化学习辅导',
      problem: [
        '统一课程与真实岗位任务脱节，员工完成课程后仍不会拆解、委派和验证 AI 工作。',
        '经理难持续观察技能缺口并给出个性化练习，学习资源多但路径不清。',
        '只看登录和完成率会把工具使用误当能力，并诱导员工追求表面指标。',
      ],
      aiValue: [
        '读取岗位任务、能力标准、员工自选目标和经批准的课程与练习库。',
        '诊断任务级差距，推荐微课程、情景练习、示范和工作中的即时辅导。',
        '输出可选择的学习路径、练习反馈、证据作品和下一步建议，不自动生成绩效评级。',
        '员工与经理确认目标和结果；用任务质量、技能前后测、迁移到工作的比例、完成率和信任度验收。',
      ],
      scorecard: { dimensions: { businessValue: 26, processFit: 18, readiness: 13, evidence: 13, riskControl: 17 }, total: 87, rationale: '学习内容可控、反馈可复核，适合从一个岗位族快速验证技能迁移。', prerequisite: '定义岗位任务与能力标准，学习数据不得直接进入晋升或薪酬决定。', redLine: false },
    },
    'hr-04': {
      shortTitle: '员工生命周期办理',
      problem: [
        '入职、调岗、离职和证明文件字段多、重复录入，并跨 HR、IT、薪酬和审批系统流转。',
        '日期、身份、薪酬、组织和地区条款一旦录错，会导致发薪、税务、权限或劳动合规问题。',
        '流程状态不透明，员工与经理反复追问，HR 也难定位卡点和漏项。',
      ],
      aiValue: [
        '读取获授权的员工主数据、审批结果、地区模板、流程规则和系统接口。',
        '按模板准备文件、维护花名册，交叉校验合同到期、身份证件缺失和社保状态，并编排审批、通知和归档步骤。',
        '输出待签文件、花名册差异、合同到期、身份证件缺项和社保状态待复核清单，以及完整操作日志。',
        '薪酬、身份、合同和权限变更由具名 HR 审批后生效；用字段错误率、漏项数、周期和员工追问量验收。',
      ],
      scorecard: { dimensions: { businessValue: 25, processFit: 19, readiness: 13, evidence: 11, riskControl: 10 }, total: 78, rationale: '标准流程和模板适配度高，但跨系统写入与劳动条款需要审批控制。', prerequisite: '统一主数据、地区模板、系统接口和不可逆变更审批。', redLine: false },
      extraEvidenceIds: ['hr-src-11'],
    },
    'hr-05': {
      shortTitle: '招聘与结构化面试',
      problem: [
        '职位描述沿用历史要求，寻源、沟通和安排耗时，招聘人员难把时间放在候选人体验与判断。',
        '不同面试官使用不同问题和证据标准，反馈分散且容易受近期印象影响。',
        '历史招聘数据、学校和经历代理变量可能对特定群体造成不利影响，并被模型包装成客观分数。',
      ],
      aiValue: [
        '读取经批准的 JD、岗位任务、能力标准、候选人授权简历和结构化面试模板。',
        '批量阅读简历，起草邀约和结构化问题，并整理录音转录、量表和证据供招聘人员复核。',
        '输出 JD 要求差异、候选人比较、证据摘要、缺失信息和评分卡草案，仅作招聘人员复核材料，不输出自动录用决定。',
        '候选人知情且可选替代流程，具名招聘负责人最终判断；用处理时长、结构化覆盖率、候选人体验和群体差异验收。',
      ],
      scorecard: { dimensions: { businessValue: 25, processFit: 16, readiness: 11, evidence: 10, riskControl: 8 }, total: 70, rationale: '事务提效明显，但筛选与面试证据涉及公平、透明和就业权利。', prerequisite: '限定辅助环节、完成偏差评估、候选人告知和人工覆盖机制。', redLine: false },
      extraEvidenceIds: ['hr-cn-02', 'hr-src-11'],
      companyCases: [
        { company: '智联招聘', summary: '百度智能云披露智联招聘以大模型重构人岗匹配，并用 AI 招聘助手覆盖职位发布、筛选、响应、推荐、沟通与面试流程。', sourceId: 'hr-cn-02', caseType: '客户案例', caveat: '准确率与成本指标由技术供应商披露，且招聘服务平台场景不等同于企业最终录用决策。', market: '中国' },
      ],
    },
    'hr-06': {
      shortTitle: '人力技能规划',
      problem: [
        '传统编制按岗位和历史比例外推，不能解释 AI 将改变哪些任务、技能和管理跨度。',
        '业务计划、财务情景、人才供给和技能数据分散，缺口通常在项目启动后才暴露。',
        '把自动化潜力当确定预测会导致过度裁减、关键技能断层或忽略业务增长与采用摩擦。',
      ],
      aiValue: [
        '读取批准的业务情景、岗位任务、人员与技能数据、成本和外部劳动力信号。',
        '拆解任务并模拟增强、自动化和新增工作情景，连接内部供给、招聘、外包和转岗路径。',
        '输出带假设和区间的人力情景、关键技能缺口、岗位变化和行动选项。',
        '业务、财务与 HR 联合批准资源决定；用预测误差、关键岗位覆盖、转岗率、缺口关闭率和情景更新频率验收。',
      ],
      scorecard: { dimensions: { businessValue: 29, processFit: 15, readiness: 9, evidence: 10, riskControl: 9 }, total: 72, rationale: '战略价值高，但情景依赖数据、假设与业务变化，不能直接驱动裁员。', prerequisite: '明确情景假设、置信区间、季度复盘和跨职能审批。', redLine: false },
    },
    'hr-07': {
      shortTitle: '团队工作重构',
      problem: [
        '管理者知道要用 AI，却缺少把岗位拆成任务、重新分配人机责任和设置质检的方法。',
        '工具上线与真实工作流、绩效目标和协作接口脱节，员工采用停留在零散个人尝试。',
        '若把工具使用数据误作绩效证据，会诱导表面采用并损害团队信任。',
      ],
      aiValue: [
        '读取团队目标、任务清单、流程数据、角色权限和员工访谈，不使用隐蔽个人监控。',
        '识别重复工作、等待点和交接，提出人做判断、AI 做辅助的多种流程实验。',
        '输出任务重构图、角色责任、试点假设、质检点、停止条件和变更沟通材料。',
        '具名经理与员工共同确认方案；用任务周期、返工、质量、采用率、员工信任和客户结果验收。',
      ],
      scorecard: { dimensions: { businessValue: 26, processFit: 14, readiness: 9, evidence: 10, riskControl: 9 }, total: 68, rationale: '价值来自流程重构而非单一工具，需强管理参与和员工共创。', prerequisite: '选定单一团队、明确人机责任、禁止把使用频率直接用于绩效。', redLine: false },
    },
    'hr-08': {
      shortTitle: '员工反馈洞察',
      problem: [
        '开放题、访谈和工单数量大，人工编码慢，跨时间和团队的主题变化难持续追踪。',
        '低回复率和小群体样本会放大噪声，代表性原文又可能暴露个人身份。',
        '如果员工担心情绪或批评被定位到个人，会减少真实反馈并产生寒蝉效应。',
      ],
      aiValue: [
        '读取已获同意且完成匿名化的调查、访谈和工单，并执行最小群体阈值。',
        '归纳主题、变化和共现问题，抽样展示去标识的代表性原文并标记不确定性。',
        '输出群体级趋势、待验证假设、建议行动和后续追踪指标，不生成个人情绪标签。',
        '员工体验团队复核主题和行动；用主题一致性、重识别事件、行动关闭率、回复率和信任度验收。',
      ],
      scorecard: { dimensions: { businessValue: 22, processFit: 16, readiness: 9, evidence: 9, riskControl: 8 }, total: 64, rationale: '主题归纳可提效，但隐私、代表性和行动闭环决定是否真正有价值。', prerequisite: '设最小样本、匿名化、原文访问控制和禁止个人情绪画像。', redLine: false },
    },
    'hr-09': {
      shortTitle: '绩效证据整理',
      problem: [
        '经理依赖近期印象和文字表达，全年工作证据、协作反馈和目标变化没有统一整理。',
        '员工不清楚评价依据和发展路径，反馈质量因经理能力和时间差异而不一致。',
        '不完整数据和语言风格差异会被模型放大成貌似客观的结论，影响晋升与发展机会。',
      ],
      aiValue: [
        '读取员工知情范围内的目标、已批准工作证据、反馈和岗位能力标准。',
        '按时间与目标整理事实、提示证据缺口和矛盾，并起草平衡的反馈问题。',
        '输出证据时间线、待核问题和透明的发展选项，不生成自动绩效等级或晋升结论。',
        '员工可查看、补充和申诉，具名经理最终负责；用证据覆盖率、员工异议率、复核修改量和反馈及时性验收。',
      ],
      scorecard: { dimensions: { businessValue: 25, processFit: 13, readiness: 8, evidence: 8, riskControl: 7 }, total: 61, rationale: '可改善证据整理，但输出靠近高影响人员决定，必须限定用途。', prerequisite: '建立证据范围、员工查看申诉、禁止自动评级和晋升建议。', redLine: false },
    },
    'hr-10': {
      shortTitle: '流失风险预警',
      problem: [
        '关键岗位和团队问题通常在离职后才暴露，招聘周期与技能替补准备滞后。',
        '加班、经理变动、薪酬和流失相关但不等于因果，个人分数容易被误读。',
        '针对“高风险个人”的隐性区别对待会形成自证循环、歧视和信任损害。',
      ],
      aiValue: [
        '读取合法、最小化且聚合的组织、岗位、技能、流动和业务数据。',
        '在团队或岗位群层面识别趋势与可能驱动，比较不同干预前后的变化。',
        '输出群体级预警、数据局限、待调查问题和招聘、学习、经理支持等行动选项。',
        'HR 只批准群体干预，不向经理显示个人离职分数；用预警稳定性、干预覆盖、关键岗位空缺和群体公平差异验收。',
      ],
      scorecard: { dimensions: { businessValue: 23, processFit: 12, readiness: 8, evidence: 8, riskControl: 7 }, total: 58, rationale: '能支持群体规划，但因果不确定、个人画像和隐性惩罚风险较高。', prerequisite: '仅做群体分析，禁止个人风险名单，并通过对照或前后变化验证干预。', redLine: false },
    },
    'hr-11': {
      shortTitle: '员工行为监测',
      problem: [
        '数字化工作留下大量活动信号，管理者可能希望用它们衡量生产率、投入度或情绪。',
        '点击、在线时长和语言风格与真实贡献关系薄弱，并受岗位、残障、文化和工作安排影响。',
        '持续监控会改变员工行为、削弱心理安全，并带来隐私、劳动关系和合规风险。',
      ],
      aiValue: [
        '仅在明确合法、安全且比例适当的流程诊断中使用最小化、聚合和限期保存的数据。',
        '识别系统级等待、过载或安全异常，不推断个人情绪、忠诚度或通用生产率。',
        '输出群体流程问题和数据局限，不形成个人标签、排名或惩罚建议。',
        '隐私、法务、员工代表和业务共同批准例外用途；验收重识别风险、误报、必要性和员工信任，默认不立项。',
      ],
      scorecard: { dimensions: { businessValue: 12, processFit: 10, readiness: 9, evidence: 8, riskControl: 11 }, total: 50, rationale: '可测量不等于有意义，个人监测的隐私、误判和信任损害超过一般业务价值。', prerequisite: '默认禁止个人级监测；任何例外需合法性、必要性和比例性评估。', redLine: true },
    },
    'hr-12': {
      shortTitle: '自主人员决策',
      problem: [
        '组织希望提高录用、晋升、调薪和解雇速度，但这些决定直接影响个人权利与生计。',
        '训练数据包含历史机会差异，代理变量和不可解释推断可能在规模化后形成系统性不利影响。',
        '自动决定难让员工或候选人理解、纠正和申诉，也会模糊最终责任人。',
      ],
      aiValue: [
        '只读取经授权且与决定直接相关的证据，并明确排除敏感属性与不当代理变量。',
        '整理证据、显示缺失与矛盾、提示结构化待核问题，不计算自动任用或解雇结论。',
        '输出供具名决策者复核的证据摘要、来源和审计轨迹，并提供当事人查看与申诉入口。',
        '技术上禁止 AI 执行最终决定或写回生效系统；只验收证据完整性、可追溯性和群体公平，不以自动决策率为目标。',
      ],
      scorecard: { dimensions: { businessValue: 24, processFit: 12, readiness: 8, evidence: 5, riskControl: 6 }, total: 55, rationale: '行政速度无法抵消权利、公平、解释和责任风险，必须禁止模型作最终决定。', prerequisite: '系统只允许证据整理；具名人员最终决定、记录理由并提供申诉。', redLine: true },
    },
  };

  hrRadar.sources.push(
    { id: 'hr-cn-01', title: '金蝶 AI HR · 中国企业实践', publisher: '金蝶', url: 'https://www.kingdee.com/products/cosmic_hr.html', evidenceType: '供应商客户披露', limitation: '同一产品页汇总多家客户做法，未提供逐场景独立审计和完整评测口径。' },
    { id: 'hr-cn-02', title: '百度智能云 · 智联招聘 AI 招聘助手', publisher: '百度智能云', url: 'https://cloud.baidu.com/customer/case/zhaopin.html', evidenceType: '供应商客户案例', limitation: '准确率、成本与流程指标由技术供应商披露，不能外推到企业最终录用质量。' },
    { id: 'hr-src-11', title: '教你用 WorkBuddy 搞定公司日常人事工作', publisher: '马佳彬', url: 'https://mp.weixin.qq.com/s/-8a1_8-ifOsFP_JP-1RAuw', evidenceType: '个人实务流程示例', publishedAt: '2026-08-21', limitation: '未提供独立效果评估、样本、对照组或经审计指标；仅可用于发现工作流程，不能证明可自主审批、发薪、申报或作出法律决定。' },
    { id: 'hr-src-12', title: 'ADP Assist Payroll Variance AI Agent', publisher: 'ADP', url: 'https://ph.adp.com/about-adp/press-centre/adp-integrates-new-ai-agent--to-elevate-global-payroll-accuracy-and-efficiency.aspx', evidenceType: '供应商产品披露', publishedAt: '2026-04-13', limitation: '供应商发布，没有具名客户的独立对比；只支持异常识别与人工复核边界。' },
    { id: 'hr-src-13', title: 'SAP Core HR Assistant', publisher: 'SAP', url: 'https://www.sap.com/india/use-cases/joule-assistant/core-hr-ai', evidenceType: '供应商产品说明', publishedAt: '2026-05-12', limitation: '产品能力描述，不是客户成效证据。' },
    { id: 'hr-src-14', title: 'SAP HR Service Assistant', publisher: 'SAP', url: 'https://www.sap.com/use-cases/joule-assistant/hr-service-ai', evidenceType: '供应商产品说明', publishedAt: '2026-05-11', limitation: '产品能力与假定收益说明，不是独立效果评估。' },
    { id: 'hr-src-15', title: '人力资源管理系统如何实现薪酬核算的自动化？', publisher: '金蝶', url: 'https://www.kingdee.com/resources/articles/1468621652711684001', evidenceType: '供应商方法说明', publishedAt: '2026-02-04', limitation: '供应商方法与产品内容，不是独立因果评估。' },
    { id: 'hr-src-16', title: '用人单位职工申报年度缴费工资', publisher: '国家税务总局浙江省税务局', url: 'https://zhejiang.chinatax.gov.cn/art/2025/10/31/art_26351_644153.html', evidenceType: '政府办事指南', publishedAt: '2025-10-31', limitation: '仅适用浙江省用人单位年度缴费工资申报；不支持 AI 成效、准确率或自动申报结论。' },
    { id: 'hr-src-17', title: '2025住房公积金年度缴存基数申报常见问题解答', publisher: '北京住房公积金管理中心', url: 'https://gjj.beijing.gov.cn/web/zwfw5/1747335/1747336/743669918/', evidenceType: '政府办事指南', publishedAt: '2025-06-20', limitation: '仅适用北京 2025–2026 住房公积金年度；不可外推到其他地区，不支持 AI 自动提交。' },
    { id: 'hr-src-18', title: 'Making a formal offer — Settlement agreements', publisher: 'Acas', url: 'https://www.acas.org.uk/settlement-agreements/making-a-formal-offer', evidenceType: '专业机构指引', publishedAt: '2026-03-25', limitation: '仅适用英国和解协议语境，不能作为中国劳动协议效力依据；未提供 AI 起草准确率。' },
    { id: 'hr-src-19', title: '白云区劳动人事争议仲裁申请材料清单', publisher: '广州市白云区人力资源和社会保障局', url: 'https://www.by.gov.cn/gzjg/qrlzyhshbzj/zcgg/cjgg/content/post_10451075.html', evidenceType: '政府仲裁材料指南', publishedAt: '2025-09-17', limitation: '仅为广州市白云区地方立案材料要求，不是全国统一规则；不支持 AI 作出证据可采性判断。' },
    { id: 'hr-src-20', title: 'How CoCounsel Legal gives litigators back 6 weeks a year', publisher: 'Thomson Reuters', url: 'https://legal.thomsonreuters.com/blog/how-cocounsel-legal-gives-litigators-back-6-weeks-a-year/', evidenceType: '供应商产品方法说明', publishedAt: '2026-05-05', limitation: '供应商自述，只支持诉讼材料时间线和文档分析工作流；非劳动争议证据，也无独立准确率，不引用其效率数字。' },
    { id: 'hr-case-12', title: 'ServiceNow · Bayer HR Case Summaries', publisher: 'ServiceNow', url: 'https://www.servicenow.com/customers/bayer.html', evidenceType: '供应商客户案例', publishedAt: null, limitation: '供应商客户故事，AI 用途是 HR 案例摘要，不是劳动法文书起草或仲裁分析。' },
    { id: 'hr-case-13', title: '金蝶 · 贵州茅台 HR 数字化转型', publisher: '金蝶', url: 'https://www.kingdee.com/case/52492', evidenceType: '供应商客户案例', publishedAt: null, limitation: '供应商案例，支持考勤、薪酬和社保一体化，但未隔离生成式 AI 影响。' },
    { id: 'hr-case-14', title: '金蝶 · 佰美基因人力资源管理', publisher: '金蝶', url: 'https://www.kingdee.com/success-stories/1574590651243192322.html', evidenceType: '供应商客户案例', publishedAt: null, limitation: '供应商案例，展示的是已配置公式和提醒，而非自主生成式 AI。' },
  );

  hrRadar.scenarios = hrRadar.scenarios.map((scenario) => {
    const { companyCases = [], extraEvidenceIds = [], ...enhancement } = scenarioEnhancements[scenario.id];
    return {
      ...scenario,
      ...enhancement,
      matrixEligible: true,
      matrixRank: Number(scenario.number),
      evidenceIds: [...scenario.evidenceIds, ...extraEvidenceIds],
      companyCases: [...scenario.companyCases, ...companyCases].map((companyCase) => ({ market: '国际', ...companyCase })),
    };
  });

  hrRadar.scenarios.push(
    {
      id: 'hr-13', number: '13', title: '用 AI 清洗考勤数据并识别异常记录', shortTitle: '考勤清洗检查', priority: 'P1', category: 'payroll', value: 4.5, feasibility: 4.5, matrix: { x: 0, y: 0 }, matrixEligible: false, matrixRank: null,
      problem: [
        '多个打卡、排班和请假系统的字段口径不一，月底需要人工合并。',
        '重复、缺失、无效日期和排班冲突容易漏进薪酬核算。',
        '异常原因可能是补卡、异常班次或接口错误，不能仅凭模型推断。',
      ],
      aiValue: [
        '只读取获授权的考勤、排班、请假、员工主数据和已批准规则。',
        '统一字段与时区，识别重复、缺失、越界和排班冲突，并标记判断依据。',
        '输出可追溯的标准化数据、异常清单、原始字段对照和处理日志。',
        '具名考勤专员联系员工或经理核实并接受或退回每条修正，再交薪酬人员。',
      ],
      risk: '模型推断不得直接写入薪酬；有争议的记录、规则冲突和低置信度结果必须转交具名 HR 复核。异常标记不得自动扣工资、修改考勤或作纪律处理。',
      evidenceIds: ['hr-src-11', 'hr-src-15', 'hr-case-13'],
      companyCases: [
        { company: '贵州茅台', summary: '金蝶案例描述茅台将考勤、薪酬和社保等 HR 业务纳入数字化平台。', sourceId: 'hr-case-13', caseType: '客户案例', caveat: '这是数字化一体化案例，不是隔离的生成式 AI 测试。', market: '中国' },
      ],
      confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
      humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。',
      evidenceWindow: 'current',
      sourceFacts: [
        { sourceId: 'hr-src-15', text: '金蝶方法文章描述多源考勤数据自动采集、清洗和异常推送给责任人核实。', locator: '五阶自动化引擎·数据自动采集' },
        { sourceId: 'hr-case-13', text: '茅台客户案例将考勤、薪酬与社保列为 HR 数字化业务。', locator: '一体共享，让数据多跑腿' },
      ],
      acceptanceMetrics: ['以人工标注样本计算异常识别准确率。', '按周统计人工复核后的修改与退回比例。', '记录从数据导入到具名 HR 接受的中位周转时间。', '未经授权自动写入考勤或薪酬的次数必须为 0。'],
      scorecard: { dimensions: { businessValue: 26, processFit: 18, readiness: 12, evidence: 8, riskControl: 13 }, total: 77, rationale: '考勤清洗高频且规则可检验，适合以异常清单辅助人工。', prerequisite: '统一员工 ID、班次、时区、假期规则和修正审批流。', redLine: false },
    },
    {
      id: 'hr-14', number: '14', title: '用 AI 生成工资初算表和计算公式，但不执行发薪', shortTitle: '工资初算草稿', priority: 'P2', category: 'payroll', value: 4, feasibility: 3, matrix: { x: 0, y: 0 }, matrixEligible: false, matrixRank: null,
      problem: ['考勤、绩效、提成、社保和个税数据分散，薪酬专员重复搬运。', '岗位、地区和月份规则频繁变化，表格公式容易被覆盖或错引。', '初算结果涉及个人生计，错误写回或付款难以挽回。'],
      aiValue: ['只读取获授权的员工主数据、已确认考勤、薪酬项目和生效规则。', '按员工和薪酬项映射来源，生成可检查公式并对空值、越界与规则冲突标记。', '输出带数据来源、公式版本、差异说明和审计轨迹的工资初算草稿。', '具名薪酬专员和审批人逐级复核、接受后，再在隔离的发薪流程中处理。'],
      risk: '禁止 AI 执行或审批发薪，不得写回薪酬生产系统或发起付款；仅生成待复核草稿。',
      evidenceIds: ['hr-src-11', 'hr-src-15', 'hr-case-14'],
      companyCases: [{ company: '佰美基因', summary: '金蝶案例称佰美将 86 项薪酬项目统一并在系统中配置薪酬计算公式。', sourceId: 'hr-case-14', caseType: '客户案例', caveat: '案例是已配置公式，不是自主生成或发薪。', market: '中国' }],
      confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
      humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。', evidenceWindow: 'current',
      sourceFacts: [{ sourceId: 'hr-src-15', text: '金蝶方法文章描述规则配置、单人试算和可追溯的批量计算。', locator: '五阶自动化引擎·规则配置与批量计算' }, { sourceId: 'hr-case-14', text: '佰美案例披露统一 86 项薪酬项目并将计算公式配置到系统。', locator: '解决方案·一体化的集团管控平台' }],
      acceptanceMetrics: ['以人工基准样本计算初算金额和公式的一致性。', '按薪酬项统计人工复核后的修改与退回比例。', '记录从数据齐备到初算草稿被接受的中位周转时间。', '未经授权自动写回、发薪或付款的次数必须为 0。'],
      scorecard: { dimensions: { businessValue: 25, processFit: 16, readiness: 10, evidence: 6, riskControl: 5 }, total: 62, rationale: '初算可节省搬运和公式维护时间，但错误后果高且证据偏弱。', prerequisite: '锁定规则版本、使用脱敏测试数据，并与写回、审批和支付权限物理隔离。', redLine: false },
    },
    {
      id: 'hr-15', number: '15', title: '用 AI 复核薪资波动、缺项和计算异常', shortTitle: '薪资异常复核', priority: 'P1', category: 'payroll', value: 4.5, feasibility: 4, matrix: { x: 0, y: 0 }, matrixEligible: false, matrixRank: null,
      problem: ['薪资专员需逐行比较本期与历史金额，异常原因分散。', '缺少薪酬项、净额大幅波动和规则越界可能在发薪后才被发现。', '正常调薪、补发或休假也会触发异常，不能将波动当成错误。'],
      aiValue: ['只读取获授权的本期与历史薪资明细、规则版本和已批准人事变动。', '比较薪酬项、净额和同类群体变化，识别缺项、越界和需要调查的差异。', '输出带来源数据、规则、阈值和可能解释的异常清单与复核记录。', '具名薪酬专员调查原因并接受或关闭线索，薪酬负责人批准任何修正。'],
      risk: '异常只是调查线索，不得因模型标记而冻结、修改或扣减工资。', evidenceIds: ['hr-src-11', 'hr-src-12'], companyCases: [],
      confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
      humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。', evidenceWindow: 'current',
      sourceFacts: [{ sourceId: 'hr-src-12', text: 'ADP 披露 Payroll Variance Agent 会识别薪资数据偏差，建议修复并交由 HR 和薪资团队复核批准。', locator: 'Leveraging AI for payroll excellence and risk mitigation' }, { sourceId: 'hr-src-11', text: 'WorkBuddy 文章将人事数据整理与检查作为日常 HR 工作流程示例，未报告成效。', locator: '第三个工作流：考勤+工资核算' }],
      acceptanceMetrics: ['以人工调查结果计算薪资异常识别准确率。', '按异常类型统计人工复核后的修改与覆盖比例。', '记录从异常产生到具名 HR 关闭的中位处理时间。', '未经授权自动冻结、修改或扣减工资的次数必须为 0。'],
      scorecard: { dimensions: { businessValue: 24, processFit: 18, readiness: 11, evidence: 9, riskControl: 11 }, total: 73, rationale: '薪资异常检查有明确产品边界和人工复核点，但缺独立客户证据。', prerequisite: '建立可解释阈值、变动原因码和人工调查工作台。', redLine: false },
    },
    {
      id: 'hr-16', number: '16', title: '用 AI 回答社保公积金问题，并引用属地政策', shortTitle: '社保政策问答', priority: 'P1', category: 'compliance', value: 4, feasibility: 4, matrix: { x: 0, y: 0 }, matrixEligible: false, matrixRank: null,
      problem: ['社保与公积金规则按城市、人员状态和时间变化，员工难找到适用口径。', '政策文件、办事页和内部流程分散，HR 重复回答仍可能引用过期内容。', '个人缴费、补缴或特殊身份个案涉及权益，需要专业判断。'],
      aiValue: ['只读取获授权且标注城市、版本、生效日和链接的官方政策与内部流程。', '识别员工所在地、身份和问题类型，检索适用条款并标记冲突或缺失信息。', '输出明示城市、版本、生效日、原文链接和适用前提的可追溯答案。', '具名社保专员接手低置信、补缴、跨城和争议个案，并确认员工获得回复。'],
      risk: '回答可能过期或错配属地；必须显示城市、版本、生效日和链接，不得替代 HR 或专业法律意见。',
      evidenceIds: ['hr-src-11', 'hr-src-14', 'hr-case-13'],
      companyCases: [{ company: '贵州茅台', summary: '金蝶客户案例将社保与年金等业务纳入人力资源数字化整合。', sourceId: 'hr-case-13', caseType: '客户案例', caveat: '案例支持社保与年金整合，不是 AI 法律咨询验证。', market: '中国' }],
      confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
      humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。', evidenceWindow: 'current',
      sourceFacts: [{ sourceId: 'hr-src-14', text: 'SAP HR Service Assistant 产品页描述政策感知回答、自助引导和复杂请求创建工单。', locator: 'Overview 与 Tasks this assistant can help with' }, { sourceId: 'hr-case-13', text: '茅台案例将社保与年金等业务纳入 HR 数字化整合。', locator: '一体共享，让数据多跑腿' }],
      acceptanceMetrics: ['以官方政策样本计算条款引用与属地匹配的准确率。', '按问题类型统计人工复核后的修改与退回比例。', '记录从提问到答案或人工接手的中位周转时间。', '未经授权自动更新政策、办理业务或给出法律决定的次数必须为 0。'],
      scorecard: { dimensions: { businessValue: 22, processFit: 17, readiness: 10, evidence: 8, riskControl: 12 }, total: 69, rationale: '高频问答可以依据官方来源验证，但属地与版本控制是硬前提。', prerequisite: '建立官方政策目录、城市与人员身份映射、更新 SLA 和人工路由。', redLine: false },
    },
    {
      id: 'hr-17', number: '17', title: '用 AI 准备社保增减员、基数调整和申报清单', shortTitle: '社保申报清单', priority: 'P2', category: 'compliance', value: 4, feasibility: 3.5, matrix: { x: 0, y: 0 }, matrixEligible: false, matrixRank: null,
      problem: ['入离职、调动和基数变更分散在花名册、薪酬与审批记录中。', '姓名、证件号、基数、属地和生效日的任一错误都可能导致申报失败。', '各地时限和表单不同，自动提交会放大错误与权益风险。'],
      aiValue: ['只读取获授权的花名册、已批准人事变动、薪酬基数、属地规则和官方表单。', '匹配增减员、基数调整和补充材料，检查身份、基数、生效日与缺件。', '输出带原始来源、政策版本、截止日和差异标记的待申报清单。', '具名社保专员逐人复核身份、基数和生效日，接受清单后手工提交并保存回执。'],
      risk: '禁止 AI 自动提交或申报；HR 必须复核身份、基数和生效日，并由具名专员操作官方系统。',
      evidenceIds: ['hr-src-11', 'hr-case-13', 'hr-src-16', 'hr-src-17'], companyCases: [{ company: '贵州茅台', summary: '金蝶案例描述茅台对员工、社保和年金等人力资源业务进行一体化管理。', sourceId: 'hr-case-13', caseType: '客户案例', caveat: '这是业务整合案例，未证明 AI 可自动完成官方申报。', market: '中国' }],
      confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
      humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。', evidenceWindow: 'current',
      sourceFacts: [{ sourceId: 'hr-src-11', text: 'WorkBuddy 文章将花名册维护、材料缺失和社保状态检查作为日常人事流程示例，未验证自动申报。', locator: '第二个工作流：人员全生命周期管理；第四个工作流：社保公积金业务操作' }, { sourceId: 'hr-case-13', text: '茅台案例描述人员、社保和年金等 HR 业务的数字化整合。', locator: '一体共享，让数据多跑腿' }, { sourceId: 'hr-src-16', text: '浙江省税务局办事指南要求用人单位按年申报参保职工上一年度月平均工资，并列出申报表和办理流程；页面未涉及 AI。', locator: '七、申请条件；九、申请材料目录；十一、办理基本流程' }, { sourceId: 'hr-src-17', text: '北京公积金问答列出 2025–2026 年度缴存基数的经办人、线上办理、合并申报和信息不一致时的人工修改流程；未授权 AI 提交。', locator: '三、由谁办理年度缴存基数申报；四、如何办理“年度缴存基数申报”；五、如何合并申报“五险一金”缴存基数' }],
      acceptanceMetrics: ['以已复核申报样本计算身份、基数和生效日字段的准确率。', '按属地统计人工复核后的修改与退回比例。', '记录从人事变动批准到清单被接受的中位处理时间。', '未经授权自动提交或申报的次数必须为 0。'],
      scorecard: { dimensions: { businessValue: 20, processFit: 16, readiness: 10, evidence: 7, riskControl: 8 }, total: 61, rationale: '清单准备可提效，但属地规则和官方提交必须由人负责。', prerequisite: '建立属地规则目录、字段对照、双人复核和提交权限隔离。', redLine: false },
    },
    {
      id: 'hr-18', number: '18', title: '用 AI 起草员工关系沟通方案和协议初稿', shortTitle: '员工关系初稿', priority: 'P2', category: 'relations', value: 3.5, feasibility: 3, matrix: { x: 0, y: 0 }, matrixEligible: false, matrixRank: null,
      problem: ['员工关系个案的事实、政策、沟通记录和模板分散，起草耗时。', '类似事件的措辞与流程不一致，可能激化冲突或漏掉员工权利。', '协议条款和沟通建议依赖事实与属地法律，模型不能作出最终判断。'],
      aiValue: ['只读取获授权的个案事实、生效制度、已批准模板和当事人允许使用的沟通记录。', '区分已核实事实、当事人陈述与待核问题，比对模板并提示缺失信息。', '输出带来源、版本、待核问题和备选措辞的沟通方案与协议初稿。', '具名员工关系 HR 和法务或律师联合复核、修订并接受后，再与员工沟通。'],
      risk: '初稿可能误述事实或法律后果；必须由具名 HR 与法务或律师共同复核，不得自动发送、签署或执行。',
      evidenceIds: ['hr-src-11', 'hr-case-12', 'hr-src-18'], companyCases: [{ company: 'Bayer', summary: 'ServiceNow 案例称 Bayer 用 Now Assist 自动摘要 HR 工单和对话，供 HR 坐席处理。', sourceId: 'hr-case-12', caseType: '客户案例', caveat: '案例仅支持 HR 案例摘要，不支持劳动法文书起草。', market: '国际' }],
      confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
      humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。', evidenceWindow: 'current',
      sourceFacts: [{ sourceId: 'hr-case-12', text: 'ServiceNow 披露 Bayer 用 Now Assist 自动摘要 HR 案例和聊天，每周生成 350 多份摘要。', locator: 'Bayer solves HR case backlog with GenAI' }, { sourceId: 'hr-src-11', text: 'WorkBuddy 文章以个人实务方式演示日常人事工作流程，未提供独立效果评估。', locator: '第五个工作流：员工关系处理' }, { sourceId: 'hr-src-18', text: 'Acas 指引说明和解协议是须书面形成的法律合同，模板不替代法律意见，劳动者需要独立顾问建议；该要求属英国语境。', locator: 'Putting the agreement in writing; Getting independent advice' }],
      acceptanceMetrics: ['以 HR 与法务标注样本计算事实陈述与模板使用的正确率。', '按文书类型统计人工复核后的修改与退回比例。', '记录从材料齐备到 HR 和法务接受初稿的中位周转时间。', '未经授权自动发送、签署或执行法律文件的次数必须为 0。'],
      scorecard: { dimensions: { businessValue: 18, processFit: 14, readiness: 9, evidence: 6, riskControl: 7 }, total: 54, rationale: '可辅助整理与起草，但证据仅为邻近的案例摘要用途，法律风险高。', prerequisite: '限定已批准模板、事实来源和双重复核，屏蔽发送与签署权限。', redLine: false },
    },
    {
      id: 'hr-19', number: '19', title: '用 AI 整理劳动争议事实、证据和事件时间线', shortTitle: '争议证据时间线', priority: 'P2', category: 'relations', value: 4, feasibility: 3, matrix: { x: 0, y: 0 }, matrixEligible: false, matrixRank: null,
      problem: ['劳动争议材料横跨合同、邮件、即时通信、薪资和考勤系统。', '日期、人物、附件和版本不一致时，人工整理容易漏项或混淆陈述与事实。', '争议走向受证据可采性、程序和属地法律影响，不能由模型预测胜诉。'],
      aiValue: ['只读取经法务授权且保留原始文件的合同、沟通、考勤、薪资和审批材料。', '抽取日期、事件、当事人和文件关联，标记矛盾、缺口和待核问题而不下法律结论。', '输出每个节点可回链原件、版本和处理记录的事实表、证据目录与时间线。', '具名员工关系 HR 和法务或律师逐项核验并接受，决定何者进入正式案件材料。'],
      risk: '不得输出胜诉概率、责任认定或法律决定；原始证据不得被覆盖，可采性与策略由律师判断。',
      evidenceIds: ['hr-src-11', 'hr-case-12', 'hr-src-19', 'hr-src-20'], companyCases: [{ company: 'Bayer', summary: 'ServiceNow 客户案例披露 Bayer 用生成式 AI 摘要 HR 工单和对话，供 HR 坐席处理。', sourceId: 'hr-case-12', caseType: '客户案例', caveat: '这是邻近的案例摘要证据，不是仲裁证据分析。', market: '国际' }],
      confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
      humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。', evidenceWindow: 'current',
      sourceFacts: [{ sourceId: 'hr-case-12', text: 'Bayer 案例中 Now Assist 的公开用途是摘要 HR 案例和聊天，帮助 HR 坐席获取信息。', locator: 'Bayer solves HR case backlog with GenAI' }, { sourceId: 'hr-src-11', text: 'WorkBuddy 文章以个人实务方式演示日常人事工作流程，未提供仲裁材料分析成效。', locator: '第五个工作流：员工关系处理' }, { sourceId: 'hr-src-19', text: '白云区人社局清单要求仲裁申请书填写证据的证明目的并按顺序编页，证据材料按清单顺序排列且原件自行保存；这是地方立案材料指南。', locator: '白云区劳动人事争议仲裁申请材料清单第 4–5 项；文书填写说明第 2 项' }, { sourceId: 'hr-src-20', text: 'Thomson Reuters 产品文章说明 CoCounsel 可从起诉文件、邮件和记录生成带源文件的时间线，并按人员、日期或争点批量分析文档；此处不引用其效率数字。', locator: 'Timeline creation drops from hours to minutes; Document review accelerates from days to under an hour' }],
      acceptanceMetrics: ['以法务标注样本计算日期、人物和原件关联的准确率。', '按材料类型统计人工复核后的修改与退回比例。', '记录从材料导入到法务接受时间线的中位处理时间。', '未经授权自动改写原件、输出胜诉概率或法律决定的次数必须为 0。'],
      scorecard: { dimensions: { businessValue: 20, processFit: 15, readiness: 9, evidence: 7, riskControl: 8 }, total: 59, rationale: '证据编目和时间线可节省大量整理时间，但不能越过法律判断边界。', prerequisite: '保全原件与元数据、建立权限与保密控制，并由律师定义验收。', redLine: false },
    },
    {
      id: 'hr-20', number: '20', title: '用 AI 检查人事制度、表单版本、签字和到期风险', shortTitle: '人事文档风险', priority: 'P1', category: 'compliance', value: 4.5, feasibility: 4, matrix: { x: 0, y: 0 }, matrixEligible: false, matrixRank: null,
      problem: ['制度、合同和表单分散在网盘与流程系统，员工可能继续使用旧版。', '签字、附件、审批和到期日期缺失时，人工盘点难以持续发现。', '文本偏差不必然等于违法或无效，需要 HR 与法务结合情境判断。'],
      aiValue: ['只读取获授权的制度库、模板、合同台账、审批记录和保留规则。', '比对文档类型、版本、生效日、签字、附件与到期日，识别差异和待核项。', '输出可回链原文、当前版本和检查规则的风险提示清单、差异表与到期日历。', '具名 HR 文档负责人复核并接受提示，制度修订和合同处理由 HR 与法务批准。'],
      risk: '风险提示不是合规结论；制度修订、合同变更或失效处理必须由具名 HR 和法务审批。',
      evidenceIds: ['hr-src-11', 'hr-src-13', 'hr-case-14'], companyCases: [{ company: '佰美基因', summary: '金蝶案例描述佰美通过预警配置提醒合同到期和员工转正，并以流程审批处理人事业务。', sourceId: 'hr-case-14', caseType: '客户案例', caveat: '案例是已配置的提醒和工作流，不是自主生成式风险决策。', market: '中国' }],
      confidence: { level: 'low', reason: 'WorkBuddy 文章提供流程示例；供应商资料和客户案例只能支持方向判断，效果需在本企业重新验证。' },
      humanHandoff: '低置信度、规则冲突、个人权益或任何不可逆动作必须转交具名 HR；工资、申报和法律文件不得由 AI 独立生效。', evidenceWindow: 'current',
      sourceFacts: [{ sourceId: 'hr-src-13', text: 'SAP Core HR Assistant 产品页描述检测数据不一致、监控工作流并在人工参与下处理集成问题。', locator: 'Overview 与 Agents used by this assistant' }, { sourceId: 'hr-case-14', text: '佰美案例披露通过预警配置提醒员工合同到期与转正。', locator: '解决方案·一体化的集团管控平台' }],
      acceptanceMetrics: ['以 HR 标注样本计算旧版、缺签字和到期项识别的准确率。', '按文档类型统计人工复核后的修改与退回比例。', '记录从文档扫描到负责人接受提示的中位周转时间。', '未经授权自动发布制度、修改合同或执行失效处理的次数必须为 0。'],
      scorecard: { dimensions: { businessValue: 23, processFit: 17, readiness: 11, evidence: 9, riskControl: 14 }, total: 74, rationale: '版本、签字和到期检查规则清晰且可追溯，适合作为人工复核入口。', prerequisite: '统一文档台账、当前版本、签署状态和负责人，并禁止模型自动发布。', redLine: false },
    },
  );

  window.OPPORTUNITY_RADAR_DATA = deepFreeze(hrRadar);
})();
