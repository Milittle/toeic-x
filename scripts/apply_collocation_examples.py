#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""把 ``example_fill.jsonl`` 里确认过的自撰例句回写进搭配库 Excel 源文件。

Excel 的 ``高频汇总`` 表新增三列（不够就自动补表头）：

    L 例句        英文例句（自撰，不是题库内容）
    M 例句译文     对应中文
    N 例句备注     默认「LLM 生成，待人工复核」

写入方式与搭配库那次补录一致：**直接改写 xlsx 包内 ``xl/worksheets/sheet2.xml``**，
只动目标行的 L/M/N 三个单元格与表头/维度声明，其余包内部件逐字节不变（脚本会自查并打印）。
写前备份，写后在 ``data/collocations/FIX_LOG.md`` 追加一节。

用法::

    uv run scripts/apply_collocation_examples.py --dry-run
    uv run scripts/apply_collocation_examples.py                    # 回写全部有例句的条目
    uv run scripts/apply_collocation_examples.py --valid-only       # 只回写过了自动校验的
    uv run scripts/apply_collocation_examples.py --id basis-point   # 只回写某一条
    uv run scripts/apply_collocation_examples.py --source 副本.xlsx --from-jsonl 测试.jsonl

回写之后仍须 ``npm run collocations`` 重新生成 ``collocations.json``。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
import time
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape, unescape

REPO = Path(__file__).resolve().parent.parent
XLSX = REPO / "TOEIC_Reading_固定搭配与惯用法_最终版.xlsx"
SHEET = "xl/worksheets/sheet2.xml"  # 高频汇总
JSONL = REPO / "data" / "collocations" / "example_fill.jsonl"
LOG = REPO / "data" / "collocations" / "FIX_LOG.md"

COL_EXAMPLE, COL_ZH, COL_NOTE = 12, 13, 14  # L / M / N
HEADERS = {COL_EXAMPLE: "例句", COL_ZH: "例句译文", COL_NOTE: "例句备注"}
DEFAULT_NOTE = "LLM 生成，待人工复核"

ROW_RE = re.compile(r'<row r="(\d+)"[^>]*>.*?</row>', re.S)
CELL_TEXT_RE = re.compile(r'<c r="A(\d+)"[^>]*>(?:<is><t[^>]*>(.*?)</t></is>)?</c>', re.S)
DIMENSION_RE = re.compile(r'<dimension ref="A1:[A-Z]+\d+" />')


def col_name(index: int) -> str:
    """1 → A, 12 → L。"""
    name = ""
    while index > 0:
        index, rem = divmod(index - 1, 26)
        name = chr(65 + rem) + name
    return name


def cell_xml(row: int, column: int, value: str, style: str) -> str:
    ref = f"{col_name(column)}{row}"
    attrs = f' s="{style}"' if style else ""
    return f'<c r="{ref}"{attrs} t="inlineStr"><is><t>{escape(value)}</t></is></c>'


def load_records(path: Path, ids: list[str] | None, valid_only: bool) -> list[dict]:
    if not path.exists():
        raise SystemExit(f"找不到 {path}；先跑 scripts/fill_collocation_examples.py 生成。")
    wanted = set(ids) if ids else None
    records = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        if not obj.get("example") or not obj.get("example_zh"):
            continue
        if valid_only and not obj.get("valid"):
            continue
        if wanted and obj["id"] not in wanted:
            continue
        records.append(obj)
    return records


def example_cell_re(column: int, row: int) -> re.Pattern[str]:
    return re.compile(rf'<c r="{col_name(column)}{row}"[^>]*(?:/>|>.*?</c>)', re.S)


def patch_row(row_xml: str, row: int, values: dict[int, str], style: str) -> str:
    """在**单行** XML 里写入 values（列号 → 文本），已存在的单元格就地替换。"""
    patched = row_xml
    for column, value in values.items():
        new_cell = cell_xml(row, column, value, style)
        existing = example_cell_re(column, row).search(patched)
        if existing:
            patched = patched[: existing.start()] + new_cell + patched[existing.end() :]
        else:
            patched = re.sub(r"</row>$", new_cell + "</row>", patched)
    return patched


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-jsonl", type=Path, default=JSONL, help="例句 JSONL")
    parser.add_argument("--source", type=Path, default=XLSX, help="xlsx 源文件（调试时可指向副本）")
    parser.add_argument("--id", action="append", default=None, help="只回写某个搭配 id，可重复")
    parser.add_argument("--valid-only", action="store_true", help="只回写过了自动校验的条目")
    parser.add_argument("--note", default=DEFAULT_NOTE, help="例句备注列的值")
    parser.add_argument("--dry-run", action="store_true", help="只打印，不写文件")
    args = parser.parse_args(argv)

    records = load_records(args.from_jsonl, args.id, args.valid_only)
    if not records:
        print("没有可回写的例句（JSONL 为空、都被过滤掉，或没有非空 example/example_zh）。")
        return 0

    zin = zipfile.ZipFile(args.source)
    parts = [(info, zin.read(info.filename)) for info in zin.infolist()]
    zin.close()
    sheet = next(data for info, data in parts if info.filename == SHEET).decode("utf-8")

    rows = {int(m.group(1)): m.group(0) for m in ROW_RE.finditer(sheet)}
    if 1 not in rows:
        raise SystemExit("高频汇总表里找不到表头行，中止。")
    by_expression: dict[str, int] = {}
    for row, xml in rows.items():
        m = CELL_TEXT_RE.search(xml)
        if m and m.group(2):
            by_expression[unescape(m.group(2)).strip()] = row

    targets = [(rec, by_expression.get(rec["expression"].strip())) for rec in records]
    missing = [rec["expression"] for rec, row in targets if row is None]
    if missing:
        print(f"以下表达在 Excel 里找不到，跳过：{missing}")
    targets = [(rec, row) for rec, row in targets if row is not None]
    if not targets:
        return 2

    header_style, body_style = "18", "30"
    header_cells_added = 'r="L1"' not in rows[1]
    new_sheet = sheet.replace(
        rows[1], patch_row(rows[1], 1, {c: HEADERS[c] for c in HEADERS}, header_style), 1
    )
    for rec, row in targets:
        new_sheet = new_sheet.replace(
            rows[row],
            patch_row(
                rows[row],
                row,
                {
                    COL_EXAMPLE: rec["example"],
                    COL_ZH: rec["example_zh"],
                    COL_NOTE: rec.get("note") or args.note,
                },
                body_style,
            ),
            1,
        )
    max_row = max(rows)
    new_sheet = DIMENSION_RE.sub(f'<dimension ref="A1:{col_name(COL_NOTE)}{max_row}" />', new_sheet)
    if header_cells_added and "</cols>" in new_sheet:
        widths = {COL_EXAMPLE: 60, COL_ZH: 34, COL_NOTE: 24}
        cols = "".join(
            f'<col width="{widths[c]}" customWidth="1" style="38" min="{c}" max="{c}" />'
            for c in HEADERS
        )
        new_sheet = new_sheet.replace("</cols>", cols + "</cols>")

    print(f"将回写 {len(targets)} 条：")
    for rec, row in targets[:10]:
        print(f"  row {row}: {rec['expression']} -> {rec['example']}")
    if len(targets) > 10:
        print(f"  …… 其余 {len(targets) - 10} 条")

    if args.dry_run:
        print("dry-run：未写入 Excel。")
        return 0

    backup = args.source.with_name(args.source.stem + f".bak-{time.strftime('%Y%m%d-%H%M%S')}.xlsx")
    shutil.copy2(args.source, backup)
    tmp = args.source.with_suffix(".tmp.xlsx")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for info, data in parts:
            zout.writestr(info, new_sheet.encode("utf-8") if info.filename == SHEET else data)
    tmp.replace(args.source)

    # 自查：除 sheet2.xml 外，包内部件必须逐字节不变
    old_hashes = {info.filename: hashlib.sha256(data).hexdigest() for info, data in parts}
    with zipfile.ZipFile(args.source) as zcheck:
        changed = [
            name
            for name in old_hashes
            if hashlib.sha256(zcheck.read(name)).hexdigest() != old_hashes[name]
        ]
    print(f"已备份到 {backup}")
    print(f"已写入 {args.source}；变化的包内部件：{changed}")

    if not args.dry_run and args.source == XLSX and LOG.exists():
        entry = [
            "",
            f"## {time.strftime('%Y-%m-%d %H:%M')} 补录自撰例句（{len(targets)} 条，代码改动）",
            "",
            f"- 计划：`{args.from_jsonl.relative_to(REPO)}`（`scripts/fill_collocation_examples.py` 生成，人工复核后回写）",
            f"- 写入：`高频汇总` 的 L/M/N 三列（例句 / 例句译文 / 例句备注），只改写 `xl/worksheets/sheet2.xml`；"
            f"包内部件变化清单：{changed}",
            f"- 备份：`{backup.name}`",
            f"- 结果：{len(targets)} 条零链接搭配现在有例句可看；其余条目的 JSON 字段不变",
            f"- 备注：例句是模型产物，备注列已标「{args.note}」；改完须 `npm run collocations` 重新生成 JSON",
        ]
        LOG.write_text(LOG.read_text(encoding="utf-8") + "\n".join(entry) + "\n", encoding="utf-8")
        print(f"已追加记录到 {LOG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
