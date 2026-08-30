#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["openpyxl"]
# ///
"""把审计结果回写进搭配库的 Excel 源文件。

审计（结构自检 + LLM 释义审查）产出的是「修复计划」——一个 JSON 文件，
列出对 Excel ``高频汇总`` 表的操作。本脚本只负责**按计划改 Excel**，
不重生成 JSON（改完再 ``npm run collocations``）。

修复计划格式（``data/collocations/fix_plan.json``）::

    {
      "note": "人工确认后的修复计划",
      "ops": [
        {"op": "delete",    "expression": "Acrobat、Photoshop"},
        {"op": "set_gloss", "expression": "find out", "gloss": "发现；查明，弄清楚"},
        {"op": "set",       "expression": "committed。vow to do",
         "expression_new": "vow to do", "gloss": "发誓做某事，郑重承诺做某事"}
      ]
    }

- ``delete``      整行删除（列对齐已错乱的垃圾行）。
- ``set_gloss``   只改「中文」列（LLM 审查通过的结果）。
- ``set``         改「表达」列（可同时改「中文」）——处理丢 be、全角省略号、拼写错等。

``expression`` 必须与 Excel 的「表达」列逐字匹配（含全角标点）。

用法::

    uv run scripts/apply_collocation_fixes.py --from-llm          # 从 llm_review.jsonl 生成计划
    uv run scripts/apply_collocation_fixes.py --plan fix_plan.json --dry-run
    uv run scripts/apply_collocation_fixes.py --plan fix_plan.json
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parent.parent
XLSX = REPO / "TOEIC_Reading_固定搭配与惯用法_最终版.xlsx"
SHEET = "高频汇总"
PLAN = REPO / "data" / "collocations" / "fix_plan.json"
LLM_PLAN = REPO / "data" / "collocations" / "llm_fix_plan.json"
REVIEW_JSONL = REPO / "data" / "collocations" / "llm_review.jsonl"

# 列号（1 起）：表达=1，中文=2，类型=3，…（见 extract_collocations.py 的 row 下标）
COL_EXPR = 1
COL_CHINESE = 2


def load_row_map(ws) -> dict[str, int]:
    rows: dict[str, int] = {}
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if r and r[0] is not None and str(r[0]).strip():
            rows[str(r[0]).strip()] = i
    return rows


def from_llm(plan_path: Path) -> None:
    if not REVIEW_JSONL.exists():
        print(f"找不到 {REVIEW_JSONL}，请先跑 review_collocations_llm.py", file=sys.stderr)
        raise SystemExit(2)
    ops = []
    for line in REVIEW_JSONL.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        if obj.get("ok") is False and obj.get("gloss"):
            ops.append({
                "op": "set_gloss",
                "expression": obj["expression"],
                "gloss": obj["gloss"],
                "reason": obj.get("reason", ""),
            })
    plan = {"note": "由 llm_review.jsonl 的 ok=false 条目生成，人工确认后再 --plan 应用。", "ops": ops}
    plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {plan_path}：{len(ops)} 条 set_gloss（请复核后再应用）")


def apply_plan(plan_path: Path, dry_run: bool) -> None:
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    ops = plan.get("ops", [])
    if not ops:
        print("计划为空，无事可做。")
        return

    wb = openpyxl.load_workbook(XLSX)  # data_only=False：保留公式
    ws = wb[SHEET]
    rows = load_row_map(ws)

    # 先做不移动行的 set/set_gloss，再按行号从大到小做 delete，避免行号偏移。
    deletes = [op for op in ops if op.get("op") == "delete"]
    others = [op for op in ops if op.get("op") != "delete"]
    matched, missing = 0, []

    def find_row(expr: str):
        row = rows.get(expr)
        if row is None:
            missing.append(expr)
        return row

    for op in others:
        expr = op.get("expression", "")
        row = find_row(expr)
        if row is None:
            continue
        matched += 1
        kind = op.get("op")
        if kind == "set_gloss":
            print(f"  set_gloss row {row}: {expr!r} 中文 -> {op.get('gloss', '')!r}")
            if not dry_run:
                ws.cell(row=row, column=COL_CHINESE, value=op.get("gloss", ""))
        elif kind == "set":
            ne = op.get("expression_new", expr)
            print(f"  set      row {row}: {expr!r} -> {ne!r}"
                  + (f"  中文 -> {op.get('gloss', '')!r}" if op.get("gloss") else ""))
            if not dry_run:
                ws.cell(row=row, column=COL_EXPR, value=ne)
                if op.get("gloss"):
                    ws.cell(row=row, column=COL_CHINESE, value=op.get("gloss"))
        else:
            missing.append(f"{expr} (未知 op: {kind!r})")

    delete_rows = []
    for op in deletes:
        expr = op.get("expression", "")
        row = find_row(expr)
        if row is None:
            continue
        matched += 1
        delete_rows.append((row, expr))
    for row, expr in sorted(delete_rows, reverse=True):
        print(f"  delete  row {row}: {expr!r}")
        if not dry_run:
            ws.delete_rows(row, 1)

    print(f"\n计划 {len(ops)} 条：命中 {matched}，未命中/跳过 {len(missing)}")
    for m in missing:
        print(f"  未命中: {m!r}")

    if dry_run:
        print("dry-run：未写入 Excel。")
        return

    backup = XLSX.with_name(XLSX.stem + f".bak-{time.strftime('%Y%m%d-%H%M%S')}.xlsx")
    shutil.copy2(XLSX, backup)
    wb.save(XLSX)
    print(f"已备份到 {backup}")
    print(f"已写入 {XLSX}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-llm", action="store_true",
                        help="从 llm_review.jsonl 生成 fix_plan.json")
    parser.add_argument("--plan", type=Path, default=PLAN, help="修复计划 JSON")
    parser.add_argument("--dry-run", action="store_true", help="只打印，不写 Excel")
    args = parser.parse_args(argv)

    if args.from_llm:
        from_llm(LLM_PLAN)
        return 0
    if not args.plan.exists():
        print(f"找不到计划文件 {args.plan}。先用 --from-llm 生成，或手工创建。", file=sys.stderr)
        return 2
    apply_plan(args.plan, args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
