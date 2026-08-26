import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../../web/radars/', import.meta.url);

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function cssBlock(css, blockStart, description) {
  if (blockStart === -1) assert.fail(`Missing opening brace for ${description}`);
  let depth = 0;
  for (let index = blockStart; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return { body: css.slice(blockStart + 1, index), end: index };
  }
  assert.fail(`Unclosed ${description}`);
}

function atRuleBlock(css, atRule) {
  const source = stripCssComments(css);
  const ruleStart = source.indexOf(atRule);
  assert.notEqual(ruleStart, -1, `Missing ${atRule}`);
  const blockStart = source.indexOf('{', ruleStart);
  return cssBlock(source, blockStart, atRule).body;
}

function topLevelRules(css) {
  const source = stripCssComments(css);
  const rules = [];
  let searchFrom = 0;
  while (searchFrom < source.length) {
    const blockStart = source.indexOf('{', searchFrom);
    if (blockStart === -1) {
      assert.equal(source.slice(searchFrom).trim(), '', 'Malformed CSS rule without an opening brace');
      break;
    }
    const selector = source.slice(searchFrom, blockStart).trim();
    const block = cssBlock(source, blockStart, selector || 'CSS rule');
    if (selector && !selector.startsWith('@')) rules.push({ selector, declarations: block.body });
    searchFrom = block.end + 1;
  }
  return rules;
}

function matchingRuleDeclarations(css, selector) {
  return topLevelRules(css)
    .filter((rule) => rule.selector.split(',').map((item) => item.trim()).includes(selector))
    .map((rule) => rule.declarations);
}

function ruleDeclarations(css, selector) {
  const matches = matchingRuleDeclarations(css, selector);
  assert.notEqual(matches.length, 0, `Missing ${selector} rule`);
  return matches;
}

function declarationMap(declarations) {
  const properties = new Map();
  for (const declaration of declarations.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator === -1) continue;
    const property = declaration.slice(0, separator).trim();
    if (property) properties.set(property, declaration.slice(separator + 1).trim());
  }
  return properties;
}

function ruleHasDeclaration(css, selector, property, value) {
  return matchingRuleDeclarations(css, selector)
    .some((declarations) => value.test(declarationMap(declarations).get(property) || ''));
}

function assertRuleDeclaration(css, selector, property, value) {
  assert.ok(ruleHasDeclaration(css, selector, property, value), `${selector} is missing ${property}: ${value}`);
}

test('knowledge homepage links to the explicit radar directory index', async () => {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /href="radars\/index\.html"[^>]*>AI机会雷达<\/a>/);
});

const domains = ['legal', 'hr', 'retail', 'supply-chain', 'finance', 'marketing'];

test('radar directory exposes all six domains as full-page destinations', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/class="radar-directory-link"/g) || []).length, domains.length);
  for (const domain of domains) assert.match(html, new RegExp(`href="${domain}\\.html"`));
  assert.match(html, /返回知识库/);
  assert.match(html, /<p class="directory-lede">在你的行业，发现 AI 机会。<\/p>/);
  assert.doesNotMatch(html, /完整场景库用于发现机会/);
});

for (const domain of domains) {
  test(`${domain} page is offline, accessible, and has a useful no-script fallback`, async () => {
    const html = await readFile(new URL(`${domain}.html`, root), 'utf8');
    assert.match(html, /id="radar-app"/);
    assert.match(html, /id="radar-error"[^>]+aria-live="assertive"/);
    assert.match(html, /返回雷达目录/);
    assert.match(html, /返回知识库/);
    assert.match(html, new RegExp(`data/${domain}\\.js`));
    if (!['legal', 'hr'].includes(domain)) assert.match(html, /data\/extended-builder\.js/);
    assert.match(html, /radar\.js/);
    assert.match(html, /<noscript>[\s\S]+核心判断[\s\S]+AI 能解决哪些业务问题[\s\S]+建议优先启动的 3 个场景[\s\S]+证据/);
    assert.doesNotMatch(html, /90 天路线图|治理门槛|五家 Insight Radar/);
    assert.doesNotMatch(html, /iframe|DEEPSEEK|api\/ask/i);
  });
}

test('shared radar styles cover focus, mobile, reduced motion, print, and readable sage', async () => {
  const css = await readFile(new URL('radar.css', root), 'utf8');
  const printStyles = atRuleBlock(css, '@media print');
  const compactMobile = atRuleBlock(css, '@media (max-width: 390px)');
  assert.throws(() => atRuleBlock('@media print', '@media print'), /Missing opening brace/);
  assert.throws(() => atRuleBlock('@media print{body{color:#111}', '@media print'), /Unclosed/);
  const declarationBoundaryFixture = '.fixture{border-color:red;max-width:100px}';
  assert.equal(ruleHasDeclaration(declarationBoundaryFixture, '.fixture', 'color', /^red$/), false);
  assert.equal(ruleHasDeclaration(declarationBoundaryFixture, '.fixture', 'width', /^100px$/), false);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*390px\)/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s+print/);
  assert.match(css, /\.scenario-detail[^{]*\{[^}]*display:\s*block\s*!important/);
  assert.match(css, /\.directory-hero h1\s*\{[^}]*font-size:\s*clamp\(56px,\s*6\.5vw,\s*96px\)/s);
  assert.match(css, /\.directory-lede\s*\{[^}]*font-size:\s*24px/s);
  assert.match(css, /@media\s*\(max-width:\s*390px\)[\s\S]*\.directory-hero h1\s*\{[^}]*font-size:\s*48px/s);
  assert.match(css, /@media\s*\(max-width:\s*390px\)[\s\S]*\.directory-lede\s*\{[^}]*font-size:\s*18px/s);
  assert.match(css, /\.radar-toc-panel\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /@media\s*\(min-width:\s*1100px\)[\s\S]*\.radar-toc-trigger[^}]*display:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*1099px\)[\s\S]*\.radar-toc-panel[^}]*transform:\s*translateX\(-/s);
  assert.match(css, /body\.radar-toc-open[\s\S]*overflow:\s*hidden/s);
  assert.match(css, /@media\s*\(max-width:\s*1099px\)[\s\S]*\.radar-toc-panel\s*\{[^}]*height:\s*100vh[^}]*height:\s*100dvh[^}]*visibility:\s*hidden[^}]*pointer-events:\s*none/s);
  assert.match(css, /body\.radar-toc-open \.radar-toc-panel\s*\{[^}]*visibility:\s*visible[^}]*pointer-events:\s*auto/s);
  assert.match(css, /@media\s*\(min-width:\s*1100px\)[\s\S]*\.radar-toc-panel\s*\{[^}]*transform:\s*none[^}]*visibility:\s*visible[^}]*pointer-events:\s*auto/s);
  assertRuleDeclaration(printStyles, '.radar-toc-panel', 'display', /^none\s*!important$/);
  assertRuleDeclaration(printStyles, '.radar-detail-page #radar-app .radar-shell', 'width', /^100%\s*!important$/);
  assertRuleDeclaration(printStyles, '.radar-detail-page #radar-app .radar-shell', 'margin-inline', /^auto\s*!important$/);
  assertRuleDeclaration(printStyles, 'body', 'overflow', /^visible\s*!important$/);
  const [rootDeclarations] = ruleDeclarations(css, ':root');
  assert.match(rootDeclarations, /--signal:\s*#a9b77a/);
  assert.match(rootDeclarations, /--signal-strong:\s*#718052/);
  assert.match(rootDeclarations, /--text-on-dark:\s*#edf2ee/);
  assert.match(rootDeclarations, /--text-muted-dark:\s*#c1ccc5/);
  assert.doesNotMatch(stripCssComments(css), /#c9ff47/i);
  assertRuleDeclaration(css, '.decision-link strong', 'color', /^var\(--text-on-dark\)$/);
  assertRuleDeclaration(css, '.decision-link small', 'color', /^var\(--text-muted-dark\)$/);
  assertRuleDeclaration(css, '.company-case-summary', 'color', /^var\(--text-muted-dark\)$/);
  assertRuleDeclaration(css, '.source-fact p', 'color', /^var\(--text-muted-dark\)$/);
  assertRuleDeclaration(css, '.evidence-confidence', 'background', /^rgba\(169,\s*183,\s*122,\s*(?:0?\.1|\.10)\)$/);
  assertRuleDeclaration(css, '.matrix-point', 'left', /^clamp\(54px,\s*var\(--x\),\s*calc\(100% - 54px\)\)$/);
  assertRuleDeclaration(css, '.matrix-point', 'width', /^108px$/);
  assertRuleDeclaration(css, '.matrix-point', 'min-width', /^108px$/);
  assertRuleDeclaration(css, '.matrix-point', 'max-width', /^108px$/);
  assertRuleDeclaration(css, '.matrix-point', 'min-height', /^50px$/);
  assertRuleDeclaration(css, '.matrix-point-number', 'font-size', /^12px$/);
  assertRuleDeclaration(css, '.matrix-point-title', 'font-size', /^12px$/);
  assertRuleDeclaration(css, '.matrix-point', 'background', /^transparent$/);
  assertRuleDeclaration(css, '.matrix-point', 'box-shadow', /^none$/);
  assertRuleDeclaration(css, '.matrix-point.p0 .matrix-point-number', 'background', /^var\(--signal\)$/);
  assertRuleDeclaration(css, '.matrix-point.p3 .matrix-point-number', 'border-style', /^dashed$/);
  assertRuleDeclaration(compactMobile, '.matrix-point', 'width', /^100%$/);
  assertRuleDeclaration(compactMobile, '.matrix-point', 'background', /^var\(--paper-bright\)$/);
  assertRuleDeclaration(compactMobile, '.matrix-point', 'border', /^1px solid var\(--ink\)$/);
  for (const selector of ['.detail-block p', '.detail-list', '.decision-link strong', '.decision-link small', '.company-case-summary', '.source-fact p', '.calibration-item p']) {
    assertRuleDeclaration(printStyles, selector, 'color', /^#222\s*!important$/);
  }
});
