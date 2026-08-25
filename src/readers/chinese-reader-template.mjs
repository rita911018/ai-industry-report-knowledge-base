import { escapeHtml } from './render-markdown.mjs';

export const ARCHIVED_PDF_FILENAME = '原始报告.pdf';

function validHttpUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

function categoryLabel(category) {
  if (typeof category === 'string') return category;
  return category?.primary || '';
}

export function renderChineseReader({ article, bodyHtml, returnHref = '/', pdfHref = null }) {
  const id = article?.id || 'unknown';
  for (const field of ['titleZh', 'publisher', 'sourceUrl']) {
    if (!String(article?.[field] || '').trim()) throw new Error(`${id}: missing ${field}`);
  }
  if (!validHttpUrl(article.sourceUrl)) throw new Error(`${id}: invalid sourceUrl`);
  if (!String(bodyHtml || '').trim()) throw new Error(`${id}: missing bodyHtml`);
  if (/<\s*(script|iframe|object|embed)\b|<[^>]+\son\w+\s*=/i.test(bodyHtml)) throw new Error(`${id}: unsafe bodyHtml`);
  if (pdfHref !== null && pdfHref !== undefined && pdfHref !== ARCHIVED_PDF_FILENAME) throw new Error(`${id}: invalid pdfHref`);

  const sourceUrl = escapeHtml(article.sourceUrl);
  const safeReturn = escapeHtml(returnHref || '/');
  const meta = [
    article.publishedAt && ['发布日期', article.publishedAt],
    categoryLabel(article.category) && ['文章类别', categoryLabel(article.category)],
    article.priority && ['优先级', article.priority],
  ].filter(Boolean);
  const summary = article.coreView?.zh || article.summary || '';
  const pdfLink = pdfHref ? `<a href="${ARCHIVED_PDF_FILENAME}" target="_blank" rel="noreferrer">查看原始报告 PDF ↗</a>` : '';
  const nav = `<nav class="reader-nav" aria-label="文章导航"><a href="${safeReturn}">← 返回知识库</a>${pdfLink}<a href="${sourceUrl}" target="_blank" rel="noreferrer">查看官网原文 ↗</a></nav>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(article.titleZh)}的完整中文译文">
  <title>${escapeHtml(article.titleZh)} · ${escapeHtml(article.publisher)}</title>
  <style>
    :root{--paper:#f5f0e6;--paper-2:#fffdf7;--ink:#182421;--muted:#66736e;--teal:#166c66;--terra:#a65338;--line:#d8d0c1;--serif:Georgia,"Songti SC","Noto Serif SC",serif;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:16px var(--serif);line-height:1.9;overflow-wrap:anywhere}a{color:var(--teal);text-underline-offset:4px}:focus-visible{outline:3px solid #287fd1;outline-offset:4px}.reader-shell{width:min(calc(100% - 48px),960px);margin:auto}.reader-nav{display:flex;justify-content:space-between;gap:24px;padding:24px 0;border-bottom:1px solid var(--line);font:700 13px/1.4 var(--sans)}.reader-header{padding:76px 0 44px}.reader-kicker{margin:0 0 18px;color:var(--teal);font:800 11px/1.4 var(--sans);letter-spacing:.16em;text-transform:uppercase}.reader-header h1{max-width:15ch;margin:0;font:600 clamp(42px,7vw,74px)/1.08 var(--serif);letter-spacing:-.045em;text-wrap:balance}.original-title{max-width:52em;margin:22px 0 0;color:var(--muted);font:15px/1.6 var(--sans)}.meta-row{display:flex;flex-wrap:wrap;gap:10px 24px;margin-top:28px;font:12px/1.6 var(--sans);color:var(--muted)}.meta-row span{display:inline-flex;gap:7px}.meta-row b{color:var(--ink)}.translation-note{margin:0 0 34px;padding:16px 18px;border-left:4px solid var(--terra);background:#efe1d4;color:#704130;font:13px/1.65 var(--sans)}.reader-main{max-width:760px;margin:0 auto;padding-bottom:70px}.summary{margin:0 0 54px;padding:28px 30px;background:var(--teal);color:white}.summary h2{margin:0 0 10px;color:#d5ff8a;font:800 11px/1.4 var(--sans);letter-spacing:.14em}.summary p{margin:0;font-size:19px;line-height:1.75}.article-body>h1:first-child{display:none}.article-body h1,.article-body h2,.article-body h3,.article-body h4,.article-body h5,.article-body h6{scroll-margin-top:24px;line-height:1.3;text-wrap:balance}.article-body h2{margin:2.5em 0 .7em;padding-top:.7em;border-top:1px solid var(--line);font-size:30px}.article-body h3{margin:2em 0 .55em;font-size:23px}.article-body h4{margin:1.7em 0 .45em;font:700 17px/1.4 var(--sans)}.article-body p{margin:1.15em 0}.article-body ul,.article-body ol{padding-left:1.4em}.article-body li{margin:.45em 0}.article-body blockquote{margin:2em 0;padding:8px 24px;border-left:4px solid var(--terra);background:#eee5d8;color:#4d5b56}.article-body pre{max-width:100%;overflow:auto;padding:18px;background:#12201d;color:#e7efe9;border-radius:4px;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}.article-body code{padding:.12em .35em;background:#e6ded0;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.article-body pre code{padding:0;background:transparent}.image-alt{display:block;margin:1.6em 0;padding:12px;border:1px dashed var(--line);color:var(--muted);font:13px/1.6 var(--sans)}.table-scroll{max-width:100%;margin:1.8em 0;overflow-x:auto;border:1px solid var(--line);background:var(--paper-2)}.article-body table{width:100%;min-width:680px;border-collapse:collapse;font:13px/1.55 var(--sans)}.article-body th,.article-body td{padding:12px 14px;border:1px solid var(--line);text-align:left;vertical-align:top}.article-body th{background:#e8e0d2;color:var(--ink);font-weight:800}.article-body tr:nth-child(even) td{background:#faf7ef}.reader-footer{padding:30px 0 52px;border-top:1px solid var(--line);color:var(--muted);font:12px/1.6 var(--sans)}
    @media (max-width:390px){.reader-shell{width:calc(100% - 30px)}.reader-nav{gap:12px;font-size:11px}.reader-header{padding:50px 0 32px}.reader-header h1{font-size:40px}.reader-main{max-width:100%}.summary{padding:22px 20px}.summary p{font-size:17px}.article-body h2{font-size:26px}.article-body pre{font-size:11px}}
    @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
    @media print{body{background:white}.reader-shell{width:100%}.reader-nav{display:none}.reader-header{padding-top:20px}.reader-main{max-width:none}.summary{color:#111;background:#eee;border:1px solid #aaa}.summary h2{color:#111}.article-body h2,.article-body h3{break-after:avoid}.article-body p,.article-body li,.article-body blockquote{orphans:3;widows:3}a[href^="http"]::after{content:" (" attr(href) ")";font-size:9px;word-break:break-all}}
  </style>
</head>
<body>
  <header class="reader-shell">${nav}<div class="reader-header"><p class="reader-kicker">${escapeHtml(article.publisher)} · 中文全文</p><h1>${escapeHtml(article.titleZh)}</h1>${article.titleOriginal ? `<p class="original-title" lang="en">${escapeHtml(article.titleOriginal)}</p>` : ''}${meta.length ? `<div class="meta-row">${meta.map(([label, value]) => `<span><b>${label}</b>${escapeHtml(value)}</span>`).join('')}</div>` : ''}</div></header>
  <main class="reader-main"><p class="translation-note">这是本地归档的完整中文译文，排版供阅读使用；如需核对措辞、图表或最新版本，请以官网原文为准。</p>${summary ? `<section class="summary" aria-labelledby="summary-title"><h2 id="summary-title">核心导读</h2><p>${escapeHtml(summary)}</p></section>` : ''}<article class="article-body">${bodyHtml}</article></main>
  <footer class="reader-shell reader-footer">${nav}<p>Markdown 译文继续作为本地检索与审计的权威内容源。</p></footer>
</body>
</html>
`;
}
