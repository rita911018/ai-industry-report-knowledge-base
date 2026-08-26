import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('GitHub Pages deploys the safe static web directory from main', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3[\s\S]*path:\s*web/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
