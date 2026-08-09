---
name: building-source-insight-radars
description: Use when scanning official websites, URLs, RSS feeds, sitemaps, or source pages to produce a recurring insight radar, research watchlist, bilingual article analysis, evidence ledger, or multidimensional management-priority scoring.
---

# Building Source Insight Radars

Build an auditable research corpus before designing the radar page.

## Workflow

1. Establish the official-domain allowlist, time window, audience, taxonomy, scoring version, and what “complete coverage” means. Read [source-discovery.md](references/source-discovery.md) whenever discovery, dates, pagination, deduplication, or recurring updates matter.
2. Create the candidate ledger before analysis. Every discovered URL must end as `included`, `excluded`, or `failed`; never claim completeness without satisfying the coverage equation.
3. Download the official page and keep a raw snapshot, retrieval timestamp, final URL, HTTP status, canonical URL, and content fingerprint. For video or PDF sources, retain the official media plus captions/text when available; never invent a transcript.
4. Extract full readable content. Keep the source language and a complete translation as separate files. Use `scripts/extract_radar_html.py` only when importing a compatible existing radar HTML.
5. Normalize each item using [data-contract.md](references/data-contract.md). Separate `source_facts`, `analyst_synthesis`, and `target_implications`. Every fact needs a section, paragraph, page, timestamp, table, or figure locator. Missing information stays `null`.
6. Tag first, then score with [scoring-rubric.md](references/scoring-rubric.md). Explain the evidence for each dimension. Keep confidence independent from score and priority.
7. Run `scripts/validate_radar.py DATASET.json` and fix every error. Mechanical validity does not replace editorial review.
8. Publish methodology, coverage and failures, priority list, article analyses, cross-source synthesis, actions, limitations, and a source index. Any knowledge-Q&A layer must retrieve archived full-text chunks and validate every cited chunk ID.

## Quick reference

| Dimension | Range |
|---|---:|
| Content value | 0–35 |
| Impact breadth | 0–25 |
| Target relevance | 0–25 |
| Evidence strength | 0–15 |

`total = content + impact + relevance + evidence`

Default priority calibration: `must-read` ≥ 90, `track` 80–89, `reference` < 80. A source corpus may use a documented alternative, but must not silently mix scales.

Coverage: `discovered = included + excluded + failed`.

Confidence answers “how strongly is this claim supported?” Priority answers “how much attention should the target audience give it?” They are not interchangeable.

## Common mistakes

- Treating an index count as proof that pagination or the date window is closed.
- Scoring a radar summary as if the full article had been read.
- Inventing authors, dates, score dimensions, locators, translations, or transcripts.
- Mixing source facts with analyst inference or target-specific recommendations.
- Giving vendor self-reports, forecasts, correlations, or cross-industry transfer high confidence without an explicit downgrade.
- Publishing a Q&A interface from summaries only, or displaying model citations that were not in the retrieved evidence set.
