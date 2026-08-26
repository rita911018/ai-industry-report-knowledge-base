export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isSafeHref(href) {
  const decoded = href.replaceAll('&amp;', '&');
  if (/^(#|\/|\.\/|\.\.\/)/.test(decoded)) return true;
  try { return ['http:', 'https:'].includes(new URL(decoded).protocol); } catch { return false; }
}

function renderEscapedFormatting(source) {
  let value = source;
  const tokens = [];
  const preserve = (html) => {
    const token = `\u0000FORMAT${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };
  value = value.replace(/`([^`\n]+)`/g, (_, code) => {
    return preserve(`<code>${code}</code>`);
  });
  value = value.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  value = value.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  value = value.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  value = value.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  tokens.forEach((html, index) => { value = value.replace(`\u0000FORMAT${index}\u0000`, html); });
  return value;
}

export function renderInline(source) {
  let value = escapeHtml(source);
  const tokens = [];
  const preserve = (html) => {
    const token = `\u0000NODE${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };
  value = value.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, alt) => alt.trim() ? preserve(`<span class="image-alt">图：${alt}</span>`) : '');
  value = value.replace(/\[\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, '');
  value = value.replace(/\[([^\[\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, label, href) => {
    if (!isSafeHref(href)) return label;
    const external = /^https?:/i.test(href);
    return preserve(`<a href="${href}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${renderEscapedFormatting(label)}</a>`);
  });
  value = renderEscapedFormatting(value);
  tokens.forEach((html, index) => { value = value.replace(`\u0000NODE${index}\u0000`, html); });
  return value;
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1);
  const cells = [];
  let cell = '';
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '\\' && value[index + 1] === '|') {
      cell += '|';
      index += 1;
    } else if (value[index] === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += value[index];
    }
  }
  cells.push(cell.trim());
  return cells;
}

function isTableDelimiter(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableStart(lines, index) {
  if (index + 1 >= lines.length || !lines[index].includes('|')) return false;
  const headers = splitTableRow(lines[index]);
  const delimiters = splitTableRow(lines[index + 1]);
  return headers.length > 0 && headers.length === delimiters.length && isTableDelimiter(lines[index + 1]);
}

function renderTableCell(cell) {
  return cell.split(/<br\s*\/?\s*>/i).map((part) => renderInline(part)).join('<br>');
}

function renderTable(lines, start, tableNumber) {
  const headers = splitTableRow(lines[start]);
  const rows = [];
  let index = start + 2;
  while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
    const cells = splitTableRow(lines[index]).slice(0, headers.length);
    while (cells.length < headers.length) cells.push('');
    rows.push(cells);
    index += 1;
  }
  const head = `<thead><tr>${headers.map((cell) => `<th>${renderTableCell(cell)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderTableCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return {
    html: `<div class="table-scroll" role="region" aria-label="数据表 ${tableNumber}" tabindex="0"><table>${head}${body}</table></div>`,
    nextIndex: index,
  };
}

function startsBlock(line) {
  return /^\s*$/.test(line) || /^#{1,6}\s+/.test(line) || /^```/.test(line) || /^>\s?/.test(line) || /^\s*(?:[-+*]|\d+\.)\s+/.test(line) || /^\s*\|.*\|\s*$/.test(line);
}

export function renderMarkdown(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) throw new Error('Chinese Markdown rendered empty');
  const normalized = markdown.replace(/\r\n?/g, '\n').replace(/\[\s*\n\s*\n([^\n[\]]+)\]\((https?:\/\/[^)\n]+)\)/g, '\n\n[$1]($2)');
  const lines = normalized.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed !== '[' && !/^\]\(https?:\/\//i.test(trimmed);
  });
  const output = [];
  let index = 0;
  let tableNumber = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    if (isTableStart(lines, index)) {
      tableNumber += 1;
      const table = renderTable(lines, index, tableNumber);
      output.push(table.html);
      index = table.nextIndex;
      continue;
    }

    const fence = line.match(/^```\s*([\w+-]*)\s*$/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      output.push(`<pre><code${language}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      output.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ''));
      output.push(`<blockquote><p>${renderInline(quote.join('\n')).replaceAll('\n', '<br>')}</p></blockquote>`);
      continue;
    }

    const listMatch = line.match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1]);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
        if (!item || /\d+\./.test(item[1]) !== ordered) break;
        const renderedItem = renderInline(item[2].trim()).trim();
        if (renderedItem) items.push(`<li>${renderedItem}</li>`);
        index += 1;
      }
      if (items.length) output.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !startsBlock(lines[index])) paragraph.push(lines[index++].trim());
    const rendered = renderInline(paragraph.join('\n')).replaceAll('\n', '<br>').trim();
    if (rendered) output.push(`<p>${rendered}</p>`);
  }
  const html = output.join('\n');
  if (!html.trim()) throw new Error('Chinese Markdown rendered empty');
  return html;
}
