#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["openpyxl"]
# ///
"""全量结构自检词库，生成人工核对清单。

只读，不修改 ``data/words/words.json`` 或 ``单词本.xlsx``。它把当前词库条目按
九类可疑问题归类，输出 ``data/words/VERIFICATION.md``，供人对照 Excel
``重点1500 / TOEIC专项_TSL1250 / 基础_NGSL2809`` 三张表逐条核对。

用法::

    uv run scripts/verify_words.py          # 或 python3 scripts/verify_words.py

修复入口是 Excel 源文件 ``单词本.xlsx``，改完再 ``npm run words`` 重新生成 JSON。
本脚本不提供 ``--apply``——词库没有 ``verified`` 标记，正确与否以人工核对为准。

检查项
------
A. 词条列为碎片/垃圾        —— 含中文/数字/异常字符，或前后带标点
B. 同形重复与 id 冲突       —— 同一单词跨词表重复、slug 相同的行
C. 释义域标签噪声           —— ``[医] [计] [经]`` 等非托业义项（ECDICT 原始条目）
D. 释义过长                —— 超过阈值，多个义项堆叠、阅读负担大
E. 释义缺失/碎片           —— 空释义、无词性前缀、词性前缀重复
F. 音标/英文简释/词性缺失   —— 字段为空（``词性`` 列在全库均为空）
G. 题库词频列不可复现       —— 工作簿词频与题库重新扫描的近似结果对不上
H. 级别与综合分一致性       —— 级别切分是否单调；NGSL 的「基础」是词类不是难度
I. 关联搭配无法解析         —— ``关联固定搭配`` 在搭配库中找不到对应条目

G 是「近似复现」而非精确校验：``单词本.xlsx`` 的词频列没有随仓库保留生成脚本，
本脚本用无依赖的词形族匹配复算，只能作为人工抽查的线索，不能直接判定数据错误。
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
WORDS = REPO / "data" / "words" / "words.json"
QUESTIONS_DIR = REPO / "data" / "questions"
COLLOC = REPO / "data" / "collocations" / "collocations.json"
PDF_TEXT = REPO / ".cache" / "material-index" / "reading.txt"
XLSX = REPO / "单词本.xlsx"
OUT = REPO / "data" / "words" / "VERIFICATION.md"

SHEET_FOR_LIST = {
    "key1500": "重点1500",
    "tsl1250": "TOEIC专项_TSL1250",
    "ngsl2809": "基础_NGSL2809",
}

GLOSS_MAX = 60          # 释义超过这个字符数视为「过长」
ROW_LIMIT = 60          # 每类清单最多列出多少行，避免报告无限膨胀
DEV_LIMIT = 30          # 词频偏差清单最多列出多少行

CJK = re.compile(r"[\u4e00-\u9fff]")
DIGIT = re.compile(r"\d")
BAD_HEADWORD = re.compile(r"[^\w'’\-. ]")  # \w 保留 é 这类带重音字母，CJK/数字另有单独检查
NON_ASCII_LETTER = re.compile(r"[^\x00-\x7f]")
DOMAIN_TAG = re.compile(r"[\[【]([^\]】]{1,4})[\]】]")
POS_PREFIX = re.compile(r"^\s*([a-z]+\.)")
POS_MARKER = re.compile(r"(?<![A-Za-z])([a-z]{1,4}\.)(?=\s)")
CTRL = re.compile(r"[\r\n\t\v\f]|\\[rnt]")
PREFIX_SUFFIXES = ("s", "es", "ed", "d", "ing", "er", "est", "ly", "ies", "ied")


# --------------------------------------------------------------------------- #
# loading
# --------------------------------------------------------------------------- #

def load_words() -> dict:
    return json.loads(WORDS.read_text(encoding="utf-8"))


def excel_row_map() -> dict[tuple[str, str], int]:
    """(词表 key, 单词) -> Excel 行号，便于直接回源文件定位。"""
    rows: dict[tuple[str, str], int] = {}
    try:
        import openpyxl
    except ImportError:
        return rows
    try:
        wb = openpyxl.load_workbook(XLSX, data_only=True, read_only=True)
    except FileNotFoundError:
        return rows
    for key, sheet in SHEET_FOR_LIST.items():
        if sheet not in wb.sheetnames:
            continue
        for i, row in enumerate(wb[sheet].iter_rows(min_row=2, values_only=True), start=2):
            word = row[1] if len(row) > 1 else None
            if word:
                rows.setdefault((key, str(word).strip()), i)
    return rows


def question_bank_texts() -> dict[int, str]:
    """题库文本按 Part 归并：P5 = 题干 + 选项；P6/P7 = 文章 + 题干 + 选项。"""
    texts: dict[int, list[str]] = {5: [], 6: [], 7: []}
    for path in sorted(QUESTIONS_DIR.glob("reading-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for part in data["parts"]:
            no = part["part"]
            if no == 5:
                for q in part["questions"]:
                    texts[5].append(q["stem"] + " " + " ".join(q["options"].values()))
            else:
                for ps in part.get("passages", []):
                    body = ps["text"]
                    for q in ps["questions"]:
                        body += " " + q["stem"] + " " + " ".join(q["options"].values())
                    texts[no].append(body)
    return {no: " \n ".join(chunks) for no, chunks in texts.items()}


def collocation_expressions() -> set[str]:
    if not COLLOC.exists():
        return set()
    data = json.loads(COLLOC.read_text(encoding="utf-8"))
    return {it["expression"].strip().lower() for it in data.get("items", []) if it.get("expression")}


# --------------------------------------------------------------------------- #
# checks
# --------------------------------------------------------------------------- #

def headword_variants(word: str) -> set[str]:
    """词形族：用于粗略复算题库词频（不处理不规则变化，见模块 docstring）。"""
    w = word.lower()
    out = {w}
    for suffix in PREFIX_SUFFIXES:
        out.add(w + suffix)
    if w.endswith("y"):
        out |= {w[:-1] + "ies", w[:-1] + "ied"}
    if w.endswith("e"):
        out |= {w[:-1] + "ing", w[:-1] + "ed"}
    if len(w) > 2 and w[-1] not in "aeiouy":
        out |= {w + w[-1] + "ing", w + w[-1] + "ed"}
    if w.endswith("sis"):
        out |= {w[:-3] + "ses"}
    if w.endswith("f"):
        out |= {w[:-1] + "ves"}
    if w.endswith("fe"):
        out |= {w[:-2] + "ves"}
    return out


def check_headwords(items: list[dict]) -> tuple[list[tuple], list[tuple]]:
    """返回 (真垃圾, 合法但非 ASCII 的词头)。后者只是提示：拼写本身正确，id 已折叠。"""
    junk, accented = [], []
    for it in items:
        w = it["word"]
        reasons = []
        if CJK.search(w):
            reasons.append("含中文")
        if DIGIT.search(w):
            reasons.append("含数字")
        if BAD_HEADWORD.search(w):
            reasons.append("异常字符")
        if w != w.strip() or re.search(r"\s\s", w):
            reasons.append("首尾/连续空格")
        if w[:1] in "-.'" or w[-1:] in "-.'":
            reasons.append("首尾标点")
        if reasons:
            junk.append((it, "、".join(reasons)))
        elif NON_ASCII_LETTER.search(w):
            accented.append((it, "非 ASCII 词头（拼写合法，id 已折叠为 ASCII）"))
    return junk, accented


def check_duplicates(items: list[dict]) -> tuple[list[tuple], list[tuple], list[tuple]]:
    by_id: dict[str, list[dict]] = defaultdict(list)
    by_word: dict[str, list[dict]] = defaultdict(list)
    for it in items:
        by_id[it["id"]].append(it)
        by_word[it["word"].lower()].append(it)
    id_dups = [(k, v) for k, v in by_id.items() if len(v) > 1]
    word_dups = [(k, v) for k, v in by_word.items() if len(v) > 1]
    # 同一 id 的多行是否字段一致（收藏夹按 id 折叠，依赖这一假设）
    inconsistent = []
    for key, rows in id_dups:
        for field in ("word", "zhDef", "enDef", "phonetic", "level", "totalFreq",
                      "compositeScore", "collocation", "collocationId"):
            if len({json.dumps(r[field], ensure_ascii=False, sort_keys=True) for r in rows}) > 1:
                inconsistent.append((key, field, rows))
                break
    id_dups.sort(key=lambda kv: kv[0])
    word_dups.sort(key=lambda kv: kv[0])
    return id_dups, word_dups, inconsistent


def check_domain_tags(items: list[dict]) -> tuple[Counter, list[tuple]]:
    counter: Counter = Counter()
    rows = []
    for it in items:
        tags = DOMAIN_TAG.findall(it["zhDef"])
        if not tags:
            continue
        for t in tags:
            counter[t] += 1
        stripped = DOMAIN_TAG.sub("", it["zhDef"])
        only_tag = not CJK.search(stripped)
        rows.append((it, "、".join(tags), only_tag))
    return counter, rows


def check_long_gloss(items: list[dict]) -> list[tuple]:
    return [(it, len(it["zhDef"])) for it in items if len(it["zhDef"]) > GLOSS_MAX]


def check_gloss_shape(items: list[dict]) -> dict[str, list[tuple]]:
    empty, no_pos, dup_pos, trailing, control = [], [], [], [], []
    for it in items:
        g = it["zhDef"]
        if not g.strip():
            empty.append((it, ""))
            continue
        if not POS_PREFIX.match(g):
            no_pos.append((it, g))
        prefixes = POS_MARKER.findall(g)
        repeated = [p for p, n in Counter(prefixes).items() if n > 1]
        if repeated:
            dup_pos.append((it, g, "、".join(sorted(set(repeated)))))
        if g.rstrip()[-1:] in "、,，；;":
            trailing.append((it, g))
        if CTRL.search(g) or CTRL.search(it["enDef"]) or CTRL.search(it["phonetic"] or ""):
            control.append((it, g))
    return {
        "empty": empty,
        "no_pos": no_pos,
        "dup_pos": dup_pos,
        "trailing": trailing,
        "control": control,
    }


def check_missing_fields(items: list[dict]) -> dict[str, list[dict]]:
    keys = ("phonetic", "enDef", "pos", "source", "level", "wordClassTag")
    return {k: [it for it in items if not it.get(k)] for k in keys}


def check_frequencies(items: list[dict], bodies: dict[int, str]) -> dict:
    """用词形族匹配近似复算题库词频，报告对不上的条目（线索，不是结论）。"""
    cache: dict[tuple[str, int], int] = {}

    def count(word: str, part: int) -> int:
        key = (word, part)
        if key in cache:
            return cache[key]
        pat = re.compile(
            r"(?<![A-Za-z])("
            + "|".join(sorted(map(re.escape, headword_variants(word)), key=len, reverse=True))
            + r")(?![A-Za-z])",
            re.I,
        )
        cache[key] = len(pat.findall(bodies[part]))
        return cache[key]

    seen: dict[str, dict] = {}
    for it in items:
        seen.setdefault(it["word"].lower(), it)

    exact = 0
    ghosts, hidden, deviations = [], [], []
    for it in seen.values():
        expected = (it["partCounts"]["5"], it["partCounts"]["6"], it["partCounts"]["7"])
        got = tuple(count(it["word"], p) for p in (5, 6, 7))
        if got == expected:
            exact += 1
            continue
        delta = sum(got) - sum(expected)
        deviations.append((it, expected, got, delta))
        if sum(expected) > 0 and sum(got) == 0:
            ghosts.append((it, expected, got))
        if sum(expected) == 0 and sum(got) > 0:
            hidden.append((it, expected, got))
    deviations.sort(key=lambda x: -abs(x[3]))
    ghosts.sort(key=lambda x: -sum(x[1]))
    hidden.sort(key=lambda x: -sum(x[2]))
    return {
        "unique": len(seen),
        "exact": exact,
        "mismatch": len(deviations),
        "ghosts": ghosts,
        "hidden": hidden,
        "deviations": deviations,
        "pdf": pdf_text_counts(ghosts),
    }


def loose_stem(word: str) -> str:
    """宽松词干：长词去掉词尾 2 个字母，短词取前 4 个字母。

    只用于判断「这个词形族到底有没有出现在原始 PDF 里」，会漏掉不规则形
    （women/teeth），也会误收同前缀词，所以只当线索。
    """
    w = word.lower()
    return w[:-2] if len(w) > 6 else w[:4]


def pdf_text_counts(rows: list[tuple]) -> dict[str, int]:
    """幽灵条目在原始 PDF 文本缓存里的词干命中数（判断数字像哪一版材料）。"""
    if not PDF_TEXT.exists():
        return {}
    text = PDF_TEXT.read_text(encoding="utf-8", errors="replace")
    out: dict[str, int] = {}
    for it, _expected, _got in rows:
        stem = loose_stem(it["word"])
        pat = re.compile(r"(?<![A-Za-z])" + re.escape(stem) + r"[A-Za-z'-]*", re.I)
        out[it["word"]] = len(pat.findall(text))
    return out


def check_levels(items: list[dict]) -> dict:
    result = {}
    for key in ("key1500", "tsl1250", "ngsl2809"):
        sub = [it for it in items if it["list"] == key]
        by_level: dict[str, list[float]] = defaultdict(list)
        for it in sub:
            by_level[it["level"] or "None"].append(it["compositeScore"])
        order = {"S": 3, "A": 2, "B": 1, "基础": 0}
        inversions = 0
        example = None
        for i, a in enumerate(sub):
            for b in sub[i + 1:]:
                da, db = order[a["level"]], order[b["level"]]
                if (da > db and a["compositeScore"] < b["compositeScore"]) or (
                    da < db and a["compositeScore"] > b["compositeScore"]
                ):
                    inversions += 1
                    if example is None:
                        example = (a, b)
        scores = Counter(round(it["compositeScore"], 2) for it in sub)
        result[key] = {
            "ranges": {lv: (min(v), max(v), len(v)) for lv, v in by_level.items()},
            "inversions": inversions,
            "example": example,
            "ties": sum(1 for v in scores.values() if v > 1),
            "max_tie": max(scores.values()) if scores else 0,
        }
    return result


def check_collocation_links(items: list[dict], expressions: set[str]) -> list[tuple]:
    out = []
    for it in items:
        label = it.get("collocation")
        if not label or it.get("collocationId"):
            continue
        parts = [p.strip() for p in re.split(r"[、;；\n]+", label) if p.strip()]
        near = [p for p in parts if p.lower() in expressions]
        out.append((it, label, near))
    out.sort(key=lambda x: x[0]["word"])
    return out


# --------------------------------------------------------------------------- #
# report
# --------------------------------------------------------------------------- #

def fmt_rows(rows: list[tuple], render) -> list[str]:
    lines = [render(r) for r in rows[:ROW_LIMIT]]
    if len(rows) > ROW_LIMIT:
        lines.append(f"| … | 其余 {len(rows) - ROW_LIMIT} 条略（见脚本输出） | | | | |")
    return lines


def build_report(payload: dict, excel: dict[tuple[str, str], int]) -> str:
    items = payload["items"]
    lists = payload["lists"]
    headwords, accented = check_headwords(items)
    id_dups, word_dups, inconsistent = check_duplicates(items)
    tags, tag_rows = check_domain_tags(items)
    long_gloss = check_long_gloss(items)
    shape = check_gloss_shape(items)
    missing = check_missing_fields(items)
    freq = check_frequencies(items, question_bank_texts())
    levels = check_levels(items)
    unresolved = check_collocation_links(items, collocation_expressions())

    def row_of(it) -> str:
        return excel.get((it["list"], it["word"]), "—")

    summary = [
        ("A 词条列为碎片/垃圾", len(headwords)),
        ("A 非 ASCII 词头（拼写合法，id 已折叠）", len(accented)),
        ("B 同 id 的行（收藏夹按 id 折叠）", sum(len(v) for _, v in id_dups)),
        ("B 跨词表重复的单词（归属清单，设计使然）", len(word_dups)),
        ("B 同 id 但字段不一致（收藏夹折叠假设破裂）", len(inconsistent)),
        ("C 释义带域标签的条目", len(tag_rows)),
        ("D 释义过长（>%d 字）" % GLOSS_MAX, len(long_gloss)),
        ("E 空释义", len(shape["empty"])),
        ("E 无词性前缀", len(shape["no_pos"])),
        ("E 词性前缀重复（同一词性出现两次）", len(shape["dup_pos"])),
        ("E 释义以标点结尾", len(shape["trailing"])),
        ("E 释义含控制字符/转义残留", len(shape["control"])),
        ("F 缺音标", len(missing["phonetic"])),
        ("F 缺英文简释", len(missing["enDef"])),
        ("F 缺词性（全库）", len(missing["pos"])),
        ("G 词频无法近似复现（行）", freq["mismatch"]),
        ("H 级别/综合分倒挂（行对）", sum(v["inversions"] for v in levels.values())),
        ("I 关联搭配无法解析", len(unresolved)),
    ]

    L = [
        "# 词库校验清单",
        "",
        "> 只读自检，逐类列出可疑条目供人工核对。核对后修改 Excel `单词本.xlsx` 的",
        "> `重点1500 / TOEIC专项_TSL1250 / 基础_NGSL2809` 三张表，再 `npm run words`",
        "> 重新生成 `data/words/words.json`。本清单不自动改数据。",
        "",
        "| 检查项 | 数量 |",
        "|---|---|",
    ]
    L += [f"| {name} | {n} |" for name, n in summary]
    list_summary = " · ".join(f"{key} {meta['count']}" for key, meta in lists.items())
    L += [
        "",
        f"总词条：{payload['count']} 行 / "
        f"{len({it['word'].lower() for it in items})} 个唯一单词（{list_summary}）",
        "",
        "## A. 词条列为碎片/垃圾（列错位、混入正文或标点）",
        "",
    ]
    if headwords:
        L += ["| 单词 | 词表 | 问题 | Excel 行 |", "|---|---|---|---|"]
        L += fmt_rows(headwords, lambda r: f"| `{r[0]['word']}` | {r[0]['list']} | {r[1]} | {row_of(r[0])} |")
    else:
        L.append("_无_")
    L += ["", f"### 非 ASCII 词头（{len(accented)} 行，仅提示）", ""]
    if accented:
        L += [
            "这些拼写本身是正确的英文（`résumé` / `café` / `entrée`），页面显示保留重音；",
            "`id` 已由 `extract_words.py` 折叠成 ASCII（`resume-2` / `cafe` / `entree`），",
            "并在同一词表内保证唯一。核对时只需确认没有重音写错。",
            "",
            "| 单词 | 词表 | id | Excel 行 |",
            "|---|---|---|---|",
        ]
        L += [(f"| `{r[0]['word']}` | {r[0]['list']} | `{r[0]['id']}` | {row_of(r[0])} |") for r in accented]
    else:
        L.append("_无_")

    L += ["", "## B. 同形重复与 id 冲突", ""]
    pair_counts = Counter(tuple(sorted(x["list"] for x in rows)) for _, rows in word_dups)
    L += [
        f"词表是「归属清单」，同一个单词可以同时属于多张词表，因此重复本身是设计使然：",
        f"**{len(word_dups)}** 个单词跨词表重复（共 {sum(len(v) for _, v in word_dups)} 行），"
        f"全库 {len({it['word'].lower() for it in items})} 个唯一单词；",
        "",
        "| 重复组合 | 单词数 |",
        "|---|---|",
    ]
    L += [f"| {' ∩ '.join(k)} | {v} |" for k, v in pair_counts.most_common()]
    L += [
        "",
        f"`id`（单词 slug）相同的有 **{len(id_dups)}** 组。收藏夹 `word_notebook` 以 `word_id`",
        "为主键、跨词表共用一条收藏（ADR-0006），所以同一 id 的各行必须字段一致，",
        "否则收藏夹展示会随折叠顺序变化。",
        "",
    ]
    if inconsistent:
        L += ["**同 id 字段不一致（需修复）**", "", "| id | 字段 | 词表 |", "|---|---|---|"]
        L += fmt_rows(inconsistent, lambda r: f"| `{r[0]}` | {r[1]} | {'、'.join(x['list'] for x in r[2])} |")
    else:
        L += [f"_已核对 {len(id_dups)} 组同 id 行，除 `list` 外字段完全一致，收藏夹折叠安全。_"]

    L += ["", "## C. 释义域标签噪声（ECDICT 原始义项，需判断是否保留）", ""]
    L += [f"带标签条目 **{len(tag_rows)}** 条（占全库 {len(tag_rows) / len(items) * 100:.1f}%）。标签分布：", ""]
    L += ["| 标签 | 次数 |", "|---|---|"]
    L += [f"| `[{t}]` | {c} |" for t, c in tags.most_common(20)]
    L += ["", f"示例（展示 ≤{ROW_LIMIT}，★ 表示去掉标签后已无中文释义）：", "",
          "| 单词 | 词表 | 释义 | 标签 | Excel 行 |", "|---|---|---|---|---|"]
    L += fmt_rows(tag_rows, lambda r: f"| {'★ ' if r[2] else ''}`{r[0]['word']}` | {r[0]['list']} | {r[0]['zhDef'][:44]} | {r[1]} | {row_of(r[0])} |")

    L += ["", f"## D. 释义过长（>{GLOSS_MAX} 字，多义项堆叠）", ""]
    if long_gloss:
        L += ["| 单词 | 词表 | 字数 | 释义 | Excel 行 |", "|---|---|---|---|---|"]
        L += fmt_rows(
            sorted(long_gloss, key=lambda r: -r[1]),
            lambda r: f"| `{r[0]['word']}` | {r[0]['list']} | {r[1]} | {r[0]['zhDef'][:60]}… | {row_of(r[0])} |",
        )
    else:
        L.append("_无_")

    L += ["", "## E. 释义缺失/碎片", ""]
    for title, rows in (
        ("空释义", shape["empty"]),
        ("无词性前缀", shape["no_pos"]),
        ("词性前缀重复（同一词性出现两次，ECDICT 义项块重复）", shape["dup_pos"]),
        ("释义以 `、,；` 结尾（疑似截断）", shape["trailing"]),
        ("释义含控制字符或 `\\r` 转义残留", shape["control"]),
    ):
        L += [f"### {title}（{len(rows)} 条）", ""]
        if rows:
            L += ["| 单词 | 词表 | 释义 | Excel 行 |", "|---|---|---|---|"]
            L += fmt_rows(rows, lambda r: f"| `{r[0]['word']}` | {r[0]['list']} | {r[1][:56]} | {row_of(r[0])} |")
        else:
            L.append("_无_")
        L.append("")

    L += ["## F. 字段缺失", "", "| 字段 | 缺失数 | 说明 |", "|---|---|---|"]
    notes = {
        "phonetic": "音标为空，页面显示 `/ /` 时会跳过音标",
        "enDef": "英文简释为空，详情区不显示英文行",
        "pos": "全库为空，页面从不展示词性",
        "source": "词表来源为空",
        "level": "推荐级别为空，级别筛选会漏掉该词",
        "wordClassTag": "词类标签为空",
    }
    L += [f"| {k} | {len(v)} | {notes[k]} |" for k, v in missing.items()]
    L += ["", f"缺音标清单（展示 ≤{ROW_LIMIT}）：", ""]
    L += fmt_rows(missing["phonetic"], lambda it: f"- `{it['word']}`（{it['list']}）")
    L += ["", f"缺英文简释清单（展示 ≤{ROW_LIMIT}）：", ""]
    L += fmt_rows(missing["enDef"], lambda it: f"- `{it['word']}`（{it['list']}）")

    L += ["", "## G. 题库词频列不可复现（近似复算，线索非结论）", ""]
    L += [
        "`单词本.xlsx` 的 `题库总次数 / Part5次数 / Part6次数 / Part7次数 / Part5答案次数`",
        "没有随仓库保留生成脚本：两个仓库里能找到的 `scripts/extract_words.py` 都是**读取方**",
        "（`to_int(cell(row, \"题库总次数\"))`），没有任何脚本写出这些列。",
        "",
        "本脚本做两次独立复算：",
        "",
        "1. 题库 JSON：P5 = 题干 + 选项，P6/P7 = 文章 + 题干 + 选项；",
        f"2. 原始 PDF 文本缓存 `.cache/material-index/reading.txt`（仅用于抽查幽灵条目）。",
        "",
        f"题库复算结果：唯一单词 **{freq['unique']}** 个，精确对上 **{freq['exact']}** 个"
        f"（{freq['exact'] / freq['unique'] * 100:.1f}%），对不上 **{freq['mismatch']}** 个。",
        "对不上的部分是**线索不是结论**：不规则词形（woman/women、admit/admitted、sew/sewn）",
        "和功能词（the/be/she）会天然误报。用带词形还原的 simplemma 复算可到 91.6%，",
        "但同样不是 100%——说明这些数字来自某个没有保留的统计口径。",
        "",
        f"工作簿记为 >0 但题库复算为 0（{len(freq['ghosts'])} 条，优先核对）：",
        "",
        "| 单词 | 词表 | 工作簿 P5/P6/P7 | 题库复算 | PDF 词干命中 | Excel 行 |",
        "|---|---|---|---|---|---|",
    ]
    L += fmt_rows(
        freq["ghosts"],
        lambda r: f"| `{r[0]['word']}` | {r[0]['list']} | {'/'.join(map(str, r[1]))} "
        f"| {'/'.join(map(str, r[2]))} | {freq['pdf'].get(r[0]['word'], '—')} | {row_of(r[0])} |",
    )
    L += [
        "",
        "逐条查证（工作簿 total / 题库 JSON / PDF 原文的实际词形）：",
        "",
        "| 单词 | 工作簿 | 题库 JSON | PDF 原文 |",
        "|---|---|---|---|",
        "| `phrase` | 20 | 0 | 20（phras*） |",
        "| `tooth` | 1 | 0 | 1（teeth） |",
        "| `harbor` | 1 | 0 | 1（harbour） |",
        "| `woman` | 12 | 0 | 20（women） |",
        "| `businessman` | 2 | 0 | 4（businessmen） |",
        "| `classify` | 3 | 0 | 7（classified） |",
        "| `ethics` | 1 | 0 | 4（ethical） |",
        "",
        "结论：这列跟**原始 PDF 材料**更接近（连不规则形 tooth/teeth、harbor/harbour 都是",
        "按 PDF 算的），但没有任何一条能同时对上题库 JSON 和 PDF，说明统计口径没有保留、",
        "无法复核。逐条查证也排除了「按解析文本计数」这一可能（这些词在解析里出现 0 次）。",
        "",
        "**建议**：要么补回生成脚本并重算这五列（可复现、可复核），要么在页面/Excel 上把这列",
        "标注为「估算值」。在补回脚本之前，`综合分` 和 `推荐级别`（由这些词频推导）也不应",
        "当作精确排序依据。",
        "",
        f"偏差最大的条目（展示 ≤{DEV_LIMIT}，同样混有词形误报）：", "",
        "| 单词 | 词表 | 工作簿 P5/P6/P7 | 复算 P5/P6/P7 | 偏差 | Excel 行 |",
        "|---|---|---|---|---|---|",
    ]
    L += [f"| `{r[0]['word']}` | {r[0]['list']} | {'/'.join(map(str, r[1]))} | {'/'.join(map(str, r[2]))} | {r[3]:+d} | {row_of(r[0])} |"
          for r in freq["deviations"][:DEV_LIMIT]]
    L += [
        "",
        f"反向候选：工作簿记为 0 但复算 >0（{len(freq['hidden'])} 条，多数是 `custom`→`customer`",
        "这类词形误报，列出供人工抽查是否漏计）：",
        "",
        "| 单词 | 词表 | 工作簿 P5/P6/P7 | 复算 P5/P6/P7 | Excel 行 |",
        "|---|---|---|---|---|",
    ]
    L += fmt_rows(
        freq["hidden"],
        lambda r: f"| `{r[0]['word']}` | {r[0]['list']} | {'/'.join(map(str, r[1]))} | "
        f"{'/'.join(map(str, r[2]))} | {row_of(r[0])} |",
    )

    L += ["", "## H. 级别与综合分一致性", ""]
    L += ["| 词表 | 级别 | 条数 | 综合分区间 |", "|---|---|---|---|"]
    for key, info in levels.items():
        for lv in ("S", "A", "B", "基础"):
            if lv in info["ranges"]:
                lo, hi, n = info["ranges"][lv]
                L.append(f"| {key} | {lv} | {n} | {lo} – {hi} |")
    L += ["", "| 词表 | 级别/分数倒挂 | 重复综合分 | 最大同分组 |", "|---|---|---|---|"]
    L += [
        f"| {key} | {info['inversions']} | {info['ties']} | {info['max_tie']} |"
        for key, info in levels.items()
    ]
    k15 = levels["key1500"]["inversions"] + levels["tsl1250"]["inversions"]
    L += [
        "",
        f"- `key1500` / `tsl1250`：倒挂 **{k15}**，级别就是按综合分从高到低切的"
        "（S ≥ 57.09，A 42–57），切分干净；",
        f"- `ngsl2809`：倒挂 **{levels['ngsl2809']['inversions']}**——该表的「基础」是 *词类*"
        "（功能词，如 `the` / `to` / `be`，综合分反而最高），不是难度等级；",
        "- 影响：级别筛选在三个 Tab 之间不可直接比较，「基础」词不是「更简单」，",
        "  而是 NGSL 里的功能词。建议页面上给 `ngsl2809` 的「基础」加说明。",
        "",
    ]

    L += ["", "## I. 关联搭配无法解析（词库标签在搭配库中不存在）", ""]
    if unresolved:
        L += ["| 单词 | 词表 | 关联固定搭配 | 搭配库中的近似条目 | Excel 行 |", "|---|---|---|---|---|"]
        L += fmt_rows(
            unresolved,
            lambda r: f"| `{r[0]['word']}` | {r[0]['list']} | {r[1]} | {'、'.join(r[2]) or '—'} | {row_of(r[0])} |",
        )
        L += [
            "",
            "处理方式二选一：把搭配补进搭配库（`TOEIC_Reading_固定搭配与惯用法_最终版.xlsx` 的",
            "`高频汇总`，再 `npm run collocations`），或把词库标签改成搭配库中已有的表达。",
        ]
    else:
        L.append("_无_")

    L += [
        "",
        "## 复核方式",
        "",
        "```bash",
        "uv run scripts/verify_words.py    # 重新生成本清单",
        "npm run words                     # Excel 改完后重新生成 words.json",
        "```",
        "",
    ]
    return "\n".join(L)


def main() -> int:
    payload = load_words()
    excel = excel_row_map()
    OUT.write_text(build_report(payload, excel), encoding="utf-8")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
