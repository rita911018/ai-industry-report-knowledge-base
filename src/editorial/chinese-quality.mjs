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

function standaloneMarkdownLink(line) {
  const match = line.trim().match(/^\[([^\]]+)]\((<?[^\s)>]+>?)(?:\s+(["'])(.*?)\3)?\)$/);
  if (!match) return null;
  return {
    label: match[1].trim(),
    destination: match[2].replace(/^<|>$/g, ''),
    title: match[4] || '',
  };
}

function noiseCodeForLabels(labels) {
  for (const category of NOISE_LINE_PATTERNS) {
    if (labels.every((line) => category.patterns.some((pattern) => pattern.test(line)))) return category.code;
  }
  return null;
}

function strongUiLinkLabel(link) {
  if (link.title || !/^https?:\/\//i.test(link.destination)) return null;
  let signals;
  try {
    const url = new URL(link.destination);
    signals = new Set([
      ...url.pathname.toLowerCase().split('/').filter(Boolean),
      ...[...url.searchParams.entries()].flatMap(([key, value]) => [key.toLowerCase(), value.toLowerCase()]),
    ]);
  } catch {
    return null;
  }
  const label = link.label.toLowerCase();
  const targetPatterns = [
    { label: /^(?:print|打印)$/iu, signals: ['print', 'printable'] },
    { label: /^(?:share|分享)$/iu, signals: ['share'] },
    { label: /^(?:save|save (?:it )?for later|保存|稍后阅读)$/iu, signals: ['save'] },
    { label: /^(?:subscribe|订阅|订阅简报)$/iu, signals: ['subscribe', 'newsletter'] },
  ];
  return targetPatterns.some((entry) => entry.label.test(label) && entry.signals.some((signal) => signals.has(signal)))
    ? link.label
    : null;
}

function possibleStandaloneUiBlock(block) {
  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return false;
  return lines.every((line) => {
    const link = standaloneMarkdownLink(line);
    return Boolean(link && noiseCodeForLabels([link.label]));
  });
}

export function classifyNoiseBlock(block) {
  if (typeof block !== 'string' || !block.trim() || /```|~~~|`/.test(block)) return null;
  if (/^(?: {4}|\t)/.test(block)) return null;
  if (/\r?\n[ \t]*\r?\n/.test(block)) return null;

  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  if (lines.some((line) => /^[-+*]\s+/.test(line))) return null;
  const labels = lines.map((line) => {
    const link = standaloneMarkdownLink(line);
    return link ? strongUiLinkLabel(link) : line;
  });
  if (labels.some((label) => !label)) return null;
  return noiseCodeForLabels(labels);
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

function indentation(line) {
  let columns = 0;
  let index = 0;
  while (index < line.length && /[ \t]/u.test(line[index])) {
    columns += line[index] === '\t' ? 4 - (columns % 4) : 1;
    index += 1;
  }
  return { columns, index, content: line.slice(index) };
}

function listMarker(line) {
  const leading = indentation(line);
  const match = leading.content.match(/^([-+*]|\d+[.)])([ \t]+)/u);
  if (!match) return null;
  const spacing = indentation(match[2]).columns;
  return {
    markerIndent: leading.columns,
    contentIndent: leading.columns + match[1].length + spacing,
  };
}

function scanMarkdownLines(markdown, lineMap) {
  const lines = [];
  let fence = null;
  let listStack = [];
  let lineIndex = 0;
  for (const match of markdown.matchAll(/[^\r\n]*(?:\r\n|\n|$)/g)) {
    const raw = match[0];
    if (!raw) continue;
    const text = raw.replace(/\r?\n$/, '');
    const opening = fence ? null : fenceOpening(text);
    const closing = fence ? closesFence(text, fence) : false;
    const possibleMarker = fence || opening ? null : listMarker(text);
    const leading = indentation(text);
    const parentList = possibleMarker && [...listStack]
      .reverse()
      .find(({ contentIndent }) => possibleMarker.markerIndent >= contentIndent);
    const marker = possibleMarker && (possibleMarker.markerIndent < 4 || parentList)
      ? possibleMarker
      : null;
    let indentedCode = false;
    if (!fence && !opening && marker) {
      listStack = listStack.filter(({ markerIndent }) => markerIndent < marker.markerIndent);
      listStack.push(marker);
    } else if (!fence && !opening && leading.content) {
      const listContext = [...listStack]
        .reverse()
        .find(({ contentIndent }) => leading.columns >= contentIndent);
      indentedCode = listContext
        ? leading.columns >= listContext.contentIndent + 4
        : leading.columns >= 4;
      if (!listContext && leading.columns < 4) listStack = [];
    }
    const protectedLine = Boolean(fence || opening || indentedCode);
    lines.push({
      raw,
      text,
      start: match.index,
      line: lineMap?.[lineIndex] ?? lineIndex + 1,
      protected: protectedLine,
      fenceOpening: Boolean(opening),
      fenceClosing: closing,
    });
    if (opening) fence = opening;
    else if (closing) fence = null;
    lineIndex += 1;
  }
  return lines;
}

function maskInlineCode(text) {
  const characters = text.split('');
  for (let index = 0; index < text.length;) {
    if (text[index] !== '`') {
      index += 1;
      continue;
    }
    let openingLength = 1;
    while (text[index + openingLength] === '`') openingLength += 1;
    let cursor = index + openingLength;
    let closingEnd = -1;
    while (cursor < text.length) {
      if (text[cursor] !== '`') {
        cursor += 1;
        continue;
      }
      let closingLength = 1;
      while (text[cursor + closingLength] === '`') closingLength += 1;
      if (closingLength === openingLength) {
        closingEnd = cursor + closingLength;
        break;
      }
      cursor += closingLength;
    }
    if (closingEnd === -1) {
      index += openingLength;
      continue;
    }
    for (let maskIndex = index; maskIndex < closingEnd; maskIndex += 1) {
      if (!/[\r\n]/u.test(characters[maskIndex])) characters[maskIndex] = ' ';
    }
    index = closingEnd;
  }
  return characters.join('');
}

function maskScannedLines(lines) {
  const codeProtected = lines
    .map((line) => (line.protected ? line.raw.replace(/[^\r\n]/g, ' ') : line.raw))
    .join('');
  const masked = maskInlineCode(codeProtected);
  let offset = 0;
  return lines.map((line) => {
    const raw = masked.slice(offset, offset + line.raw.length);
    offset += line.raw.length;
    return { ...line, raw, text: raw.replace(/\r?\n$/, '') };
  });
}

function splitMarkdownBlocks(markdown, lineMap) {
  const lines = scanMarkdownLines(markdown, lineMap);
  const blocks = [];
  let chunks = [];
  let blockLineMap = [];
  let blockLines = [];
  let blockLine = 1;
  let protectedBlock = false;

  const flush = ({ beforeBlank = false } = {}) => {
    if (!chunks.length) return;
    let block = chunks.join('');
    if (beforeBlank) block = block.replace(/\r?\n$/, '');
    blocks.push({ block, line: blockLine, lineMap: blockLineMap, lines: blockLines, protected: protectedBlock });
    chunks = [];
    blockLineMap = [];
    blockLines = [];
    protectedBlock = false;
  };

  for (const line of lines) {
    const blank = /^[ \t]*$/.test(line.text);

    if (!line.protected && blank) {
      flush({ beforeBlank: true });
      continue;
    }

    if (!chunks.length) blockLine = line.line;
    protectedBlock ||= line.protected;
    chunks.push(line.raw);
    blockLineMap.push(line.line);
    blockLines.push(line);
  }
  flush();
  return blocks;
}

function cleanBaselineInternal(markdown) {
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
      retained.push(item);
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

  const lineMap = [];
  for (let index = 0; index < retained.length; index += 1) {
    if (index) lineMap.push(null);
    const lineCount = retained[index].block.split(/\r?\n/).length;
    for (let offset = 0; offset < lineCount; offset += 1) lineMap.push(retained[index].line + offset);
  }
  return { markdown: retained.map(({ block }) => block).join(separator), removals, lineMap };
}

export function cleanBaseline(markdown) {
  const { markdown: cleanedMarkdown, removals } = cleanBaselineInternal(markdown);
  return { markdown: cleanedMarkdown, removals };
}

function locationAt(text, index) {
  const prefix = text.slice(0, index);
  const line = (prefix.match(/\n/g) || []).length + 1;
  const lastNewline = prefix.lastIndexOf('\n');
  return { line, column: index - lastNewline };
}

function mappedLocationAt(text, index, lineMap) {
  const location = locationAt(text, index);
  return { ...location, line: lineMap?.[location.line - 1] ?? location.line };
}

function sanitizeProtectedMarkdown(markdown) {
  return maskScannedLines(scanMarkdownLines(markdown))
    .map((line) => line.raw)
    .join('')
    .replace(/(?:https?:\/\/|mailto:|tel:)[^\s)>\]"']+/g, (value) => ' '.repeat(value.length));
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
    if (!code && !protectedBlock && possibleStandaloneUiBlock(block)) {
      const label = block.trim();
      pushRisk(risks, markdown, 'possible_webpage_ui', index, `Possible standalone webpage UI link requires review: ${label}`, { block: label });
      continue;
    }
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

function markdownLines(markdown, lineMap) {
  return maskScannedLines(scanMarkdownLines(markdown, lineMap))
    .filter((line) => !line.protected)
    .map(({ text, line, start }) => ({ text, line, start }));
}

function headings(markdown, lineMap) {
  return markdownLines(markdown, lineMap).flatMap((entry) => {
    const match = entry.text.match(/^(#{1,6})\s+(.+?)\s*$/);
    return match ? [{ ...entry, level: match[1].length, label: match[2] }] : [];
  });
}

function listItems(markdown, lineMap) {
  return markdownLines(markdown, lineMap).flatMap((entry) => {
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

function tables(markdown, lineMap) {
  const lines = markdownLines(markdown, lineMap);
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
      fingerprint: rows.map(({ text }) => text).join('\n'),
    });
    index = next - 1;
  }
  return found;
}

function inlineMarkdownStructures(markdown, lineMap) {
  const links = [];
  const images = [];
  const pattern = /(!?)\[([^\]\n]*)]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  for (const line of markdownLines(markdown, lineMap)) {
    for (const match of line.text.matchAll(pattern)) {
      const destination = match[3].replace(/^<|>$/g, '');
      const item = {
        line: line.line,
        column: match.index + 1,
        text: match[0],
        label: match[2],
        destination,
      };
      (match[1] ? images : links).push(item);
    }
  }
  return { links, images };
}

function referenceMarkdownStructures(markdown, lineMap) {
  const links = [];
  const images = [];
  const definitions = [];
  const usagePattern = /(!?)\[([^\]\n]*)]\[([^\]\n]*)]/g;
  const shortcutPattern = /(?<!\])(!?)\[([^\]\n]+)](?![[(])/g;
  const definitionPattern = /^ {0,3}\[([^\]^][^\]]*)]:\s*(<?\S+>?)(?:\s+.*)?$/;
  const lines = markdownLines(markdown, lineMap);
  const definitionLines = new Set();
  for (const line of lines) {
    const definition = line.text.match(definitionPattern);
    if (definition) {
      definitionLines.add(line.start);
      definitions.push({
        line: line.line,
        column: line.text.indexOf('[') + 1,
        text: line.text.trim(),
        id: definition[1].trim().toLowerCase(),
        destination: definition[2].replace(/^<|>$/g, ''),
      });
    }
  }
  const definitionIds = new Set(definitions.map(({ id }) => id));
  for (const line of lines) {
    if (definitionLines.has(line.start)) continue;
    for (const match of line.text.matchAll(usagePattern)) {
      const item = {
        line: line.line,
        column: match.index + 1,
        text: match[0],
        label: match[2],
        id: (match[3] || match[2]).trim().toLowerCase(),
      };
      (match[1] ? images : links).push(item);
    }
    for (const match of line.text.matchAll(shortcutPattern)) {
      const id = match[2].trim().toLowerCase();
      if (id.startsWith('^') || !definitionIds.has(id)) continue;
      const item = {
        line: line.line,
        column: match.index + 1,
        text: match[0],
        label: match[2],
        id,
      };
      (match[1] ? images : links).push(item);
    }
  }
  return { links, images, definitions };
}

function semanticMarkdownStructures(inline, references) {
  const definitions = new Map(references.definitions.map((definition) => [definition.id, definition]));
  const resolve = (kind) => {
    const resolvedReferences = references[kind].map((item) => {
      const definition = definitions.get(item.id);
      return { ...item, syntax: 'reference', destination: definition?.destination || null, definition };
    });
    return [
      ...inline[kind].map((item) => ({ ...item, syntax: 'inline' })),
      ...resolvedReferences.filter(({ destination }) => destination),
    ];
  };
  return {
    links: resolve('links'),
    images: resolve('images'),
    unresolved: [...references.links, ...references.images]
      .filter((item) => !definitions.has(item.id)),
  };
}

function footnotes(markdown, lineMap) {
  const definitions = [];
  const references = [];
  const definitionPattern = /^\[\^([^\]]+)]\s*:/;
  const referencePattern = /\[\^([^\]]+)]/g;
  for (const line of markdownLines(markdown, lineMap)) {
    const definition = line.text.match(definitionPattern);
    if (definition) {
      definitions.push({ line: line.line, column: 1, id: definition[1], text: definition[0] });
      continue;
    }
    for (const match of line.text.matchAll(referencePattern)) {
      references.push({ line: line.line, column: match.index + 1, id: match[1], text: match[0] });
    }
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

function alignSequence(expected, actual, signature, label) {
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
  const pairs = [];
  let expectedIndex = expected.length;
  let actualIndex = actual.length;
  while (expectedIndex || actualIndex) {
    const action = actions[expectedIndex][actualIndex];
    if (action === 'align') {
      pairs.push([expected[expectedIndex - 1], actual[actualIndex - 1]]);
      expectedIndex -= 1;
      actualIndex -= 1;
    } else if (action === 'insert') {
      actualIndex -= 1;
    } else {
      missing.push(expected[expectedIndex - 1]);
      expectedIndex -= 1;
    }
  }
  return { missing: missing.reverse(), pairs: pairs.reverse() };
}

function missingByAlignedSequence(expected, actual, signature, label) {
  return alignSequence(expected, actual, signature, label).missing;
}

function countBy(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) || 0) + 1);
  return counts;
}

function missingByKey(expected, actual, key) {
  const available = countBy(actual, key);
  const missing = [];
  for (const item of expected) {
    const itemKey = key(item);
    const remaining = available.get(itemKey) || 0;
    if (remaining) available.set(itemKey, remaining - 1);
    else missing.push(item);
  }
  return missing;
}

function structuralIssues(baseline, polished, baselineLineMap) {
  const issues = [];
  const expectedHeadings = headings(baseline, baselineLineMap);
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

  const expectedListItems = listItems(baseline, baselineLineMap);
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

  const expectedTables = tables(baseline, baselineLineMap);
  const actualTables = tables(polished);
  const tableAlignment = alignSequence(
    expectedTables,
    actualTables,
    () => 'table',
    ({ fingerprint }) => fingerprint,
  );
  for (const expected of tableAlignment.missing) {
    issues.push({
      code: 'missing_table',
      line: expected.line,
      item: expected.text,
      message: `Missing table from baseline line ${expected.line}: ${expected.text}`,
    });
  }
  for (const [expected, actual] of tableAlignment.pairs) {
    if (actual.columns < expected.columns) {
      const expectedHeaders = expected.headers.map((label, headerIndex) => ({ label, headerIndex }));
      const actualHeaders = actual.headers.map((label, headerIndex) => ({ label, headerIndex }));
      const missingColumns = missingByAlignedSequence(
        expectedHeaders,
        actualHeaders,
        () => 'column',
        ({ label }) => label,
      ).map(({ label, headerIndex }) => ({ index: headerIndex + 1, label }));
      const item = missingColumns.map(({ index, label }) => `${index} "${label}"`).join(', ');
      issues.push({
        code: 'missing_table_column',
        line: expected.line,
        item,
        details: { missingColumns, actualColumns: actual.columns, expectedColumns: expected.columns },
        message: `Missing table from baseline line ${expected.line}, column(s): ${item} (actual=${actual.columns}, expected=${expected.columns})`,
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

  const expectedInline = inlineMarkdownStructures(baseline, baselineLineMap);
  const actualInline = inlineMarkdownStructures(polished);
  const expectedReferences = referenceMarkdownStructures(baseline, baselineLineMap);
  const actualReferences = referenceMarkdownStructures(polished);
  const expectedSemantics = semanticMarkdownStructures(expectedInline, expectedReferences);
  const actualSemantics = semanticMarkdownStructures(actualInline, actualReferences);
  for (const kind of ['links', 'images']) {
    for (const item of missingByKey(expectedSemantics[kind], actualSemantics[kind], ({ destination }) => destination)) {
      const code = kind === 'images'
        ? (item.syntax === 'reference' ? 'missing_reference_image' : 'missing_image')
        : (item.syntax === 'reference' ? 'missing_reference_link' : 'missing_markdown_link');
      issues.push({
        code,
        line: item.line,
        column: item.column,
        item: item.text,
        details: { destination: item.destination, sourceSyntax: item.syntax },
        message: `Missing Markdown ${kind === 'links' ? 'link' : 'image'} from baseline line ${item.line}: ${item.text}`,
      });
    }
  }

  const expectedDefinitions = new Map(expectedReferences.definitions.map((definition) => [definition.id, definition]));
  for (const unresolved of actualSemantics.unresolved) {
    const expectedDefinition = expectedDefinitions.get(unresolved.id);
    const item = expectedDefinition || unresolved;
    issues.push({
      code: 'missing_link_definition',
      line: item.line,
      column: item.column,
      item: item.text,
      details: { referenceId: unresolved.id, destination: expectedDefinition?.destination || null },
      message: `Missing link definition required by reference "${unresolved.id}" at line ${unresolved.line}: ${item.text}`,
    });
  }

  const expectedFootnotes = footnotes(baseline, baselineLineMap);
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

function locatedUrls(markdown, lineMap) {
  const found = [];
  const pattern = /https?:\/\/[^\s)>\]"']+/g;
  for (const match of markdown.matchAll(pattern)) {
    const value = match[0].replace(/[.,;:!?]+$/g, '');
    found.push({ ...mappedLocationAt(markdown, match.index, lineMap), item: value });
  }
  return found;
}

function locatedNumbers(markdown, lineMap) {
  const found = [];
  const pattern = /\d+(?:[.,]\d+)*(?:%|‰)?/g;
  for (const match of markdown.matchAll(pattern)) {
    found.push({ ...mappedLocationAt(markdown, match.index, lineMap), item: match[0] });
  }
  return found;
}

const CURRENCY_TOKEN_SOURCE = String.raw`(?:US\$|HK\$|A\$|C\$|S\$|USD|HKD|AUD|CAD|SGD|EUR|GBP|CNY|RMB|[$€£¥]|(?:US\s+)?dollars?|Hong\s+Kong\s+dollars?|Australian\s+dollars?|Canadian\s+dollars?|Singapore\s+dollars?|euros?|pounds?|yuan|美元|港元|港币|澳元|加元|新加坡元|新元|欧元|英镑|人民币|元)`;
const SCALE_SOURCE = String.raw`(?:thousand|million|billion|trillion|万亿|十亿|百万|千|万)`;
const UNIT_DEFINITIONS = [
  { key: 'unit:km', english: [String.raw`kilomet(?:er|re)s?`, 'km'], local: ['公里', '千米'] },
  { key: 'unit:kg', english: [String.raw`kilograms?`, 'kg'], local: ['公斤'] },
  { key: 'unit:GB', english: [String.raw`gigabytes?`, 'GB'] },
  { key: 'unit:MB', english: [String.raw`megabytes?`, 'MB'] },
  { key: 'unit:TB', english: [String.raw`terabytes?`, 'TB'] },
  { key: 'unit:kWh', english: [String.raw`kilowatt[ -]?hours?`, 'kWh'], local: ['千瓦时'] },
  { key: 'unit:MWh', english: [String.raw`megawatt[ -]?hours?`, 'MWh'], local: ['兆瓦时'] },
  { key: 'unit:GWh', english: [String.raw`gigawatt[ -]?hours?`, 'GWh'], local: ['吉瓦时'] },
  { key: 'unit:Wh', english: [String.raw`watt[ -]?hours?`, 'Wh'], local: ['瓦时'] },
  { key: 'unit:kW', english: [String.raw`kilowatts?`, 'kW'], local: ['千瓦'] },
  { key: 'unit:MW', english: [String.raw`megawatts?`, 'MW'], local: ['兆瓦'] },
  { key: 'unit:GW', english: [String.raw`gigawatts?`, 'GW'], local: ['吉瓦'] },
  { key: 'unit:tonne', english: [String.raw`metric\s+tonnes?`, String.raw`tonnes?`, String.raw`tons?`], local: ['公吨', '吨'] },
  { key: 'unit:token', english: [String.raw`tokens?`], local: ['令牌', '词元'] },
  { key: 'unit:second', english: [String.raw`seconds?`, String.raw`secs?`], local: ['秒'] },
  { key: 'unit:month', english: [String.raw`months?`], local: ['个月', '月'] },
  { key: 'unit:basis_point', english: [String.raw`basis\s+points?`, 'bps'], local: ['个基点', '基点'] },
  { key: 'unit:celsius', local: ['°C'] },
  { key: 'unit:fahrenheit', local: ['°F'] },
];

function boundarySafeEnglishSource(alternatives) {
  const longestFirst = [...alternatives].sort((left, right) => right.length - left.length);
  return String.raw`(?<![A-Za-z0-9_])(?:${longestFirst.join('|')})(?![-A-Za-z0-9_])`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ENGLISH_UNIT_SOURCE = boundarySafeEnglishSource(UNIT_DEFINITIONS.flatMap(({ english = [] }) => english));
const LOCAL_UNIT_SOURCE = UNIT_DEFINITIONS
  .flatMap(({ local = [] }) => local)
  .sort((left, right) => right.length - left.length)
  .map(escapeRegExp)
  .join('|');
const UNIT_SOURCE = String.raw`(?:${ENGLISH_UNIT_SOURCE}|${LOCAL_UNIT_SOURCE})`;
const FACT_QUALIFIER_SOURCE = String.raw`(?:%|‰|percent|per\s+cent|${SCALE_SOURCE}(?:\s*(?:${CURRENCY_TOKEN_SOURCE}|${UNIT_SOURCE}))?|${CURRENCY_TOKEN_SOURCE}|${UNIT_SOURCE})`;
const CURRENCY_PREFIX = new RegExp(`${CURRENCY_TOKEN_SOURCE}\\s*$`, 'i');
const FACT_QUALIFIER_SUFFIX = new RegExp(`^\\s*${FACT_QUALIFIER_SOURCE}`, 'i');

function canonicalFactQualifier(value) {
  const normalized = value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  const parts = [];
  if (normalized.includes('‰')) parts.push('rate:permille');
  else if (normalized.includes('%') || /\b(?:percent|per cent)\b/.test(normalized)) parts.push('rate:percent');

  const scales = [
    [/trillion|万亿/, 'scale:trillion'],
    [/billion|十亿/, 'scale:billion'],
    [/million|百万/, 'scale:million'],
    [/thousand|千/, 'scale:thousand'],
    [/万/, 'scale:ten_thousand'],
  ];
  const scale = scales.find(([pattern]) => pattern.test(normalized));
  if (scale) parts.push(scale[1]);

  const currencies = [
    [/(?:(?<![a-z])hk\$|hkd|hong kong dollars?|港元|港币)/, 'currency:HKD'],
    [/(?:(?<![a-z])a\$|aud|australian dollars?|澳元)/, 'currency:AUD'],
    [/(?:(?<![a-z])c\$|cad|canadian dollars?|加元)/, 'currency:CAD'],
    [/(?:(?<![a-z])s\$|sgd|singapore dollars?|新加坡元|新元)/, 'currency:SGD'],
    [/(?:us\$|usd|(?<![a-z])\$|(?:us )?dollars?|美元)/, 'currency:USD'],
    [/(?:€|eur|euros?|欧元)/, 'currency:EUR'],
    [/(?:£|gbp|pounds?|英镑)/, 'currency:GBP'],
    [/(?:¥|cny|rmb|yuan|人民币|元)/, 'currency:CNY'],
  ];
  const currency = currencies.find(([pattern]) => pattern.test(normalized));
  if (currency) parts.push(currency[1]);

  const unit = UNIT_DEFINITIONS.find(({ english = [], local = [] }) => (
    (english.length && new RegExp(boundarySafeEnglishSource(english), 'i').test(normalized))
      || local.some((token) => normalized.includes(token.toLowerCase()))
  ));
  if (unit) parts.push(unit.key);
  return parts.join('|');
}

function sentenceSegments(text) {
  const segments = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const decimalPoint = character === '.'
      && /\d/u.test(text[index - 1] ?? '')
      && /\d/u.test(text[index + 1] ?? '');
    const sentenceBoundary = /[。！？!?；;]/u.test(character)
      || (character === '.' && !decimalPoint);
    if (!sentenceBoundary) continue;
    if (index > start) segments.push({ text: text.slice(start, index), start });
    start = index + 1;
  }
  if (start < text.length) segments.push({ text: text.slice(start), start });
  return segments;
}

function rangesOverlap(left, right) {
  return left.start < right.end && right.start < left.end;
}

function sharedQualifierAnchors(lines, group) {
  const anchors = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const tableHeader = lineIndex + 1 < lines.length
      && isTableDivider(lines[lineIndex + 1].text)
      && lines.slice(lineIndex + 2).some(({ text }) => /\d/u.test(text));
    const caption = line.text.match(/^\s*(?:表格?|图(?:表|示)?|figure|fig\.?|chart)\s*\d*\s*[:：.\-]?\s*/iu);
    const captionHasData = Boolean(caption) && (
      /\d/u.test(line.text.slice(caption[0].length))
        || lines.some(({ text }, index) => index !== lineIndex && /\d/u.test(text) && !isTableDivider(text))
    );
    if (!tableHeader && !captionHasData) continue;
    const candidates = [];
    const exactQualifierPattern = new RegExp(
      `^(?:(?:单位|unit)\\s*[:：]\\s*)?(${FACT_QUALIFIER_SOURCE})$`,
      'iu',
    );
    for (const match of line.text.matchAll(/[（(]([^（）()\n]{1,60})[）)]/gu)) {
      if (/\d/u.test(match[1])) continue;
      const exactQualifier = match[1].trim().match(exactQualifierPattern);
      if (!exactQualifier) continue;
      candidates.push({ text: match[0], value: exactQualifier[1], index: match.index });
    }
    const unitPattern = new RegExp(`(?:单位|unit)\\s*[:：]\\s*(${FACT_QUALIFIER_SOURCE})`, 'giu');
    for (const match of line.text.matchAll(unitPattern)) {
      candidates.push({ text: match[0], value: match[1], index: match.index });
    }
    const seen = new Set();
    for (const candidate of candidates) {
      const qualifier = canonicalFactQualifier(candidate.value);
      const key = `shared|${qualifier}`;
      if (!qualifier || seen.has(key)) continue;
      seen.add(key);
      anchors.push({
        line: line.line,
        column: candidate.index + 1,
        item: candidate.text,
        number: 'shared',
        qualifier,
        key,
        group,
      });
    }
  }
  return anchors;
}

function numericFactAnchors(markdown, lineMap) {
  const anchors = [];
  const maximumAssociationDistance = 32;
  let group = 0;
  for (const block of splitMarkdownBlocks(markdown, lineMap)) {
    const visibleLines = maskScannedLines(block.lines)
      .filter((line) => !line.protected)
      .map(({ text, line, start }) => ({ text, line, start }));
    if (!visibleLines.length || (!block.protected && classifyNoiseBlock(block.block))) continue;
    const blockGroup = group;
    group += 1;
    anchors.push(...sharedQualifierAnchors(visibleLines, blockGroup));
    for (const line of visibleLines) {
      for (const segment of sentenceSegments(line.text)) {
        const numbers = [...segment.text.matchAll(/\d+(?:[.,]\d+)*/g)].map((match) => {
          const numberStart = segment.start + match.index;
          const numberEnd = numberStart + match[0].length;
          const prefix = segment.text.slice(0, match.index).match(CURRENCY_PREFIX);
          const suffix = segment.text.slice(match.index + match[0].length).match(FACT_QUALIFIER_SUFFIX);
          const start = numberStart - (prefix?.[0].length || 0);
          const end = numberEnd + (suffix?.[0].length || 0);
          const qualifier = canonicalFactQualifier(`${prefix?.[0] || ''}${suffix?.[0] || ''}`);
          return {
            line: line.line,
            column: start + 1,
            item: line.text.slice(start, end).trim() || match[0],
            number: match[0],
            qualifier,
            start,
            end,
            numberStart,
            numberEnd,
            qualifierRanges: [
              ...(prefix ? [{ start, end: numberStart }] : []),
              ...(suffix ? [{ start: numberEnd, end }] : []),
            ],
          };
        });

        const directRanges = numbers.flatMap(({ qualifierRanges }) => qualifierRanges);
        const qualifierPattern = new RegExp(FACT_QUALIFIER_SOURCE, 'gi');
        const detachedQualifiers = [...segment.text.matchAll(qualifierPattern)]
          .map((match) => ({
            text: match[0],
            qualifier: canonicalFactQualifier(match[0]),
            start: segment.start + match.index,
            end: segment.start + match.index + match[0].length,
          }))
          .filter((qualifier) => qualifier.qualifier && !directRanges.some((range) => rangesOverlap(range, qualifier)));

        const unresolvedNumbers = numbers.filter(({ qualifier }) => !qualifier);
        const candidates = detachedQualifiers.flatMap((qualifier, qualifierIndex) => unresolvedNumbers.map((number, numberIndex) => ({
          qualifier,
          qualifierIndex,
          number,
          numberIndex,
          distance: qualifier.end <= number.numberStart
            ? number.numberStart - qualifier.end
            : qualifier.start - number.numberEnd,
        }))).filter(({ distance }) => distance >= 0 && distance <= maximumAssociationDistance)
          .sort((left, right) => left.distance - right.distance || left.qualifier.start - right.qualifier.start || left.number.numberStart - right.number.numberStart);
        const usedQualifiers = new Set();
        const usedNumbers = new Set();
        for (const candidate of candidates) {
          if (usedQualifiers.has(candidate.qualifierIndex) || usedNumbers.has(candidate.numberIndex)) continue;
          candidate.number.qualifier = candidate.qualifier.qualifier;
          candidate.number.item = `${candidate.number.number} … ${candidate.qualifier.text}`;
          usedQualifiers.add(candidate.qualifierIndex);
          usedNumbers.add(candidate.numberIndex);
        }
        anchors.push(...numbers.map((number) => ({
          line: number.line,
          column: number.column,
          item: number.item,
          number: number.number,
          qualifier: number.qualifier,
          key: `${number.number}|${number.qualifier}`,
          group: blockGroup,
        })));
      }
    }
  }
  return anchors;
}

function additionalSourceFacts(beforeFacts, originalFacts) {
  const represented = countBy(beforeFacts.filter(({ qualifier }) => qualifier), ({ key }) => key);
  const extras = [];
  const seenOriginal = new Map();
  for (const fact of originalFacts.filter(({ qualifier }) => qualifier)) {
    const occurrence = (seenOriginal.get(fact.key) || 0) + 1;
    seenOriginal.set(fact.key, occurrence);
    if (occurrence > (represented.get(fact.key) || 0)) extras.push(fact);
  }
  return extras;
}

function missingQualifiedFacts(expected, actual) {
  const availableByGroup = new Map();
  for (const item of actual.filter(({ qualifier }) => qualifier)) {
    if (!availableByGroup.has(item.group)) availableByGroup.set(item.group, new Map());
    const available = availableByGroup.get(item.group);
    available.set(item.key, (available.get(item.key) || 0) + 1);
  }
  const missing = [];
  for (const item of expected.filter(({ qualifier }) => qualifier)) {
    const available = availableByGroup.get(item.group);
    const remaining = available?.get(item.key) || 0;
    if (remaining > 0) available.set(item.key, remaining - 1);
    else missing.push(item);
  }
  return missing;
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

function factualIssues(original, before, polished, originalLineMap, beforeLineMap) {
  const issues = [];
  for (const item of missingLocated(locatedUrls(original, originalLineMap), locatedUrls(polished))) {
    issues.push({
      code: 'missing_url',
      line: item.line,
      column: item.column,
      item: item.item,
      message: `Missing URL from original line ${item.line}: ${item.item}`,
    });
  }
  const canonicalNumber = (value) => value.replace(/[%‰]$/, '');
  for (const item of missingLocated(locatedNumbers(original, originalLineMap), locatedNumbers(polished), canonicalNumber)) {
    issues.push({
      code: 'missing_numeric_token',
      line: item.line,
      column: item.column,
      item: item.item,
      message: `Missing numeric token from original line ${item.line}: ${item.item}`,
    });
  }
  const beforeAnchors = numericFactAnchors(before, beforeLineMap);
  const originalAnchors = numericFactAnchors(original, originalLineMap);
  const polishedAnchors = numericFactAnchors(polished);
  const missingFacts = missingQualifiedFacts(beforeAnchors, polishedAnchors)
    .map((item) => ({ ...item, source: 'before' }));
  const sourceExtras = additionalSourceFacts(beforeAnchors, originalAnchors);
  missingFacts.push(...missingByKey(
    sourceExtras,
    polishedAnchors.filter(({ qualifier }) => qualifier),
    ({ key }) => key,
  ).map((item) => ({ ...item, source: 'original' })));
  for (const item of missingFacts) {
    const sourceLabel = item.source === 'original' ? 'original' : 'baseline';
    issues.push({
      code: 'missing_factual_qualifier',
      line: item.line,
      column: item.column,
      item: item.item,
      details: { number: item.number, qualifier: item.qualifier, source: item.source },
      message: `Missing or altered factual qualifier from ${sourceLabel} line ${item.line}: ${item.item}`,
    });
  }
  return issues;
}

export function verifyPolishedChinese({ original, before, polished, glossary = {} }) {
  for (const [name, value] of Object.entries({ original, before, polished })) {
    if (typeof value !== 'string') throw new TypeError(`${name} must be a string`);
  }

  const cleanedOriginal = cleanBaselineInternal(original);
  const cleanedBefore = cleanBaselineInternal(before);
  const errors = [];
  let translationErrors = [];
  let translationReport;
  try {
    translationReport = verifyTranslation(cleanedOriginal.markdown, polished);
  } catch (error) {
    if (!error.report) throw error;
    translationReport = error.report;
    translationErrors = error.report.errors;
  }

  const issues = [
    ...factualIssues(
      cleanedOriginal.markdown,
      cleanedBefore.markdown,
      polished,
      cleanedOriginal.lineMap,
      cleanedBefore.lineMap,
    ),
    ...structuralIssues(cleanedBefore.markdown, polished, cleanedBefore.lineMap),
  ];
  const issueCodes = new Set(issues.map(({ code }) => code));
  translationErrors = translationErrors.filter((message) => {
    if (/^Missing URL\(s\):/i.test(message) && issueCodes.has('missing_url')) return false;
    if (/^Missing or altered numeric token\(s\):/i.test(message) && issueCodes.has('missing_numeric_token')) return false;
    if (/^Missing heading\(s\):/i.test(message) && issueCodes.has('missing_heading')) return false;
    return true;
  });
  errors.push(...translationErrors);
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
