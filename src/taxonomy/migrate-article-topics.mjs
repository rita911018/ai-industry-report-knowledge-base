import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_TOPICS,
  TAXONOMY_VERSION,
  normalizeCategory,
} from './article-topics.mjs';

function duplicate(values) {
  const seen = new Set();
  return values.find((value) => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
}

export function migrateArticleTopics(input, { migratedAt = new Date().toISOString() } = {}) {
  if (!Array.isArray(input)) throw new TypeError('Article ledger must be an array');

  const idsBefore = input.map((article) => article.id);
  const urlsBefore = input.map((article) => article.canonicalUrl);
  if (duplicate(idsBefore) !== undefined || duplicate(urlsBefore) !== undefined) {
    throw new Error('Migration identity invariant failed: duplicate article ID or canonical URL');
  }

  const inputTopics = new Set();
  const changes = [];
  const articles = input.map((article) => {
    const from = article.category?.sourcePrimary || article.category?.primary;
    inputTopics.add(from);
    const category = normalizeCategory(article.category);
    changes.push({
      articleId: article.id,
      from,
      to: category.primary,
      mappingRule: 'legacy-primary-to-zh-management-v1',
      taxonomyVersion: TAXONOMY_VERSION,
      migratedAt,
    });
    return { ...article, category };
  });

  const identityChanged = articles.some((article, index) => (
    article.id !== idsBefore[index] || article.canonicalUrl !== urlsBefore[index]
  ));
  if (identityChanged) throw new Error('Migration identity invariant failed: article identity or order changed');

  const outputTopics = new Set(articles.map((article) => article.category.primary));
  if ([...outputTopics].some((topic) => !CANONICAL_TOPICS.includes(topic))) {
    throw new Error('Migration produced an unknown canonical topic');
  }

  return {
    articles,
    changes,
    summary: {
      articleCount: articles.length,
      inputTopicCount: inputTopics.size,
      outputTopicCount: outputTopics.size,
      unmappedCount: 0,
    },
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument: ${key || ''}`);
    options[key.slice(2)] = value;
  }
  return options;
}

async function writeAtomic(targetPath, content) {
  const absolute = path.resolve(targetPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, absolute);
}

export async function runMigration({ ledger, audit, browserTopics, migratedAt } = {}) {
  if (!ledger || !audit || !browserTopics) throw new Error('Migration requires --ledger, --audit, and --browser-topics');
  const input = JSON.parse(await readFile(path.resolve(ledger), 'utf8'));
  const result = migrateArticleTopics(input, { migratedAt });
  const auditLedger = {
    schemaVersion: '1.0',
    taxonomyVersion: TAXONOMY_VERSION,
    migratedAt: result.changes[0]?.migratedAt || migratedAt || new Date().toISOString(),
    summary: result.summary,
    changes: result.changes,
  };

  await writeAtomic(ledger, `${JSON.stringify(result.articles, null, 2)}\n`);
  await writeAtomic(audit, `${JSON.stringify(auditLedger, null, 2)}\n`);
  await writeAtomic(browserTopics, `window.ARTICLE_TOPICS = ${JSON.stringify(CANONICAL_TOPICS)};\n`);
  return result.summary;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const options = parseArgs(process.argv.slice(2));
  const summary = await runMigration({
    ledger: options.ledger,
    audit: options.audit,
    browserTopics: options['browser-topics'],
  });
  process.stdout.write(`${summary.articleCount} articles migrated; ${summary.inputTopicCount} input topics; ${summary.outputTopicCount} canonical topics; ${summary.unmappedCount} unmapped\n`);
}
