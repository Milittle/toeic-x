#!/usr/bin/env python3
"""Extract the TOEIC reading question bank from the book's extracted text.

Source : ``.cache/material-index/reading.txt`` (pdftotext output of the paper book)
Output : one JSON file per test under ``data/questions/reading-NN.json``

The book has two sections:
  * 试题册 (question book)  — stems, options, passages
  * 答案册 (answer book)    — answer grid + per-question Chinese annotation

Each test has 100 questions numbered 101-200:
  Part 5  101-130  single-sentence fill-in (no passage)
  Part 6  131-146  four short cloze passages (4 questions each)
  Part 7  147-200  reading comprehension (single / double / triple passages)

Annotation markers differ by part:
  Part 5 : ``▶<译文>`` then ``▶解析 <解析>``
  Part 6 : ``→<解析>``  (no translation)
  Part 7 : <中文题干+选项译文> then ``→<解析>``

This module is intentionally pure: :func:`parse_book` takes the raw text and
returns plain data structures, so it can be unit-tested with small fixtures.
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

QUESTION_RE = re.compile(r"^\s{0,6}(\d{3})\.?\s+[^\s\d]")   # "101. …" / "178 What" (not a bare page number)
PASSAGE_SET_RE = re.compile(
    r"Questions\s+(\d{3})\s*-\s*(\d{3})\.?\s+\w*refer\s+to\s+the\s+following\s*(.*)"
)
GRID_TOKEN_RE = re.compile(r"(\d{3})\.\s*\(([ABCD])\)")    # "101. (A)"
EXPL_HEADER_RE = re.compile(r"^\s{0,8}(\d{3})\s+[A-Z(]")   # "105 In..." / "134 (A)"
EXPL_MARKER_RE = re.compile(r"^\s{0,8}(▶解析|→)")          # explanation starts here
CJK_RE = re.compile(r"[\u4e00-\u9fff]")

PART5 = range(101, 131)
PART6 = range(131, 147)
PART7 = range(147, 201)


# --------------------------------------------------------------------------- #
# Data shapes
# --------------------------------------------------------------------------- #
@dataclass
class Question:
    number: int
    stem: str = ""
    options: dict[str, str] = field(default_factory=dict)
    answer: str = ""
    translation: str = ""
    explanation: str = ""


@dataclass
class PassageSet:
    start: int
    end: int
    descriptor: str = ""
    title: str = ""
    text: str = ""
    questions: list[Question] = field(default_factory=list)


# --------------------------------------------------------------------------- #
# Low-level helpers
# --------------------------------------------------------------------------- #
def parse_options(region: str) -> dict[str, str]:
    """Split a ``region`` of text into its (A)/(B)/(C)/(D) options.

    Options (A)-(C) are bounded by the next label. The final option (D) is
    bounded by the first blank line, so trailing content (part directions, the
    next passage marker, etc.) after the last question in a region is not
    absorbed into option D.
    """
    labels = ["(A)", "(B)", "(C)", "(D)"]
    positions = [region.find(label) for label in labels]
    if any(p < 0 for p in positions):
        return {}
    parts: dict[str, str] = {}
    for i, label in enumerate(labels):
        start = positions[i] + len(label)
        if i + 1 < len(labels):
            end = positions[i + 1]
        else:
            blank = region.find("\n\n", start)
            end = blank if blank != -1 else len(region)
        parts[chr(65 + i)] = _tidy(region[start:end])
    return parts


def _tidy(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _tidy_cjk(text: str) -> str:
    """Collapse whitespace, dropping spaces inserted at CJK line-wrap points."""
    text = re.sub(r"\s+", " ", text).strip()
    cjk = r"[\u4e00-\u9fff，。、；：！？（）”“—…]"
    prev = None
    while prev != text:
        prev = text
        text = re.sub(rf"({cjk})\s+({cjk})", r"\1\2", text)
    return text


def _is_grid_line(line: str) -> bool:
    """A compact answer-grid line: only digits/dots/parens/letters/spaces."""
    return bool(line.strip()) and re.fullmatch(r"[\s\d.()ABCD]+", line) is not None


# --------------------------------------------------------------------------- #
# Section / test boundaries
# --------------------------------------------------------------------------- #
def _find_test_headers(lines: list[str]):
    """Return (question_book_starts, answer_book_starts) as line indices.

    A real section header ``Test NN`` is recognised by what follows it:
      * question book -> ``Reading Test``
      * answer book   -> an answer-grid line containing ``101. (``
    TOC occurrences (followed by more ``Test NN`` lines) are skipped.
    """
    qb, ab = [], []
    for i, line in enumerate(lines):
        m = re.fullmatch(r"\s*Test\s+(0[1-9]|10)\s*", line)
        if not m:
            continue
        lookahead = " ".join(lines[i + 1 : i + 6])
        if "Reading Test" in lookahead:
            qb.append(i)
        elif "101." in lookahead and "(" in lookahead:
            ab.append(i)
    return qb, ab


# --------------------------------------------------------------------------- #
# Question book
# --------------------------------------------------------------------------- #
def _collect_questions(lines, lo, hi, out: dict[int, Question]) -> None:
    """Parse question blocks within ``[lo, hi)`` into ``out`` keyed by number."""
    starts = [(i, int(m.group(1))) for i in range(lo, hi)
              if (m := QUESTION_RE.match(lines[i])) and int(m.group(1)) in range(101, 201)]
    starts.append((hi, None))  # sentinel
    for idx in range(len(starts) - 1):
        start_i, number = starts[idx]
        end_i = starts[idx + 1][0]
        block = lines[start_i:end_i]
        first = re.sub(r"^\s{0,6}\d{3}\.?\s+", "", block[0])
        region = "\n".join([first, *block[1:]])
        opt_pos = region.find("(A)")
        stem_raw = region[:opt_pos] if opt_pos >= 0 else region
        # drop bare page-number lines that sit between the stem and the options
        stem_lines = [ln for ln in stem_raw.splitlines()
                      if not re.fullmatch(r"\s*\d{3,4}\s*", ln)]
        stem = _tidy(" ".join(stem_lines))
        options = parse_options(region[opt_pos:]) if opt_pos >= 0 else {}
        out[number] = Question(number=number, stem=stem, options=options)


def _find_body_end(lines, lo, hi, start_num: int) -> int:
    """Index of the first real question of a passage set.

    Scans past the passage body. A real question line for ``start_num`` must be
    followed by an ``(A)`` option within a few lines, which rules out stray
    body lines such as a street address that happens to start with a number.
    """
    for i in range(lo, hi):
        m = QUESTION_RE.match(lines[i])
        if not m or int(m.group(1)) != start_num:
            continue
        if any("(A)" in lines[j] for j in range(i, min(i + 7, hi))):
            return i
    return lo  # fallback: no body detected


def _parse_question_book_test(lines: list[str]):
    """Parse one test's question-book slice into parts 5/6/7."""
    # passage-set markers (line_idx, start, end, descriptor)
    markers = []
    for i, line in enumerate(lines):
        m = PASSAGE_SET_RE.search(line)
        if m:
            s, e = int(m.group(1)), int(m.group(2))
            desc = m.group(3).strip().rstrip(".").strip()
            markers.append((i, s, e, desc))
    markers.sort()

    questions: dict[int, Question] = {}
    sets: list[PassageSet] = []

    first_marker = markers[0][0] if markers else len(lines)
    # Part 5: everything before the first passage-set marker --------------- #
    _collect_questions(lines, 0, first_marker, questions)

    # Parts 6 & 7: one passage set per marker ----------------------------- #
    for k, (i, s, e, desc) in enumerate(markers):
        region_end = markers[k + 1][0] if k + 1 < len(markers) else len(lines)
        body_end = _find_body_end(lines, i + 1, region_end, s)

        body_raw = [lines[j].strip() for j in range(i + 1, body_end)]
        body = _tidy(" ".join(x for x in body_raw if x and not re.fullmatch(r"\d{3,4}", x)))
        title = ""
        for raw in body_raw:
            if raw and not re.fullmatch(r"\d{3,4}", raw):
                title = _tidy(raw)
                break

        set_qs: dict[int, Question] = {}
        _collect_questions(lines, body_end, region_end, set_qs)
        questions.update(set_qs)
        sets.append(PassageSet(
            start=s, end=e, descriptor=desc, title=title, text=body,
            questions=[set_qs[n] for n in range(s, e + 1) if n in set_qs],
        ))

    part5 = [questions[n] for n in PART5 if n in questions]
    part6 = [ps for ps in sets if ps.start in PART6]
    part7 = [ps for ps in sets if ps.start in PART7]
    return part5, part6, part7


# --------------------------------------------------------------------------- #
# Answer book
# --------------------------------------------------------------------------- #
def _parse_answer_grid(lines: list[str]) -> dict[int, str]:
    """Read the leading ``101. (A) 102. (A) ...`` grid into {number: letter}.

    The grid wraps at the right margin, so a number and its letter can land on
    different lines (``... 109.`` then ``(A) 110. (B)``). We therefore collect
    every grid line first, then tokenise the joined text.
    """
    buf: list[str] = []
    started = False
    for line in lines:
        if not started:
            if "101." in line and GRID_TOKEN_RE.search(line):
                started = True
            else:
                continue
        if not line.strip():
            continue  # blank rows separate grid lines but stay inside the grid
        if not _is_grid_line(line):
            break
        buf.append(line)
    joined = " ".join(buf)
    return {int(num): letter for num, letter in GRID_TOKEN_RE.findall(joined)}


def _parse_explanation_block(block: list[str]) -> tuple[str, str]:
    """Return (translation, explanation) for one answer-book question block."""
    marker_idx = None
    for i, line in enumerate(block):
        if EXPL_MARKER_RE.match(line):
            marker_idx = i
            break
    if marker_idx is None:
        # only translation-ish CJK lines, no reasoning marker
        before, after = block, []
    else:
        before, after = block[:marker_idx], block[marker_idx:]

    translation = _join_cjk(before)
    explanation = _join_contiguous(after)
    return translation, explanation


def _join_cjk(lines: list[str]) -> str:
    """Join lines that carry Chinese characters (drops English options)."""
    out = []
    for line in lines:
        if CJK_RE.search(line):
            out.append(re.sub(r"^\s*▶\s?", "", line.strip()))
    return _tidy_cjk(" ".join(out))


def _join_contiguous(lines: list[str]) -> str:
    """Join the explanation paragraph: from the marker up to the first blank line.

    Stops at a blank line so trailing vocabulary lists (``word 译文``) between
    blocks are not captured as part of the explanation.
    """
    out = []
    for line in lines:
        if line.strip() == "":
            if out:
                break
            continue
        out.append(line)
    if not out:
        return ""
    text = "\n".join(out)
    text = re.sub(r"^\s{0,8}(▶解析|→)\s?", "", text)
    return _tidy_cjk(text)


def _parse_answer_book_test(lines: list[str]) -> dict[int, tuple[str, str]]:
    """Parse one test's answer-book slice: {number: (translation, explanation)}."""
    # drop the leading answer grid
    grid_end = 0
    started = False
    for i, line in enumerate(lines):
        if not started:
            if "101." in line and GRID_TOKEN_RE.search(line):
                started = True
            else:
                continue
        if started and not _is_grid_line(line):
            grid_end = i
            break
    body = lines[grid_end:]

    # split into blocks by question-number header
    blocks: list[tuple[int, list[str]]] = []
    current_num: Optional[int] = None
    current: list[str] = []
    for line in body:
        m = EXPL_HEADER_RE.match(line)
        if m and (num := int(m.group(1))) in range(101, 201) and not GRID_TOKEN_RE.search(line):
            if current_num is not None:
                blocks.append((current_num, current))
            current_num, current = num, [line]
        elif current_num is not None:
            current.append(line)
    if current_num is not None:
        blocks.append((current_num, current))

    result: dict[int, tuple[str, str]] = {}
    for num, block in blocks:
        result[num] = _parse_explanation_block(block)
    return result


# --------------------------------------------------------------------------- #
# Top-level
# --------------------------------------------------------------------------- #
def parse_book(text: str):
    lines = text.splitlines()
    qb_starts, ab_starts = _find_test_headers(lines)
    if len(qb_starts) != 10 or len(ab_starts) != 10:
        raise ValueError(
            f"expected 10 question-book + 10 answer-book test headers, "
            f"got {len(qb_starts)}/{len(ab_starts)}"
        )

    ab_begin = ab_starts[0]
    tests = []
    for t in range(10):
        # question-book slice for this test
        qb_lo = qb_starts[t]
        qb_hi = qb_starts[t + 1] if t + 1 < 10 else ab_begin
        part5, part6, part7 = _parse_question_book_test(lines[qb_lo:qb_hi])

        # answer-book slice for this test
        ab_lo = ab_starts[t]
        ab_hi = ab_starts[t + 1] if t + 1 < 10 else len(lines)
        answers = _parse_answer_grid(lines[ab_lo:ab_hi])
        annotations = _parse_answer_book_test(lines[ab_lo:ab_hi])

        # merge answers + annotations into the questions
        all_qs: list[Question] = list(part5)
        for ps in (*part6, *part7):
            all_qs.extend(ps.questions)
        for q in all_qs:
            q.answer = answers.get(q.number, "")
            if q.number in annotations:
                q.translation, q.explanation = annotations[q.number]

        tests.append(_build_test(t + 1, part5, part6, part7))
    return tests


def _build_test(index: int, part5, part6, part7) -> dict:
    def q(q: Question) -> dict:
        return {
            "number": q.number,
            "stem": q.stem,
            "options": q.options,
            "answer": q.answer,
            "translation": q.translation,
            "explanation": q.explanation,
        }

    parts = [{"part": 5, "questions": [q(x) for x in part5]}]
    if part6:
        parts.append({"part": 6, "passages": [_passage(ps, q) for ps in part6]})
    if part7:
        parts.append({"part": 7, "passages": [_passage(ps, q) for ps in part7]})
    return {
        "testId": f"reading-{index:02d}",
        "title": f"阅读全真模拟 {index:02d}",
        "verified": False,
        "parts": parts,
    }


def _passage(ps: PassageSet, qfn) -> dict:
    return {
        "id": f"p{ps.start}",
        "descriptor": ps.descriptor,
        "title": ps.title,
        "text": ps.text,
        "questions": [qfn(x) for x in ps.questions],
    }


def write_questions(tests, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for test in tests:
        (out_dir / f"{test['testId']}.json").write_text(
            json.dumps(test, ensure_ascii=False, indent=2), encoding="utf-8"
        )


def summarize(tests) -> str:
    rows = []
    for test in tests:
        counts = {5: 0, 6: 0, 7: 0}
        explained = answered = 0
        for part in test["parts"]:
            p = part["part"]
            qs = [q for ps in part.get("passages", []) for q in ps["questions"]]
            if p == 5:
                qs = part["questions"]
            counts[p] = len(qs)
            for x in qs:
                answered += bool(x["answer"])
                explained += bool(x["explanation"])
        total = sum(counts.values())
        rows.append(
            f"  {test['testId']}: total={total:>3} "
            f"P5={counts[5]:>2} P6={counts[6]:>2} P7={counts[7]:>2} "
            f"answered={answered:>3} explained={explained:>3}"
        )
    return "\n".join(rows)


def main(argv=None) -> int:
    argv = argv or sys.argv[1:]
    repo = Path(__file__).resolve().parent.parent
    src = repo / ".cache" / "material-index" / "reading.txt"
    out = repo / "data" / "questions"
    if "--source" in argv:
        src = Path(argv[argv.index("--source") + 1])
    if "--out" in argv:
        out = Path(argv[argv.index("--out") + 1])

    text = src.read_text(encoding="utf-8")
    tests = parse_book(text)
    write_questions(tests, out)
    print(f"wrote {len(tests)} tests to {out}")
    print(summarize(tests))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
