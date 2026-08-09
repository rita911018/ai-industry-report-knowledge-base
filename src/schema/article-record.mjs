export const PROJECT_SCHEMA_VERSION = '1.0.0';

const SCORE_MAXIMA = Object.freeze({ content: 35, impact: 25, relevance: 25, evidence: 15 });

export function assertArticleRecord(record) {
  for (const key of ['id', 'radarTitle', 'publisher', 'sourceUrl', 'titleOriginal', 'priority', 'provenance']) {
    if (!record[key]) throw new Error(`Missing ${key} for ${record.id ?? 'unknown record'}`);
  }
  if (!/^https:\/\//.test(record.sourceUrl)) throw new Error(`Non-HTTPS source: ${record.sourceUrl}`);
  const dimensions = record.score?.dimensions;
  if (dimensions) {
    for (const [key, maximum] of Object.entries(SCORE_MAXIMA)) {
      if (!Number.isInteger(dimensions[key]) || dimensions[key] < 0 || dimensions[key] > maximum) {
        throw new Error(`Invalid ${key} score for ${record.id}`);
      }
    }
    const total = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
    if (total !== record.score.total) throw new Error(`Score mismatch for ${record.id}: ${total} != ${record.score.total}`);
  }
  return record;
}
