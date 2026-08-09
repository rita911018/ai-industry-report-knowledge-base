const LATIN = /[a-z0-9][a-z0-9+._-]*/gi;
const HAN_RUNS = /[\p{Script=Han}]+/gu;

export function tokenize(value = '') {
  const text = String(value).toLowerCase();
  const tokens = text.match(LATIN) || [];
  for (const run of text.match(HAN_RUNS) || []) {
    if (run.length === 1) tokens.push(run);
    else for (let index = 0; index < run.length - 1; index += 1) tokens.push(run.slice(index, index + 2));
  }
  return tokens;
}

function frequencies(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
}

function weightedText(chunk) {
  const title = `${chunk.titleZh || ''} ${chunk.titleOriginal || ''}`;
  const core = `${chunk.coreView?.zh || ''} ${chunk.coreView?.original || ''}`;
  const evidence = (chunk.evidence || []).map((item) => `${item.statementZh || ''} ${item.statementOriginal || ''}`).join(' ');
  return `${title} ${title} ${title} ${core} ${core} ${evidence} ${evidence} ${chunk.sectionPath || ''} ${chunk.content || ''}`;
}

export function createSearchIndex(chunks) {
  const documents = chunks.map((chunk) => {
    const tokens = tokenize(weightedText(chunk));
    return { chunk, tokens, frequencies: frequencies(tokens), length: tokens.length };
  });
  const documentFrequency = new Map();
  for (const document of documents) {
    for (const token of new Set(document.tokens)) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }
  return {
    documents,
    documentFrequency,
    averageLength: documents.reduce((sum, document) => sum + document.length, 0) / Math.max(documents.length, 1),
  };
}

function allowed(chunk, filters) {
  if (filters.publishers?.length && !filters.publishers.includes(chunk.publisher)) return false;
  if (filters.categories?.length && !filters.categories.includes(chunk.category?.primary)) return false;
  if (filters.priorities?.length && !filters.priorities.includes(chunk.priority)) return false;
  if (filters.dateFrom && chunk.publishedAt && chunk.publishedAt < filters.dateFrom) return false;
  if (filters.dateTo && chunk.publishedAt && chunk.publishedAt > `${filters.dateTo}T23:59:59`) return false;
  return true;
}

export function searchCorpus(index, query, filters = {}) {
  const queryTokens = [...new Set(tokenize(query))];
  if (!queryTokens.length) return { insufficient: true, results: [] };
  const count = index.documents.length;
  const k1 = 1.2;
  const b = 0.75;
  const scored = [];
  for (const document of index.documents) {
    if (!allowed(document.chunk, filters)) continue;
    let score = 0;
    let matches = 0;
    for (const token of queryTokens) {
      const frequency = document.frequencies.get(token) || 0;
      if (!frequency) continue;
      matches += 1;
      const df = index.documentFrequency.get(token) || 0;
      const idf = Math.log(1 + (count - df + 0.5) / (df + 0.5));
      score += idf * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * document.length / Math.max(index.averageLength, 1))));
    }
    if (score > 0) scored.push({ ...document.chunk, score, matchedTerms: matches });
  }
  scored.sort((a, b) => b.score - a.score || a.chunkId.localeCompare(b.chunkId));
  const selected = [];
  const perArticle = new Map();
  for (const item of scored) {
    if ((perArticle.get(item.articleId) || 0) >= 3) continue;
    selected.push(item);
    perArticle.set(item.articleId, (perArticle.get(item.articleId) || 0) + 1);
    if (selected.length >= 12) break;
  }
  const minimumMatches = queryTokens.length >= 4 ? 2 : 1;
  const sufficient = selected.some((item) => item.matchedTerms >= minimumMatches && item.score >= 0.25);
  return { insufficient: !sufficient, results: sufficient ? selected : [] };
}
