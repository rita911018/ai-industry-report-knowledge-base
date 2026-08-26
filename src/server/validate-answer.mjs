function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function validateSections(sections, insufficient) {
  if (insufficient && sections === undefined) return [];
  if (!Array.isArray(sections) || sections.length < 2 || sections.length > 4) {
    throw new Error('sections must contain 2 to 4 items');
  }
  return sections.map((section) => {
    requireString(section?.heading, 'section.heading');
    const hasBody = Object.hasOwn(section, 'body');
    const hasItems = Object.hasOwn(section, 'items');
    if (hasBody === hasItems) throw new Error('section requires exactly one of body or items');
    if (hasBody) {
      requireString(section.body, 'section.body');
      return { heading: section.heading.trim(), body: section.body.trim() };
    }
    if (!Array.isArray(section.items) || !section.items.length || section.items.some((item) => typeof item !== 'string' || !item.trim())) {
      throw new Error('section.items must contain nonempty strings');
    }
    return { heading: section.heading.trim(), items: section.items.map((item) => item.trim()) };
  });
}

export function validateAnswer(answer, evidence) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) throw new Error('Answer must be an object');
  requireString(answer.answer, 'answer');
  if (typeof answer.insufficient !== 'boolean') throw new Error('insufficient must be a boolean');
  const sections = validateSections(answer.sections, answer.insufficient);
  if (!Array.isArray(answer.claims) || !Array.isArray(answer.limitations)) throw new Error('claims and limitations must be arrays');
  if (answer.limitations.some((item) => typeof item !== 'string')) throw new Error('limitations must contain strings');
  if (answer.insufficient) {
    if (answer.claims.length) throw new Error('Insufficient answers cannot include factual claims');
    return { ...answer, sections, sources: [] };
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
  return { ...answer, sections, sources };
}
