#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""用 DeepSeek（OpenAI 兼容接口）批量审查搭配库的中文释义。

只读：不修改 Excel 或 collocations.json。它逐条把「表达 + 当前中文释义 +
类型 + 优先级 + 题库真实例句」发给模型，判断该释义在托业阅读场景下是否
准确、完整，把「建议修改」的条目记录到
``data/collocations/llm_review.jsonl`` 并生成
``data/collocations/LLM_REVIEW.md`` 供人工复核。

结果只作建议，不自动回写 Excel——人工确认后再用 apply 步骤更新源文件。

环境变量::

    DEEPSEEK_API_KEY     必填
    DEEPSEEK_BASE_URL    默认 https://api.deepseek.com
    DEEPSEEK_MODEL       默认 deepseek-v4-flash

用法::

    DEEPSEEK_API_KEY=... uv run scripts/review_collocations_llm.py --dry-run
    DEEPSEEK_API_KEY=... uv run scripts/review_collocations_llm.py --limit 20
    DEEPSEEK_API_KEY=... uv run scripts/review_collocations_llm.py            # 全量
    uv run scripts/review_collocations_llm.py --report-only                   # 只重生成报告

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
COLLOC = REPO / "data" / "collocations" / "collocations.json"
QUESTIONS_DIR = REPO / "data" / "questions"
REVIEW_JSONL = REPO / "data" / "collocations" / "llm_review.jsonl"
REVIEW_MD = REPO / "data" / "collocations" / "LLM_REVIEW.md"

BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

MAX_SNIPPETS = 2       # 每条最多带几段例句
SNIPPET_LEN = 160      # 每段例句截断长度
DEFAULT_CONCURRENCY = 5

SYSTEM_PROMPT = (
    "你是托业阅读（Part 5/6/7）词汇审查员。给定一个固定表达的英文、当前中文释义、"
    "类型、优先级，以及它在托业模拟题中的真实例句，判断该中文释义是否准确且完整。"
    "只输出严格 JSON，不要输出任何其他文字。"
)

USER_TEMPLATE = """expression: {expression}
current_gloss: {chinese}
type: {typ}
priority: {priority}
example_usage:
{snippets}

输出一个 JSON 对象，只含这三个键：
- "ok": true 或 false。释义准确且对托业场景足够完整则为 true；若释义错误、有误导、缺常见义项、或过于字面（literal）导致在商务/阅读语境下不合适则为 false。
- "gloss": 完整的中文释义（简化字，≤30 字，多个义项用；分隔）。若 ok=true 则原样返回 current_gloss。
- "reason": 一句话中文说明；若 ok=true 可写 "ok"。

规则：只覆盖托业/商务英语里确实常用的义项，不要加入与考试无关的生僻义。"""


def load_items() -> list[dict]:
    return json.loads(COLLOC.read_text(encoding="utf-8"))["items"]


_test_cache: dict[str, dict] = {}


def load_test(test_id: str) -> dict | None:
    if test_id in _test_cache:
        return _test_cache[test_id]
    path = QUESTIONS_DIR / f"{test_id}.json"
    if not path.exists():
        _test_cache[test_id] = None
        return None
    _test_cache[test_id] = json.loads(path.read_text(encoding="utf-8"))
    return _test_cache[test_id]


def _question_and_passage(test: dict, part_no: int, number: int):
    for part in test["parts"]:
        if part["part"] != part_no:
            continue
        if part_no == 5:
            for q in part["questions"]:
                if q["number"] == number:
                    return q, None
        else:
            for ps in part.get("passages", []):
                for q in ps["questions"]:
                    if q["number"] == number:
                        return q, ps
    return None, None


def _sentence_containing(text: str, expression: str) -> str:
    tokens = sorted({t for t in re.findall(r"[a-zA-Z]{3,}", expression.lower())},
                    key=len, reverse=True)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    for tok in tokens:
        for s in sentences:
            if tok in s.lower():
                return s.strip()
    return ""


def snippets(item: dict) -> list[str]:
    """从题库取该表达的 1–2 句真实例句（不含答案，只作语境）。"""
    out: list[str] = []
    seen: set[str] = set()
    for src in item["sources"]:
        if len(out) >= MAX_SNIPPETS:
            break
        test = load_test(src["testId"])
        if not test:
            continue
        q, ps = _question_and_passage(test, src["part"], src["questionNumber"])
        if q is None:
            continue
        if src["part"] == 5:
            text = q["stem"]
        else:
            text = _sentence_containing(ps["text"], item["expression"]) if ps else q["stem"]
        text = text.strip()
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text[:SNIPPET_LEN])
    return out


def build_user_prompt(item: dict, snips: list[str]) -> str:
    body = "\n".join(f"- {s}" for s in snips) if snips else "- （无例句）"
    return USER_TEMPLATE.format(
        expression=item["expression"],
        chinese=item["chinese"] or "（空）",
        typ=item["type"] or "—",
        priority=item["priority"] or "—",
        snippets=body,
    )


def parse_result(raw: str) -> dict:
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.S)
        if m:
            try:
                obj = json.loads(m.group(0))
            except json.JSONDecodeError:
                raise
        else:
            raise
    if not isinstance(obj, dict) or "ok" not in obj or "gloss" not in obj:
        raise ValueError(f"missing keys in {raw[:200]}")
    return {
        "ok": bool(obj["ok"]),
        "gloss": str(obj.get("gloss", "")),
        "reason": str(obj.get("reason", "")),
    }


async def review_one(client: httpx.AsyncClient, item: dict, snips: list[str]) -> dict:
    for attempt in range(3):
        try:
            resp = await client.post(
                f"{BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {API_KEY}"},
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": build_user_prompt(item, snips)},
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
            data = resp.json()
            raw = data["choices"][0]["message"]["content"]
            parsed = parse_result(raw)
            parsed["id"] = item["id"]
            parsed["expression"] = item["expression"]
            parsed["current_gloss"] = item["chinese"]
            parsed["model"] = MODEL
            parsed["ts"] = time.time()
            return parsed
        except Exception as exc:  # noqa: BLE001 - 记录并返回错误，不中断整批
            if attempt == 2:
                return {
                    "id": item["id"],
                    "expression": item["expression"],
                    "current_gloss": item["chinese"],
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


def build_report(results: list[dict]) -> str:
    fixes = [r for r in results if r.get("ok") is False]
    errors = [r for r in results if r.get("ok") is None]
    ok = [r for r in results if r.get("ok") is True]
    lines = [
        "# 搭配库释义 LLM 审查报告",
        "",
        f"- 模型：{MODEL}",
        f"- 已审查：{len(results)} 条（通过 {len(ok)} / 建议修改 {len(fixes)} / 出错 {len(errors)}）",
        "",
        "> 本报告只列「建议修改」的条目，供人工确认。确认后统一回写 Excel。",
        "",
        "| 表达 | 当前释义 | 建议释义 | 理由 |",
        "|---|---|---|---|",
    ]
    for r in sorted(fixes, key=lambda x: x["expression"].lower()):
        lines.append(
            f"| `{r['expression']}` | {r['current_gloss']} | {r['gloss']} | {r['reason']} |"
        )
    lines.append("")
    if errors:
        lines.append("## 出错条目")
        lines.append("")
        for r in errors:
            lines.append(f"- `{r['expression']}`：{r['reason']}")
        lines.append("")
    return "\n".join(lines)


async def run(items: list[dict], concurrency: int, limit: int | None) -> None:
    done = load_done()
    pending = [it for it in items if it["id"] not in done]
    if limit is not None:
        pending = pending[:limit]
    if not pending:
        print("nothing to do — all items already reviewed (or --limit=0)")
        return

    print(f"reviewing {len(pending)} items (concurrency={concurrency}, model={MODEL})")
    sem = asyncio.Semaphore(concurrency)
    results: list[dict] = []

    async def worker(item: dict) -> dict:
        async with sem:
            snips = snippets(item)
            return await review_one(client, item, snips)

    async with httpx.AsyncClient() as client:
        with REVIEW_JSONL.open("a", encoding="utf-8") as f:
            for coro in asyncio.as_completed([worker(it) for it in pending]):
                r = await coro
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
                f.flush()
                results.append(r)
                mark = "OK" if r["ok"] is True else ("FIX" if r["ok"] is False else "ERR")
                print(f"  [{mark}] {r['expression']}")

    # 合并已完成的旧结果 + 本次结果，重生成报告
    all_results = list(load_done().values())
    REVIEW_MD.write_text(build_report(all_results), encoding="utf-8")
    print(f"wrote {REVIEW_MD}")


def dry_run(items: list[dict], limit: int | None) -> None:
    done = load_done()
    pending = [it for it in items if it["id"] not in done]
    if limit is not None:
        pending = pending[:limit]
    print(f"dry-run: would review {len(pending)} items (already done: {len(done)})")
    if not pending:
        return
    it = pending[0]
    print("\n--- sample prompt (first item) ---")
    print(build_user_prompt(it, snippets(it)))
    print("\n--- system prompt ---")
    print(SYSTEM_PROMPT)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="只审查前 N 条（调试用）")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--dry-run", action="store_true", help="只打印样例 prompt，不调用 API")
    parser.add_argument("--report-only", action="store_true", help="不调用 API，只重生成报告")
    args = parser.parse_args(argv)

    items = load_items()
    if args.report_only:
        REVIEW_MD.write_text(build_report(list(load_done().values())), encoding="utf-8")
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
