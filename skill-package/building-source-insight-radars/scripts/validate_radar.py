#!/usr/bin/env python3
"""Validate the auditable data contract used by building-source-insight-radars."""
import argparse
import json
import sys
from urllib.parse import urlparse

DIMENSIONS = {"content": (0, 35), "impact": (0, 25), "relevance": (0, 25), "evidence": (0, 15)}
PRIORITIES = {"must-read", "track", "reference"}
CONFIDENCE = {"high", "middle", "low"}
TERMINAL = {"included", "excluded", "failed"}


def validate(data):
    errors = []
    for key in ("schema_version", "run", "coverage", "candidates", "records"):
        if key not in data: errors.append(f"missing dataset field: {key}")
    coverage = data.get("coverage", {})
    discovered = coverage.get("discovered")
    terminal_sum = sum(coverage.get(key, -10**9) for key in ("included", "excluded", "failed"))
    if discovered != terminal_sum: errors.append("coverage equation failed: discovered must equal included + excluded + failed")
    candidates = data.get("candidates", [])
    if discovered != len(candidates): errors.append("coverage discovered must equal candidate ledger length")
    status_counts = {name: 0 for name in TERMINAL}
    for index, candidate in enumerate(candidates):
        status = candidate.get("status")
        if status not in TERMINAL: errors.append(f"candidate[{index}] invalid terminal status")
        else: status_counts[status] += 1
        if not candidate.get("reason"): errors.append(f"candidate[{index}] missing terminal reason")
    for status in TERMINAL:
        if coverage.get(status) != status_counts[status]: errors.append(f"coverage {status} does not match candidate ledger")

    urls, ids, fingerprints = set(), set(), set()
    for index, record in enumerate(data.get("records", [])):
        prefix = f"record[{index}]"
        for key in ("id", "publisher", "source_url", "canonical_url", "title_original", "category", "tags", "source_facts", "score", "priority", "confidence", "retrieval", "terminal_status"):
            if key not in record: errors.append(f"{prefix} missing {key}")
        stable_id = record.get("id")
        if not stable_id or stable_id in ids: errors.append(f"{prefix} id missing or duplicate")
        ids.add(stable_id)
        for key in ("source_url", "canonical_url"):
            value = record.get(key, "")
            parsed = urlparse(value)
            if parsed.scheme != "https" or not parsed.netloc: errors.append(f"{prefix} {key} must be an official HTTPS URL")
        canonical = record.get("canonical_url")
        if canonical in urls: errors.append(f"{prefix} duplicate canonical_url")
        urls.add(canonical)
        if not record.get("published_at") and record.get("window_status") not in {"date_unknown", "undated"}: errors.append(f"{prefix} missing published_at/window_status")
        category = record.get("category", {})
        if not category.get("primary") or not isinstance(category.get("secondary"), list): errors.append(f"{prefix} invalid primary/secondary category")
        for fact_index, fact in enumerate(record.get("source_facts", [])):
            if not fact.get("text"): errors.append(f"{prefix} source_fact[{fact_index}] missing text")
            if not fact.get("locator"): errors.append(f"{prefix} source_fact[{fact_index}] missing locator")
        score = record.get("score", {})
        total = 0
        for name, (minimum, maximum) in DIMENSIONS.items():
            value = score.get(name)
            if not isinstance(value, (int, float)) or not minimum <= value <= maximum: errors.append(f"{prefix} score {name} outside {minimum}-{maximum}")
            else: total += value
            if not score.get("reasons", {}).get(name): errors.append(f"{prefix} score {name} missing reason")
        if score.get("total") != total: errors.append(f"{prefix} score total must equal additive dimensions")
        if record.get("priority") not in PRIORITIES: errors.append(f"{prefix} invalid priority")
        confidence = record.get("confidence", {})
        if confidence.get("level") not in CONFIDENCE or not confidence.get("reason"): errors.append(f"{prefix} invalid confidence level/reason")
        retrieval = record.get("retrieval", {})
        fingerprint = retrieval.get("fingerprint")
        if not fingerprint: errors.append(f"{prefix} missing content fingerprint")
        elif fingerprint in fingerprints: errors.append(f"{prefix} duplicate content fingerprint")
        fingerprints.add(fingerprint)
        if record.get("terminal_status") != "included": errors.append(f"{prefix} included record must have terminal_status included")
    if coverage.get("included") != len(data.get("records", [])): errors.append("coverage included must equal records length")
    return errors


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("dataset")
    args = parser.parse_args()
    try:
        with open(args.dataset, encoding="utf-8") as handle: data = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        print(f"invalid input: {error}", file=sys.stderr); return 2
    errors = validate(data)
    if errors:
        for error in errors: print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(json.dumps({"valid": True, "records": len(data["records"]), "candidates": len(data["candidates"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__": raise SystemExit(main())
