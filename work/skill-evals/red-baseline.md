# Insight radar RED baseline

The pre-Skill reconstruction used BCG article cards, cross-source scoring, and the MIT/Bain end-to-end pipeline as three baseline scenarios.

Observed gaps:

- Card extraction could preserve visible titles, URLs, tags and scores, but could not recover absent authors, explicit language metadata, source methods or full evidence from summaries alone.
- Score weights were inferable across some radars, but priority thresholds and confidence calibration were not portable.
- Existing HTML did not contain raw snapshots or retrieval chunks; thin locators could not support verifiable knowledge Q&A.
- No reusable validator, versioned coverage ledger, deterministic import command, or coverage equation existed.

The Skill therefore treats absent fields as null, requires full-source artifacts and locators, separates confidence from priority, validates additive scoring, and accounts for every discovered candidate.
