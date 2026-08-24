(function attachArticleUtils(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ArticleUtils = api;
}(globalThis, () => {
  function normalizedScore(article) {
    const rawTotal = article?.score?.total;
    if (rawTotal === null || rawTotal === undefined || rawTotal === '') return null;
    const total = Number(rawTotal);
    const scale = Number(article?.score?.sourceScale ?? 100);
    if (!Number.isFinite(total) || !Number.isFinite(scale) || scale <= 0) return null;
    return Math.round((total / scale) * 1000) / 10;
  }

  function dateValue(article) {
    const parsed = Date.parse(article?.publishedAt || '');
    return Number.isFinite(parsed) ? parsed : null;
  }

  function compareNullableDescending(left, right) {
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  }

  function byId(left, right) {
    return String(left?.id || '').localeCompare(String(right?.id || ''));
  }

  function sortArticles(articles, mode = 'date') {
    if (!['date', 'score'].includes(mode)) throw new Error(`Unknown article sort mode: ${mode}`);
    return [...articles].sort((left, right) => {
      const first = mode === 'score'
        ? compareNullableDescending(normalizedScore(left), normalizedScore(right))
        : compareNullableDescending(dateValue(left), dateValue(right));
      if (first) return first;
      const second = mode === 'score'
        ? compareNullableDescending(dateValue(left), dateValue(right))
        : compareNullableDescending(normalizedScore(left), normalizedScore(right));
      return second || byId(left, right);
    });
  }

  function scoreText(article) {
    const score = normalizedScore(article);
    return score === null ? '—' : `${score}/100`;
  }

  return { normalizedScore, scoreText, sortArticles };
}));
