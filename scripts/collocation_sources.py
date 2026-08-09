#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Regenerate each collocation's ``sources`` by scanning the question bank.

The xlsx's self-reported question numbers (``来源位置``) never aligned with the
PDF-extracted question bank numbering, so the old links were systematically
wrong (~29% substring hit). Instead of trusting the xlsx, we scan every
question's text and record where each expression actually appears.

Id-stable by design: only ``sources`` is rewritten; expression order and the
``id`` field are never touched (the notebook table references these ids).

Matching model
--------------
For each expression we derive a sequence of *anchor tokens* (literal content
words, placeholders stripped) plus a small *gap budget* (how many stripped
placeholders may sit between anchors). A question matches when the anchors
appear, in order, with each gap within budget — and the first anchor accepts
verb-inflection variants (``result`` → ``results/resulted/resulting``).

Run standalone to rescan an existing ``collocations.json`` in place::

    uv run scripts/collocation_sources.py
"""

from __future__ import annotations

import glob
import json
import re
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
QUESTIONS_DIR = REPO / "data" / "questions"
COLLOC_PATH = REPO / "data" / "collocations" / "collocations.json"

# Placeholders stripped from an expression before anchoring. Order matters:
# strip the multi-char forms before the bare single-letter catcher.
PLACEHOLDER_RES = [
    re.compile(r"sb\.?"),
    re.compile(r"sth\.?"),
    re.compile(r"p\.p\."),
    re.compile(r"~ing"),
    re.compile(r"\bdoing\b"),      # gerund slot: "be committed to doing"
    re.compile(r"\.\.\.|…"),
    re.compile(r"\bone'?s?\b"),
    re.compile(r"'s\b"),
    re.compile(r"\b[A-Z]\b"),  # single-letter slots: "add A to B"
]

# First-token verbs whose inflections we recognise explicitly.
VERB_INFLECTIONS: dict[str, list[str]] = {
    "be": ["is", "are", "was", "were", "been", "being", "be", "am"],
    "have": ["have", "has", "had", "having"],
    "do": ["do", "does", "did", "doing", "done"],
    "go": ["go", "goes", "went", "gone", "going"],
    "get": ["get", "gets", "got", "gotten", "getting"],
    "let": ["let", "lets", "letting"],
    "pay": ["pay", "pays", "paid", "paying"],
    "put": ["put", "puts", "putting"],
    "run": ["run", "runs", "ran", "running"],
    "see": ["see", "sees", "saw", "seen", "seeing"],
    "set": ["set", "sets", "setting"],
    "make": ["make", "makes", "made", "making"],
    "take": ["take", "takes", "took", "taken", "taking"],
    "give": ["give", "gives", "gave", "given", "giving"],
    "come": ["come", "comes", "came", "coming"],
    "bring": ["bring", "brings", "brought", "bringing"],
    "result": ["result", "results", "resulted", "resulting"],
    "look": ["look", "looks", "looked", "looking"],
    "turn": ["turn", "turns", "turned", "turning"],
    "offer": ["offer", "offers", "offered", "offering"],
    "charge": ["charge", "charges", "charged", "charging"],
    "notify": ["notify", "notifies", "notified", "notifying"],
    "inform": ["inform", "informs", "informed", "informing"],
    "rely": ["rely", "relies", "relied", "relying"],
    "apply": ["apply", "applies", "applied", "applying"],
    "agree": ["agree", "agrees", "agreed", "agreeing"],
}


def regular_inflections(word: str) -> list[str]:
    out = {word}
    if word.endswith("e"):
        out |= {word + "d", word[:-1] + "ing", word + "s"}
    elif word.endswith("y") and len(word) > 1 and word[-2] not in "aeiou":
        out |= {word[:-1] + "ies", word[:-1] + "ied", word + "ing"}
    else:
        out |= {word + "s", word + "ed", word + "ing"}
    return sorted(out)


def inflect_first(token: str) -> list[str]:
    if token in VERB_INFLECTIONS:
        return VERB_INFLECTIONS[token]
    if token.isalpha() and len(token) >= 4:
        return regular_inflections(token)
    return [token]


_NORMALIZE_RE = re.compile(r"[^a-z0-9 ]+")


_APOS_RE = re.compile(r"[’`]")


def normalize(text: str) -> list[str]:
    text = _APOS_RE.sub("'", text.lower())
    text = re.sub(r"n't\b", " not", text)  # wasn't/aren't/don't -> was/are/do not
    text = text.replace("'", "")  # glue possessives / other contractions
    text = _NORMALIZE_RE.sub(" ", text)
    return [t for t in text.split() if t]


def derive_pattern(expression: str) -> tuple[list[str], list[str], int] | None:
    """Return (first_anchor_variants, rest_anchors, gap_budget) or None."""
    raw = expression
    # "to do" is an infinitive slot — keep "to" as an anchor, drop the bare "do".
    raw = re.sub(r"\bto do\b", "to", raw)
    for rx in PLACEHOLDER_RES:
        raw = rx.sub(" ", raw)
    # treat CJK/punctuation separators as token splits
    raw = raw.replace("、", " ").replace("/", " ")
    tokens = normalize(raw)
    if not tokens:
        return None
    # gap budget: how many placeholder groups were removed, floored at 1 so a
    # single intervening modifier/negation (e.g. "be fully aware of",
    # "are not now affiliated with") still matches.
    gap_budget = max(min(sum(len(rx.findall(expression)) for rx in PLACEHOLDER_RES), 3), 1)
    first_variants = inflect_first(tokens[0])
    return first_variants, tokens[1:], gap_budget


def ordered_match(
    tokens: list[str],
    first_variants: list[str],
    rest: list[str],
    gap_budget: int,
) -> bool:
    n = len(tokens)
    first_set = set(first_variants)
    for start in (i for i, t in enumerate(tokens) if t in first_set):
        prev = start
        ok = True
        for tok in rest:
            j = prev + 1
            while j < n and tokens[j] != tok:
                j += 1
            if j >= n or (j - prev - 1) > gap_budget:
                ok = False
                break
            prev = j
        if ok:
            return True
    return False


def build_corpus(questions_dir: Path) -> dict[tuple[str, int, int], list[str]]:
    corpus: dict[tuple[str, int, int], list[str]] = {}
    for path in sorted(glob.glob(str(questions_dir / "reading-*.json"))):
        test = json.loads(Path(path).read_text(encoding="utf-8"))
        test_id = test["testId"]
        for part in test["parts"]:
            pno = part["part"]
            if pno == 5:
                for q in part["questions"]:
                    text = q["stem"] + " " + " ".join(q["options"].values())
                    corpus[(test_id, pno, q["number"])] = normalize(text)
            else:
                for ps in part["passages"]:
                    base = normalize(ps["text"])
                    for q in ps["questions"]:
                        extra = normalize(q["stem"] + " " + " ".join(q["options"].values()))
                        corpus[(test_id, pno, q["number"])] = base + extra
    return corpus


def build_index(corpus) -> dict[str, set[tuple[str, int, int]]]:
    index: dict[str, set[tuple[str, int, int]]] = defaultdict(set)
    for key, tokens in corpus.items():
        for t in set(tokens):
            index[t].add(key)
    return index


def compute_sources(items: list[dict], questions_dir: Path) -> dict:
    """Rewrite each item's ``sources`` by scanning the question bank."""
    corpus = build_corpus(questions_dir)
    index = build_index(corpus)

    stats = {
        "total": len(items),
        "matched": 0,
        "zero": [],
        "high": [],
        "links": 0,
    }

    for item in items:
        pattern = derive_pattern(item["expression"])
        if pattern is None:
            item["sources"] = []
            stats["zero"].append(item["expression"])
            continue
        first_variants, rest, gap_budget = pattern

        # minimum-anchor guard: if placeholders stripped the expression down
        # to a lone head word (e.g. "offer B A" -> "offer"), matching that
        # word anywhere would produce floods of false links. These structurally
        # ambiguous forms are left for manual review instead.
        if not rest:
            item["sources"] = []
            stats["zero"].append(item["expression"])
            continue

        # candidate filter: union of first-variant postings (a match must
        # start with some inflection of the head word), intersected with the
        # postings of every rest anchor (a match must contain them all).
        first_sets = [index[v] for v in first_variants if v in index]
        if not first_sets:
            item["sources"] = []
            stats["zero"].append(item["expression"])
            continue
        candidates: set[tuple[str, int, int]] = set().union(*first_sets)
        rest_sets = [index[tok] for tok in rest if tok in index]
        # if a rest anchor is absent from the index entirely, no match possible
        if len(rest_sets) != len(rest):
            item["sources"] = []
            stats["zero"].append(item["expression"])
            continue
        for rs in rest_sets:
            candidates &= rs
        if not candidates:
            item["sources"] = []
            stats["zero"].append(item["expression"])
            continue

        hits: set[tuple[str, int, int]] = set()
        for key in candidates:
            if ordered_match(corpus[key], first_variants, rest, gap_budget):
                hits.add(key)

        refs = [
            {"testId": k[0], "part": k[1], "questionNumber": k[2]}
            for k in sorted(hits)
        ]
        item["sources"] = refs
        stats["links"] += len(refs)
        if refs:
            stats["matched"] += 1
        else:
            stats["zero"].append(item["expression"])
        if len(refs) > 40:
            stats["high"].append((item["expression"], len(refs)))

    return stats


def verify_rate(items: list[dict], questions_dir: Path) -> tuple[int, int]:
    """Re-check how many stored sources actually contain the expression
    pattern. Returns (hits, total)."""
    corpus = build_corpus(questions_dir)
    hits = total = 0
    for item in items:
        pattern = derive_pattern(item["expression"])
        if pattern is None:
            continue
        first_variants, rest, gap_budget = pattern
        for s in item["sources"]:
            total += 1
            key = (s["testId"], s["part"], s["questionNumber"])
            if key in corpus and ordered_match(
                corpus[key], first_variants, rest, gap_budget
            ):
                hits += 1
    return hits, total


def main() -> int:
    backup_items = json.loads(COLLOC_PATH.read_text(encoding="utf-8"))["items"]
    old_ids = [it["id"] for it in backup_items]
    old_links = sum(len(it["sources"]) for it in backup_items)

    payload = json.loads(COLLOC_PATH.read_text(encoding="utf-8"))
    items = payload["items"]
    stats = compute_sources(items, QUESTIONS_DIR)

    # id-stability guard
    new_ids = [it["id"] for it in items]
    assert old_ids == new_ids, "id set changed — aborting to protect notebook refs"

    payload["items"] = items
    COLLOC_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # report
    old_hit, old_tot = verify_rate(backup_items, QUESTIONS_DIR)
    new_hit, new_tot = verify_rate(items, QUESTIONS_DIR)
    print(f"items: {stats['total']}  | with links: {stats['matched']}  | zero-match: {len(stats['zero'])}")
    print(f"total links: {old_links} -> {stats['links']}")
    print(
        f"pattern-verified hit rate: "
        f"old {old_hit}/{old_tot} = {old_hit/max(old_tot,1)*100:.1f}%  ->  "
        f"new {new_hit}/{new_tot} = {new_hit/max(new_tot,1)*100:.1f}%"
    )
    print(f"id set stable: {old_ids == new_ids}")
    if stats["zero"]:
        print(f"\nzero-match expressions ({len(stats['zero'])}), first 20:")
        for e in stats["zero"][:20]:
            print(f"  {e}")
    if stats["high"]:
        print(f"\nhigh-count expressions (>{40} links), verify if legitimate:")
        for e, n in sorted(stats["high"], key=lambda x: -x[1])[:15]:
            print(f"  {e}: {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
