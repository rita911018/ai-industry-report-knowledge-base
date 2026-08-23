import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractArticle } from '../archive/extract-article.mjs';
import { fetchPage } from '../archive/fetch-page.mjs';

const TERMINAL_STATUSES = new Set(['included', 'excluded', 'failed']);

function hostAllowed(url, domains) {
  const host = new URL(url).hostname.toLowerCase();
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function validateCandidateLedger(ledger) {
  if (!ledger?.run?.officialDomains?.length || !Array.isArray(ledger.candidates)) throw new Error('Invalid candidate ledger');
  const counts = { included: 0, excluded: 0, failed: 0 };
  const urls = new Set();
  for (const candidate of ledger.candidates) {
    if (!TERMINAL_STATUSES.has(candidate.status)) throw new Error(`Invalid candidate status: ${candidate.url}`);
    if (!candidate.reason) throw new Error(`Missing candidate reason: ${candidate.url}`);
    if (urls.has(candidate.url)) throw new Error(`Duplicate candidate URL: ${candidate.url}`);
    urls.add(candidate.url);
    if (!hostAllowed(candidate.url, ledger.run.officialDomains)) throw new Error(`Non-official candidate domain: ${candidate.url}`);
    if (candidate.status === 'included' && !candidate.publishedAt) throw new Error(`Included candidate missing publishedAt: ${candidate.url}`);
    counts[candidate.status] += 1;
  }
  const expected = { discovered: ledger.candidates.length, ...counts };
  for (const [key, value] of Object.entries(expected)) {
    if (ledger.coverage?.[key] !== value) throw new Error(`Coverage mismatch for ${key}: ${ledger.coverage?.[key]} != ${value}`);
  }
  return true;
}

async function mapLimit(values, limit, worker) {
  const results = new Array(values.length);
  let cursor = 0;
  async function run() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length || 1) }, run));
  return results;
}

export async function inspectCandidateLedger(ledger, { concurrency = 4, fetchPageImpl = fetchPage } = {}) {
  validateCandidateLedger(ledger);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12) throw new Error('concurrency must be 1-12');
  const included = ledger.candidates.filter((candidate) => candidate.status === 'included');
  const inspected = await mapLimit(included, concurrency, async (candidate) => {
    try {
      const page = await fetchPageImpl(candidate.url);
      const article = extractArticle({ html: page.body, url: page.finalUrl || candidate.url, publisher: candidate.publisher });
      if (article.status !== 'extracted' || !article.title || article.characterCount < 300) throw new Error(`Thin or untitled candidate: ${candidate.url}`);
      return [candidate.url, {
        status: 'verified',
        titleOriginal: article.title,
        pagePublishedAt: article.publishedAt || null,
        finalUrl: page.finalUrl || candidate.url,
        httpStatus: page.status,
        retrievedAt: page.retrievedAt,
        extractionStatus: article.status,
        extractionMethod: article.extractionMethod,
        characterCount: article.characterCount,
        headingCount: article.headingCount,
        paragraphCount: article.paragraphCount,
      }];
    } catch (error) {
      return [candidate.url, { status: 'failed', httpStatus: Number.isInteger(error.status) ? error.status : null, error: error.message }];
    }
  });
  const byUrl = new Map(inspected);
  return { ...ledger, verifiedAt: new Date().toISOString(), candidates: ledger.candidates.map((candidate) => byUrl.has(candidate.url) ? { ...candidate, inspection: byUrl.get(candidate.url) } : candidate) };
}

function parseArgs(argv) {
  const options = { concurrency: 4 };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--input') options.input = argv[++index];
    else if (argv[index] === '--out') options.out = argv[++index];
    else if (argv[index] === '--concurrency') options.concurrency = Number(argv[++index]);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.input || !options.out) throw new Error('Missing --input or --out');
  const ledger = JSON.parse(await readFile(path.resolve(options.input), 'utf8'));
  const result = await inspectCandidateLedger(ledger, { concurrency: options.concurrency });
  const outputPath = path.resolve(options.out);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(`${outputPath}.tmp`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await rename(`${outputPath}.tmp`, outputPath);
  console.log(JSON.stringify({ coverage: result.coverage, verified: result.candidates.filter((candidate) => candidate.inspection?.status === 'verified').length, failedInspection: result.candidates.filter((candidate) => candidate.inspection?.status === 'failed').length }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
