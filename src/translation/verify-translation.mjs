import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function occurrences(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

function missingValues(sourceValues, translatedValues) {
  const available = occurrences(translatedValues);
  const missing = [];
  for (const [value, required] of occurrences(sourceValues)) {
    const actual = available.get(value) || 0;
    if (actual < required) missing.push(`${value} (${actual}/${required})`);
  }
  return missing;
}

function markdownUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s)>\]"']+/g)].map((match) => match[0].replace(/[.,;:!?]+$/g, ''));
}

function numericTokens(text) {
  return [...text.matchAll(/\d+(?:[.,]\d+)*(?:%|‰)?/g)].map((match) => match[0]);
}

function missingNumericValues(sourceValues, translatedValues) {
  const canonical = (value) => value.replace(/[%‰]$/, '');
  const available = occurrences(translatedValues.map(canonical));
  const required = occurrences(sourceValues.map(canonical));
  const sourceLabels = new Map(sourceValues.map((value) => [canonical(value), value]));
  const missing = [];
  for (const [value, count] of required) {
    const actual = available.get(value) || 0;
    if (actual < count) missing.push(`${sourceLabels.get(value)} (${actual}/${count})`);
  }
  return missing;
}

function headingCount(text) {
  return (text.match(/^#{1,6}\s+\S/gm) || []).length;
}

function paragraphCount(text) {
  return text.split(/\n{2,}/).map((block) => block.trim()).filter((block) => block && !/^#{1,6}\s/.test(block)).length;
}

export function verifyTranslation(source, translation, { minimumChineseRatio = 0.12, excludeUrlsFromChineseRatio = false } = {}) {
  const errors = [];
  const warnings = [];
  const sourceHeadings = headingCount(source);
  const translationHeadings = headingCount(translation);
  if (translationHeadings < sourceHeadings) {
    errors.push(`Missing heading(s): source=${sourceHeadings}, translation=${translationHeadings}`);
  }

  const missingUrls = missingValues(markdownUrls(source), markdownUrls(translation));
  if (missingUrls.length) errors.push(`Missing URL(s): ${missingUrls.join(', ')}`);

  const sourceNumbers = numericTokens(source);
  const missingNumbers = missingNumericValues(sourceNumbers, numericTokens(translation));
  if (missingNumbers.length) errors.push(`Missing or altered numeric token(s): ${missingNumbers.join(', ')}`);

  const sourceParagraphs = paragraphCount(source);
  const translatedParagraphs = paragraphCount(translation);
  const minimumParagraphs = Math.max(1, Math.floor(sourceParagraphs * 0.8));
  if (translatedParagraphs < minimumParagraphs) {
    errors.push(`Insufficient paragraph coverage: source=${sourceParagraphs}, translation=${translatedParagraphs}, minimum=${minimumParagraphs}`);
  }

  const languageSample = excludeUrlsFromChineseRatio
    ? translation.replace(/https?:\/\/[^\s)>\]"']+/g, '')
    : translation;
  const chineseCharacters = (languageSample.match(/[\p{Script=Han}]/gu) || []).length;
  const meaningfulCharacters = (languageSample.match(/[\p{L}\p{N}]/gu) || []).length;
  const chineseRatio = meaningfulCharacters ? chineseCharacters / meaningfulCharacters : 0;
  if (chineseRatio < minimumChineseRatio) {
    errors.push(`Chinese-character ratio too low: ${chineseRatio.toFixed(3)} < ${minimumChineseRatio}`);
  }
  if (translation.trim().length < source.trim().length * 0.25) {
    warnings.push('Translation is less than 25% of the source character length');
  }

  const report = {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      sourceHeadings,
      translationHeadings,
      sourceParagraphs,
      translatedParagraphs,
      sourceNumbers: sourceNumbers.length,
      sourceUrls: markdownUrls(source).length,
      chineseCharacters,
      chineseRatio,
    },
  };
  if (!report.ok) {
    const error = new Error(errors.join('; '));
    error.report = report;
    throw error;
  }
  return report;
}

async function verifyAll(archiveRoot) {
  const { scanTranslationQueue } = await import('./queue.mjs');
  const entries = await scanTranslationQueue(archiveRoot);
  const records = [];
  for (const entry of entries) {
    try {
      const source = await readFile(entry.sourcePath, 'utf8');
      const translation = await readFile(entry.targetPath, 'utf8');
      const report = entry.sourceLanguage === 'zh'
        ? { ok: Boolean(translation.trim()), errors: [], warnings: [], metrics: {} }
        : verifyTranslation(source, translation);
      records.push({ id: entry.id, ok: report.ok, ...report });
    } catch (error) {
      records.push({ id: entry.id, ok: false, errors: error.report?.errors || [error.message], warnings: error.report?.warnings || [], metrics: error.report?.metrics || {} });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    total: records.length,
    passed: records.filter((record) => record.ok).length,
    failed: records.filter((record) => !record.ok).length,
    records,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const allIndex = process.argv.indexOf('--all');
  if (allIndex === -1 || !process.argv[allIndex + 1]) {
    console.error('Usage: node src/translation/verify-translation.mjs --all <archive-root>');
    process.exitCode = 1;
  } else {
    const archiveRoot = path.resolve(process.argv[allIndex + 1]);
    verifyAll(archiveRoot).then(async (audit) => {
      await writeFile(path.join(process.cwd(), 'work', 'translation-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
      console.log(JSON.stringify({ total: audit.total, passed: audit.passed, failed: audit.failed }, null, 2));
      if (audit.failed) process.exitCode = 1;
    }).catch((error) => { console.error(error); process.exitCode = 1; });
  }
}
