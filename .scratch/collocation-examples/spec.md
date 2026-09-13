# 搭配例句补录（自撰例句）

> 目标读者：实现者（我）与复核者（你）。写完代码后本文件是这次改动的验收依据。

## 背景

搭配真题页现在能给每条搭配显示「原句」——从题库现算，填空题把横线补成正确答案，
阅读题定位搭配所在的那一句（见 `lib/domain/collocation-example.ts`）。但它只覆盖
**有真题链接的 730 条**；搭配库 902 条里有 **172 条题库里一次都没出现**（`sources` 为空），
这些卡片上永远看不到「搭配在句子里长什么样」。

本 spec 只解决这 172 条：给它们**自撰例句 + 中文译文**。例句不是题库内容，所以可以
无条件显示，不涉及「未见题样本」门控。

## 范围

**做**

1. `高频汇总` 新增三列：`例句`（英文，一词一句）、`例句译文`（中文）、`例句备注`
   （标「LLM 生成，待人工复核」，与词库那次补音标的写法一致）。
2. 新增生成脚本 `scripts/fill_collocation_examples.py`（`npm run examples`）：只针对 `sources` 为空的条目，
   调 DeepSeek 生成例句 + 译文，断点续跑，产出 `data/collocations/example_fill.jsonl`
   与复核报告 `data/collocations/EXAMPLE_FILL.md`。
3. 新增回写脚本 `scripts/apply_collocation_examples.py`（`npm run apply-examples`）：把确认过的例句写进 Excel
   （写入前备份，只改写 `xl/worksheets/sheet2.xml`，不用 openpyxl 保存）。
4. `scripts/extract_collocations.py` 改为**按表头名取列**（对齐 `extract_words.py`），
   把三列读成 `example` / `exampleZh` / `exampleNote`；只在该条有例句时才写这三个键，
   其余条目的 JSON 保持不变。
5. 学习卡（`app/collocations/[id]`）显示例句块。

**不做**

- 不给已有真题原句的 730 条写例句（它们已经有更好的：真题原句）。
- 不改任何门控逻辑；例句不来自题库，无需门控。
- 不自动回写：模型产出必须经人过目后由回写脚本显式写入。

## 生成规则（prompt 约束）

- 一句自然、地道的**商务/托业语境**英文，10–25 词，只含一句。
- 必须**原样包含**该表达；带占位符的（`notify A of B`、`be aimed at ~ing`、`at sb.'s request`、
  `in a(n) ... fashion`）要把占位符实例化成具体词，并保持表达的语法框架。
- 配一句中文译文（≤40 字），不用解释，不堆同义词。
- 若该表达在英语里并不成立（历史上 LLM 审查判过 `a clean seek` 这类为生造），
  允许模型返回空例句 + 理由，由人决定是否删条目。
- 输出严格 JSON：`{"example": str, "example_zh": str, "reason": str}`。

## 自动校验（脚本内，写入 JSONL 与报告）

生成后用 `scripts/collocation_sources.py` 的匹配器复核：把例句当语料，检查该表达的
锚点是否按序出现（首词认常见变形，占位符剥掉，词距 ≤3）。记录 `valid: true/false`。
**校验失败不自动丢弃**——只标出来给人看，因为个别表达的占位符写法（如 `a(n)`、`~ing`）
会让匹配器本身失手。

## 字段与数据流

```
高频汇总 L/M/N 列（人可读的真源）
      │  uv run scripts/apply_collocation_examples.py --from-jsonl ...
      ▼
example_fill.jsonl（模型产物 + 校验位，人工复核后回写）
      │  npm run collocations
      ▼
collocations.json items[].example / .exampleZh / .exampleNote（缺省不写这三个键）
      ▼
学习卡例句块
```

## 验收标准

1. `uv run scripts/fill_collocation_examples.py --dry-run` 能打印样例 prompt，不调 API。
2. 带 `DEEPSEEK_API_KEY` 跑 `--limit 5` 能产出 5 行 JSONL + 报告，重复跑会跳过已完成的 id。
3. `uv run scripts/apply_collocation_examples.py --dry-run` 打印将写入的行；
   去掉 `--dry-run` 后：只有 `sheet2.xml` 变化（其余包内部件 sha256 不变），
   备份文件名打印在输出里，并在 `data/collocations/FIX_LOG.md` 追加一节。
4. `npm run collocations` 后 `collocations.json` 里那几条带 `example`/`exampleZh`/`exampleNote`，
   **其余条目的 items 逐字段不变**。
5. 学习卡能看到例句与译文，并带「待人工复核」提示。
6. `npm test`、`npx tsc --noEmit` 通过；`uv run scripts/verify_collocations.py` 七类可疑项不因本次改动增加。

## 已定的决策

- 覆盖范围：**只做 172 条零链接**（有原句的 730 条不写自撰例句）。
- 分工：脚本与 spec 由 agent 写，DeepSeek 生成由你带 `DEEPSEEK_API_KEY` 跑。
- 存哪：Excel 新增列（真源）→ 提取进 JSON，不用旁路文件当运行时数据源。
- 回写方式：直接改写 xlsx 包内 sheet XML（历史教训：openpyxl 保存会丢公式缓存值；
  本工作簿虽无缓存值，但同一套做法更安全、diff 更小）。

## 待你决定的（跑之前）

- 例句是否要统一长度/难度（现在定 10–25 词、商务语境）。
- 复核要逐条过还是抽查：建议按仓库对词库那次的结论——**抽查 + 结构校验**，不追求逐条闭环。

## 已做的验证（写代码时）

- 生成器 `--dry-run` 能打印样例 prompt；没有 `DEEPSEEK_API_KEY` 时明确报错并以 2 退出。
- 回写器在**工作簿副本**上跑通：L/M/N 只落在表头 + 目标行（单元格数 = 1 + N，没有波及其他行）；
  含 `&` 的表达（`R&D Department (Research and Development Department)`）与含弯引号的表达
  （`at one’s fingertips`）都能正确按表达定位行、按 XML 转义写入；重复跑幂等（改值就地替换）；
  写后包内部件只有 `xl/worksheets/sheet2.xml` 变化（脚本自己打印该清单）。
- 提取器改成按表头名取列后，对现有数据是 no-op（`items` 逐字段不变）；把副本回写后重新提取，
  只有目标条目多出 `example` / `exampleZh` / `exampleNote`，其余 899 条逐字段不变。
- `npm test`（32 项）与 `npx tsc --noEmit` 通过。
