import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function urlKey(value) {
  const url = new URL(value);
  url.hash = '';
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().toLowerCase();
}

export function mergeRecords(existing, additions) {
  const ids = new Set();
  const urls = new Set();
  const output = [];
  for (const record of [...existing, ...additions]) {
    if (ids.has(record.id)) throw new Error(`Duplicate id: ${record.id}`);
    const key = urlKey(record.canonicalUrl || record.sourceUrl);
    if (urls.has(key)) throw new Error(`Duplicate URL: ${record.sourceUrl}`);
    ids.add(record.id);
    urls.add(key);
    output.push(record);
  }
  return output;
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index].startsWith('--')) options[argv[index].slice(2)] = argv[++index];
  }
  for (const required of ['ledger', 'additions']) {
    if (!options[required]) throw new Error(`Missing --${required}`);
  }
  return options;
}

async function runCli() {
  const options = parseArguments(process.argv.slice(2));
  const ledgerPath = path.resolve(options.ledger);
  const [existing, additions] = await Promise.all([
    readFile(ledgerPath, 'utf8').then(JSON.parse),
    readFile(path.resolve(options.additions), 'utf8').then(JSON.parse),
  ]);
  const merged = mergeRecords(existing, additions);
  const temporaryPath = `${ledgerPath}.refresh.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, ledgerPath);
  console.log(JSON.stringify({ before: existing.length, added: additions.length, after: merged.length }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
