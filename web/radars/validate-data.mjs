import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const REQUIRED_TEXT = ['id', 'title', 'eyebrow', 'updatedAt', 'coreJudgment', 'goal90Days'];
const SCENARIO_TEXT = ['id', 'number', 'title', 'priority', 'category', 'problem', 'aiRole', 'valueCase', 'feasibilityCase', 'risk', 'humanOwner'];
const CALIBRATION_PUBLISHERS = ['BCG', 'Anthropic', 'McKinsey', 'MIT Sloan', 'Bain'];

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function pushMissing(errors, object, fields, prefix) {
  for (const field of fields) if (!nonEmpty(object?.[field])) errors.push(`${prefix}.${field} must be non-empty text`);
}

function uniqueCount(items, key) {
  return new Set(items.map((item) => item?.[key])).size;
}

function validSourceUrl(value) {
  if (!nonEmpty(value)) return false;
  if (value.startsWith('/archive/')) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
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
  new vm.Script(source, { filename: filePath }).runInContext(context, { timeout: 1_000 });
  if (!context.window.OPPORTUNITY_RADAR_DATA) throw new Error(`${filePath} did not assign window.OPPORTUNITY_RADAR_DATA`);
  return context.window.OPPORTUNITY_RADAR_DATA;
}

export function validateRadarData(data, options = {}) {
  const errors = [];
  pushMissing(errors, data, REQUIRED_TEXT, 'radar');

  const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];
  const pilots = Array.isArray(data?.pilots) ? data.pilots : [];
  const gates = Array.isArray(data?.governanceGates) ? data.governanceGates : [];
  const kpis = Array.isArray(data?.kpis) ? data.kpis : [];
  const calibrations = Array.isArray(data?.sourceCalibrations) ? data.sourceCalibrations : [];
  const sources = Array.isArray(data?.sources) ? data.sources : [];

  if (data?.scenarioCount !== 12 || scenarios.length !== 12) errors.push('radar.scenarioCount and scenarios.length must both equal 12');
  if (data?.p0Count !== 3 || scenarios.filter((item) => item.priority === 'P0').length !== 3) errors.push('radar.p0Count and actual P0 count must both equal 3');
  if (data?.horizonDays !== 90) errors.push('radar.horizonDays must equal 90');
  if (uniqueCount(scenarios, 'id') !== scenarios.length) errors.push('scenario IDs must be unique');

  const sourceIds = new Set(sources.map((source) => source?.id));
  scenarios.forEach((scenario, index) => {
    const prefix = `scenarios[${index}]`;
    pushMissing(errors, scenario, SCENARIO_TEXT, prefix);
    if (!/^\d{2}$/.test(scenario?.number || '')) errors.push(`${prefix}.number must contain two digits`);
    if (!['P0', 'P1', 'P2', 'P3'].includes(scenario?.priority)) errors.push(`${prefix}.priority is invalid`);
    for (const field of ['value', 'feasibility']) if (typeof scenario?.[field] !== 'number' || scenario[field] < 1 || scenario[field] > 5) errors.push(`${prefix}.${field} must be in [1,5]`);
    for (const field of ['x', 'y']) if (typeof scenario?.matrix?.[field] !== 'number' || scenario.matrix[field] < 0 || scenario.matrix[field] > 100) errors.push(`${prefix}.matrix.${field} must be in [0,100]`);
    if (!Array.isArray(scenario?.evidenceIds) || scenario.evidenceIds.length === 0) errors.push(`${prefix}.evidenceIds must be non-empty`);
    else for (const id of scenario.evidenceIds) if (!sourceIds.has(id)) errors.push(`${prefix}.evidenceIds contains unknown source ${id}`);
  });

  if (pilots.length !== 3) errors.push('radar.pilots must contain exactly 3 entries');
  pilots.forEach((pilot, index) => pushMissing(errors, pilot, ['id', 'label', 'title', 'scope', 'acceptance'], `pilots[${index}]`));
  if (gates.length !== 6 || gates.some((gate) => !nonEmpty(gate))) errors.push('radar.governanceGates must contain exactly 6 non-empty entries');
  if (kpis.length !== 5) errors.push('radar.kpis must contain exactly 5 entries');
  kpis.forEach((kpi, index) => pushMissing(errors, kpi, ['id', 'label', 'metrics'], `kpis[${index}]`));
  if (calibrations.length !== 5) errors.push('radar.sourceCalibrations must contain exactly 5 entries');
  const calibrationNames = calibrations.map((item) => item?.publisher).sort();
  if (JSON.stringify(calibrationNames) !== JSON.stringify([...CALIBRATION_PUBLISHERS].sort())) errors.push('radar.sourceCalibrations publishers must match the five approved sources');
  calibrations.forEach((item, index) => pushMissing(errors, item, ['publisher', 'insight'], `sourceCalibrations[${index}]`));

  if (sources.length === 0) errors.push('radar.sources must be non-empty');
  if (uniqueCount(sources, 'id') !== sources.length) errors.push('source IDs must be unique');
  sources.forEach((source, index) => {
    pushMissing(errors, source, ['id', 'title', 'publisher', 'evidenceType', 'limitation'], `sources[${index}]`);
    if (!validSourceUrl(source?.url)) errors.push(`sources[${index}].url must be an HTTPS or /archive/ URL`);
    validateLocalSource(source, options, errors);
  });
  if (data?.id === 'legal' && sources.length !== 16) errors.push('legal radar must contain exactly 16 sources');
  if (data?.id === 'hr') {
    const boundary = scenarios.find((item) => item.id === 'hr-12')?.humanOwner || '';
    if (!boundary.includes('禁止') || !boundary.includes('具名人员')) errors.push('hr-12 must prohibit autonomous action and require a named human owner');
  }

  if (errors.length) throw new Error(errors.join('\n'));
  return { id: data.id, scenarios: scenarios.length, p0: scenarios.filter((item) => item.priority === 'P0').length, pilots: pilots.length, gates: gates.length, kpis: kpis.length, calibrations: calibrations.length };
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
  const radars = await Promise.all(['legal', 'hr'].map((domain) => loadRadarFile(path.join(radarRoot, 'data', `${domain}.js`))));
  for (const summary of validateRadarCollection(radars, { radarRoot })) console.log(`${summary.id}: ${summary.scenarios} scenarios, ${summary.p0} P0, ${summary.pilots} pilots, ${summary.gates} gates, ${summary.kpis} KPI groups, ${summary.calibrations} calibrations`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
