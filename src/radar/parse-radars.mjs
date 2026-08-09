import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { load } from 'cheerio';
import { INPUT_RADARS } from '../config/input-radars.mjs';
import { PROJECT_SCHEMA_VERSION, assertArticleRecord } from '../schema/article-record.mjs';

const clean = (value = '') => value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const stripPrefix = (value, pattern) => clean(value).replace(pattern, '').trim();

function firstText($root, selector) {
  return clean($root.find(selector).first().text());
}

function languageText($root, selector, language) {
  const $container = $root.find(selector).first();
  if (!$container.length) return null;
  const $language = $container.find(`[data-lang-content="${language}"]`).first();
  return clean(($language.length ? $language : $container).text()) || null;
}

function sectionForHeading($, $root, pattern, scope = 'section') {
  let found = null;
  $root.find('h4').each((_, heading) => {
    if (found) return;
    if (pattern.test(clean($(heading).text()))) {
      const $section = $(heading).closest(scope);
      if ($section.length) found = $section;
    }
  });
  return found;
}

function textWithout($, $element, selectors) {
  const $clone = $element.clone();
  $clone.find(selectors).remove();
  return clean($clone.text());
}

function parseDimensions(text) {
  const patterns = {
    content: /(?:CV|Content)\s*(\d+)(?:\s*\/\s*35)?/i,
    impact: /(?:IB|Impact)\s*(\d+)(?:\s*\/\s*25)?/i,
    relevance: /(?:SR|Relevance)\s*(\d+)(?:\s*\/\s*25)?/i,
    evidence: /(?:ES|Evidence)\s*(\d+)(?:\s*\/\s*15)?/i
  };
  const dimensions = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (!match) return null;
    dimensions[key] = Number(match[1]);
  }
  return dimensions;
}

function parseOrderedDimensions(text) {
  const matches = [...text.matchAll(/(\d+)\s*\/\s*(35|25|25|15)/g)].map((match) => Number(match[1]));
  if (matches.length < 4) return null;
  return { content: matches[0], impact: matches[1], relevance: matches[2], evidence: matches[3] };
}

function normalizePriority(value) {
  return clean(value).toLowerCase().replace(/\s+/g, '-');
}

function normalizeConfidence(value) {
  const match = clean(value).match(/\b(high|middle|medium|low)\b/i);
  if (!match) return 'unknown';
  return match[1].toLowerCase() === 'medium' ? 'middle' : match[1].toLowerCase();
}

function canonicalizeUrl(value) {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function sourceUrl($card) {
  const selectors = ['a.source-link[href^="http"]', 'footer a[href^="http"]', '.article-footer a[href^="http"]', 'a[href^="http"]'];
  for (const selector of selectors) {
    const href = $card.find(selector).last().attr('href');
    if (href) return href;
  }
  return null;
}

function evidenceFromSection($, $section) {
  if (!$section?.length) return [];
  const evidence = [];
  const $items = $section.find('li').length ? $section.find('li') : $section.find('p');
  $items.each((_, item) => {
    const $item = $(item);
    const statementZh = clean($item.find('[data-lang-content="zh"]').first().text()) || textWithout($, $item, 'small,a.locator');
    const statementOriginal = clean($item.find('[data-lang-content="en"]').first().text()) || null;
    const locator = clean($item.find('a.locator,small').last().text()) || null;
    if (statementZh || statementOriginal) evidence.push({ statementOriginal, statementZh, locator });
  });
  return evidence;
}

function makeBaseRecord({ $, $card, radar, rawId, titleOriginal, titleZh, publishedAt, documentType, category, priority, score, confidence, coreView, evidence, impactZh, implicationZh, tags, source }) {
  const publisherId = radar.publisher.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const stable = rawId.replace(/^article-/, '');
  return assertArticleRecord({
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: `${publisherId}-${stable}`,
    radarTitle: radar.title,
    publisher: radar.publisher,
    sourceUrl: source,
    canonicalUrl: canonicalizeUrl(source),
    titleOriginal,
    titleZh,
    publishedAt,
    documentType,
    authorRaw: null,
    category,
    tags,
    priority,
    score,
    confidence,
    coreView,
    evidence,
    impactZh,
    implicationZh,
    provenance: {
      sourceFile: radar.path,
      elementId: $card.attr('id') || rawId,
      extractionBasis: 'radar_html'
    }
  });
}

function parseBcg($, $card, radar) {
  const rawId = $card.attr('id');
  const scoreText = firstText($card, '.score');
  const scoreMatch = scoreText.match(/(High|Medium|Low)\s*·\s*(\d+)\s*\/\s*10/i);
  const topics = clean($card.attr('data-categories') || '').split('|').filter(Boolean);
  const $claim = sectionForHeading($, $card, /核心观点/);
  const $evidence = sectionForHeading($, $card, /关键证据/);
  const $impact = sectionForHeading($, $card, /^影响面$/);
  const $implication = sectionForHeading($, $card, /Amer Sports \/ Salomon/);
  const $domains = sectionForHeading($, $card, /CDIO Office/);
  const source = sourceUrl($card);
  const confidenceReason = firstText($domains, '.confidence');
  const $meta = $card.find('.meta span');
  const record = makeBaseRecord({
    $, $card, radar, rawId,
    titleOriginal: firstText($card, 'h3'),
    titleZh: firstText($card, '.translated-title') || null,
    publishedAt: firstText($card, '.date') || null,
    documentType: clean($meta.eq(0).text()) || 'article',
    category: { primary: topics[0] || 'uncategorized', secondary: topics.slice(1) },
    priority: normalizePriority($card.attr('data-priority') || firstText($card, '.priority')),
    score: { total: Number(scoreMatch?.[2] ?? 0), dimensions: null, sourceScale: 10, tier: scoreMatch?.[1]?.toLowerCase() ?? null },
    confidence: { level: normalizeConfidence(confidenceReason), reason: confidenceReason },
    coreView: { original: null, zh: firstText($claim, 'p') || null },
    evidence: [{ statementOriginal: null, statementZh: firstText($evidence, 'p') || null, locator: null }].filter((item) => item.statementZh),
    impactZh: firstText($impact, 'p') || clean($impact?.text()) || null,
    implicationZh: firstText($implication, 'p') || null,
    tags: {
      topics,
      geography: $card.find('.chip.geo').map((_, node) => clean($(node).text())).get(),
      horizon: $card.find('.chip.horizon').map((_, node) => clean($(node).text())).get(),
      domains: $card.find('.chip.domain').map((_, node) => clean($(node).text())).get()
    },
    source
  });
  record.authorRaw = clean($meta.eq(1).text()) || null;
  return record;
}

function parseBilingual($, $card, radar) {
  const rawId = $card.attr('data-radar-id') || $card.attr('id');
  const scoreTotal = Number($card.attr('data-score'));
  const chipValues = $card.find('.chips > span').map((_, node) => clean($(node).text())).get();
  const chipText = chipValues.join(' ');
  const dimensions = parseDimensions(chipText);
  const $evidence = sectionForHeading($, $card, /关键证据|Key evidence/);
  const $impact = sectionForHeading($, $card, /影响范围|Impact/);
  const $implication = $card.find('section.implication').first();
  const confidenceReason = languageText($card, 'footer p', 'zh') || firstText($card, 'footer p');
  const publishedAt = firstText($card, '.eyebrow').match(/\d{4}-\d{2}-\d{2}/)?.[0] || null;
  const documentType = chipValues.find((value) => !/^(must-read|track|reference)$/i.test(value) && !/^confidence:/i.test(value) && !/(?:CV|Content)\s*\d+/i.test(value)) || 'article';
  return makeBaseRecord({
    $, $card, radar, rawId,
    titleOriginal: firstText($card, '.original-title') || languageText($card, 'h3', 'en'),
    titleZh: languageText($card, 'h3', 'zh'),
    publishedAt,
    documentType,
    category: { primary: $card.attr('data-category') || 'uncategorized', secondary: [] },
    priority: normalizePriority($card.attr('data-priority')),
    score: { total: scoreTotal, dimensions, sourceScale: 100 },
    confidence: { level: normalizeConfidence(chipText), reason: confidenceReason },
    coreView: { original: languageText($card, '.take p', 'en'), zh: languageText($card, '.take p', 'zh') },
    evidence: evidenceFromSection($, $evidence),
    impactZh: languageText($impact, 'p', 'zh'),
    implicationZh: languageText($implication, 'p', 'zh'),
    tags: { topics: [$card.attr('data-category')].filter(Boolean), geography: [], horizon: [], domains: [] },
    source: sourceUrl($card)
  });
}

function parseMit($, $card, radar) {
  const rawId = $card.attr('data-radar-id') || $card.attr('id');
  const $zhBody = $card.find('.article-body[data-lang-content="zh"]').first();
  const $enBody = $card.find('.article-body[data-lang-content="en"]').first();
  const zhSection = (pattern) => sectionForHeading($, $zhBody, pattern);
  const enSection = (pattern) => sectionForHeading($, $enBody, pattern);
  const $zhEvidence = $zhBody.find('.evidence').first();
  const $enEvidence = $enBody.find('.evidence').first();
  const evidence = [];
  const $zhItems = $zhEvidence.find('li');
  const $enItems = $enEvidence.find('li');
  $zhItems.each((index, item) => {
    const $zhItem = $(item);
    const $enItem = $enItems.eq(index);
    evidence.push({
      statementOriginal: textWithout($, $enItem, 'small') || null,
      statementZh: textWithout($, $zhItem, 'small') || null,
      locator: clean($zhItem.find('small').text()) || clean($enItem.find('small').text()) || null
    });
  });
  const scoreTotal = Number($card.attr('data-score'));
  const metric = firstText($card, 'footer .metric');
  const confidenceReason = firstText($zhBody, '.confidence');
  return makeBaseRecord({
    $, $card, radar, rawId,
    titleOriginal: firstText($card, '.source-title') || languageText($card, 'h3', 'en'),
    titleZh: languageText($card, 'h3', 'zh'),
    publishedAt: firstText($card, 'footer span').match(/\d{4}-\d{2}-\d{2}/)?.[0] || null,
    documentType: 'article',
    category: { primary: $card.attr('data-category') || 'uncategorized', secondary: [] },
    priority: normalizePriority($card.attr('data-priority')),
    score: { total: scoreTotal, dimensions: parseOrderedDimensions(metric), sourceScale: 100 },
    confidence: { level: normalizeConfidence(confidenceReason), reason: confidenceReason },
    coreView: { original: firstText(enSection(/Core view/), 'p'), zh: firstText(zhSection(/核心观点/), 'p') },
    evidence,
    impactZh: firstText(zhSection(/^影响$/), 'p') || null,
    implicationZh: firstText(zhSection(/Salomon/), 'p') || null,
    tags: { topics: [$card.attr('data-category')].filter(Boolean), geography: [], horizon: [], domains: [] },
    source: sourceUrl($card)
  });
}

function parseBain($, $card, radar) {
  const rawId = $card.attr('data-radar-id') || $card.attr('id');
  const $evidence = sectionForHeading($, $card, /关键证据|Key evidence/);
  const $impact = sectionForHeading($, $card, /影响范围|Impact/);
  const $implication = sectionForHeading($, $card, /Salomon/);
  const scoreText = firstText($card, '.scoreline');
  const confidenceReason = firstText($card, 'p.confidence');
  const eyebrow = firstText($card, '.eyebrow');
  const documentType = clean(eyebrow.split('·').at(-1)) || 'article';
  return makeBaseRecord({
    $, $card, radar, rawId,
    titleOriginal: stripPrefix(firstText($card, '.original-title'), /^Original\s*·\s*/i) || languageText($card, 'h3', 'en'),
    titleZh: languageText($card, 'h3', 'zh'),
    publishedAt: eyebrow.match(/\d{4}-\d{2}-\d{2}/)?.[0] || null,
    documentType,
    category: { primary: $card.attr('data-category') || 'uncategorized', secondary: [] },
    priority: normalizePriority($card.attr('data-priority')),
    score: { total: Number($card.attr('data-score')), dimensions: parseDimensions(scoreText), sourceScale: 100 },
    confidence: { level: normalizeConfidence(scoreText), reason: confidenceReason },
    coreView: { original: languageText($card, '.core', 'en'), zh: languageText($card, '.core', 'zh') },
    evidence: evidenceFromSection($, $evidence),
    impactZh: languageText($impact, 'p', 'zh'),
    implicationZh: languageText($implication, 'p', 'zh'),
    tags: { topics: [$card.attr('data-category')].filter(Boolean), geography: [], horizon: [], domains: [] },
    source: sourceUrl($card)
  });
}

export async function parseRadarFile(radar) {
  const html = await readFile(radar.path, 'utf8');
  const $ = load(html);
  const actualTitle = clean($('title').first().text());
  if (actualTitle !== radar.title) throw new Error(`Radar title mismatch: ${actualTitle} != ${radar.title}`);
  const selector = radar.adapter === 'bilingual-analysis' ? 'article.analysis-card' : 'article.article-card';
  const records = $(selector).map((_, article) => {
    const $card = $(article);
    if (radar.adapter === 'bcg') return parseBcg($, $card, radar);
    if (radar.adapter === 'bilingual-analysis') return parseBilingual($, $card, radar);
    if (radar.adapter === 'mit') return parseMit($, $card, radar);
    if (radar.adapter === 'bain') return parseBain($, $card, radar);
    throw new Error(`Unknown adapter: ${radar.adapter}`);
  }).get();
  if (records.length !== radar.expectedCount) throw new Error(`${radar.publisher}: expected ${radar.expectedCount}, parsed ${records.length}`);
  return records;
}

export async function parseAllRadars(radars = INPUT_RADARS) {
  const groups = await Promise.all(radars.map(parseRadarFile));
  const records = groups.flat();
  const ids = new Set(records.map((record) => record.id));
  const urls = new Set(records.map((record) => record.canonicalUrl));
  if (ids.size !== records.length) throw new Error('Duplicate normalized article IDs');
  if (urls.size !== records.length) throw new Error('Duplicate canonical article URLs');
  return records;
}

async function main() {
  const output = 'work/normalized/articles.json';
  const records = await parseAllRadars();
  await mkdir('work/normalized', { recursive: true });
  await writeFile(output, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  const counts = INPUT_RADARS.map((radar) => `${radar.publisher}=${records.filter((record) => record.publisher === radar.publisher).length}`);
  console.log(`${counts.join(' ')} Total=${records.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
