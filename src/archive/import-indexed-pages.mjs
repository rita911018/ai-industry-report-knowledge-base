import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeArticleArchive, writeSourceManifests } from './write-archive.mjs';

function extractIndexedLines(raw) {
  const total = Number(raw.match(/Total lines:\s*(\d+)/)?.[1] || 0);
  const markers = [...raw.matchAll(/L(\d+):\s?/g)];
  const lines = new Map();
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const lineNumber = Number(marker[1]);
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? raw.length;
    let value = raw.slice(start, end).trim();
    value = value.replace(/\n\s*=== NEXT CHUNK ===[\s\S]*$/u, '').trim();
    if (!lines.has(lineNumber) || value.length > lines.get(lineNumber).length) {
      lines.set(lineNumber, value);
    }
  }
  return { total, lines };
}

function cleanCitations(value) {
  return value
    .replace(/cite[^†]+†([^]*)/gu, (_, label) => label.replace(/†[^†\s]+$/u, ''))
    .replace(/cite[^]+/gu, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function normalizeHeadings(lines) {
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^#{1,6}$/.test(line)) {
      let titleIndex = index + 1;
      while (titleIndex < lines.length && !lines[titleIndex]) titleIndex += 1;
      if (titleIndex < lines.length) {
        output.push(`${line} ${lines[titleIndex]}`);
        index = titleIndex;
        continue;
      }
    }
    output.push(line);
  }
  return output;
}

export function parseIndexedPage(rawParts) {
  const lineMap = new Map();
  let totalLines = 0;
  for (const raw of rawParts) {
    const parsed = extractIndexedLines(raw);
    totalLines = Math.max(totalLines, parsed.total);
    for (const [lineNumber, value] of parsed.lines) {
      if (!lineMap.has(lineNumber) || value.length > lineMap.get(lineNumber).length) {
        lineMap.set(lineNumber, value);
      }
    }
  }

  const ordered = [...lineMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => cleanCitations(value))
    .filter((value) => !/^(Skip to main content|Explore a career with us)$/i.test(value));
  const markdown = normalizeHeadings(ordered)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    markdown,
    totalLines,
    capturedLines: lineMap.size,
    coverage: totalLines ? lineMap.size / totalLines : 0,
    characterCount: markdown.replace(/\s/g, '').length,
  };
}

export function parseSearchResult(raw) {
  const headers = [...raw.matchAll(/^(.+?) \((https?:\/\/[^)]+)\)\s*$/gm)];
  if (headers.length === 0) throw new Error('Search result does not contain a source header');
  const first = headers[0];
  const end = headers[1]?.index ?? raw.length;
  const block = raw.slice(first.index, end).trim();
  const lines = block.split('\n');
  const markdown = cleanCitations(lines.slice(2).join('\n'))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return {
    title: first[1],
    sourceUrl: first[2],
    markdown,
    characterCount: markdown.replace(/\s/g, '').length,
  };
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function importMcKinseyIndexedPages(projectRoot) {
  const cacheDirectory = path.join(projectRoot, 'work', 'http-cache', 'mckinsey');
  const archiveRoot = path.join(projectRoot, 'work', 'archive');
  const statePath = path.join(projectRoot, 'work', 'archive-state.json');
  const records = JSON.parse(await readFile(path.join(projectRoot, 'work', 'normalized', 'articles.json'), 'utf8'))
    .filter((record) => record.publisher === 'McKinsey');
  const cacheFiles = await readdir(cacheDirectory);
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  const imported = [];

  for (let offset = 0; offset < records.length; offset += 1) {
    const index = offset + 1;
    const prefix = `article-${String(index).padStart(3, '0')}`;
    const rawParts = await Promise.all(
      cacheFiles.filter((name) => name.startsWith(prefix) && name.endsWith('.raw.txt'))
        .sort()
        .map((name) => readFile(path.join(cacheDirectory, name), 'utf8')),
    );
    if (rawParts.length === 0) throw new Error(`Missing indexed cache for McKinsey article ${index}`);
    const parsed = parseIndexedPage(rawParts);
    if (parsed.coverage < 0.98 || parsed.characterCount < 300) {
      throw new Error(`Incomplete indexed page ${index}: coverage=${parsed.coverage}, characters=${parsed.characterCount}`);
    }

    const record = records[offset];
    const page = {
      body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(record.titleOriginal)}</title></head><body><p><strong>Archive note:</strong> McKinsey blocked direct automated retrieval. The article text below was reconstructed line-for-line from a read-only web index of the official URL.</p><p><a href="${escapeHtml(record.sourceUrl)}">Open the official McKinsey article</a></p><article><pre>${escapeHtml(parsed.markdown)}</pre></article></body></html>`,
      status: 200,
      attempts: 1,
      finalUrl: record.sourceUrl,
      contentType: 'text/plain; source=web-index',
      retrievedAt: new Date().toISOString(),
      retrievalMethod: 'web_index_fallback',
      retrievalDetails: {
        officialUrlBlockedStatus: state.records[record.id]?.httpStatus || 403,
        capturedLines: parsed.capturedLines,
        totalLines: parsed.totalLines,
        coverage: parsed.coverage,
      },
    };
    const extracted = {
      status: 'extracted',
      markdown: parsed.markdown,
      contentHtml: '',
      headingCount: (parsed.markdown.match(/^#{1,6}\s+/gm) || []).length,
      paragraphCount: parsed.markdown.split(/\n{2,}/).filter(Boolean).length,
      characterCount: parsed.characterCount,
      extractionMethod: 'web_index_lines',
      title: record.titleOriginal,
      byline: record.authorRaw,
      publishedAt: record.publishedAt,
    };
    const written = await writeArticleArchive({ root: archiveRoot, record, index, page, extracted });
    state.records[record.id] = {
      id: record.id,
      sourceUrl: record.sourceUrl,
      status: 'downloaded',
      snapshotSha256: written.snapshotSha256,
      extractionStatus: 'extracted',
      characterCount: parsed.characterCount,
      archiveDirectory: path.relative(archiveRoot, written.directory).split(path.sep).join('/'),
      retrievalMethod: 'web_index_fallback',
      coverage: parsed.coverage,
      updatedAt: new Date().toISOString(),
    };
    imported.push({ id: record.id, coverage: parsed.coverage, characterCount: parsed.characterCount });
  }

  state.updatedAt = new Date().toISOString();
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, statePath);
  await writeSourceManifests({ root: archiveRoot, radarTitle: records[0].radarTitle });
  return imported;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  importMcKinseyIndexedPages(process.cwd())
    .then((records) => console.log(JSON.stringify({ imported: records.length, minimumCoverage: Math.min(...records.map((record) => record.coverage)) }, null, 2)))
    .catch((error) => { console.error(error); process.exitCode = 1; });
}
