import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRadarFile, validateRadarData } from '../../web/radars/validate-data.mjs';

const radarRoot = fileURLToPath(new URL('../../web/radars/', import.meta.url));

test('validator rejects an incomplete radar', () => {
  assert.throws(() => validateRadarData({ id: 'broken' }, { radarRoot }), /title/);
});

for (const domain of ['legal', 'hr']) {
  test(`${domain} radar satisfies the shared contract`, async () => {
    const data = await loadRadarFile(`${radarRoot}/data/${domain}.js`);
    const result = validateRadarData(data, { radarRoot });
    assert.deepEqual(result, { id: domain, scenarios: 12, p0: 3, pilots: 3, gates: 6, kpis: 5, calibrations: 5 });
  });
}
