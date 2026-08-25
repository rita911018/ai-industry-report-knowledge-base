import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const REQUIRED_TEXT = ['id', 'title', 'eyebrow', 'updatedAt', 'coreJudgment'];
const SCENARIO_TEXT = ['id', 'number', 'title', 'shortTitle', 'priority', 'category', 'risk'];
const CASE_TEXT = ['company', 'summary', 'sourceId', 'caseType', 'caveat', 'market'];
const CASE_TYPES = new Set(['客户案例', '公司披露', '研究案例', '警示案例']);
const CASE_MARKETS = new Set(['中国', '国际']);
const CONFIDENCE_LEVELS = new Set(['high', 'middle', 'low']);
const EVIDENCE_WINDOWS = new Set(['current', 'legacy_reference']);
const SCORE_MAXIMUMS = Object.freeze({ businessValue: 30, processFit: 20, readiness: 15, evidence: 15, riskControl: 20 });

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function pushMissing(errors, object, fields, prefix) {
  for (const field of fields) if (!nonEmpty(object?.[field])) errors.push(`${prefix}.${field} must be non-empty text`);
}

function uniqueCount(items, key) {
  return new Set(items.map((item) => item?.[key])).size;
}

function validateTextArray(value, minimum, prefix, errors) {
  if (!Array.isArray(value) || value.length < minimum) {
    errors.push(`${prefix} must contain at least ${minimum} entries`);
    return;
  }
  value.forEach((item, index) => {
    if (!nonEmpty(item)) errors.push(`${prefix}[${index}] must be non-empty text`);
  });
}

function validateScorecard(scenario, prefix, errors) {
  const scorecard = scenario?.scorecard;
  if (!scorecard || typeof scorecard !== 'object') {
    errors.push(`${prefix}.scorecard must be an object`);
    return;
  }
  pushMissing(errors, scorecard, ['rationale', 'prerequisite'], `${prefix}.scorecard`);
  if (typeof scorecard.redLine !== 'boolean') errors.push(`${prefix}.scorecard.redLine must be boolean`);

  const dimensions = scorecard.dimensions;
  if (!dimensions || typeof dimensions !== 'object') {
    errors.push(`${prefix}.scorecard.dimensions must be an object`);
    return;
  }
  let calculatedTotal = 0;
  for (const [dimension, maximum] of Object.entries(SCORE_MAXIMUMS)) {
    const score = dimensions[dimension];
    if (!Number.isInteger(score) || score < 0 || score > maximum) {
      errors.push(`${prefix}.scorecard.dimensions.${dimension} must be an integer in [0,${maximum}]`);
    } else {
      calculatedTotal += score;
    }
  }
  if (!Number.isInteger(scorecard.total) || scorecard.total !== calculatedTotal) {
    errors.push(`${prefix}.scorecard.total must equal the five dimension scores`);
  }

  if (scenario.priority === 'P0' && (scorecard.total < 80 || scorecard.redLine)) errors.push(`${prefix} P0 requires total >= 80 and no red line`);
  if (scenario.priority === 'P1' && (scorecard.total < 65 || scorecard.total > 79 || scorecard.redLine)) errors.push(`${prefix} P1 requires total 65-79 and no red line`);
  if (scenario.priority === 'P2' && (scorecard.total < 50 || scorecard.redLine || (scorecard.total > 64 && !nonEmpty(scorecard.prerequisite)))) errors.push(`${prefix} P2 requires total 50-64 or a documented prerequisite, without a red line`);
  if (scenario.priority === 'P3' && !scorecard.redLine) errors.push(`${prefix} P3 requires a risk red line`);
}

function validSourceUrl(value) {
  if (!nonEmpty(value)) return false;
  if (value.startsWith('/archive/')) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateLocalSource(source, { radarRoot, archiveRoot }, errors) {
  if (!source.url?.startsWith('/archive/')) return;
  const resolvedArchive = path.resolve(archiveRoot || path.resolve(radarRoot, '../../work/archive'));
  const relative = decodeURIComponent(source.url.slice('/archive/'.length));
  const target = path.resolve(resolvedArchive, relative);
  if (target !== resolvedArchive && !target.startsWith(`${resolvedArchive}${path.sep}`)) {
    errors.push(`source ${source.id} escapes archive root`);
  } else if (!existsSync(target)) {
    errors.push(`source ${source.id} local path does not exist: ${source.url}`);
  }
}

export async function loadRadarFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const context = vm.createContext({ window: {} });
  const builderPath = path.join(path.dirname(filePath), 'extended-builder.js');
  if (source.includes('buildExtendedRadar') && existsSync(builderPath)) {
    new vm.Script(readFileSync(builderPath, 'utf8'), { filename: builderPath }).runInContext(context, { timeout: 1_000 });
  }
  new vm.Script(source, { filename: filePath }).runInContext(context, { timeout: 1_000 });
  if (!context.window.OPPORTUNITY_RADAR_DATA) throw new Error(`${filePath} did not assign window.OPPORTUNITY_RADAR_DATA`);
  return structuredClone(context.window.OPPORTUNITY_RADAR_DATA);
}

export function validateRadarData(data, options = {}) {
  const errors = [];
  pushMissing(errors, data, REQUIRED_TEXT, 'radar');
  const isExtended = data?.schemaVersion === '2.0';
  const isRankedLibrary = isExtended || data?.libraryMode === 'ranked';

  const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];
  const pilots = Array.isArray(data?.pilots) ? data.pilots : [];
  const sources = Array.isArray(data?.sources) ? data.sources : [];

  if (isRankedLibrary) {
    const radarKind = isExtended ? 'extended' : 'ranked';
    if (data?.scenarioCount !== scenarios.length || scenarios.length < 20 || scenarios.length > 30) errors.push(`${radarKind} radar.scenarioCount must match 20–30 scenarios`);
    if (data?.p0Count !== scenarios.filter((item) => item.priority === 'P0').length) errors.push(`${radarKind} radar.p0Count must match the actual P0 count`);
  } else {
    if (data?.scenarioCount !== 12 || scenarios.length !== 12) errors.push('radar.scenarioCount and scenarios.length must both equal 12');
    if (data?.p0Count !== 3 || scenarios.filter((item) => item.priority === 'P0').length !== 3) errors.push('radar.p0Count and actual P0 count must both equal 3');
  }
  if (uniqueCount(scenarios, 'id') !== scenarios.length) errors.push('scenario IDs must be unique');

  const sourceIds = new Set(sources.map((source) => source?.id));
  const sourceById = new Map(sources.map((source) => [source?.id, source]));
  scenarios.forEach((scenario, index) => {
    const prefix = `scenarios[${index}]`;
    pushMissing(errors, scenario, SCENARIO_TEXT, prefix);
    if (!/^(用 AI|让 AI)/.test(scenario?.title || '')) errors.push(`${prefix}.title must start with 用 AI or 让 AI`);
    if (nonEmpty(scenario?.shortTitle) && (scenario.shortTitle.length < 4 || scenario.shortTitle.length > 14)) errors.push(`${prefix}.shortTitle must contain 4-14 characters`);
    if (!/^\d{2}$/.test(scenario?.number || '')) errors.push(`${prefix}.number must contain two digits`);
    if (!['P0', 'P1', 'P2', 'P3'].includes(scenario?.priority)) errors.push(`${prefix}.priority is invalid`);
    validateTextArray(scenario?.problem, 3, `${prefix}.problem`, errors);
    validateTextArray(scenario?.aiValue, 4, `${prefix}.aiValue`, errors);
    validateScorecard(scenario, prefix, errors);
    for (const field of ['value', 'feasibility']) if (typeof scenario?.[field] !== 'number' || scenario[field] < 1 || scenario[field] > 5) errors.push(`${prefix}.${field} must be in [1,5]`);
    for (const field of ['x', 'y']) if (typeof scenario?.matrix?.[field] !== 'number' || scenario.matrix[field] < 0 || scenario.matrix[field] > 100) errors.push(`${prefix}.matrix.${field} must be in [0,100]`);
    if (!Array.isArray(scenario?.evidenceIds) || scenario.evidenceIds.length === 0) errors.push(`${prefix}.evidenceIds must be non-empty`);
    else for (const id of scenario.evidenceIds) if (!sourceIds.has(id)) errors.push(`${prefix}.evidenceIds contains unknown source ${id}`);
    if (isRankedLibrary) {
      if (typeof scenario?.matrixEligible !== 'boolean') errors.push(`${prefix}.matrixEligible must be boolean`);
      const hasExplicitMatrixRank = typeof scenario === 'object' && scenario !== null && Object.hasOwn(scenario, 'matrixRank') && scenario.matrixRank !== undefined;
      const hasRank = hasExplicitMatrixRank && scenario.matrixRank !== null;
      if (!hasExplicitMatrixRank || (hasRank && (!Number.isInteger(scenario.matrixRank) || scenario.matrixRank < 1 || scenario.matrixRank > 12))) errors.push(`${prefix}.matrixRank must be an integer in [1,12] or null`);
      if (hasRank && !scenario?.matrixEligible) errors.push(`${prefix}.matrixRank requires matrixEligible to be true`);
      if (isExtended && hasRank && (scenario?.priority === 'P3' || scenario?.scorecard?.redLine)) errors.push(`${prefix}.matrixRank cannot include a P3 or red-line scenario`);
    }
    if (isExtended) {
      if (!scenario?.confidence || !CONFIDENCE_LEVELS.has(scenario.confidence.level) || !nonEmpty(scenario.confidence.reason)) errors.push(`${prefix}.confidence requires a valid level and reason`);
      if (!nonEmpty(scenario?.humanHandoff)) errors.push(`${prefix}.humanHandoff must be non-empty text`);
      if (!EVIDENCE_WINDOWS.has(scenario?.evidenceWindow)) errors.push(`${prefix}.evidenceWindow must be current or legacy_reference`);
      validateTextArray(scenario?.acceptanceMetrics, 3, `${prefix}.acceptanceMetrics`, errors);
      if (!Array.isArray(scenario?.sourceFacts) || scenario.sourceFacts.length === 0) errors.push(`${prefix}.sourceFacts must be non-empty`);
      else scenario.sourceFacts.forEach((fact, factIndex) => {
        const factPrefix = `${prefix}.sourceFacts[${factIndex}]`;
        pushMissing(errors, fact, ['sourceId', 'text', 'locator'], factPrefix);
        if (nonEmpty(fact?.sourceId) && !sourceIds.has(fact.sourceId)) errors.push(`${factPrefix}.sourceId contains unknown source ${fact.sourceId}`);
        if (nonEmpty(fact?.sourceId) && Array.isArray(scenario.evidenceIds) && !scenario.evidenceIds.includes(fact.sourceId)) errors.push(`${factPrefix}.sourceId must also appear in evidenceIds`);
      });
      if (scenario?.priority === 'P0' && Array.isArray(scenario.evidenceIds)) {
        const publishers = new Set(scenario.evidenceIds.map((id) => sourceById.get(id)?.publisher).filter(nonEmpty));
        if (publishers.size < 2) errors.push(`${prefix} P0 requires evidence from at least two distinct publishers`);
      }
    }
    if (!Array.isArray(scenario?.companyCases)) errors.push(`${prefix}.companyCases must be an array`);
    else scenario.companyCases.forEach((companyCase, caseIndex) => {
      const casePrefix = `${prefix}.companyCases[${caseIndex}]`;
      pushMissing(errors, companyCase, CASE_TEXT, casePrefix);
      if (!CASE_TYPES.has(companyCase?.caseType)) errors.push(`${casePrefix}.caseType is invalid`);
      if (!CASE_MARKETS.has(companyCase?.market)) errors.push(`${casePrefix}.market is invalid`);
      if (nonEmpty(companyCase?.sourceId) && !sourceIds.has(companyCase.sourceId)) errors.push(`${casePrefix}.sourceId contains unknown source ${companyCase.sourceId}`);
    });
  });

  const chinaCompanies = new Set(scenarios.flatMap((scenario) => scenario.companyCases || []).filter((companyCase) => companyCase?.market === '中国').map((companyCase) => companyCase.company));
  if (chinaCompanies.size < 2) errors.push('radar must contain at least two different Chinese company cases');

  if (isExtended) {
    if (pilots.length > 3) errors.push('extended radar.pilots must contain no more than 3 entries');
  } else if (pilots.length !== 3) errors.push('radar.pilots must contain exactly 3 entries');
  pilots.forEach((pilot, index) => pushMissing(errors, pilot, ['id', 'label', 'title', 'scope', 'acceptance'], `pilots[${index}]`));
  if (sources.length === 0) errors.push('radar.sources must be non-empty');
  if (uniqueCount(sources, 'id') !== sources.length) errors.push('source IDs must be unique');
  sources.forEach((source, index) => {
    pushMissing(errors, source, ['id', 'title', 'publisher', 'evidenceType', 'limitation'], `sources[${index}]`);
    if (!validSourceUrl(source?.url)) errors.push(`sources[${index}].url must be an HTTPS or /archive/ URL`);
    if (source?.publishedAt !== null && source?.publishedAt !== undefined && !validIsoDate(source.publishedAt)) errors.push(`sources[${index}].publishedAt must be a valid YYYY-MM-DD date`);
    validateLocalSource(source, options, errors);
  });
  if (data?.id === 'legal' && sources.length < 16) errors.push('legal radar must contain at least 16 sources');
  if (data?.id === 'hr') {
    const boundary = scenarios.find((item) => item.id === 'hr-12')?.risk || '';
    if (!boundary.includes('禁止') || !boundary.includes('具名人员')) errors.push('hr-12 risk must prohibit autonomous action and require a named human owner');
  }

  let matrixCount = 0;
  if (isRankedLibrary) {
    const ranks = scenarios.map((scenario) => scenario.matrixRank).filter((rank) => rank !== null && rank !== undefined).sort((a, b) => a - b);
    matrixCount = ranks.length;
    if (ranks.length !== 12 || ranks.some((rank, index) => rank !== index + 1)) errors.push(`${isExtended ? 'extended' : 'ranked'} radar must contain each matrixRank from 1 through 12 exactly once`);
  }

  if (errors.length) throw new Error(errors.join('\n'));
  const summary = { id: data.id, scenarios: scenarios.length, p0: scenarios.filter((item) => item.priority === 'P0').length, pilots: pilots.length };
  if (isRankedLibrary) Object.assign(summary, { scenarioCount: scenarios.length, matrixCount });
  return summary;
}

export function validateRadarCollection(radars, options = {}) {
  const summaries = radars.map((radar) => validateRadarData(radar, options));
  for (const [label, values] of [
    ['radar', radars.map((item) => item.id)],
    ['scenario', radars.flatMap((item) => item.scenarios.map((scenario) => scenario.id))],
    ['source', radars.flatMap((item) => item.sources.map((source) => source.id))],
  ]) if (new Set(values).size !== values.length) throw new Error(`${label} IDs must be unique across the collection`);
  return summaries;
}

async function main() {
  const radarRoot = path.dirname(fileURLToPath(import.meta.url));
  const radars = await Promise.all(['legal', 'hr', 'retail', 'supply-chain', 'finance', 'marketing'].map((domain) => loadRadarFile(path.join(radarRoot, 'data', `${domain}.js`))));
  for (const summary of validateRadarCollection(radars, { radarRoot })) console.log(`${summary.id}: ${summary.scenarios} scenarios, ${summary.p0} P0, ${summary.pilots} priority starts`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
