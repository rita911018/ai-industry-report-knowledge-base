import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const MINIMUM_VISIBLE_CHARACTERS = 300;

const SOURCE_SELECTORS = {
  BCG: ['main article', '[data-component="article-body"]', 'main'],
  Anthropic: ['main article', '#main-content', 'main'],
  McKinsey: ['main article', '.article-body', '[data-module="ArticleBody"]', 'main'],
  MIT: ['main article', 'main[role="main"]', 'main'],
  Bain: ['main article', 'main[role="main"]', 'main'],
};

const NOISE_SELECTOR = [
  'nav',
  'header',
  'footer',
  'aside',
  'script',
  'style',
  'noscript',
  'form',
  '[aria-hidden="true"]',
  '[class*="cookie" i]',
  '[id*="cookie" i]',
  '[class*="newsletter" i]',
  '[class*="related" i]',
  '[class*="recommend" i]',
  '[class*="social-share" i]',
].join(',');

function visibleText(node) {
  return (node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function cleanContent(node, url) {
  const cleaned = node.cloneNode(true);
  cleaned.querySelectorAll(NOISE_SELECTOR).forEach((element) => element.remove());
  cleaned.querySelectorAll('a[href]').forEach((anchor) => {
    try {
      anchor.setAttribute('href', new URL(anchor.getAttribute('href'), url).href);
    } catch {
      anchor.removeAttribute('href');
    }
  });
  cleaned.querySelectorAll('img[src]').forEach((image) => {
    try {
      image.setAttribute('src', new URL(image.getAttribute('src'), url).href);
    } catch {
      image.removeAttribute('src');
    }
  });
  return cleaned;
}

function selectSourceContent(document, publisher, url) {
  const selectors = SOURCE_SELECTORS[publisher] || ['main article', 'article', 'main'];
  for (const selector of selectors) {
    const candidate = document.querySelector(selector);
    if (!candidate) continue;
    const cleaned = cleanContent(candidate, url);
    if (visibleText(cleaned).length >= MINIMUM_VISIBLE_CHARACTERS) {
      return { node: cleaned, method: `selector:${selector}` };
    }
  }
  return null;
}

function readabilityContent(html, url) {
  const readabilityDocument = new JSDOM(html, { url }).window.document;
  const parsed = new Readability(readabilityDocument).parse();
  if (!parsed?.content) return null;

  const wrapperDocument = new JSDOM(`<main>${parsed.content}</main>`, { url }).window.document;
  const node = cleanContent(wrapperDocument.querySelector('main'), url);
  return {
    node,
    method: 'readability',
    title: parsed.title || null,
    byline: parsed.byline || null,
  };
}

function metadata(document) {
  const meta = (selector) => document.querySelector(selector)?.getAttribute('content')?.trim() || null;
  return {
    title:
      document.querySelector('h1')?.textContent.trim() ||
      meta('meta[property="og:title"]') ||
      document.title.trim() ||
      null,
    byline:
      meta('meta[name="author"]') ||
      document.querySelector('[rel="author"]')?.textContent.trim() ||
      null,
    publishedAt:
      meta('meta[property="article:published_time"]') ||
      document.querySelector('time[datetime]')?.getAttribute('datetime') ||
      null,
  };
}

export function extractArticle({ html, url, publisher }) {
  const document = new JSDOM(html, { url }).window.document;
  const pageMetadata = metadata(document);
  let selected = selectSourceContent(document, publisher, url);

  if (!selected) {
    selected = readabilityContent(html, url);
  }

  if (!selected) {
    return {
      status: 'thin',
      markdown: '',
      contentHtml: '',
      headingCount: 0,
      paragraphCount: 0,
      characterCount: 0,
      extractionMethod: 'none',
      ...pageMetadata,
    };
  }

  const characterCount = visibleText(selected.node).length;
  const turndown = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });
  turndown.remove(['script', 'style', 'noscript']);
  const markdown = turndown.turndown(selected.node.innerHTML).trim();

  return {
    status: characterCount >= MINIMUM_VISIBLE_CHARACTERS ? 'extracted' : 'thin',
    markdown,
    contentHtml: selected.node.innerHTML,
    headingCount: selected.node.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
    paragraphCount: selected.node.querySelectorAll('p').length,
    characterCount,
    extractionMethod: selected.method,
    title: selected.title || pageMetadata.title,
    byline: selected.byline || pageMetadata.byline,
    publishedAt: pageMetadata.publishedAt,
  };
}
