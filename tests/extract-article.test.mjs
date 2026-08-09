import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { extractArticle } from '../src/archive/extract-article.mjs';

const cases = [
  ['BCG', 'bcg', 'The Cost of Caution with AI Investments', 'Turn investment into business value', 'https://www.bcg.com/capabilities/artificial-intelligence/overview'],
  ['Anthropic', 'anthropic', 'Trustworthy agents in practice', 'Building trustworthy agents', 'https://www.anthropic.com/news/model-context-protocol'],
  ['McKinsey', 'mckinsey', 'Geopolitics and the geometry of global trade', 'Trade relationships are being rewired', 'https://www.mckinsey.com/mgi/our-research'],
  ['MIT', 'mit', 'How organizations can capture value from digital colleagues', 'Design work around human and digital strengths', 'https://mitsloan.mit.edu/topic/artificial-intelligence'],
  ['Bain', 'bain', 'Rearchitecting the Data Platform for the AI Era', 'A platform designed for changing AI workloads', 'https://www.bain.com/insights/topics/digital-transformation/'],
];

for (const [publisher, fixture, headline, bodyHeading, absoluteLink] of cases) {
  test(`extracts readable ${publisher} content and removes page chrome`, async () => {
    const html = await readFile(new URL(`./fixtures/sources/${fixture}.html`, import.meta.url), 'utf8');
    const baseUrl = {
      BCG: 'https://www.bcg.com/publications/example',
      Anthropic: 'https://www.anthropic.com/research/example',
      McKinsey: 'https://www.mckinsey.com/featured-insights/example',
      MIT: 'https://mitsloan.mit.edu/ideas-made-to-matter/example',
      Bain: 'https://www.bain.com/insights/example/',
    }[publisher];
    const result = extractArticle({ html, url: baseUrl, publisher });

    assert.equal(result.status, 'extracted');
    assert.match(result.markdown, new RegExp(headline));
    assert.match(result.markdown, new RegExp(bodyHeading));
    assert.ok(result.markdown.includes(absoluteLink));
    assert.ok(!/Cookie|Accept cookies|Subscribe/.test(result.markdown));
    assert.ok(result.headingCount >= 1);
    assert.ok(result.paragraphCount >= 2);
    assert.ok(result.characterCount >= 300);
  });
}

test('returns thin when neither selectors nor Readability find enough content', () => {
  const result = extractArticle({
    html: '<html><head><title>Short</title></head><body><main><p>Tiny.</p></main></body></html>',
    url: 'https://example.com/short',
    publisher: 'Example',
  });
  assert.equal(result.status, 'thin');
  assert.ok(result.characterCount < 300);
});
