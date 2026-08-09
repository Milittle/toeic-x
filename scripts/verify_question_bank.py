#!/usr/bin/env python3
"""Sample-check the extracted question bank against the paper book.

The book has no score-conversion table and OCR can introduce errors, so each
test is only marked ``verified: true`` after a human spot-checks a few questions
against the printed book.

Usage::

    python3 scripts/verify_question_bank.py              # print a checklist
    python3 scripts/verify_question_bank.py --apply       # mark every test verified

The checklist picks 5 questions per test (spread across Parts 5/6/7) and shows
the number, the recorded answer, the stem, and the options, so a human can read
each one alongside the book and confirm.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
QDIR = REPO / "data" / "questions"

# Fixed per-part picks so the same questions are reviewed every time (P5/P6/P7).
SAMPLES = {
    5: [101, 115, 128],
    6: [133, 142],
    7: [150, 168, 184],
}


def _all_questions(test):
    for part in test["parts"]:
        if part["part"] == 5:
            yield part["questions"]
        else:
            yield [q for ps in part.get("passages", []) for q in ps["questions"]]


def build_checklist():
    lines = ["# 题库抽样校验清单", ""]
    lines.append("> 每套抽 7 题（P5×3 / P6×2 / P7×2），逐题对照纸质书核对题号、题干、选项与答案。")
    lines.append("> 全部核对无误后执行 `python3 scripts/verify_question_bank.py --apply` 置「已校验」。")
    lines.append("")
    for path in sorted(QDIR.glob("reading-*.json")):
        test = json.loads(path.read_text(encoding="utf-8"))
        lines.append(f"## {test['title']}  (`{test['testId']}`, verified={test['verified']})")
        lines.append("")
        by_part = {p["part"]: (p["questions"] if p["part"] == 5
                               else [q for ps in p.get("passages", []) for q in ps["questions"]])
                    for p in test["parts"]}
        for part, numbers in SAMPLES.items():
            lookup = {q["number"]: q for q in by_part.get(part, [])}
            for n in numbers:
                q = lookup.get(n)
                if not q:
                    lines.append(f"- [ ] **{n}** （P{part}）⚠️ 未找到该题")
                    continue
                stem = q["stem"] or "（题干在文章中，见文章上下文）"
                lines.append(f"- [ ] **{n}** （P{part}，答案={q['answer']}）")
                lines.append(f"      - 题干：{stem}")
                for letter in "ABCD":
                    lines.append(f"      - ({letter}) {q['options'][letter]}")
                if q["explanation"]:
                    lines.append(f"      - 解析：{q['explanation']}")
        lines.append("")
    return "\n".join(lines)


def apply_verified() -> None:
    for path in sorted(QDIR.glob("reading-*.json")):
        test = json.loads(path.read_text(encoding="utf-8"))
        test["verified"] = True
        path.write_text(json.dumps(test, ensure_ascii=False, indent=2), encoding="utf-8")
    print("marked all tests verified=true")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="mark every test verified (run only after human sign-off)")
    args = parser.parse_args(argv)
    if args.apply:
        apply_verified()
        return 0
    out = REPO / "data" / "questions" / "VERIFICATION.md"
    out.write_text(build_checklist(), encoding="utf-8")
    print(f"wrote {out}")
    print(build_checklist()[:400])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
