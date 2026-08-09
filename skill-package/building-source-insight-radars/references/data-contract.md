# Radar data contract

## Dataset

```json
{
  "schema_version": "1.0.0",
  "run": { "id": "2026-W31", "window_start": "2026-01-01", "window_end": "2026-07-31", "scoring_version": "1.0" },
  "coverage": { "discovered": 1, "included": 1, "excluded": 0, "failed": 0 },
  "candidates": [{ "url": "https://example.com/a", "status": "included", "reason": "in window" }],
  "records": []
}
```

## Included record

```json
{
  "id": "publisher-stable-slug",
  "publisher": "Publisher",
  "source_url": "https://example.com/a",
  "canonical_url": "https://example.com/a",
  "title_original": "Original title",
  "title_zh": "完整中文标题",
  "published_at": "2026-07-31",
  "window_status": "in_window",
  "category": { "primary": "governance", "secondary": ["agents"] },
  "tags": { "topics": ["agent governance"], "geography": ["global"], "horizon": ["6-18m"], "domains": ["technology"] },
  "source_facts": [{ "text": "Source-supported statement", "locator": "Methods, paragraph 3" }],
  "analyst_synthesis": "Clearly labeled interpretation.",
  "target_implications": "Clearly labeled audience-specific implication.",
  "score": {
    "content": 30,
    "impact": 22,
    "relevance": 20,
    "evidence": 13,
    "total": 85,
    "reasons": { "content": "...", "impact": "...", "relevance": "...", "evidence": "..." }
  },
  "priority": "track",
  "confidence": { "level": "high", "reason": "Primary data and traceable method." },
  "artifacts": { "snapshot": "原始网页.html", "source_markdown": "英文原文.md", "translation_markdown": "中文全文.md" },
  "retrieval": { "retrieved_at": "2026-08-01T00:00:00Z", "http_status": 200, "final_url": "https://example.com/a", "fingerprint": "sha256" },
  "terminal_status": "included"
}
```

Use `null` for absent source information. Do not silently substitute analyst text. Preserve the original and translated text separately. Source facts require locators; analyst synthesis and target implications do not masquerade as quotes. Every record links back to a candidate and raw artifact.
