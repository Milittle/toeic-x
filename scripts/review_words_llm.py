#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""用 DeepSeek（OpenAI 兼容接口）批量审查词库的中文释义。

只读：不修改 ``单词本.xlsx`` 或 ``data/words/words.json``。它逐条把「单词 +
词表归属 + 推荐级别 + 音标 + 当前中文释义 + 英文简释 + 题库真实用例」发给模型，
判断该释义在托业阅读场景下是否准确、完整、干净，把「建议修改」的条目记录到
``data/words/llm_review.jsonl`` 并生成 ``data/words/LLM_REVIEW.md`` 供人工复核。

同 ``review_collocations_llm.py`` 一样，结果只作建议，不自动回写 Excel——
人工确认后再改 ``单词本.xlsx``，然后 ``npm run words`` 重新生成 JSON。

同一个单词可能同时属于多张词表（``data/words/words.json`` 里是多行、字段完全
一样），本脚本按单词去重后再送审：审 4059 个唯一单词即覆盖全部 5559 行。

环境变量::

    DEEPSEEK_API_KEY     必填
    DEEPSEEK_BASE_URL    默认 https://api.deepseek.com
    DEEPSEEK_MODEL       默认 deepseek-v4-flash

用法::

    DEEPSEEK_API_KEY=... uv run scripts/review_words_llm.py --dry-run
    DEEPSEEK_API_KEY=... uv run scripts/review_words_llm.py --limit 20
    DEEPSEEK_API_KEY=... uv run scripts/review_words_llm.py            # 全量
    uv run scripts/review_words_llm.py --report-only                   # 只重生成报告

断点续跑：已写入 ``llm_review.jsonl`` 的 id 会自动跳过；删除该文件可重新开始。
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path

import httpx

REPO = Path(__file__).resolve().parent.parent
WORDS = REPO / "data" / "words" / "words.json"
QUESTIONS_DIR = REPO / "data" / "questions"
REVIEW_JSONL = REPO / "data" / "words" / "llm_review.jsonl"
REVIEW_MD = REPO / "data" / "words" / "LLM_REVIEW.md"

BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

MAX_SNIPPETS = 2       # 每个单词最多带几条例句
SNIPPET_LEN = 180      # 每条例句截断长度
DEFAULT_CONCURRENCY = 5

SYSTEM_PROMPT = (
    "你是托业阅读（Part 5/6/7）词汇审查员。给定一个英文单词、音标、词表归属、"
    "推荐级别、当前中文释义、英文简释，以及它在托业模拟题中的真实例句，"
    "判断该中文释义是否准确、完整、干净，适合中国考生的托业备考。"
    "只输出严格 JSON，不要输出任何其他文字。"
)

USER_TEMPLATE = """word: {word}
phonetic: {phonetic}
word_lists: {lists}
level: {level}
current_gloss: {chinese}
en_def: {en_def}
example_usage:
{snippets}

输出一个 JSON 对象，只含这三个键：
- "ok": true 或 false。释义准确、覆盖托业常用义项、没有无关噪声则为 true；若释义错误、有误导、缺常见义项、堆了考试用不到的义项（医学/计算机/化学等 ECDICT 专业义），或过长到影响阅读则为 false。
- "gloss": 完整的中文释义。保持现有格式：词性前缀（n. / v. / vt. / vi. / a. / adv. / prep. / conj. 等）+ 义项，多个义项用「；」分隔，总长 ≤40 字，简体中文。若 ok=true 则原样返回 current_gloss。
- "reason": 一句话中文说明；若 ok=true 可写 "ok"。

规则：
1. 只保留托业/商务英语里确实常用的义项，删掉与考试无关的专业义项；
2. 不要新增生僻义，也不要漏掉该词在例句中体现的义项；
3. 保留原释义里正确的义项，只做增删改，不要整条重写成另一套说法；
4. 单词表里的单词以阅读词汇为主，注释要能直接放进背单词页面。"""


def sanitize_no_proxy() -> None:
    """httpx 会把 NO_PROXY 的每个模式当 URL 解析；本机环境里的 `[::1]` 会让它抛 InvalidURL。

    只丢掉方括号 IPv6 条目，其它代理设置保持原样（仍然需要走 127.0.0.1 的代理）。
    """
    for var in ("NO_PROXY", "no_proxy"):
        raw = os.environ.get(var)
        if not raw:
            continue
        keep = [p for p in raw.split(",") if p.strip() and not p.strip().startswith("[")]
        os.environ[var] = ",".join(keep)


def load_unique_words() -> list[dict]:
    """按单词去重（同一单词的多行字段完全一致，只保留第一行并合并词表归属）。"""
    payload = json.loads(WORDS.read_text(encoding="utf-8"))
    by_word: dict[str, dict] = {}
    for it in payload["items"]:
        key = it["word"].lower()
        if key in by_word:
            by_word[key]["lists"].append(it["list"])
        else:
            row = dict(it)
            row["lists"] = [it["list"]]
            by_word[key] = row
    return list(by_word.values())


def build_sentence_index() -> dict[str, list[str]]:
    """token -> 含该 token 的例句（题库 P5 题干 + P6/P7 文章），用于给模型提供语境。"""
    index: dict[str, list[str]] = {}
    for path in sorted(QUESTIONS_DIR.glob("reading-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for part in data["parts"]:
            if part["part"] == 5:
                chunks = [q["stem"] for q in part["questions"]]
            else:
                chunks = [ps["text"] for ps in part.get("passages", [])]
            for chunk in chunks:
                for sentence in re.split(r"(?<=[.!?])\s+", chunk):
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    for token in {t.lower() for t in re.findall(r"[A-Za-z][A-Za-z'’-]*", sentence)}:
                        bucket = index.setdefault(token, [])
                        if len(bucket) < 4 and sentence not in bucket:
                            bucket.append(sentence)
    return index


def snippets(item: dict, index: dict[str, list[str]]) -> list[str]:
    word = item["word"].lower()
    out: list[str] = []
    for key in (word, word + "s", word + "es", word + "ed", word + "ing", word + "d"):
        for sentence in index.get(key, []):
            if len(out) >= MAX_SNIPPETS:
                return out
            if sentence not in out:
                out.append(sentence[:SNIPPET_LEN])
    return out


def build_user_prompt(item: dict, snips: list[str], list_labels: dict[str, str]) -> str:
    body = "\n".join(f"- {s}" for s in snips) if snips else "- （无例句）"
    return USER_TEMPLATE.format(
        word=item["word"],
        phonetic=item["phonetic"] or "—",
        lists="、".join(list_labels.get(k, k) for k in item["lists"]),
        level=item["level"] or "—",
        chinese=item["zhDef"] or "（空）",
        en_def=item["enDef"] or "（无）",
        snippets=body,
    )


def parse_result(raw: str) -> dict:
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.S)
        if not m:
            raise
        obj = json.loads(m.group(0))
    if not isinstance(obj, dict) or "ok" not in obj or "gloss" not in obj:
        raise ValueError(f"missing keys in {raw[:200]}")
    return {
        "ok": bool(obj["ok"]),
        "gloss": str(obj.get("gloss", "")),
        "reason": str(obj.get("reason", "")),
    }


async def review_one(
    client: httpx.AsyncClient, item: dict, snips: list[str], list_labels: dict[str, str]
) -> dict:
    for attempt in range(3):
        try:
            resp = await client.post(
                f"{BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {API_KEY}"},
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": build_user_prompt(item, snips, list_labels)},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                },
                timeout=60,
            )
            if resp.status_code == 429 or resp.status_code >= 500:
                await asyncio.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            parsed = parse_result(resp.json()["choices"][0]["message"]["content"])
            parsed["id"] = item["id"]
            parsed["word"] = item["word"]
            parsed["lists"] = item["lists"]
            parsed["current_gloss"] = item["zhDef"]
            parsed["model"] = MODEL
            parsed["ts"] = time.time()
            return parsed
        except Exception as exc:  # noqa: BLE001 - 记录并返回错误，不中断整批
            if attempt == 2:
                return {
                    "id": item["id"],
                    "word": item["word"],
                    "lists": item["lists"],
                    "current_gloss": item["zhDef"],
                    "ok": None,
                    "gloss": "",
                    "reason": f"ERROR: {type(exc).__name__}: {exc}",
                    "model": MODEL,
                    "ts": time.time(),
                }
            await asyncio.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def load_done() -> dict[str, dict]:
    if not REVIEW_JSONL.exists():
        return {}
    done: dict[str, dict] = {}
    for line in REVIEW_JSONL.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        done[obj["id"]] = obj
    return done


THEMES = [
    ("专业义/域标签噪声（[医] [计] [经] 等）", ("专业", "标签", "无关", "考试不考", "不考")),
    ("义项缺失或不完整", ("缺", "遗漏", "未覆盖", "没有覆盖", "漏")),
    ("释义错误/误导", ("错误", "误导", "不准确", "并非", "不是该词")),
    ("释义过长/义项堆砌", ("过长", "堆砌", "冗余", "精简", "太长")),
]


def build_report(results: list[dict], list_labels: dict[str, str]) -> str:
    fixes = [r for r in results if r.get("ok") is False]
    errors = [r for r in results if r.get("ok") is None]
    ok = [r for r in results if r.get("ok") is True]
    theme_counts = [
        (label, sum(1 for r in fixes if any(k in r.get("reason", "") for k in keys)))
        for label, keys in THEMES
    ]
    lengths_now = [len(r.get("current_gloss", "")) for r in fixes]
    lengths_new = [len(r.get("gloss", "")) for r in fixes]
    lines = [
        "# 词库释义 LLM 审查报告",
        "",
        f"- 模型：{MODEL}",
        f"- 已审查：{len(results)} 个唯一单词（通过 {len(ok)} / 建议修改 {len(fixes)} / 出错 {len(errors)}）",
        "",
        "> 本报告只列「建议修改」的条目，供人工确认。确认后统一回写 `单词本.xlsx`，",
        "> 再 `npm run words` 重新生成 `data/words/words.json`。",
        "",
    ]
    if fixes:
        lines += [
            "## 粗略分类（按理由里的关键词多标签统计，一条可同时命中多类）",
            "",
            "| 主题 | 条数 |",
            "|---|---|",
        ]
        lines += [f"| {label} | {n} |" for label, n in theme_counts]
        lines += [
            "",
            f"建议修改条目的释义平均长度：{sum(lengths_now) / len(lengths_now):.1f} 字 → "
            f"{sum(lengths_new) / len(lengths_new):.1f} 字。",
            "",
        ]
    lines += [
        "## 建议修改清单",
        "",
        "| 单词 | 词表 | 当前释义 | 建议释义 | 理由 |",
        "|---|---|---|---|---|",
    ]
    for r in sorted(fixes, key=lambda x: x["word"].lower()):
        lists = "、".join(list_labels.get(k, k) for k in r.get("lists", []))
        lines.append(
            f"| `{r['word']}` | {lists} | {r['current_gloss']} | {r['gloss']} | {r['reason']} |"
        )
    lines.append("")
    if errors:
        lines.append("## 出错条目")
        lines.append("")
        for r in errors:
            lines.append(f"- `{r['word']}`：{r['reason']}")
        lines.append("")
    return "\n".join(lines)


async def run(items: list[dict], concurrency: int, limit: int | None) -> None:
    sanitize_no_proxy()
    done = load_done()
    pending = [it for it in items if it["id"] not in done]
    if limit is not None:
        pending = pending[:limit]
    if not pending:
        print("nothing to do — all words already reviewed (or --limit=0)")
        return

    payload = json.loads(WORDS.read_text(encoding="utf-8"))
    list_labels = {k: v["label"] for k, v in payload["lists"].items()}
    print(f"reviewing {len(pending)} words (concurrency={concurrency}, model={MODEL})")
    index = build_sentence_index()
    sem = asyncio.Semaphore(concurrency)
    results: list[dict] = []

    async def worker(item: dict) -> dict:
        async with sem:
            snips = snippets(item, index)
            return await review_one(client, item, snips, list_labels)

    async with httpx.AsyncClient() as client:
        with REVIEW_JSONL.open("a", encoding="utf-8") as f:
            for coro in asyncio.as_completed([worker(it) for it in pending]):
                r = await coro
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
                f.flush()
                results.append(r)
                mark = "OK" if r["ok"] is True else ("FIX" if r["ok"] is False else "ERR")
                print(f"  [{mark}] {r['word']}")

    all_results = list(load_done().values())
    REVIEW_MD.write_text(build_report(all_results, list_labels), encoding="utf-8")
    print(f"wrote {REVIEW_MD}")


def dry_run(items: list[dict], limit: int | None) -> None:
    done = load_done()
    pending = [it for it in items if it["id"] not in done]
    if limit is not None:
        pending = pending[:limit]
    print(f"dry-run: would review {len(pending)} words (already done: {len(done)})")
    if not pending:
        return
    payload = json.loads(WORDS.read_text(encoding="utf-8"))
    list_labels = {k: v["label"] for k, v in payload["lists"].items()}
    index = build_sentence_index()
    it = pending[0]
    print("\n--- sample prompt (first word) ---")
    print(build_user_prompt(it, snippets(it, index), list_labels))
    print("\n--- system prompt ---")
    print(SYSTEM_PROMPT)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="只审查前 N 个单词（调试用）")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--dry-run", action="store_true", help="只打印样例 prompt，不调用 API")
    parser.add_argument("--report-only", action="store_true", help="不调用 API，只重生成报告")
    args = parser.parse_args(argv)

    items = load_unique_words()
    if args.report_only:
        payload = json.loads(WORDS.read_text(encoding="utf-8"))
        list_labels = {k: v["label"] for k, v in payload["lists"].items()}
        REVIEW_MD.write_text(build_report(list(load_done().values()), list_labels), encoding="utf-8")
        print(f"wrote {REVIEW_MD}")
        return 0
    if args.dry_run:
        dry_run(items, args.limit)
        return 0
    if not API_KEY:
        print("缺少 DEEPSEEK_API_KEY 环境变量。用法见文件头 docstring。", file=sys.stderr)
        return 2
    asyncio.run(run(items, args.concurrency, args.limit))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
