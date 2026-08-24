import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadRadarFile, validateRadarData } from '../../web/radars/validate-data.mjs';

const radarRoot = fileURLToPath(new URL('../../web/radars/', import.meta.url));
const researchRoot = fileURLToPath(new URL('../../work/radars/2026-08-24/retail/', import.meta.url));

test('retail closes its source ledger and publishes a valid 24-scenario library', async () => {
  const ledger = JSON.parse(await readFile(`${researchRoot}/candidates.json`, 'utf8'));
  assert.equal(ledger.coverage.discovered, ledger.coverage.included + ledger.coverage.excluded + ledger.coverage.failed);
  assert.equal(ledger.candidates.length, ledger.coverage.discovered);
  assert.ok(ledger.candidates.every((candidate) => ['included', 'excluded', 'failed'].includes(candidate.status)));

  const radar = await loadRadarFile(`${radarRoot}/data/retail.js`);
  const summary = validateRadarData(radar, { radarRoot });
  assert.equal(summary.scenarioCount, 24);
  assert.equal(summary.matrixCount, 12);
  assert.deepEqual(radar.scenarios.filter((scenario) => scenario.matrixRank).map((scenario) => scenario.matrixRank), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.ok(new Set(radar.scenarios.flatMap((scenario) => scenario.companyCases.filter((item) => item.market === '中国').map((item) => item.company))).size >= 2);

  for (const source of radar.sources) {
    const directory = `${researchRoot}/sources/${source.id}`;
    await access(`${directory}/原始网页.html`);
    await access(`${directory}/来源全文.md`);
    if (source.language === 'en') await access(`${directory}/中文全文.md`);
  }
});
