# Official-source discovery and coverage

## Boundary first

Record the official domains, UTC-normalized start/end dates, accepted content types, language handling, and whether “published” or “updated” controls inclusion. Publication date precedence is: structured metadata, visible publication date, sitemap/RSS timestamp, then unknown. Never infer a date from URL text without marking it as inferred.

## Discovery order

1. RSS/API: efficient delta discovery; do not assume historical completeness.
2. XML sitemap and sitemap indexes: enumerate candidates and last-modified hints.
3. Official index/search pages: validate taxonomy and catch omissions.
4. Pagination/cursor traversal: continue until the window is closed or a documented failure prevents closure.
5. Direct page extraction: confirm canonical URL, content type, and visible date.

Keep an official-domain allowlist. External sources linked by an official article may be archived as supporting material, but must retain their own publisher and provenance.

## Candidate ledger

Each candidate requires: discovery URL, discovery method, discovered time, canonical URL, fingerprint, published/updated dates, window decision, terminal status, and reason. Allowed terminal states are `included`, `excluded`, and `failed`.

Coverage is valid only when:

`discovered = included + excluded + failed`

Report failures by reason. Robots denial, authentication, timeout, thin media, duplicate, and missing date are not the same condition.

## Canonicalization and duplicates

Remove fragments and known tracking parameters, normalize host casing and trailing slashes, respect credible canonical tags, then compare content fingerprints. Keep one canonical record and preserve every discovery alias. Same title is not sufficient proof of duplication.

## Recurring runs

Store `run_id`, window, discovery checkpoints, previous fingerprint, current fingerprint, and `change_status` (`new`, `changed`, `unchanged`, `removed`). Never overwrite a prior raw snapshot; retain versioned evidence.
