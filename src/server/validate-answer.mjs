function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
}

export function validateAnswer(answer, evidence) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) throw new Error('Answer must be an object');
  requireString(answer.answer, 'answer');
  if (typeof answer.insufficient !== 'boolean') throw new Error('insufficient must be a boolean');
  if (!Array.isArray(answer.claims) || !Array.isArray(answer.limitations)) throw new Error('claims and limitations must be arrays');
  if (answer.limitations.some((item) => typeof item !== 'string')) throw new Error('limitations must contain strings');
  if (answer.insufficient) {
    if (answer.claims.length) throw new Error('Insufficient answers cannot include factual claims');
    return { ...answer, sources: [] };
  }
  const byId = new Map(evidence.map((chunk) => [chunk.chunkId, chunk]));
  const used = [];
  for (const claim of answer.claims) {
    requireString(claim?.text, 'claim.text');
    if (!['source_fact', 'analysis'].includes(claim.kind)) throw new Error(`Invalid claim kind: ${claim.kind}`);
    if (!Array.isArray(claim.citations) || !claim.citations.length) throw new Error('Every claim requires citations');
    if (new Set(claim.citations).size !== claim.citations.length) throw new Error('Duplicate citation in claim');
    for (const id of claim.citations) {
      if (!byId.has(id)) throw new Error(`Unknown citation: ${id}`);
      used.push(id);
    }
  }
  const sources = [...new Set(used)].map((id) => {
    const chunk = byId.get(id);
    return {
      chunkId: id,
      articleId: chunk.articleId,
      titleZh: chunk.titleZh,
      titleOriginal: chunk.titleOriginal,
      publisher: chunk.publisher,
      publishedAt: chunk.publishedAt,
      sectionPath: chunk.sectionPath,
      sourceUrl: chunk.sourceUrl,
      localPaths: chunk.localPaths,
    };
  });
  return { ...answer, sources };
}
