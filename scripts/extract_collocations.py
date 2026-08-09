#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["openpyxl"]
# ///
"""Extract the TOEIC collocations / idioms workbook into a static JSON library.

Source : ``TOEIC_Reading_固定搭配与惯用法_最终版.xlsx`` (sheet ``高频汇总``)
Output : ``data/collocations/collocations.json``  (read-only, ADR-0004)

The collocations are a static reference corpus parallel to the question bank
(ADR-0002). The app never writes this file; regeneration is manual via
``uv run scripts/extract_collocations.py``.

Question-source links (``sources``) are NOT trusted from the xlsx — its
self-reported question numbers never matched the PDF-extracted bank. Instead,
after building the records we scan the question bank text to record where each
expression actually appears (see ``collocation_sources.compute_sources``).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import openpyxl

from collocation_sources import compute_sources

SHEET = "高频汇总"

# Known chat-transcript pollution that leaked into a few 中文 cells during the
# book's PDF extraction (e.g. the "at one's fingertips" row). We cut the cell at
# the first such marker so only the genuine gloss survives.
POLLUTION_MARKERS = [
    "格兰特", "格斯", "约兰达", "彼得", "玛丽", "卡特",
    "[下午", "[上午", "大家好", "还记得", "检查员",
]


def clean_chinese(value) -> str:
    if value is None:
        return ""
    text = str(value).split("\n")[0].strip()  # keep only the first line
    cut = len(text)
    for marker in POLLUTION_MARKERS:
        idx = text.find(marker)
        if idx != -1:
            cut = min(cut, idx)
    return re.sub(r"\s+", " ", text[:cut]).strip()


def to_int(value) -> int:
    if value is None or value == "":
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def slugify(expression: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", expression.lower()).strip("-")
    return slug or "item"


def build_records(rows) -> list[dict]:
    records = []
    for row in rows:
        expression = (row[0] or "").strip() if row[0] else ""
        if not expression:
            continue
        priority = (str(row[8]).strip() if row[8] is not None else "")
        records.append({
            "expression": expression,
            "chinese": clean_chinese(row[1]),
            "type": (str(row[2]).strip() if row[2] is not None else ""),
            "bookFreq": to_int(row[3]),
            "counts": {
                "5": to_int(row[4]),
                "6": to_int(row[5]),
                "7": to_int(row[6]),
            },
            "bookletCount": to_int(row[7]),
            "priority": priority if priority in {"S", "A", "B"} else None,
            "sourceType": (str(row[10]).strip() if row[10] is not None else ""),
            # question links are filled by scanning the bank, not from the xlsx.
            "sources": [],
        })
    # deterministic order so generated ids are stable across runs
    records.sort(key=lambda r: (r["expression"].lower(), r["chinese"]))
    # assign stable, collision-safe ids
    slug_counts: dict[str, int] = {}
    for rec in records:
        base = slugify(rec["expression"])
        n = slug_counts.get(base, 0) + 1
        slug_counts[base] = n
        rec["id"] = base if n == 1 else f"{base}-{n}"
    return records


def main(argv=None) -> int:
    argv = argv or sys.argv[1:]
    repo = Path(__file__).resolve().parent.parent
    src = repo / "TOEIC_Reading_固定搭配与惯用法_最终版.xlsx"
    out_dir = repo / "data" / "collocations"
    if "--source" in argv:
        src = Path(argv[argv.index("--source") + 1])
    if "--out" in argv:
        out_dir = Path(argv[argv.index("--out") + 1])

    wb = openpyxl.load_workbook(src, data_only=True)
    if SHEET not in wb.sheetnames:
        raise SystemExit(f"sheet {SHEET!r} not found in {src.name}; sheets: {wb.sheetnames}")
    ws = wb[SHEET]
    rows = [tuple(c.value for c in row) for row in ws.iter_rows(min_row=2, values_only=False)]

    items = build_records(rows)
    stats = compute_sources(items, repo / "data" / "questions")

    out_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": f"{src.name} · {SHEET}",
        "count": len(items),
        "items": items,
    }
    out_path = out_dir / "collocations.json"
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # summary, mirroring extract_question_bank.py's reporting style
    by_priority = {"S": 0, "A": 0, "B": 0, None: 0}
    for it in items:
        by_priority[it["priority"]] += 1
    print(f"wrote {len(items)} collocations to {out_dir}")
    print(
        "  priority: "
        f"S={by_priority['S']} A={by_priority['A']} B={by_priority['B']} none={by_priority[None]}"
    )
    print(
        f"  with question links: {stats['matched']}/{len(items)} "
        f"({stats['links']} links total)"
    )
    if stats["zero"]:
        print(f"  zero-link (absent or structurally unmatched): {len(stats['zero'])}")
    flagged = [it["expression"] for it in items if len(it["chinese"]) == 0]
    if flagged:
        print(f"  WARNING: {len(flagged)} rows with empty gloss after cleaning: {flagged[:5]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
