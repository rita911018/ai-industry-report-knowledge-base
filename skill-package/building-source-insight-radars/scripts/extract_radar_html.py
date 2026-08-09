#!/usr/bin/env python3
"""Extract compatible insight-radar cards without third-party dependencies."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path

CARD_CLASSES = {"article-card", "analysis-card"}


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


class RadarParser(HTMLParser):
    def __init__(self, source_file):
        super().__init__(convert_charrefs=True)
        self.source_file = str(source_file)
        self.stack = []
        self.active = None
        self.records = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        classes = set(attributes.get("class", "").split())
        frame = {"tag": tag, "classes": classes}
        self.stack.append(frame)
        if tag == "article" and classes.intersection(CARD_CLASSES) and self.active is None:
            self.active = {"attrs": attributes, "card_class": next(iter(classes.intersection(CARD_CLASSES))), "buckets": {}, "links": [], "depth": len(self.stack)}
        if self.active:
            href = attributes.get("href")
            if tag == "a" and href and href.startswith(("https://", "http://")): self.active["links"].append(href)
            if tag == "time" and attributes.get("datetime"): self.active["buckets"].setdefault("date", []).append(attributes["datetime"])

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data):
        if not self.active or not clean(data): return
        text = clean(data)
        self.active["buckets"].setdefault("_all", []).append(text)
        for frame in self.stack:
            self.active["buckets"].setdefault(frame["tag"], []).append(text)
            for class_name in frame["classes"]: self.active["buckets"].setdefault(class_name, []).append(text)

    def handle_endtag(self, tag):
        if self.active and tag == "article" and len(self.stack) == self.active["depth"]:
            self.records.append(normalize_card(self.active, self.source_file))
            self.active = None
        if self.stack: self.stack.pop()


def bucket(card, name):
    return clean(" ".join(card["buckets"].get(name, []))) or None


def normalize_card(card, source_file):
    attrs = card["attrs"]
    heading = bucket(card, "h3") or bucket(card, "h2")
    original_label = bucket(card, "original-title")
    translated_label = bucket(card, "translated-title")
    if translated_label:
        title_original, title_zh = heading, translated_label
    elif original_label:
        title_original, title_zh = original_label, heading
    else:
        title_original, title_zh = heading, None
    raw_score = attrs.get("data-score")
    if raw_score is None:
        match = re.search(r"\b(100|[1-9]?\d)(?:/100|/10)?\b", bucket(card, "score") or bucket(card, "score-orbit") or "")
        raw_score = match.group(1) if match else None
    source_url = next((url for url in reversed(card["links"]) if url.startswith("https://")), None)
    facts = []
    locator = bucket(card, "locator")
    evidence_text = bucket(card, "evidence") or bucket(card, "key-evidence")
    if evidence_text: facts.append({"text": evidence_text, "locator": locator})
    return {
        "id": attrs.get("data-radar-id") or attrs.get("id") or None,
        "source_url": source_url,
        "title_original": title_original,
        "title_zh": title_zh,
        "published_at": bucket(card, "date"),
        "category": {"primary": attrs.get("data-category") or attrs.get("data-categories"), "secondary": []},
        "priority": (attrs.get("data-priority") or "").lower() or None,
        "score": {"total": int(raw_score)} if raw_score and raw_score.isdigit() else None,
        "confidence": bucket(card, "confidence"),
        "core_view": bucket(card, "core") or bucket(card, "take"),
        "source_facts": facts,
        "implication": bucket(card, "implication"),
        "provenance": {"source_file": source_file, "element_id": attrs.get("id"), "extraction_basis": "radar_html"},
    }


def extract(path):
    parser = RadarParser(path)
    parser.feed(Path(path).read_text(encoding="utf-8"))
    return parser.records


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("html"); parser.add_argument("--format", choices=("json", "jsonl"), default="json")
    args = parser.parse_args(); records = extract(args.html)
    if args.format == "jsonl":
        for record in records: print(json.dumps(record, ensure_ascii=False))
    else: print(json.dumps(records, ensure_ascii=False, indent=2))


if __name__ == "__main__": main()
