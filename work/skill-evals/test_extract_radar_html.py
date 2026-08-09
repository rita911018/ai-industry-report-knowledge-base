import tempfile
import unittest
from pathlib import Path
import importlib.util

ROOT = Path(__file__).parents[2]
SCRIPT = ROOT / "skill-package/building-source-insight-radars/scripts/extract_radar_html.py"
SPEC = importlib.util.spec_from_file_location("extract_radar_html", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(MODULE)


class ExtractRadarTests(unittest.TestCase):
    def test_extracts_bilingual_card_without_inventing_dimensions(self):
        html = '''<article class="analysis-card" id="article-agent" data-radar-id="agent" data-category="governance" data-score="92" data-priority="must-read">
        <h3>可信智能体</h3><p class="original-title">Trustworthy Agents</p><time datetime="2026-07-01">July 1</time>
        <div class="take"><p>治理单元包括模型、工具和环境。</p></div><p class="confidence">High：官方方法说明。</p>
        <div class="implication"><p>建立分层权限。</p></div><footer><a href="https://example.com/agents">Source</a></footer></article>'''
        with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as handle: handle.write(html); path = handle.name
        [record] = MODULE.extract(path)
        self.assertEqual(record["title_original"], "Trustworthy Agents")
        self.assertEqual(record["title_zh"], "可信智能体")
        self.assertEqual(record["score"], {"total": 92})
        self.assertNotIn("dimensions", record["score"])
        self.assertEqual(record["source_url"], "https://example.com/agents")

    def test_extracts_all_cards_from_five_real_radars(self):
        cases = {
            "/Users/rita/Downloads/BCG-Insight-Radar-2026-W31-Static.html": 116,
            "/Users/rita/Downloads/Anthropic-Six-Month-Insight-Radar-2026-08-02.html": 25,
            "/Users/rita/Downloads/McKinsey-Six-Month-Insight-Radar-2026-08-02.html": 29,
            "/Users/rita/Downloads/MIT-AI-Management-Insight-Radar-2026-08-04.html": 38,
            "/Users/rita/Downloads/Bain-Six-Month-Insight-Radar-2026-08-02.html": 210,
        }
        for path, expected in cases.items(): self.assertEqual(len(MODULE.extract(path)), expected, path)


if __name__ == "__main__": unittest.main()
