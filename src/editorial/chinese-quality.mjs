import { createHash } from 'node:crypto';
import { verifyTranslation } from '../translation/verify-translation.mjs';

const NOISE_CODES = new Set([
  'save_share_print',
  'subscribe_newsletter',
  'cookie_language',
  'progress_widget',
  'duplicate_navigation',
]);

const NOISE_LINE_PATTERNS = [
  {
    code: 'save_share_print',
    patterns: [
      /^save it for later$/i,
      /^save for later$/i,
      /^save$/i,
      /^share$/i,
      /^print$/i,
      /^copy link$/i,
      /^保存$/u,
      /^稍后阅读$/u,
      /^分享$/u,
      /^打印$/u,
      /^复制链接$/u,
    ],
  },
  {
    code: 'subscribe_newsletter',
    patterns: [
      /^subscribe$/i,
      /^subscribe to (?:our |the )?newsletter$/i,
      /^sign up for (?:our |the )?newsletter$/i,
      /^newsletter sign[ -]?up$/i,
      /^订阅$/u,
      /^订阅简报$/u,
      /^注册提醒$/u,
    ],
  },
  {
    code: 'cookie_language',
    patterns: [
      /^en$/i,
      /^english$/i,
      /^accept (?:all )?cookies$/i,
      /^cookie preferences$/i,
      /^language$/i,
      /^接受(?:全部)? cookie$/iu,
      /^cookie 偏好$/iu,
      /^语言$/u,
    ],
  },
  {
    code: 'progress_widget',
    patterns: [
      /^progress\s*:\s*(?:\d+(?:\.\d+)?%?)?$/i,
      /^reading progress\s*:\s*(?:\d+(?:\.\d+)?%?)?$/i,
      /^\d+\s+min(?:ute)?s? read$/i,
      /^阅读进度\s*[::]　?\s*(?:\d+(?:\.\d+)?%?)?$/u,
      /^预计阅读时间\s*[::]　?\s*\d+\s*分钟$/u,
    ],
  },
  {
    code: 'duplicate_navigation',
    patterns: [
      /^home$/i,
      /^previous(?: article)?$/i,
      /^next(?: article)?$/i,
      /^back to top$/i,
      /^首页$/u,
      /^上一篇$/u,
      /^下一篇$/u,
      /^返回顶部$/u,
    ],
  },
];

function unwrapNoiseLabel(line) {
  let value = line.trim().replace(/^[-+*]\s+/, '').trim();
  const markdownLink = value.match(/^\[([^\]]+)]\(<?https?:\/\/[^\s)>]+>?\)$/i);
  if (markdownLink) value = markdownLink[1].trim();
  return value;
}

export function classifyNoiseBlock(block) {
  if (typeof block !== 'string' || !block.trim() || /```|~~~|`/.test(block)) return null;
  if (/^(?: {4}|\t)/.test(block)) return null;
  if (/\r?\n[ \t]*\r?\n/.test(block)) return null;

  const lines = block.split(/\r?\n/).map(unwrapNoiseLabel).filter(Boolean);
  if (!lines.length) return null;

  for (const category of NOISE_LINE_PATTERNS) {
    if (lines.every((line) => category.patterns.some((pattern) => pattern.test(line)))) {
      return category.code;
    }
  }
  return null;
}

function hashBlock(block) {
  return createHash('sha256').update(block, 'utf8').digest('hex');
}

function fenceOpening(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!match || (match[1][0] === '`' && match[2].includes('`'))) return null;
  return { marker: match[1][0], length: match[1].length };
}

function closesFence(line, fence) {
  const match = line.match(/^ {0,3}(`+|~+)[ \t]*$/);
  return Boolean(match && match[1][0] === fence.marker && match[1].length >= fence.length);
}

function splitMarkdownBlocks(markdown) {
  const lines = [...markdown.matchAll(/[^\r\n]*(?:\r\n|\n|$)/g)]
    .map((match) => match[0])
    .filter(Boolean);
  const blocks = [];
  let chunks = [];
  let blockLine = 1;
  let lineNumber = 1;
  let protectedFence = false;
  let fence = null;

  const flush = ({ beforeBlank = false } = {}) => {
    if (!chunks.length) return;
    let block = chunks.join('');
    if (beforeBlank) block = block.replace(/\r?\n$/, '');
    blocks.push({ block, line: blockLine, protected: protectedFence });
    chunks = [];
    protectedFence = false;
  };

  for (const lineWithEnding of lines) {
    const line = lineWithEnding.replace(/\r?\n$/, '');
    const blank = /^[ \t]*$/.test(line);

    if (!fence && blank) {
      flush({ beforeBlank: true });
      lineNumber += 1;
      continue;
    }

    if (!chunks.length) blockLine = lineNumber;
    const opening = fence ? null : fenceOpening(line);
    if (opening) {
      fence = opening;
      protectedFence = true;
    }
    chunks.push(lineWithEnding);
    if (fence && closesFence(line, fence) && !opening) fence = null;
    lineNumber += 1;
  }
  flush();
  return blocks;
}

export function cleanBaseline(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('markdown must be a string');
  const separator = markdown.includes('\r\n') ? '\r\n\r\n' : '\n\n';
  const blocks = splitMarkdownBlocks(markdown);
  const classified = blocks.map(({ block, line, protected: protectedBlock }, blockIndex) => ({
    block,
    line,
    blockIndex,
    code: protectedBlock ? null : classifyNoiseBlock(block),
  }));
  const totals = new Map();
  for (const item of classified) {
    if (!item.code) continue;
    const key = `${item.code}\0${item.block}`;
    totals.set(key, (totals.get(key) || 0) + 1);
  }

  const seen = new Map();
  const removals = [];
  const retained = [];
  for (const item of classified) {
    if (!item.code || !NOISE_CODES.has(item.code)) {
      retained.push(item.block);
      continue;
    }
    const key = `${item.code}\0${item.block}`;
    const occurrence = (seen.get(key) || 0) + 1;
    seen.set(key, occurrence);
    removals.push({
      code: item.code,
      originalBlock: item.block,
      originalBlockHash: hashBlock(item.block),
      count: totals.get(key),
      occurrence,
      blockIndex: item.blockIndex,
      line: item.line,
    });
  }

  return {
    markdown: retained.join(separator),
    removals,
  };
}

function locationAt(text, index) {
  const prefix = text.slice(0, index);
  const line = (prefix.match(/\n/g) || []).length + 1;
  const lastNewline = prefix.lastIndexOf('\n');
  return { line, column: index - lastNewline };
}

function sanitizeProtectedMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (value) => value.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (value) => ' '.repeat(value.length))
    .replace(/https?:\/\/[^\s)>\]"']+/g, (value) => ' '.repeat(value.length));
}

function glossaryEntries(glossary) {
  const sourceEntries = Array.isArray(glossary)
    ? glossary.map((entry, index) => [entry.term || entry.english || String(index), entry])
    : Object.entries(glossary || {});
  const entries = [];

  for (const [term, definition] of sourceEntries) {
    if (typeof definition === 'string') {
      entries.push({ term, preferred: definition, prohibited: [term] });
      continue;
    }
    if (Array.isArray(definition)) {
      entries.push({ term, preferred: '', prohibited: definition });
      continue;
    }
    if (!definition || typeof definition !== 'object') continue;
    const prohibited = definition.prohibited
      || definition.prohibitedVariants
      || definition.forbidden
      || definition.disallowed
      || [];
    entries.push({
      term,
      preferred: definition.preferred || definition.defaultChinese || definition.translation || '',
      prohibited: Array.isArray(prohibited) ? prohibited : [prohibited],
    });
  }
  return entries;
}

function pushRisk(risks, markdown, code, index, message, details = {}) {
  const { line, column } = locationAt(markdown, Math.max(0, index));
  risks.push({ code, line, column, message, ...details });
}

export function scanChineseStyle(markdown, glossary = {}) {
  if (typeof markdown !== 'string') throw new TypeError('markdown must be a string');
  const risks = [];
  const searchable = sanitizeProtectedMarkdown(markdown);

  for (const entry of glossaryEntries(glossary)) {
    for (const variant of entry.prohibited.filter((value) => typeof value === 'string' && value)) {
      let offset = 0;
      while ((offset = searchable.indexOf(variant, offset)) !== -1) {
        pushRisk(
          risks,
          markdown,
          'prohibited_glossary_variant',
          offset,
          `Prohibited glossary variant "${variant}"; use "${entry.preferred || entry.term}"`,
          { term: entry.term, variant, preferred: entry.preferred },
        );
        offset += variant.length;
      }
    }
  }

  const blocks = splitMarkdownBlocks(markdown);
  let searchFrom = 0;
  for (const { block, protected: protectedBlock } of blocks) {
    const code = protectedBlock ? null : classifyNoiseBlock(block);
    const index = markdown.indexOf(block, searchFrom);
    searchFrom = index + block.length;
    if (!code) continue;
    const label = block.trim();
    const riskCode = /^[\x00-\x7f\s\p{P}]+$/u.test(label)
      ? 'isolated_english_ui'
      : 'webpage_noise';
    pushRisk(risks, markdown, riskCode, index, `Isolated webpage UI block (${code}): ${label}`, { noiseCode: code, block: label });
  }

  const mixedPunctuation = /(?:[\p{Script=Han}][ \t]*[,;:!?]|[,;:!?][ \t]*[\p{Script=Han}])/gu;
  for (const match of searchable.matchAll(mixedPunctuation)) {
    pushRisk(
      risks,
      markdown,
      'mixed_english_punctuation',
      match.index,
      `ASCII punctuation mixed with Chinese text: "${markdown.slice(match.index, match.index + match[0].length)}"`,
    );
  }

  const repeatedPunctuation = /([，。！？；：,.!?;:])\1+/gu;
  for (const match of searchable.matchAll(repeatedPunctuation)) {
    pushRisk(
      risks,
      markdown,
      'repeated_punctuation',
      match.index,
      `Repeated punctuation: "${match[0]}"`,
    );
  }

  return risks;
}

function markdownLines(markdown) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let fenced = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(?:```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) entries.push({ text: line, line: index + 1 });
  }
  return entries;
}

function headings(markdown) {
  return markdownLines(markdown).flatMap((entry) => {
    const match = entry.text.match(/^(#{1,6})\s+(.+?)\s*$/);
    return match ? [{ ...entry, level: match[1].length, label: match[2] }] : [];
  });
}

function listItems(markdown) {
  return markdownLines(markdown).flatMap((entry) => {
    const match = entry.text.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
    if (!match) return [];
    return [{
      ...entry,
      depth: match[1].replace(/\t/g, '    ').length,
      type: /^\d/.test(match[2]) ? 'ordered' : 'unordered',
      label: match[3],
    }];
  });
}

function tableCells(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  return value.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

function isTableDivider(line) {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function tables(markdown) {
  const lines = markdownLines(markdown);
  const found = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = lines[index];
    const divider = lines[index + 1];
    if (!header.text.includes('|') || !divider.text.includes('|') || !isTableDivider(divider.text)) continue;
    const rows = [header, divider];
    let next = index + 2;
    while (next < lines.length && lines[next].text.includes('|') && lines[next].text.trim()) {
      rows.push(lines[next]);
      next += 1;
    }
    found.push({
      line: header.line,
      text: header.text,
      columns: tableCells(header.text).length,
      headers: tableCells(header.text),
      rows: rows.length - 1,
    });
    index = next - 1;
  }
  return found;
}

function images(markdown) {
  const found = [];
  const pattern = /!\[([^\]]*)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of markdown.matchAll(pattern)) {
    const location = locationAt(markdown, match.index);
    found.push({ ...location, text: match[0], alt: match[1], url: match[2] });
  }
  return found;
}

function footnotes(markdown) {
  const definitions = [];
  const references = [];
  const definitionRanges = [];
  const definitionPattern = /^\[\^([^\]]+)]\s*:/gm;
  for (const match of markdown.matchAll(definitionPattern)) {
    const location = locationAt(markdown, match.index);
    definitions.push({ ...location, id: match[1], text: match[0] });
    definitionRanges.push([match.index, match.index + match[0].length]);
  }
  const referencePattern = /\[\^([^\]]+)]/g;
  for (const match of markdown.matchAll(referencePattern)) {
    if (definitionRanges.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const location = locationAt(markdown, match.index);
    references.push({ ...location, id: match[1], text: match[0] });
  }
  return { definitions, references };
}

function normalizedLabel(value) {
  return String(value).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function labelDistance(left, right) {
  const source = [...normalizedLabel(left)];
  const target = [...normalizedLabel(right)];
  if (!source.length && !target.length) return 0;
  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const current = [sourceIndex];
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      current[targetIndex] = Math.min(
        current[targetIndex - 1] + 1,
        previous[targetIndex] + 1,
        previous[targetIndex - 1] + (source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[target.length] / Math.max(source.length, target.length);
}

function missingByAlignedSequence(expected, actual, signature, label) {
  const deletionCost = 0.75;
  const insertionCost = 0.75;
  const costs = Array.from({ length: expected.length + 1 }, () => Array(actual.length + 1).fill(0));
  const actions = Array.from({ length: expected.length + 1 }, () => Array(actual.length + 1).fill(null));
  for (let expectedIndex = 1; expectedIndex <= expected.length; expectedIndex += 1) {
    costs[expectedIndex][0] = expectedIndex * deletionCost;
    actions[expectedIndex][0] = 'delete';
  }
  for (let actualIndex = 1; actualIndex <= actual.length; actualIndex += 1) {
    costs[0][actualIndex] = actualIndex * insertionCost;
    actions[0][actualIndex] = 'insert';
  }

  for (let expectedIndex = 1; expectedIndex <= expected.length; expectedIndex += 1) {
    for (let actualIndex = 1; actualIndex <= actual.length; actualIndex += 1) {
      let bestCost = costs[expectedIndex - 1][actualIndex] + deletionCost;
      let bestAction = 'delete';
      const insertCost = costs[expectedIndex][actualIndex - 1] + insertionCost;
      if (insertCost < bestCost) {
        bestCost = insertCost;
        bestAction = 'insert';
      }
      if (signature(expected[expectedIndex - 1]) === signature(actual[actualIndex - 1])) {
        const alignCost = costs[expectedIndex - 1][actualIndex - 1]
          + labelDistance(label(expected[expectedIndex - 1]), label(actual[actualIndex - 1]));
        if (alignCost <= bestCost) {
          bestCost = alignCost;
          bestAction = 'align';
        }
      }
      costs[expectedIndex][actualIndex] = bestCost;
      actions[expectedIndex][actualIndex] = bestAction;
    }
  }

  const missing = [];
  let expectedIndex = expected.length;
  let actualIndex = actual.length;
  while (expectedIndex || actualIndex) {
    const action = actions[expectedIndex][actualIndex];
    if (action === 'align') {
      expectedIndex -= 1;
      actualIndex -= 1;
    } else if (action === 'insert') {
      actualIndex -= 1;
    } else {
      missing.push(expected[expectedIndex - 1]);
      expectedIndex -= 1;
    }
  }
  return missing.reverse();
}

function countBy(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) || 0) + 1);
  return counts;
}

function structuralIssues(baseline, polished) {
  const issues = [];
  const expectedHeadings = headings(baseline);
  const actualHeadings = headings(polished);
  for (const item of missingByAlignedSequence(
    expectedHeadings,
    actualHeadings,
    ({ level }) => level,
    ({ label }) => label,
  )) {
    issues.push({
      code: 'missing_heading',
      line: item.line,
      item: item.text,
      message: `Missing heading from baseline line ${item.line}: ${item.text}`,
    });
  }

  const expectedListItems = listItems(baseline);
  const actualListItems = listItems(polished);
  for (const item of missingByAlignedSequence(
    expectedListItems,
    actualListItems,
    ({ depth, type }) => `${depth}:${type}`,
    ({ label }) => label,
  )) {
    issues.push({
      code: 'missing_list_item',
      line: item.line,
      item: item.text,
      message: `Missing list item from baseline line ${item.line}: ${item.text}`,
    });
  }

  const expectedTables = tables(baseline);
  const actualTables = tables(polished);
  for (let index = 0; index < expectedTables.length; index += 1) {
    const expected = expectedTables[index];
    const actual = actualTables[index];
    if (!actual) {
      issues.push({
        code: 'missing_table',
        line: expected.line,
        item: expected.text,
        message: `Missing table from baseline line ${expected.line}: ${expected.text}`,
      });
      continue;
    }
    if (actual.columns < expected.columns) {
      const expectedHeaders = expected.headers.map((label, headerIndex) => ({ label, headerIndex }));
      const actualHeaders = actual.headers.map((label, headerIndex) => ({ label, headerIndex }));
      const missing = missingByAlignedSequence(
        expectedHeaders,
        actualHeaders,
        () => 'column',
        ({ label }) => label,
      ).map(({ label, headerIndex }) => `${headerIndex + 1} "${label}"`);
      issues.push({
        code: 'missing_table_column',
        line: expected.line,
        item: missing,
        message: `Missing table from baseline line ${expected.line}, column(s): ${missing.join(', ')} (actual=${actual.columns}, expected=${expected.columns})`,
      });
    }
    if (actual.rows < expected.rows) {
      issues.push({
        code: 'missing_table_row',
        line: expected.line,
        item: expected.text,
        message: `Missing table row(s) from baseline line ${expected.line}: actual=${actual.rows}, expected=${expected.rows}`,
      });
    }
  }

  const expectedImages = images(baseline);
  const actualImageCounts = countBy(images(polished), ({ url }) => url);
  const seenImages = new Map();
  for (const item of expectedImages) {
    const occurrence = (seenImages.get(item.url) || 0) + 1;
    seenImages.set(item.url, occurrence);
    if (occurrence <= (actualImageCounts.get(item.url) || 0)) continue;
    issues.push({
      code: 'missing_image',
      line: item.line,
      item: item.text,
      message: `Missing image from baseline line ${item.line}: ${item.text}`,
    });
  }

  const expectedFootnotes = footnotes(baseline);
  const actualFootnotes = footnotes(polished);
  for (const kind of ['references', 'definitions']) {
    const actualCounts = countBy(actualFootnotes[kind], ({ id }) => id);
    const seen = new Map();
    for (const item of expectedFootnotes[kind]) {
      const occurrence = (seen.get(item.id) || 0) + 1;
      seen.set(item.id, occurrence);
      if (occurrence <= (actualCounts.get(item.id) || 0)) continue;
      issues.push({
        code: `missing_footnote_${kind === 'references' ? 'reference' : 'definition'}`,
        line: item.line,
        item: item.text,
        message: `Missing footnote ${kind === 'references' ? 'reference' : 'definition'} from baseline line ${item.line}: ${item.text}`,
      });
    }
  }

  return issues;
}

function locatedUrls(markdown) {
  const found = [];
  const pattern = /https?:\/\/[^\s)>\]"']+/g;
  for (const match of markdown.matchAll(pattern)) {
    const value = match[0].replace(/[.,;:!?]+$/g, '');
    found.push({ ...locationAt(markdown, match.index), item: value });
  }
  return found;
}

function locatedNumbers(markdown) {
  const found = [];
  const pattern = /\d+(?:[.,]\d+)*(?:%|‰)?/g;
  for (const match of markdown.matchAll(pattern)) {
    found.push({ ...locationAt(markdown, match.index), item: match[0] });
  }
  return found;
}

function missingLocated(expected, actual, canonical = (value) => value) {
  const available = countBy(actual, ({ item }) => canonical(item));
  const missing = [];
  for (const item of expected) {
    const key = canonical(item.item);
    const remaining = available.get(key) || 0;
    if (remaining > 0) available.set(key, remaining - 1);
    else missing.push(item);
  }
  return missing;
}

function factualIssues(original, polished) {
  const issues = [];
  for (const item of missingLocated(locatedUrls(original), locatedUrls(polished))) {
    issues.push({
      code: 'missing_url',
      line: item.line,
      column: item.column,
      item: item.item,
      message: `Missing URL from original line ${item.line}: ${item.item}`,
    });
  }
  const canonicalNumber = (value) => value.replace(/[%‰]$/, '');
  for (const item of missingLocated(locatedNumbers(original), locatedNumbers(polished), canonicalNumber)) {
    issues.push({
      code: 'missing_numeric_token',
      line: item.line,
      column: item.column,
      item: item.item,
      message: `Missing numeric token from original line ${item.line}: ${item.item}`,
    });
  }
  return issues;
}

export function verifyPolishedChinese({ original, before, polished, glossary = {} }) {
  for (const [name, value] of Object.entries({ original, before, polished })) {
    if (typeof value !== 'string') throw new TypeError(`${name} must be a string`);
  }

  const cleanedOriginal = cleanBaseline(original);
  const cleanedBefore = cleanBaseline(before);
  const errors = [];
  let translationReport;
  try {
    translationReport = verifyTranslation(cleanedOriginal.markdown, polished);
  } catch (error) {
    if (!error.report) throw error;
    translationReport = error.report;
    errors.push(...error.report.errors);
  }

  const issues = [
    ...factualIssues(cleanedOriginal.markdown, polished),
    ...structuralIssues(cleanedBefore.markdown, polished),
  ];
  errors.push(...issues.map(({ message }) => message));
  const risks = scanChineseStyle(polished, glossary);
  const baselineLength = cleanedBefore.markdown.trim().length;
  const polishedLength = polished.trim().length;
  const lengthRatio = baselineLength ? polishedLength / baselineLength : (polishedLength ? Infinity : 1);
  if (lengthRatio < 0.8 || lengthRatio > 1.4) {
    risks.push({
      code: 'abnormal_length_change',
      line: 1,
      column: 1,
      ratio: lengthRatio,
      baselineLength,
      polishedLength,
      message: `Abnormal length change requires review: ratio=${Number.isFinite(lengthRatio) ? lengthRatio.toFixed(3) : 'Infinity'}, polished=${polishedLength}, baseline=${baselineLength}, expected=0.800–1.400`,
    });
  }

  const report = {
    ok: errors.length === 0,
    errors,
    warnings: translationReport.warnings || [],
    risks,
    needsReview: risks.length > 0,
    issues,
    removals: {
      original: cleanedOriginal.removals,
      before: cleanedBefore.removals,
    },
    metrics: {
      ...translationReport.metrics,
      baselineLength,
      polishedLength,
      lengthRatio,
    },
  };

  if (!report.ok) {
    const error = new Error(errors.join('; '));
    error.report = report;
    throw error;
  }
  return report;
}
