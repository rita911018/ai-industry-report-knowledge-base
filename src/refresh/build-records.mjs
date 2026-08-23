import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROJECT_SCHEMA_VERSION, assertArticleRecord } from '../schema/article-record.mjs';

const RADAR_TITLES = Object.freeze({
  BCG: 'BCG Insight Radar · 2026-W31 · Static',
  Anthropic: 'Anthropic 最近半年洞察雷达 | 2026-08-02',
  McKinsey: 'McKinsey 最近半年洞察雷达 | 2026-08-02',
  MIT: 'MIT AI Management Insight Radar · 2026-08-04',
  Bain: 'Bain Six-Month Insight Radar · 2026-08-02',
});

const CATEGORY_RULES = [
  {
    pattern: /safety|safeguard|security|cyber|risk|govern|trust|vendor lock|cryptograph|治理|安全|风险|信任/i,
    primary: '治理、风险与安全',
    domains: ['AI Governance', 'Cybersecurity'],
  },
  {
    pattern: /workforce|worker|talent|hr\b|human resources|productivity|adoption|fluency|retraining|organization|人才|员工|生产力|采用/i,
    primary: '组织、人才与变革',
    domains: ['Workforce Transformation', 'Change Management'],
  },
  {
    pattern: /agentic|agent\b|operating model|transformation|enterprise|procurement|business services|智能体|运营模式|采购|转型/i,
    primary: 'AI战略与价值',
    domains: ['AI Transformation', 'Operating Model'],
  },
  {
    pattern: /infrastructure|data center|architecture|cloud|compute|semiconductor|基础设施|数据中心|架构|算力/i,
    primary: '数据、平台与基础设施',
    domains: ['Enterprise Architecture', 'AI Infrastructure'],
  },
  {
    pattern: /growth|sales|commercial|marketing|retail|store|customer|category management|增长|销售|营销|零售|客户/i,
    primary: '客户、增长与商业模式',
    domains: ['Growth', 'Customer Experience'],
  },
  {
    pattern: /research|science|biology|riemann|climate|experiment|研究|科学|生物|黎曼|气候/i,
    primary: '前沿研究与技术',
    domains: ['AI Research', 'Science'],
  },
];

function canonicalizeUrl(value) {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function slugForUrl(value) {
  const url = new URL(value);
  const part = url.pathname.split('/').filter(Boolean).at(-1) || 'article';
  return part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'article';
}

function classify(text) {
  const match = CATEGORY_RULES.find((rule) => rule.pattern.test(text));
  return match || {
    primary: 'AI战略与价值',
    domains: ['AI Transformation'],
  };
}

function scoreFor(text) {
  const evidenceRich = /study|survey|research|case|evidence|measured|experiment|benchmark|研究|调查|案例|证据|实验|数据/i.test(text);
  const applied = /how |guide|building|transform|procurement|operations|growth|strategy|指南|转型|运营|战略/i.test(text);
  const dimensions = evidenceRich
    ? { content: 27, impact: 20, relevance: 21, evidence: 12 }
    : applied
      ? { content: 25, impact: 20, relevance: 21, evidence: 9 }
      : { content: 23, impact: 19, relevance: 20, evidence: 9 };
  const total = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  return { total, dimensions, sourceScale: 100, tier: total >= 78 ? 'high' : total >= 68 ? 'medium' : 'low' };
}

function priorityFor(total) {
  if (total >= 82) return 'must-read';
  if (total >= 74) return 'track';
  return 'reference';
}

function nextIndexes(existing) {
  const counts = new Map();
  for (const record of existing) {
    const current = counts.get(record.publisher) || 0;
    const index = Number.isInteger(record.archiveIndex) ? record.archiveIndex : current + 1;
    counts.set(record.publisher, Math.max(current, index));
  }
  return counts;
}

export function buildRefreshRecords({ candidates, inspections, overrides, existing = [] }) {
  const urlKey = (value) => canonicalizeUrl(value).toLowerCase();
  const inspectionByUrl = new Map((inspections?.candidates || []).map((candidate) => [urlKey(candidate.url), candidate.inspection]));
  const overrideByUrl = new Map(Object.entries(overrides).map(([url, value]) => [urlKey(url), value]));
  const existingUrls = new Set(existing.map((record) => urlKey(record.canonicalUrl || record.sourceUrl)));
  const usedIds = new Set(existing.map((record) => record.id));
  const indexes = nextIndexes(existing);
  const output = [];

  for (const candidate of candidates.candidates.filter((item) => item.status === 'included')) {
    const sourceUrl = canonicalizeUrl(candidate.url);
    const sourceKey = urlKey(sourceUrl);
    if (existingUrls.has(sourceKey)) throw new Error(`Duplicate existing URL: ${sourceUrl}`);
    const override = overrideByUrl.get(sourceKey);
    if (!override?.titleZh) throw new Error(`Missing editorial override for ${sourceUrl}`);
    const inspection = inspectionByUrl.get(sourceKey);
    const titleOriginal = inspection?.status === 'verified' ? inspection.titleOriginal : override.titleOriginal;
    if (!titleOriginal) throw new Error(`Missing verified or editorial title for ${sourceUrl}`);
    if (!RADAR_TITLES[candidate.publisher]) throw new Error(`Unsupported publisher: ${candidate.publisher}`);

    const publisherId = candidate.publisher.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const baseId = `${publisherId}-refresh-${slugForUrl(sourceUrl)}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    existingUrls.add(sourceKey);

    const index = (indexes.get(candidate.publisher) || 0) + 1;
    indexes.set(candidate.publisher, index);
    const analysisText = `${titleOriginal} ${override.titleZh} ${candidate.reason || ''}`;
    const category = classify(analysisText);
    const score = scoreFor(analysisText);
    const reasonZh = `该文位于本次 ${candidates.run?.windowStart || ''} 至 ${candidates.run?.windowEnd || ''} 更新窗口，主题为：${override.titleZh}。`;

    output.push(assertArticleRecord({
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id,
      radarTitle: RADAR_TITLES[candidate.publisher],
      publisher: candidate.publisher,
      sourceUrl,
      canonicalUrl: sourceUrl,
      titleOriginal,
      titleZh: override.titleZh,
      publishedAt: candidate.publishedAt || null,
      documentType: 'Article',
      authorRaw: null,
      category: { primary: category.primary, secondary: [] },
      tags: {
        topics: [category.primary],
        geography: ['全球'],
        horizon: ['未来6–18个月'],
        domains: category.domains,
      },
      priority: priorityFor(score.total),
      score,
      confidence: {
        level: inspection?.status === 'verified' ? 'high' : 'middle',
        reason: inspection?.status === 'verified'
          ? '官方来源页面已验证；具体证据与业务含义将在全文归档后复核。'
          : '官方页面直连受限，标题与日期经官方索引核验；具体证据将在全文导入后复核。',
      },
      coreView: { original: null, zh: reasonZh },
      evidence: [],
      impactZh: `该主题主要影响${category.primary}，可作为近期管理议程与应用机会判断的输入。`,
      implicationZh: '归档全文后，应结合可量化证据、实施条件和风险边界决定是否纳入试点或跟踪清单。',
      archiveIndex: index,
      provenance: {
        sourceFile: `work/refresh/${candidates.run?.id || 'unknown'}/candidates.json`,
        elementId: null,
        extractionBasis: inspection?.status === 'verified' ? 'official_page_verified' : 'official_index_verified',
        discoveryMethod: candidate.discoveryMethod || null,
        discoveryReason: candidate.reason || null,
      },
    }));
  }

  return output;
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key.startsWith('--')) options[key.slice(2)] = argv[++index];
  }
  for (const required of ['candidates', 'inspections', 'overrides', 'ledger', 'out']) {
    if (!options[required]) throw new Error(`Missing --${required}`);
  }
  return options;
}

async function runCli() {
  const options = parseArguments(process.argv.slice(2));
  const [candidates, inspections, overrides, existing] = await Promise.all([
    readFile(path.resolve(options.candidates), 'utf8').then(JSON.parse),
    readFile(path.resolve(options.inspections), 'utf8').then(JSON.parse),
    readFile(path.resolve(options.overrides), 'utf8').then(JSON.parse),
    readFile(path.resolve(options.ledger), 'utf8').then(JSON.parse),
  ]);
  const records = buildRefreshRecords({ candidates, inspections, overrides, existing });
  await writeFile(path.resolve(options.out), `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ output: options.out, records: records.length }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
