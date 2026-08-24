import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadRadarFile, validateRadarData } from '../../web/radars/validate-data.mjs';

const radarRoot = fileURLToPath(new URL('../../web/radars/', import.meta.url));
const researchRoot = fileURLToPath(new URL('../../work/radars/2026-08-24/marketing/', import.meta.url));

test('marketing closes its source ledger and distinguishes reported lift from incrementality', async () => {
  const ledger = JSON.parse(await readFile(`${researchRoot}/candidates.json`, 'utf8'));
  assert.equal(ledger.coverage.discovered, ledger.coverage.included + ledger.coverage.excluded + ledger.coverage.failed);
  const radar = await loadRadarFile(`${radarRoot}/data/marketing.js`);
  const summary = validateRadarData(radar, { radarRoot });
  assert.equal(summary.scenarioCount, 24);
  assert.equal(summary.matrixCount, 12);
  assert.ok(radar.scenarios.every((scenario) => scenario.companyCases.every((item) => item.measurementBasis?.trim())));
  assert.ok(new Set(radar.scenarios.flatMap((scenario) => scenario.companyCases.filter((item) => item.market === '中国').map((item) => item.company))).size >= 2);
  for (const source of radar.sources) {
    const directory = `${researchRoot}/sources/${source.id}`;
    await access(`${directory}/原始网页.html`);
    await access(`${directory}/来源全文.md`);
    if (source.language === 'en') await access(`${directory}/中文全文.md`);
  }
});
