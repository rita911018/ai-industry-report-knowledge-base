export const TAXONOMY_VERSION = 'zh-management-v1';

export const CANONICAL_TOPICS = Object.freeze([
  'AI 战略与价值',
  '战略、增长与行业洞察',
  '客户、品牌与零售',
  '运营、供应链与成本',
  '财务、投资与资本',
  '组织、人才与工作',
  '技术、数据与架构',
  '治理、风险与安全',
  '可持续发展与韧性',
  '前沿研究与社会影响',
]);

const GROUPS = Object.freeze({
  'AI 战略与价值': [
    'AI战略与价值',
    'AI 战略与价值',
    'strategy-value',
    'ai-operating-model',
    'operating-model-agents',
    'enterprise-workflows',
  ],
  '战略、增长与行业洞察': [
    '战略与行业观察',
    '战略、增长与行业洞察',
    'strategy-growth-transformation',
    'industry-market-signals',
    'macro-risk-geopolitics',
    'risk-geopolitics',
    'ecosystem-policy',
    'innovation-methods',
  ],
  '客户、品牌与零售': [
    '消费者、品牌与营销',
    '客户、增长与商业模式',
    '客户、品牌与零售',
    'consumer-brand-retail',
    'consumer-brand',
    'retail-fashion',
  ],
  '运营、供应链与成本': [
    '运营、供应链与成本',
    'operations-supply-chain',
    'operations',
  ],
  '财务、投资与资本': [
    '财务、投资与资本',
    'finance-investment-ma',
    'finance-functional-use',
    'strategy-finance',
  ],
  '组织、人才与工作': [
    '组织、人才与变革',
    '组织、人才与工作',
    'organization-leadership-talent',
    'organization-work',
    'organization',
    'organization-talent',
  ],
  '技术、数据与架构': [
    '技术、数据与架构',
    '数据、平台与基础设施',
    'ai-digital-platform',
    'agent-architecture',
    'architecture-data',
    'data-architecture',
    'models-platform',
  ],
  '治理、风险与安全': [
    '治理、风险与安全',
    'safety-governance',
    'governance-risk-trust',
    'cyber-resilience',
  ],
  '可持续发展与韧性': [
    '可持续与韧性',
    '可持续发展与韧性',
    'sustainability-resilience',
  ],
  '前沿研究与社会影响': [
    '前沿研究与技术',
    '前沿研究与社会影响',
    'physical-science',
    'economics-society',
  ],
});

const TOPIC_MAP = new Map(
  Object.entries(GROUPS).flatMap(([canonical, aliases]) => (
    aliases.map((alias) => [alias, canonical])
  )),
);

export function canonicalTopicFor(value) {
  const topic = TOPIC_MAP.get(value);
  if (!topic) throw new Error(`Unknown article topic: ${value}`);
  return topic;
}

export function normalizeCategory(category = {}) {
  const sourcePrimary = category.sourcePrimary || category.primary;
  return {
    ...category,
    primary: canonicalTopicFor(category.primary),
    secondary: Array.isArray(category.secondary) ? category.secondary : [],
    sourcePrimary,
    taxonomyVersion: TAXONOMY_VERSION,
  };
}
