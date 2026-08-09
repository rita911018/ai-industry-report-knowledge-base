# Building Source Insight Radars Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and deploy `building-source-insight-radars`, a tested Codex Skill for official-source discovery, article extraction, evidence traceability, multidimensional tagging/scoring, bilingual analysis, and auditable radar output.

**Architecture:** Keep the main SKILL.md concise and procedural; place the scoring rubric/data contract in one-level references and deterministic validation/extraction utilities in scripts. Use the completed RED baselines to write minimal guidance, then forward-test fresh agents on new source variants before validating and syncing from the canonical Codex skill root.

**Tech Stack:** Markdown Agent Skill format, Python/Node utility scripts, Codex skill-creator validators, subagent application evaluations, canonical `~/.codex/skills` plus sync script.

---

## File map

- `/Users/rita/.codex/skills/building-source-insight-radars/SKILL.md`: activation and core workflow.
- `/Users/rita/.codex/skills/building-source-insight-radars/agents/openai.yaml`: user-facing metadata.
- `/Users/rita/.codex/skills/building-source-insight-radars/references/data-contract.md`: normalized record schema and provenance fields.
- `/Users/rita/.codex/skills/building-source-insight-radars/references/scoring-rubric.md`: 35/25/25/15 scoring anchors, priority calibration, confidence rules.
- `/Users/rita/.codex/skills/building-source-insight-radars/references/source-discovery.md`: RSS/sitemap/index/date-window and coverage-ledger rules.
- `/Users/rita/.codex/skills/building-source-insight-radars/scripts/validate_radar.py`: deterministic JSON validation.
- `/Users/rita/.codex/skills/building-source-insight-radars/scripts/extract_radar_html.py`: extract records from compatible radar HTML.
- `work/skill-evals/red-baseline.md`: observed baseline behaviors.
- `work/skill-evals/*.json`: three evaluation prompts and rubrics.
- `work/skill-evals/results/*.md`: GREEN/REFACTOR outputs.

### Task 1: Record the RED baselines before writing the Skill

**Files:**
- Create: `work/skill-evals/red-baseline.md`
- Create: `work/skill-evals/extraction-eval.json`
- Create: `work/skill-evals/scoring-eval.json`
- Create: `work/skill-evals/pipeline-eval.json`

- [ ] **Step 1: Preserve the three completed no-Skill scenarios**

Document the exact prompts and outputs from:

1. BCG article-1/article-8 record extraction;
2. cross-source scoring reconstruction;
3. MIT/Bain end-to-end discovery-to-Q&A workflow reconstruction.

- [ ] **Step 2: Identify observed gaps, not hypothetical gaps**

Record these baseline findings:

- extraction was strong but could not recover absent authors, explicit language metadata, source-page methods, or full evidence from radar summaries alone;
- scoring correctly inferred weights but found nonportable priority thresholds and inconsistent confidence calibration;
- pipeline analysis correctly identified that existing HTML lacked original snapshots/chunks and that thin locators cannot support verifiable Q&A;
- no baseline produced a reusable validator, versioned coverage ledger, or deterministic extraction command.

- [ ] **Step 3: Write machine-readable evaluation rubrics**

Each JSON file must include `query`, `files`, and `expected_behavior`. Required behaviors must test provenance, non-invention, coverage boundaries, additive scoring, independent confidence, locator quality, and validation.

- [ ] **Step 4: Commit baseline evidence in the project repository**

```bash
git add work/skill-evals
git commit -m "test: capture insight radar skill baselines"
```

### Task 2: Initialize the canonical Skill

**Files:**
- Create: `/Users/rita/.codex/skills/building-source-insight-radars/**`

- [ ] **Step 1: Run the required initializer**

```bash
python3 /Users/rita/.codex/skills/.system/skill-creator/scripts/init_skill.py building-source-insight-radars \
  --path /Users/rita/.codex/skills \
  --resources scripts,references \
  --interface display_name="Building Source Insight Radars" \
  --interface short_description="Build auditable, scored insight radars from official sources" \
  --interface default_prompt="Use $building-source-insight-radars to analyze these official source URLs into a cited, scored insight radar."
```

Expected: the skill folder, `SKILL.md`, `agents/openai.yaml`, `scripts/`, and `references/` exist.

- [ ] **Step 2: Verify generated metadata**

`agents/openai.yaml` must contain only quoted string values under `interface`, with a default prompt that explicitly names `$building-source-insight-radars`.

- [ ] **Step 3: Remove generated placeholders before any forward test**

Delete example placeholder files created by the initializer. Keep only resources defined in the file map.

### Task 3: Write the deterministic radar validator with TDD

**Files:**
- Create: `/Users/rita/.codex/skills/building-source-insight-radars/scripts/validate_radar.py`
- Create: `work/skill-evals/test_validate_radar.py`

- [ ] **Step 1: Write failing tests**

```python
def test_score_must_add_to_total(tmp_path):
    record = valid_record()
    record["score"] = {"content": 35, "impact": 25, "relevance": 25, "evidence": 14, "total": 98}
    path = write_dataset(tmp_path, [record])
    result = run_validator(path)
    assert result.returncode != 0
    assert "score total" in result.stderr.lower()

def test_every_candidate_has_terminal_status(tmp_path):
    dataset = valid_dataset()
    dataset["coverage"]["discovered"] = 2
    dataset["records"] = dataset["records"][:1]
    path = write_dataset(tmp_path, dataset)
    result = run_validator(path)
    assert result.returncode != 0
    assert "coverage equation" in result.stderr.lower()
```

- [ ] **Step 2: Verify RED**

Run: `python3 -m unittest work/skill-evals/test_validate_radar.py -v`

Expected: failures because the validator does not exist.

- [ ] **Step 3: Implement validation rules**

The script must validate required metadata, official HTTPS URL, stable ID, date/window status, unique canonical URL/fingerprint, primary/secondary tags, source facts separate from analyst inference, evidence locators, dimension ranges, exact score addition, priority enum, confidence enum/reason, and the coverage equation `discovered = included + excluded + failed`.

- [ ] **Step 4: Verify GREEN**

Run: `python3 -m unittest work/skill-evals/test_validate_radar.py -v`

Expected: all validator tests pass.

### Task 4: Write the extraction utility with TDD

**Files:**
- Create: `/Users/rita/.codex/skills/building-source-insight-radars/scripts/extract_radar_html.py`
- Create: `work/skill-evals/test_extract_radar_html.py`

- [ ] **Step 1: Write failing fixture tests**

Test BCG `.article-card`, bilingual `.analysis-card`, MIT `.article-card`, and Bain `.article-card`. Assert official URL, original/Chinese title, date, priority, total/dimensions when exposed, confidence, category, core view, evidence, implication, and provenance.

- [ ] **Step 2: Verify RED**

Run: `python3 -m unittest work/skill-evals/test_extract_radar_html.py -v`

Expected: failures because the extractor is absent.

- [ ] **Step 3: Implement a standard-library parser**

Use `html.parser.HTMLParser` so the Skill does not assume third-party packages. Emit JSON Lines or a JSON array selected by `--format`. Preserve missing fields as `null`; never invent score dimensions not present in the source HTML.

- [ ] **Step 4: Verify GREEN on fixtures and the five real files**

Run: `python3 -m unittest work/skill-evals/test_extract_radar_html.py -v`

Expected: fixture tests pass.

Run the extractor on the five input files and verify counts `116,25,29,38,210`.

### Task 5: Write one-level references

**Files:**
- Create: `/Users/rita/.codex/skills/building-source-insight-radars/references/data-contract.md`
- Create: `/Users/rita/.codex/skills/building-source-insight-radars/references/scoring-rubric.md`
- Create: `/Users/rita/.codex/skills/building-source-insight-radars/references/source-discovery.md`

- [ ] **Step 1: Write the data contract**

Define metadata, source lineage, raw snapshot, bilingual fields, `source_fact`/`analysis`/`target_implication`, evidence locator, tags, score, confidence, fingerprints, timestamps, change status, and terminal coverage status. Include one complete JSON example.

- [ ] **Step 2: Write the scoring rubric**

Define:

- Content value 0–35;
- Impact breadth 0–25;
- Target relevance 0–25;
- Evidence strength 0–15;
- additive total;
- default priorities 90+/80–89/<80, with corpus calibration required;
- tie-breakers total, evidence, date, stable source order;
- confidence High/Middle/Low independent from total and priority;
- explicit downgrades for vendor claims, self-report, thin samples, forecasts, correlation, and cross-industry transfer.

- [ ] **Step 3: Write discovery and coverage rules**

Define RSS/sitemap/index roles, official-domain allowlist, publication date precedence, pagination/window closure, candidate terminal states, canonicalization, duplicate fingerprints, coverage claims, and delta-run metadata.

- [ ] **Step 4: Check reference length and navigation**

If any reference exceeds 100 lines, add a contents list at its top. Do not create references that are only referenced by another reference; all three must be linked directly from `SKILL.md`.

### Task 6: Write the minimal Skill body from baseline gaps

**Files:**
- Modify: `/Users/rita/.codex/skills/building-source-insight-radars/SKILL.md`

- [ ] **Step 1: Replace initializer content with valid frontmatter**

```yaml
---
name: building-source-insight-radars
description: Use when scanning official websites, URLs, RSS feeds, sitemaps, or source pages to produce a recurring insight radar, research watchlist, bilingual article analysis, evidence ledger, or multidimensional management-priority scoring.
---
```

- [ ] **Step 2: Write the concise core workflow**

The body must instruct the agent to:

1. establish official sources, window, audience, taxonomy, scoring version, and coverage boundary;
2. create the candidate ledger before analysis;
3. download/snapshot and extract official content;
4. separate source facts, analyst synthesis, and target implications;
5. create traceable locators and limitations;
6. tag and score with the reference rubric;
7. keep confidence separate;
8. validate with `scripts/validate_radar.py` until clean;
9. publish coverage, methodology, warnings, priorities, article analyses, synthesis, actions, and source index.

- [ ] **Step 3: Link every reference directly**

State exactly when to read `references/source-discovery.md`, `references/data-contract.md`, and `references/scoring-rubric.md`. State when to run rather than read each script.

- [ ] **Step 4: Add quick reference and common mistakes**

Include the score table, terminal status equation, evidence/confidence distinction, and mistakes observed in baseline tests. Keep `SKILL.md` under 500 lines and target under 500 words where practical.

### Task 7: Run GREEN forward tests with fresh agents

**Files:**
- Create: `work/skill-evals/results/extraction-green.md`
- Create: `work/skill-evals/results/scoring-green.md`
- Create: `work/skill-evals/results/pipeline-green.md`

- [ ] **Step 1: Run extraction evaluation with the Skill**

Prompt a fresh agent as an end user: `Use $building-source-insight-radars at /Users/rita/.codex/skills/building-source-insight-radars to turn these raw HTML cards into normalized records with evidence and provenance.` Pass raw fixtures, not expected outputs.

- [ ] **Step 2: Run scoring evaluation on a new source mix**

Pass raw official-source cards not used to author the rubric. Verify additive scoring, explained anchors, independent confidence, source/corpus calibration, and no invented evidence.

- [ ] **Step 3: Run pipeline evaluation with missing data**

Include an undated page, a vendor announcement, a podcast without transcript, and a duplicate canonical URL. Verify correct terminal statuses, thin-evidence treatment, no false completeness claim, and actionable validation output.

- [ ] **Step 4: Compare against RED**

Record exact improvements and any new failure/rationalization. A pass requires correct application, not merely reciting the Skill.

### Task 8: REFACTOR gaps and re-run evaluations

**Files:**
- Modify only the minimal affected Skill/reference/script files.
- Update: `work/skill-evals/results/*.md`

- [ ] **Step 1: Convert each observed new failure into one explicit rule or validator check**

Do not add hypothetical prose. Prefer deterministic script checks for mechanical failures and Skill guidance for judgment failures.

- [ ] **Step 2: Re-run the failed scenario from raw artifacts**

Ensure the agent does not see previous diagnoses or expected answers. Continue until no new transferable gap appears.

- [ ] **Step 3: Run all utility tests**

```bash
python3 -m unittest work/skill-evals/test_validate_radar.py work/skill-evals/test_extract_radar_html.py -v
```

Expected: all tests pass.

### Task 9: Validate metadata and Skill structure

**Files:**
- Verify: `/Users/rita/.codex/skills/building-source-insight-radars/**`

- [ ] **Step 1: Run the official quick validator**

```bash
python3 /Users/rita/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/rita/.codex/skills/building-source-insight-radars
```

Expected: validation succeeds.

- [ ] **Step 2: Verify metadata and size**

Run:

```bash
wc -l -w /Users/rita/.codex/skills/building-source-insight-radars/SKILL.md
rg -n "TBD|TODO|FIXME|example placeholder" /Users/rita/.codex/skills/building-source-insight-radars
```

Expected: under 500 lines, no placeholders, and valid direct links to all resources.

### Task 10: Sync from canonical Codex root

**Files:**
- Source: `/Users/rita/.codex/skills/building-source-insight-radars`
- Sync destinations: controlled by `/Users/rita/Documents/New project/scripts/sync-agent-skills.mjs`

- [ ] **Step 1: Run required dry-run**

```bash
node "/Users/rita/Documents/New project/scripts/sync-agent-skills.mjs" --dry-run
```

Expected: the new Skill will be copied from Codex to other agents; `global-template-ppt-skill` and `sow-writer` remain archived and are not reactivated.

- [ ] **Step 2: Apply sync**

```bash
node "/Users/rita/Documents/New project/scripts/sync-agent-skills.mjs" --apply
```

Expected: successful synchronization with no protected archived Skill restored.

- [ ] **Step 3: Re-validate synced copies**

Run the sync script's verification mode or compare checksums for `SKILL.md`, scripts, references, and `agents/openai.yaml` across reported destinations.

### Task 11: Commit project-side evaluation evidence

**Files:**
- Commit: `work/skill-evals/**`

- [ ] **Step 1: Run a final diff and secret scan**

Run:

```bash
git diff --check
rg -n "api[_-]?key|bearer [A-Za-z0-9]" work/skill-evals
```

Expected: no whitespace errors and no credentials.

- [ ] **Step 2: Commit evaluation evidence**

```bash
git add work/skill-evals
git commit -m "feat: validate source insight radar skill"
```
