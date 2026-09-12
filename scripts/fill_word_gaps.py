#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""用 DeepSeek 补齐词库里缺失的音标 / 英文简释，产出可以直接回写的修复计划。

只读：不修改 ``单词本.xlsx`` 或 ``data/words/words.json``。它挑出
``phonetic`` 或 ``enDef`` 为空的单词，连同中文释义一起发给模型，要求按词库
现有风格补全（音标沿用 ECDICT 的 ASCII 音标写法，英文简释沿用
``n. ...; v. ...`` 的简释写法），把结果写到
``data/words/gap_fill.jsonl``，并把通过机械质检的条目整理成
``data/words/gap_fix_plan.json``（``set_phonetic`` / ``set_endef``），
再用 ``apply_word_fixes.py --plan`` 回写。

环境变量 / 用法与 ``review_words_llm.py`` 相同::

    DEEPSEEK_API_KEY=... uv run scripts/fill_word_gaps.py
    DEEPSEEK_API_KEY=... uv run scripts/fill_word_gaps.py --limit 5 --dry-run

音标由模型生成，属于**建议值**：回写后仍应在 ``data/words/VERIFICATION.md``
的抽查里人工过一遍（脚本不做发音校验）。
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
FILL_JSONL = REPO / "data" / "words" / "gap_fill.jsonl"
PLAN = REPO / "data" / "words" / "gap_fix_plan.json"

BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

DEFAULT_CONCURRENCY = 5
MAX_PHONETIC = 30

# 词库现有音标风格（取自 单词本.xlsx 已有行）
PHONETIC_EXAMPLES = "refund='ri:fʌnd  seminar='seminɑ:  vacation=vei'keiʃәn  the=ðә  laptop='læptɒp"

SYSTEM_PROMPT = (
    "你是托业词汇库的数据校对员。给定一个英文单词和它的中文释义，补全它的音标和英文简释。"
    "只输出严格 JSON，不要输出任何其他文字。"
)

USER_TEMPLATE = """word: {word}
word_lists: {lists}
current_gloss: {chinese}
missing: {missing}
existing_style_examples: {examples}

输出一个 JSON 对象，只含这两个键（缺失的字段才需要给值，不缺失的填空字符串）：
- "phonetic": 英式音标，沿用示例的 ASCII 写法（重音用 '，长音用 :，schwa 用 ә，不要加斜杠）。
- "endef": 英文简释，沿用 ECDICT 风格：词性缩写 + 简短英文释义，多个义项用「; 」分隔，≤80 字符。

规则：只写该单词真实存在的读音和释义；不确定就给出最保守的常见读音/释义，不要编造专业义。"""


def sanitize_no_proxy() -> None:
    """httpx 会把 NO_PROXY 的每个模式当 URL 解析；本机环境里的 `[::1]` 会让它抛 InvalidURL。"""
    for var in ("NO_PROXY", "no_proxy"):
        raw = os.environ.get(var)
        if not raw:
            continue
        keep = [p for p in raw.split(",") if p.strip() and not p.strip().startswith("[")]
        os.environ[var] = ",".join(keep)


def load_targets() -> list[dict]:
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
    return [r for r in by_word.values() if not r["phonetic"] or not r["enDef"]]


def build_user_prompt(item: dict, list_labels: dict[str, str]) -> str:
    missing = "、".join(
        name for name, key in (("音标", "phonetic"), ("英文简释", "enDef")) if not item[key]
    )
    return USER_TEMPLATE.format(
        word=item["word"],
        lists="、".join(list_labels.get(k, k) for k in item["lists"]),
        chinese=item["zhDef"] or "（空）",
        missing=missing,
        examples=PHONETIC_EXAMPLES,
    )


def parse_result(raw: str) -> dict:
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.S)
        if not m:
            raise
        obj = json.loads(m.group(0))
    if not isinstance(obj, dict):
        raise ValueError(f"not an object: {raw[:120]}")
    return {
        "phonetic": normalize_phonetic(str(obj.get("phonetic", ""))),
        "endef": str(obj.get("endef", "")).strip(),
    }


async def fill_one(client: httpx.AsyncClient, item: dict, prompt: str) -> dict:
    for attempt in range(3):
        try:
            resp = await client.post(
                f"{BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {API_KEY}"},
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
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
            parsed.update({
                "id": item["id"],
                "word": item["word"],
                "lists": item["lists"],
                "need_phonetic": not item["phonetic"],
                "need_endef": not item["enDef"],
                "model": MODEL,
                "ts": time.time(),
            })
            return parsed
        except Exception as exc:  # noqa: BLE001 - 记录并返回错误，不中断整批
            if attempt == 2:
                return {
                    "id": item["id"], "word": item["word"], "lists": item["lists"],
                    "need_phonetic": not item["phonetic"], "need_endef": not item["enDef"],
                    "phonetic": "", "endef": "", "error": f"{type(exc).__name__}: {exc}",
                    "model": MODEL, "ts": time.time(),
                }
            await asyncio.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def load_done() -> dict[str, dict]:
    if not FILL_JSONL.exists():
        return {}
    done: dict[str, dict] = {}
    for line in FILL_JSONL.read_text(encoding="utf-8").splitlines():
        if line.strip():
            obj = json.loads(line)
            done[obj["id"]] = obj
    return done


# 词库现有音标里出现过的字符集（3024 个音标不含空格/逗号，但 ice cream 这类多词条目需要）
PHONETIC_OK = re.compile(r"^[A-Za-z'’,.: ˌˈәəɑɔɒɜɪʊʌæeioouʃʒθðŋ-]+$")
ENDEF_OK = re.compile(r"^[a-z]{1,7}\.\s")

# 模型偶尔会写现代 IPA，这里统一回词库的 ASCII 风格（统计自 words.json 现有音标）
PHONETIC_NORMALIZE = [
    ("aɪ", "ai"), ("aʊ", "au"), ("eɪ", "ei"), ("ɔɪ", "ɔi"),
    ("əʊ", "әu"), ("әʊ", "әu"), ("ɜː", "ә:"),
    ("ʊ", "u"), ("ɪ", "i"), ("ɜ", "ә"), ("ə", "ә"), ("ɡ", "g"),
    ("ˈ", "'"), ("ˌ", ""),
]


def normalize_phonetic(value: str) -> str:
    out = value.strip().strip("/[]")
    for src, dst in PHONETIC_NORMALIZE:
        out = out.replace(src, dst)
    return re.sub(r"\s+", " ", out).strip()


def qa_reject(row: dict) -> str | None:
    if row.get("error"):
        return f"调用出错：{row['error']}"
    if row["need_phonetic"]:
        p = row["phonetic"]
        if not p:
            return "音标为空"
        if len(p) > MAX_PHONETIC:
            return "音标过长"
        if not PHONETIC_OK.match(p):
            return "音标含异常字符"
    if row["need_endef"]:
        e = row["endef"]
        if not e:
            return "英文简释为空"
        if not ENDEF_OK.match(e):
            return "英文简释缺少词性前缀"
        if re.search(r"[\u4e00-\u9fff]", e):
            return "英文简释含中文"
    return None


def write_plan(rows: dict[str, dict], plan_path: Path) -> tuple[int, list[tuple]]:
    ops, rejects = [], []
    for row in rows.values():
        reason = qa_reject(row)
        if reason:
            rejects.append((row["word"], reason))
            continue
        if row["need_phonetic"]:
            row["phonetic"] = normalize_phonetic(row["phonetic"])  # 幂等：老 jsonl 也统一风格
            ops.append({"op": "set_phonetic", "word": row["word"], "phonetic": row["phonetic"]})
        if row["need_endef"]:
            ops.append({"op": "set_endef", "word": row["word"], "endef": row["endef"]})
        ops.append({
            "op": "set_note",
            "word": row["word"],
            "note": "音标/英文简释由 LLM 补全（" + time.strftime("%Y-%m-%d") + "），待人工复核",
        })
        print(f"  {row['word']}: phonetic={row['phonetic']!r} endef={row['endef']!r}")
    plan = {
        "note": "filling 缺失音标/英文简释（LLM 建议值，见 gap_fill.jsonl），人工确认后再 --plan 应用。",
        "ops": ops,
    }
    plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {plan_path}：{len(ops)} 条 op")
    return len(ops), rejects


async def run(items: list[dict], concurrency: int, limit: int | None) -> None:
    sanitize_no_proxy()
    done = load_done()
    pending = [it for it in items if it["id"] not in done]
    if limit is not None:
        pending = pending[:limit]
    if not pending:
        print("nothing to do — all gap words already filled")
        return
    payload = json.loads(WORDS.read_text(encoding="utf-8"))
    list_labels = {k: v["label"] for k, v in payload["lists"].items()}
    print(f"filling {len(pending)} words (concurrency={concurrency}, model={MODEL})")
    sem = asyncio.Semaphore(concurrency)

    async def worker(item: dict) -> dict:
        async with sem:
            return await fill_one(client, item, build_user_prompt(item, list_labels))

    async with httpx.AsyncClient() as client:
        with FILL_JSONL.open("a", encoding="utf-8") as f:
            for coro in asyncio.as_completed([worker(it) for it in pending]):
                r = await coro
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
                f.flush()
                print(f"  [{'ERR' if r.get('error') else 'OK'}] {r['word']}")

    write_plan(load_done(), PLAN)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--dry-run", action="store_true", help="只打印将要补全的单词和 prompt")
    parser.add_argument("--plan-only", action="store_true", help="不调用 API，只用已有 jsonl 重新生成计划")
    args = parser.parse_args(argv)

    items = load_targets()
    if args.plan_only:
        write_plan(load_done(), PLAN)
        return 0
    if args.dry_run:
        payload = json.loads(WORDS.read_text(encoding="utf-8"))
        list_labels = {k: v["label"] for k, v in payload["lists"].items()}
        done = load_done()
        pending = [it for it in items if it["id"] not in done]
        print(f"dry-run: {len(pending)} words need filling (already done: {len(done)})")
        if pending:
            print(build_user_prompt(pending[0], list_labels))
        return 0
    if not API_KEY:
        print("缺少 DEEPSEEK_API_KEY 环境变量。用法见文件头 docstring。", file=sys.stderr)
        return 2
    asyncio.run(run(items, args.concurrency, args.limit))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
