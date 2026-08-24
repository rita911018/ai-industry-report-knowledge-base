import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractArticle } from '../archive/extract-article.mjs';
import { fetchPage } from '../archive/fetch-page.mjs';
import { loadRadarFile, validateRadarData } from '../../web/radars/validate-data.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageRoot = path.join(projectRoot, 'work', 'radars', '2026-08-24');

const SOURCE_ARCHIVES = {
  retail: {
    'retail-store-ai': { local: 'work/archive/McKinsey 最近半年洞察雷达 | 2026-08-02/articles/024-shopping-in-the-age-of-ai-redefining-stores-for-a-new-era' },
    'retail-ecommerce-ai': { local: 'work/archive/McKinsey 最近半年洞察雷达 | 2026-08-02/articles/019-europe-s-new-e-commerce-agenda-how-ai-is-resetting-growth-and-competition' },
    'retail-agentic-commerce': { local: 'work/archive/Bain Six-Month Insight Radar · 2026-08-02/articles/018-agentic-ai-commerce-the-next-retail-revolution-is-here' },
    'retail-pricing-bots': { local: 'work/archive/Bain Six-Month Insight Radar · 2026-08-02/articles/059-online-grocery-pricing-for-both-humans-and-bots' },
    'retail-alibaba-1111': { remote: true },
    'retail-haier-digital': { remote: true },
  },
};

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function archiveLocal(source, archive, target) {
  const sourceDirectory = path.join(projectRoot, archive.local);
  await copyFile(path.join(sourceDirectory, '原始网页.html'), path.join(target, '原始网页.html'));
  const originalMarkdown = source.language === 'en' ? '英文原文.md' : '中文全文.md';
  await copyFile(path.join(sourceDirectory, originalMarkdown), path.join(target, '来源全文.md'));
  if (source.language === 'en') await copyFile(path.join(sourceDirectory, '中文全文.md'), path.join(target, '中文全文.md'));
}

async function archiveRemote(source, target) {
  const page = await fetchPage(source.url);
  const extracted = extractArticle({ html: page.body, url: page.finalUrl || source.url, publisher: source.publisher });
  if (extracted.status !== 'extracted') throw new Error(`${source.id} extraction is ${extracted.status}`);
  await writeFile(path.join(target, '原始网页.html'), page.body, 'utf8');
  await writeFile(path.join(target, '来源全文.md'), `${extracted.markdown.trim()}\n`, 'utf8');
}

async function archiveSources(domain, radar) {
  const mappings = SOURCE_ARCHIVES[domain];
  if (!mappings) throw new Error(`No source archive mapping for ${domain}`);
  const root = path.join(packageRoot, domain, 'sources');
  for (const source of radar.sources) {
    const target = path.join(root, source.id);
    await mkdir(target, { recursive: true });
    const archive = mappings[source.id];
    if (!archive) throw new Error(`No archive mapping for ${source.id}`);
    if (!(await exists(path.join(target, '原始网页.html')))) {
      if (archive.local) await archiveLocal(source, archive, target);
      else await archiveRemote(source, target);
    }
    await writeFile(path.join(target, 'metadata.json'), `${JSON.stringify({
      id: source.id, publisher: source.publisher, title: source.title, language: source.language,
      sourceUrl: source.url, publishedAt: source.publishedAt, evidenceWindow: source.evidenceWindow,
      retrievedAt: new Date().toISOString(), limitation: source.limitation,
    }, null, 2)}\n`, 'utf8');
  }
}

async function writeLedgers(domain, radar) {
  const root = path.join(packageRoot, domain);
  const evidence = {
    schemaVersion: '1.0', domain, generatedAt: new Date().toISOString(),
    sources: radar.sources.map((source) => ({
      id: source.id, title: source.title, publisher: source.publisher, publishedAt: source.publishedAt,
      evidenceType: source.evidenceType, language: source.language, url: source.url,
      fact: source.fact, locator: source.locator, limitation: source.limitation,
    })),
  };
  const scenarioLedger = {
    schemaVersion: '1.0', domain, generatedAt: new Date().toISOString(), scenarioCount: radar.scenarioCount,
    scenarios: radar.scenarios.map((scenario) => ({
      id: scenario.id, title: scenario.title, priority: scenario.priority, matrixEligible: scenario.matrixEligible,
      matrixRank: scenario.matrixRank, evidenceIds: scenario.evidenceIds, sourceFacts: scenario.sourceFacts,
      companyCases: scenario.companyCases.map(({ company, sourceId, market, caveat }) => ({ company, sourceId, market, caveat })),
      confidence: scenario.confidence, evidenceWindow: scenario.evidenceWindow,
    })),
  };
  await writeFile(path.join(root, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  await writeFile(path.join(root, 'scenario-ledger.json'), `${JSON.stringify(scenarioLedger, null, 2)}\n`, 'utf8');
}

async function main() {
  const domain = process.argv[2];
  if (!domain) throw new Error('Usage: node src/radars/build-research-package.mjs <domain>');
  const radarRoot = path.join(projectRoot, 'web', 'radars');
  const radar = await loadRadarFile(path.join(radarRoot, 'data', `${domain}.js`));
  validateRadarData(radar, { radarRoot });
  await mkdir(path.join(packageRoot, domain, 'sources'), { recursive: true });
  await archiveSources(domain, radar);
  await writeLedgers(domain, radar);
  const candidates = JSON.parse(await readFile(path.join(packageRoot, domain, 'candidates.json'), 'utf8'));
  if (candidates.coverage.discovered !== candidates.coverage.included + candidates.coverage.excluded + candidates.coverage.failed) throw new Error('candidate coverage is not closed');
  console.log(`${domain}: ${radar.scenarioCount} scenarios, ${radar.sources.length} archived sources`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
