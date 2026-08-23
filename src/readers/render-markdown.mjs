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

export function renderInline(source) {
  let value = escapeHtml(source);
  const codeTokens = [];
  value = value.replace(/`([^`\n]+)`/g, (_, code) => {
    const token = `\u0000CODE${codeTokens.length}\u0000`;
    codeTokens.push(`<code>${code}</code>`);
    return token;
  });
  value = value.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, alt) => `<span class="image-alt">图：${alt}</span>`);
  value = value.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, label, href) => {
    if (!isSafeHref(href)) return label;
    const external = /^https?:/i.test(href);
    return `<a href="${href}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${label}</a>`;
  });
  value = value.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  value = value.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  value = value.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  value = value.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  codeTokens.forEach((html, index) => { value = value.replace(`\u0000CODE${index}\u0000`, html); });
  return value;
}

function startsBlock(line) {
  return /^\s*$/.test(line) || /^#{1,6}\s+/.test(line) || /^```/.test(line) || /^>\s?/.test(line) || /^\s*(?:[-+*]|\d+\.)\s+/.test(line);
}

export function renderMarkdown(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) throw new Error('Chinese Markdown rendered empty');
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

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
        items.push(`<li>${renderInline(item[2].trim())}</li>`);
        index += 1;
      }
      output.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !startsBlock(lines[index])) paragraph.push(lines[index++].trim());
    output.push(`<p>${renderInline(paragraph.join('\n')).replaceAll('\n', '<br>')}</p>`);
  }
  const html = output.join('\n');
  if (!html.trim()) throw new Error('Chinese Markdown rendered empty');
  return html;
}
