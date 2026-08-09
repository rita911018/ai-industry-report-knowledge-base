import { createHash } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { parseIndexedPage, parseSearchResult } from './import-indexed-pages.mjs';
import { writeSourceManifests } from './write-archive.mjs';

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function atomicWrite(filePath, content) {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, content, 'utf8');
  await rename(temporaryPath, filePath);
}

function decodeEntities(value) {
  return cheerio.load(`<p>${value}</p>`)('p').text();
}

export function parseWebVtt(vtt) {
  const seen = new Set();
  const transcript = [];
  const blocks = vtt.replace(/^\uFEFF?WEBVTT[^\n]*\n/u, '').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !/^(?:\d+|\d{2}:\d{2}:\d{2}[.,]\d{3}\s+-->)/.test(line));
    for (const rawLine of lines) {
      const line = decodeEntities(rawLine.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (!line || seen.has(line)) continue;
      seen.add(line);
      transcript.push(line);
    }
  }
  return transcript.join('\n\n');
}

function normalizePdfText(title, sourceUrl, text) {
  const cleaned = text
    .replace(/\f/g, '\n\n---\n\n')
    .replace(/[\u0008\u000b\u000c]/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  return `# ${title}\n\nOfficial report: ${sourceUrl}\n\n${cleaned}\n`;
}

const INFOGRAPHIC_MARKDOWN = `# The AI Ripple Effect: Managing Strained Semiconductor Supply

Source: Bain Data Center Model, January 2026.

## AI data center construction is soaring

The rapid build-out of AI data centers for model training and inference has created shortages in some semiconductor components.

New data center capacity globally rises from roughly 8 gigawatts in 2024 to more than 30 gigawatts in 2030 in the mid-case forecast. AI data centers account for most of the increase, while traditional data center capacity grows more slowly.

## Shortages are spiking prices

Prices have skyrocketed for some memory chips (DRAM and NAND), and shortages are a risk for network interface cards (NIC), optical transceivers, and other components.

The infographic compares materials costs for a traditional 20-megawatt data center ($460 million) with an AI 100-megawatt data center ($3.75 billion). AI data centers use disproportionately more GPU, DRAM, storage, network interface card, networking, optical transceiver, and fiber capacity, alongside CPU, cooling, power, shell, labor, land, site preparation, and design.

## Four questions to assess risk

This is like the chip shortage of a few years ago, with some differences. Data center demand creates pinch points in leading-edge silicon chips, especially those that rely on advanced packaging (CoWoS and FC-BGA substrates).

To assess vulnerability, technology manufacturers should ask:

1. Are data centers a reasonably large part of the market for this component?
2. Are data centers a more intense user of that market's capacity?
3. Are the components more profitable to AI data centers than in our value chain?
4. Are there long lead times to add capacity?

If the answers are yes, there is a five-alarm fire in the supply chain.

## Protecting share, preserving margins

Technology manufacturers should take action to protect supplies, preserve margins, and focus sales on available products.

### Secure stable supply

- Build a supply-and-demand fact base for key product inputs.
- Lock in critical components with multiyear contracts.
- Qualify new suppliers and products.

### Capture value through pricing

- Update cost plans to account for increased input prices.
- Track competitor pricing, and price strategically.
- Price to capture higher margins on severely constrained components.

### Shape product demand

- Focus the salesforce on available products.
- Prioritize high-margin markets and products.
- Shift demand to products that are available.
`;

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function minutes(milliseconds) {
  return `${Math.floor(milliseconds / 60_000)}:${String(Math.floor((milliseconds % 60_000) / 1000)).padStart(2, '0')}`;
}

function webinarMarkdown({ record, html, video, transcript }) {
  const $ = cheerio.load(html);
  const description = $('.hero__description').first().text().replace(/\s+/g, ' ').trim();
  const byline = $('.hero__byline').first().text().replace(/\s+/g, ' ').trim();
  const published = $('.hero__data-item').first().text().replace(/\s+/g, ' ').trim();
  const reportLinks = [];
  $('[itemprop="articleBody"] a[href]').each((_, element) => {
    const label = $(element).text().replace(/\s+/g, ' ').trim();
    const href = new URL($(element).attr('href'), record.sourceUrl).href;
    if (label && !reportLinks.some((item) => item.href === href)) reportLinks.push({ label, href });
  });

  const sections = [
    `# ${record.titleOriginal}`,
    description,
    byline,
    published,
    '## Official webinar recording',
    `- Recording title: ${video.name}`,
    `- Duration: ${minutes(video.duration)}`,
    `- Brightcove video ID: ${video.id}`,
    `- Official page: ${record.sourceUrl}`,
  ];
  if (reportLinks.length) {
    sections.push('## Associated Bain resources', ...reportLinks.map((item) => `- [${item.label}](${item.href})`));
  }
  if (transcript) {
    sections.push('## Official English captions — full transcript', transcript);
  } else {
    sections.push(
      '## Caption availability',
      'The public Bain/Brightcove playback metadata did not publish an English caption track for this recording. The official page, recording metadata, and associated report links are preserved; no transcript has been fabricated.',
    );
  }
  return `${sections.filter(Boolean).join('\n\n')}\n`;
}

async function enrichBainThin(projectRoot) {
  const archiveRoot = path.join(projectRoot, 'work', 'archive');
  const cacheRoot = path.join(projectRoot, 'work', 'http-cache', 'bain-external');
  const statePath = path.join(projectRoot, 'work', 'archive-state.json');
  const records = (await readJson(path.join(projectRoot, 'work', 'normalized', 'articles.json')))
    .filter((record) => record.publisher === 'Bain');
  const state = await readJson(statePath);

  const externalSpecs = new Map([
    [19, { mode: 'search', file: 'article-019-search-result.raw.txt', linkedSourceUrl: 'https://www.forbes.com/sites/selk/2026/06/26/the-learning-system-how-agentic-ai-can-compound-its-own-advantage/' }],
    [62, { mode: 'indexed', file: 'article-062.raw.txt', linkedSourceUrl: 'https://www.forbes.com/sites/davidmichels/2026/04/09/four-things-ceos-need-to-do-differently-on-ai/' }],
    [109, { mode: 'indexed', file: 'article-109.raw.txt', linkedSourceUrl: 'https://www.weforum.org/stories/2026/03/how-corporate-strategy-is-changing-in-a-world-of-constant-shocks/' }],
  ]);
  const pdfSpecs = new Map([
    [143, { pdf: '官方报告.pdf', text: '官方报告提取文本.txt', sourceUrl: 'https://reports.weforum.org/docs/WEF_From_Pilots_to_Portfolios_2026.pdf' }],
    [181, { pdf: '官方报告.pdf', text: '官方报告提取文本.txt', sourceUrl: 'https://www.temenos.com/wp-content/uploads/2026/04/FINAL-Trends-Report-2026_V07.pdf' }],
  ]);
  const videoSpecs = new Map([
    [102, '6389142348112'], [116, '6389171561112'], [131, '6395323132112'],
    [142, '6390438887112'], [190, '6401807028112'], [194, '6400639494112'], [200, '6393201975112'],
  ]);
  const changed = [];

  async function update(index, markdown, details) {
    const record = records[index - 1];
    const stateRecord = state.records[record.id];
    const directory = path.join(archiveRoot, stateRecord.archiveDirectory);
    const englishPath = path.join(directory, '英文原文.md');
    const normalized = `${markdown.trim()}\n`;
    await atomicWrite(englishPath, normalized);
    const metadataPath = path.join(directory, 'metadata.json');
    const metadata = await readJson(metadataPath);
    Object.assign(metadata, {
      extractionStatus: details.extractionStatus,
      extractionMethod: details.extractionMethod,
      characterCount: normalized.replace(/\s/g, '').length,
      headingCount: (normalized.match(/^#{1,6}\s+/gm) || []).length,
      paragraphCount: normalized.split(/\n{2,}/).filter(Boolean).length,
      englishMarkdownSha256: sha256(normalized),
      contentEnrichment: details,
    });
    for (const [key, filename] of Object.entries(details.extraFiles || {})) {
      metadata.files[key] = path.relative(archiveRoot, path.join(directory, filename)).split(path.sep).join('/');
    }
    await atomicWrite(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    Object.assign(stateRecord, {
      extractionStatus: details.extractionStatus,
      characterCount: metadata.characterCount,
      contentEnrichmentMethod: details.extractionMethod,
      linkedSourceUrl: details.linkedSourceUrl || null,
      updatedAt: new Date().toISOString(),
    });
    changed.push({ index, id: record.id, status: details.extractionStatus, characters: metadata.characterCount });
  }

  for (const [index, spec] of externalSpecs) {
    const raw = await readFile(path.join(cacheRoot, spec.file), 'utf8');
    const parsed = spec.mode === 'search' ? parseSearchResult(raw) : parseIndexedPage([raw]);
    await update(index, parsed.markdown, {
      extractionStatus: 'extracted',
      extractionMethod: 'linked_source_web_index',
      linkedSourceUrl: spec.linkedSourceUrl,
      indexCoverage: parsed.coverage ?? null,
    });
  }

  for (const [index, spec] of pdfSpecs) {
    const record = records[index - 1];
    const directory = path.join(archiveRoot, state.records[record.id].archiveDirectory);
    const text = await readFile(path.join(directory, spec.text), 'utf8');
    await update(index, normalizePdfText(record.titleOriginal, spec.sourceUrl, text), {
      extractionStatus: 'extracted',
      extractionMethod: 'linked_official_pdf',
      linkedSourceUrl: spec.sourceUrl,
      extraFiles: { officialReportPdf: spec.pdf, officialReportExtractedText: spec.text },
    });
  }

  await update(72, INFOGRAPHIC_MARKDOWN, {
    extractionStatus: 'extracted',
    extractionMethod: 'official_infographic_transcription',
    extraFiles: { officialInfographic: '官方信息图.png' },
  });

  for (const [index, videoId] of videoSpecs) {
    const record = records[index - 1];
    const directory = path.join(archiveRoot, state.records[record.id].archiveDirectory);
    const html = await readFile(path.join(directory, '原始网页.html'), 'utf8');
    const video = await readJson(`/private/tmp/brightcove-${videoId}.json`);
    await atomicWrite(path.join(directory, '视频元数据.json'), `${JSON.stringify(video, null, 2)}\n`);
    let transcript = null;
    const extraFiles = { videoMetadata: '视频元数据.json' };
    if (index === 102) {
      transcript = parseWebVtt(await readFile(path.join(directory, '官方英文字幕.vtt'), 'utf8'));
      extraFiles.officialEnglishCaptions = '官方英文字幕.vtt';
    }
    await update(index, webinarMarkdown({ record, html, video, transcript }), {
      extractionStatus: transcript ? 'extracted' : 'complete_media',
      extractionMethod: transcript ? 'official_video_captions' : 'official_video_metadata',
      videoId,
      officialCaptionTrack: Boolean(transcript),
      extraFiles,
    });
  }

  state.updatedAt = new Date().toISOString();
  await atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeSourceManifests({ root: archiveRoot, radarTitle: records[0].radarTitle });
  return changed.sort((a, b) => a.index - b.index);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  enrichBainThin(process.cwd())
    .then((records) => console.log(JSON.stringify({ enriched: records.length, records }, null, 2)))
    .catch((error) => { console.error(error); process.exitCode = 1; });
}
