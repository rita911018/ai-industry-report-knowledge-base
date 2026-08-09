import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[2]
VALIDATOR = ROOT / "skill-package/building-source-insight-radars/scripts/validate_radar.py"


def valid_record():
    return {
        "id": "publisher-a", "publisher": "Publisher", "source_url": "https://example.com/a",
        "canonical_url": "https://example.com/a", "title_original": "A", "title_zh": "甲",
        "published_at": "2026-07-01", "window_status": "in_window",
        "category": {"primary": "governance", "secondary": []},
        "tags": {"topics": ["agents"], "geography": [], "horizon": [], "domains": []},
        "source_facts": [{"text": "Fact", "locator": "Section 1, paragraph 2"}],
        "analyst_synthesis": "Synthesis", "target_implications": "Implication",
        "score": {"content": 35, "impact": 25, "relevance": 25, "evidence": 15, "total": 100,
                  "reasons": {"content": "x", "impact": "x", "relevance": "x", "evidence": "x"}},
        "priority": "must-read", "confidence": {"level": "high", "reason": "Traceable evidence"},
        "retrieval": {"retrieved_at": "2026-08-01T00:00:00Z", "http_status": 200,
                      "final_url": "https://example.com/a", "fingerprint": "abc"},
        "terminal_status": "included"
    }


def valid_dataset():
    return {"schema_version": "1.0.0", "run": {"id": "run", "window_start": "2026-01-01", "window_end": "2026-07-31", "scoring_version": "1.0"},
            "coverage": {"discovered": 1, "included": 1, "excluded": 0, "failed": 0},
            "candidates": [{"url": "https://example.com/a", "status": "included", "reason": "in window"}],
            "records": [valid_record()]}


def run_validator(dataset):
    handle = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
    json.dump(dataset, handle); handle.close()
    return subprocess.run(["python3", str(VALIDATOR), handle.name], capture_output=True, text=True)


class RadarValidatorTests(unittest.TestCase):
    def test_valid_dataset_passes(self):
        self.assertEqual(run_validator(valid_dataset()).returncode, 0)

    def test_score_must_add_to_total(self):
        dataset = valid_dataset(); dataset["records"][0]["score"]["total"] = 98
        result = run_validator(dataset)
        self.assertNotEqual(result.returncode, 0); self.assertIn("score total", result.stderr.lower())

    def test_every_candidate_has_terminal_status(self):
        dataset = valid_dataset(); dataset["coverage"]["discovered"] = 2
        result = run_validator(dataset)
        self.assertNotEqual(result.returncode, 0); self.assertIn("coverage equation", result.stderr.lower())

    def test_rejects_missing_locator_and_non_https_source(self):
        dataset = valid_dataset(); dataset["records"][0]["source_facts"][0]["locator"] = ""; dataset["records"][0]["source_url"] = "http://example.com/a"
        result = run_validator(dataset)
        self.assertNotEqual(result.returncode, 0); self.assertIn("https", result.stderr.lower()); self.assertIn("locator", result.stderr.lower())


if __name__ == "__main__": unittest.main()
