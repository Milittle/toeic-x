# 搭配库修复记录

> 与 `data/words/FIX_LOG.md` 同一套做法：每次写入源 Excel 前先备份，写完在这里留一条记录。
> 改完 Excel 仍须 `npm run collocations` 重新生成 JSON（真题链接在生成时由题库扫描回填，
> 不信任 Excel 的旧题号）。

## 2026-09-13 12:03 补录 1 条「解析明确搭配」（the majority of）

- 来源：Test 01 P5 Q110 的解析原文写着「the majority of...后应接名词或名词性短语」，题干为
  `The majority of the contract ------- that took place during the year were handled…`。
  搭配库当时只有 `majority vote standard`，解析真正考的这条没有卡片——该题只链到 `take place`。
- 做法：沿用既有 21 条 `解析明确搭配` 的填法，补进 `高频汇总` 第 903 行。初稿记在
  `explanation_additions.json`（中文/类型是模型初稿，尚未人工逐条核对）；优先级给 A
  （S 档是教材侧判断，补录条目不擅自占位）；频次列按同组条目填 D=1、P5=1、H=1。

  | 列 | 表达 | 中文 | 类型 | 词汇栏/解析 | P5 | P6 | P7 | 题册原文 | 优先级 | 来源位置 | 来源类型 |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | 903 | the majority of | ……中的大多数；大部分 | 商务/名词词块 | 1 | 1 | 0 | 0 | 1 | A | T01-P5-Q110 | 解析明确搭配 |

- 写入方式：**直接改写 xlsx 包内 `xl/worksheets/sheet2.xml`**（表尾追加 `<row r="903">` 并把
  `<dimension>` 从 `A1:K902` 改为 `A1:K903`），不用 openpyxl 保存——已核对改动前后 37 个包内
  部件里只有 `sheet2.xml` 的 sha256 变化，其余逐字节不变。
- 写入前的快照：提交 `b74cabd` 里的 `TOEIC_Reading_固定搭配与惯用法_最终版.xlsx`
  （sha256 `d024349c30c9…`，与当时的 `.bak` 逐字节一致）。本地 `.bak` 文件已在
  2026-09-13 备份清理中删除，需要时用
  `git show b74cabd:"TOEIC_Reading_固定搭配与惯用法_最终版.xlsx" > 快照.xlsx` 取回。
- 结果：搭配库 901 → 902 条；现有条目 id、顺序与 sources 零变动，总链接 5901 → 5902；
  题库扫描把新条目精确链到 reading-01（Test 01）P5 Q110。
- 自检：`uv run scripts/verify_collocations.py` 七类可疑项数量不变（新条目没有进零链接 /
  近似重复 / 链接虚高清单），`总条目：902`。
- 已知瑕疵：`AllPhrasesTable` 的 ref 仍是 `A1:K895`，与既有 25 条`词库关联补录`行一样落在
  表格范围之外；这是补录行沿用 `Excel 表尾追加` 的既有现象，不是本次引入的。

## 2026-09-13 16:54 补录自撰例句（172 条，代码改动）

- 范围：题库里一次都没出现（`sources` 为空）的 172 条搭配；有真题原句的 730 条不动
- 来源：**本批例句由 agent 直接撰写**（当时环境里没有 `DEEPSEEK_API_KEY`，跑不了
  `scripts/fill_collocation_examples.py` 的模型调用）。撰写规则与脚本 prompt 一致：商务/托业语境、
  一句、含该表达、占位符实例化；`example_fill.jsonl` 的 `model` 字段记为
  `dsh-agent (no API key; authored directly)`。想换成模型生成的版本：删掉该 JSONL 后
  `DEEPSEEK_API_KEY=... npm run examples`
- 校验：除仓库自检外，走了生成器自带的锚点校验（与题库同一套匹配器）——**172 条里 161 条通过**；
  11 条保留 ⚠️，原因是表达式自身含 `(= …)`、`+ clause`、`oneself`、`B A` 这类占位符/注解，
  校验器注定失手（逐条说明见 `data/collocations/EXAMPLE_FILL.md` 的「未过自动校验」一节）
- 写入：`高频汇总` 的 L/M/N 三列（例句 / 例句译文 / 例句备注），只改写 `xl/worksheets/sheet2.xml`；
  包内部件变化清单：`['xl/worksheets/sheet2.xml']`
- 备份：`TOEIC_Reading_固定搭配与惯用法_最终版.bak-20260913-165403.xlsx`（已被 `.gitignore` 排除）
- 结果：搭配库 902 条不变；`collocations.json` 里恰好 172 条多出 `example` / `exampleZh` /
  `exampleNote`，其余条目逐字段不变，真题链接 5902 条不变；学习卡开始显示例句块
- 复核方式：`data/collocations/EXAMPLE_FILL.md` 是 172 条的对照表（表达 / 释义 / 例句 / 译文 / 校验），
  逐条或抽查后在 Excel 里直接改即可，改完 `npm run collocations`
