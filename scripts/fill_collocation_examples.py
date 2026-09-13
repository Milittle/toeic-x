#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""给「题库里一次都没出现」的搭配补一句自撰例句 + 中文译文。

只读 ``data/collocations/collocations.json``，不碰 Excel、不改 JSON。它挑出
``sources`` 为空的条目（当前 172 条），把「表达 + 中文释义 + 类型」发给 DeepSeek，
要一句商务/托业语境的英文例句和中文译文，结果写进
``data/collocations/example_fill.jsonl``，并生成复核报告
``data/collocations/EXAMPLE_FILL.md``。

生成的例句不是题库内容（题库里本来就没有这些表达），所以可以无条件显示，
不涉及「未见题样本」门控；回写 Excel 由 ``apply_collocation_examples.py`` 负责，
人工确认之前不会进真源。

环境变量::

    DEEPSEEK_API_KEY     必填
    DEEPSEEK_BASE_URL    默认 https://api.deepseek.com
    DEEPSEEK_MODEL       默认 deepseek-v4-flash

用法::

    uv run scripts/fill_collocation_examples.py --dry-run          # 只打印样例 prompt
    DEEPSEEK_API_KEY=... uv run scripts/fill_collocation_examples.py --limit 5
    DEEPSEEK_API_KEY=... uv run scripts/fill_collocation_examples.py          # 全量（172 条）
    uv run scripts/fill_collocation_examples.py --report-only      # 只重生成报告

断点续跑：已写进 ``example_fill.jsonl`` 的 id 自动跳过；删掉该文件可重新开始。
校验失败的条目不丢弃，只标出来（个别占位符写法会让匹配器本身失手）。
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from collocation_sources import derive_pattern, normalize, ordered_match  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
COLLOC = REPO / "data" / "collocations" / "collocations.json"
OUT_JSONL = REPO / "data" / "collocations" / "example_fill.jsonl"
REPORT_MD = REPO / "data" / "collocations" / "EXAMPLE_FILL.md"

BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

DEFAULT_CONCURRENCY = 5
MAX_WORDS = 25
MIN_WORDS = 8

SYSTEM_PROMPT = (
    "你是托业阅读（Part 5/6/7）教研员。给定一个固定搭配的英文表达、中文释义和类型，"
    "写一句它在商务/托业语境下的英文例句，并给出中文译文。只输出严格 JSON，不要输出任何其他文字。"
)

USER_TEMPLATE = """expression: {expression}
chinese: {chinese}
type: {typ}

输出一个 JSON 对象，只含这三个键：
- "example": 一句英文例句。要求：商务/托业语境；{min_words}–{max_words} 个词；只写一句；原样包含上面的表达。
  若表达里有占位符（sb. / sth. / A / B / one's / ~ing / ... / a(n)），换成具体的人或物，
  但保持这个表达的语法框架（例如 "notify A of B" → "Please notify the client of the schedule change."）。
- "example_zh": 上句的中文译文，≤40 字，不要解释，不要罗列同义词。
- "reason": 一句话中文说明；正常时写 "ok"。
  如果这个表达在英语里并不成立（生造、拼写错误、没有对应的英文说法），把 example 和
  example_zh 留空，并在 reason 里说明原因，不要硬造句子。"""

RETRY_TEMPLATE = """

上一版例句没有通过自动校验：{problem}
上一版是：{previous}
请重写一句，确保例句里原样出现该表达的各个实词，且保持原有词序。"""


def load_items() -> list[dict]:
    return json.loads(COLLOC.read_text(encoding="utf-8"))["items"]


def targets(items: list[dict], ids: list[str] | None, include_with_sources: bool) -> list[dict]:
    picked = items if include_with_sources else [it for it in items if not it.get("sources")]
    if ids:
        wanted = set(ids)
        picked = [it for it in items if it["id"] in wanted]
    return picked


def validate(expression: str, sentence: str) -> tuple[bool, str]:
    """用题库那套锚点匹配复核例句：实词按序出现，词距放宽到 3。"""
    if not sentence.strip():
        return False, "例句为空"
    words = len(sentence.split())
    if not (MIN_WORDS - 2 <= words <= MAX_WORDS + 5):
        return False, f"长度不合适（{words} 词）"
    pattern = derive_pattern(expression)
    if pattern is None:
        return False, "该表达剥掉占位符后不足两个锚点，无法自动校验"
    first_variants, rest, gap = pattern
    anchors = [t for t in rest if len(t) >= 2] or rest
    if not anchors:
        return False, "没有可校验的实词锚点"
    if ordered_match(normalize(sentence), first_variants, anchors, max(gap, 3)):
        return True, ""
    return False, f"例句里没有按序出现：{' '.join(anchors)}"


def build_prompt(item: dict, problem: str = "", previous: str = "") -> str:
    body = USER_TEMPLATE.format(
        expression=item["expression"],
        chinese=item["chinese"] or "（空）",
        typ=item["type"] or "—",
        min_words=MIN_WORDS,
        max_words=MAX_WORDS,
    )
    if problem:
        body += RETRY_TEMPLATE.format(problem=problem, previous=previous)
    return body


def parse_result(raw: str) -> dict:
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.S)
        if not m:
            raise
        obj = json.loads(m.group(0))
    if not isinstance(obj, dict) or "example" not in obj:
        raise ValueError(f"missing keys in {raw[:200]}")
    return {
        "example": str(obj.get("example", "")).strip(),
        "example_zh": str(obj.get("example_zh", "")).strip(),
        "reason": str(obj.get("reason", "")).strip(),
    }


async def generate_one(client: httpx.AsyncClient, item: dict) -> dict:
    problem, previous = "", ""
    last_error = ""
    for attempt in range(3):
        try:
            resp = await client.post(
                f"{BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {API_KEY}"},
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": build_prompt(item, problem, previous)},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                },
                timeout=60,
            )
            if resp.status_code == 429 or resp.status_code >= 500:
                await asyncio.sleep(2**attempt)
                continue
            resp.raise_for_status()
            parsed = parse_result(resp.json()["choices"][0]["message"]["content"])
        except Exception as exc:  # noqa: BLE001 - 记下来继续跑，不中断整批
            last_error = f"{type(exc).__name__}: {exc}"
            await asyncio.sleep(2**attempt)
            continue

        # 模型自己判定「这个表达不成立」时直接采纳，不再重试
        if not parsed["example"]:
            parsed["valid"] = False
            parsed["validation"] = "模型未给例句"
            return {**base_record(item), **parsed, "model": MODEL, "ts": time.time()}

        ok, why = validate(item["expression"], parsed["example"])
        if ok or attempt == 2:
            parsed["valid"] = ok
            parsed["validation"] = why
            return {**base_record(item), **parsed, "model": MODEL, "ts": time.time()}
        problem, previous = why, parsed["example"]

    record = base_record(item)
    record.update(
        {
            "example": "",
            "example_zh": "",
            "reason": f"ERROR: {last_error or '调用失败'}",
            "valid": False,
            "validation": "",
            "model": MODEL,
            "ts": time.time(),
        }
    )
    return record


def base_record(item: dict) -> dict:
    return {
        "id": item["id"],
        "expression": item["expression"],
        "chinese": item["chinese"],
        "type": item["type"],
    }


def load_done() -> dict[str, dict]:
    if not OUT_JSONL.exists():
        return {}
    done: dict[str, dict] = {}
    for line in OUT_JSONL.read_text(encoding="utf-8").splitlines():
        if line.strip():
            obj = json.loads(line)
            done[obj["id"]] = obj
    return done


def build_report(results: list[dict]) -> str:
    usable = [r for r in results if r.get("example")]
    failed = [r for r in results if r.get("example") and not r.get("valid")]
    declined = [r for r in results if not r.get("example")]
    errors = [r for r in declined if str(r.get("reason", "")).startswith("ERROR")]
    models = sorted({str(r.get("model") or MODEL) for r in results})
    lines = [
        "# 搭配自撰例句补录报告",
        "",
        f"- 模型：{', '.join(models) if models else MODEL}",
        f"- 目标：题库里没有用例（`sources` 为空）的搭配",
        f"- 已生成：{len(results)} 条（有例句 {len(usable)} / 其中未过自动校验 {len(failed)} / "
        f"模型判为不成立 {len(declined) - len(errors)} / 调用出错 {len(errors)}）",
        "",
        "> 本报告供人工复核（回写前确认、或回写后抽查都行）；回写用",
        "> `uv run scripts/apply_collocation_examples.py`（`npm run apply-examples`）。",
        "> 「校验」列是脚本用题库那套锚点匹配复核的结果，未过不代表例句一定有错（占位符写法会让匹配器失手）。",
        "",
        "| 表达 | 中文 | 例句 | 译文 | 校验 |",
        "|---|---|---|---|---|",
    ]
    for r in sorted(usable, key=lambda x: x["expression"].lower()):
        mark = "✅" if r.get("valid") else f"⚠️ {r.get('validation', '')}"
        lines.append(
            f"| `{r['expression']}` | {r['chinese']} | {r['example']} | {r['example_zh']} | {mark} |"
        )
    lines.append("")

    if failed:
        lines += ["## 未过自动校验（请重点看这几条）", ""]
        for r in failed:
            lines.append(f"- `{r['expression']}`：{r['validation']}")
            lines.append(f"  - 例句：{r['example']}")
            if r.get("reason") and r["reason"] != "ok":
                lines.append(f"  - 说明：{r['reason']}")
        lines.append("")

    if declined or errors:
        lines += ["## 没有例句的条目", ""]
        for r in declined:
            lines.append(f"- `{r['expression']}`：{r.get('reason', '')}")
        lines.append("")

    return "\n".join(lines)


async def run(pending: list[dict], concurrency: int) -> None:
    print(f"generating {len(pending)} examples (concurrency={concurrency}, model={MODEL})")
    sem = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient() as client:

        async def worker(item: dict) -> dict:
            async with sem:
                return await generate_one(client, item)

        with OUT_JSONL.open("a", encoding="utf-8") as f:
            for coro in asyncio.as_completed([worker(it) for it in pending]):
                record = await coro
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                f.flush()
                mark = "OK" if record.get("valid") else ("SKIP" if not record["example"] else "WARN")
                print(f"  [{mark}] {record['expression']}")

    REPORT_MD.write_text(build_report(list(load_done().values())), encoding="utf-8")
    print(f"wrote {REPORT_MD}")


def dry_run(pending: list[dict]) -> None:
    print(f"dry-run: would generate {len(pending)} examples")
    if not pending:
        return
    print("\n--- sample prompt (first item) ---")
    print(build_prompt(pending[0]))
    print("\n--- system prompt ---")
    print(SYSTEM_PROMPT)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="只生成前 N 条（调试用）")
    parser.add_argument("--id", action="append", default=None, help="只跑某个搭配 id，可重复")
    parser.add_argument("--all", action="store_true", help="连有真题的条目也生成（默认只做零链接的）")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--dry-run", action="store_true", help="只打印样例 prompt，不调用 API")
    parser.add_argument("--report-only", action="store_true", help="不调用 API，只重生成报告")
    args = parser.parse_args(argv)

    if args.report_only:
        REPORT_MD.write_text(build_report(list(load_done().values())), encoding="utf-8")
        print(f"wrote {REPORT_MD}")
        return 0

    done = load_done()
    picked = targets(load_items(), args.id, args.all)
    pending = [it for it in picked if it["id"] not in done]
    if args.limit is not None:
        pending = pending[: args.limit]

    if args.dry_run:
        dry_run(pending)
        return 0
    if not API_KEY:
        print("缺少 DEEPSEEK_API_KEY 环境变量。用法见文件头 docstring。", file=sys.stderr)
        return 2
    if not pending:
        print("nothing to do — 目标条目都已生成（或 --limit=0）。")
        return 0

    asyncio.run(run(pending, args.concurrency))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
