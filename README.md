# TOEIC 阅读 Web 练习项目

这是一个面向个人使用的托业阅读（Part 5/6/7）局域网 Web 练习应用，不是完整的 Listening & Reading 平台。它把阅读模拟题数字化，支持闭卷模拟、复盘、错因标记和间隔复测。

## 交付范围

- 10 套阅读模拟，每套 100 题，共 1000 题；
- 练习模式：逐题作答、即时查看答案和解析；
- 模拟模式：75 分钟闭卷计时，提交后服务端判分；
- 首次成绩锁定，并标记是否为未见题样本；
- 复盘：标记 G/V/S/E/T/A/L/K 主错因和备注；
- 复测：错题按 D+2 / D+7 / D+21 排期；
- 搭配库：902 条固定搭配，可按 Part、类型、优先级和频次筛选；
- 词库：重点 1500、TSL1250、NGSL2809 三份词表，单词支持收藏；
- 每周汇总：从 SQLite 读取做题数据，供人工查看；
- 局域网部署：监听 `0.0.0.0`，不对公网开放。

听力 Part 1–4、音频播放、8 周每日任务和多用户认证不属于当前 Web 交付范围。听力原始资料由 Hermes 训练目录保存，不代表当前 Web 已支持听力。

## 首次安装与启动

开发环境需要 Node.js 18.17+、Python 3.11+ 和能够编译 `better-sqlite3` 的本地构建工具。只有重新生成搭配库或词库时才需要 `uv`；只有重新从 PDF 生成文本缓存时才需要 Poppler 的 `pdftotext`。

首次启动：

```bash
npm install
npm run dev
```

`npm run dev` 会监听 `0.0.0.0:3000`，并打印本机和局域网访问地址。使用同一局域网中的手机或电脑访问打印出的局域网地址即可。如果 3000 端口被占用，可以指定端口：

```bash
PORT=3001 npm run dev
```

首次启动后，应用会自动创建 `data/app.db`，用于保存当前机器上的作答、复盘、复测和收藏状态。题库 JSON 不会被运行时修改。

生产构建和启动：

```bash
npm run build
npm start
```

`npm start` 只能在构建成功后使用；如需指定端口，可执行 `PORT=3001 npm start`。本项目只适合个人或可信局域网使用，不建议直接暴露到公网。

验证代码和题库提取脚本：

```bash
npm test
npm run py-test
```

## 日常使用流程

### 1. 选择套题

打开首页的“做套题”，进入“套题”列表后选择 Test 01–10。每套题包含 Part 5（30 题）、Part 6（16 题）和 Part 7（54 题），共 100 题。

### 2. 练习模式

“练习模式”适合学习、查答案和复盘：逐题作答后立即显示对错与解析。它不产生正式的首次成绩，但打开过题目会将套题标记为“已见题”。练习模式适合用于熟悉题目、复测错题或学习解析，不适合作为闭卷成绩。

### 3. 75 分钟模拟模式

“模拟模式”适合记录正式的首次成绩：

1. 开始后计时 75 分钟，提交前不会显示答案和解析；
2. 可以提交已作答和未作答的题目，服务端在提交后统一判分；
3. 每套题的首次模拟成绩会锁定，之后的练习和重做不会覆盖它；
4. 如果中途离开而没有提交，不会产生正式成绩，但套题会被标记为“已见题”；
5. 只有开始前没有看过题目的模拟，才会标记为“未见题样本”。

### 4. 复盘与错因标记

完成首次模拟后，在套题详情页进入“复盘错题”。可以查看首次作答、正确答案和解析，并为错题标记一个主错因：

- `G`：语法知识；`V`：词汇/搭配；`S`：句法解析；
- `E`：证据定位；`T`：时间/策略；`A`：注意/操作；
- `L`：听觉加工；`K`：材料问题。

可以同时填写备注。错题标记后会自动进入复测排期。

### 5. 复测

打开“复测”查看到期题目。到期题目需要回到对应套题的练习模式中重做，完成后在复测列表记录“对”或“错”。同一道错题最多按 D+2、D+7、D+21 三个阶段排期，复测结果不修改首次模拟成绩。

### 6. 搭配、单词和收藏夹

- “学搭配”：按 Part、类型、优先级和频次筛选固定搭配，进入详情后可查看关联题目并收藏；
- “背单词”：按重点 1500、TSL1250、NGSL2809 浏览词表，支持搜索、筛选和收藏；
- “搭配收藏”和“单词收藏”：集中查看已收藏内容；
- “每周汇总”：查看套题进度、正确率、错因分布和复测统计。

收藏和作答记录只保存在本机的 SQLite 数据库中，不会同步到 Hermes 或其他目录。

## 作答数据的备份与重置

运行数据位于 `data/app.db`。应用使用 SQLite WAL 模式运行，因此备份或迁移前应先停止 Web 服务，并一并处理存在的 `data/app.db-wal`、`data/app.db-shm` 文件。不要把这些运行状态文件当作题库复制到 Hermes。

如需从零开始练习：

1. 停止 Web 服务；
2. 先备份 `data/app.db*`；
3. 删除或移走 `data/app.db`、`data/app.db-wal`、`data/app.db-shm`；
4. 重新启动应用，系统会自动创建空数据库。

题库和词库在 `data/questions/`、`data/collocations/`、`data/words/` 中，不会因为重置作答数据而丢失。

## 目录说明

```text
app/                 Next.js 页面和 API
components/          客户端交互组件
lib/domain/          纯领域模型与判分/排期/题目投影
lib/application/     作答、复盘、复测和收藏用例
lib/content/         静态题库、搭配库和词库读取
lib/adapters/sqlite/ SQLite 动态数据持久化适配层
data/questions/      阅读题库 JSON，只读
data/collocations/   搭配库 JSON，只读
data/words/          词库 JSON，只读
data/app.db          运行时 SQLite 记录，首次运行自动创建
resources/           阅读原始教材
scripts/             题库/词库生成、校验和启动脚本
docs/adr/            Web 数据层和部署架构决策
```

`data/questions/`、`data/collocations/` 和 `data/words/` 是静态源数据；`data/app.db` 只保存本机作答状态，不应当作为题库或交付数据复制到其他训练系统。

## 数据生成与题库校验

阅读题库由阅读 PDF 的文本缓存生成。当前项目保留阅读 PDF 和提取所需的文本缓存；如果缓存需要重建，可执行：

```bash
pdftotext -layout -enc UTF-8 \
  resources/source-books/阅读全真模拟1000题.pdf \
  .cache/material-index/reading.txt
npm run extract
python3 scripts/verify_question_bank.py
```

题库提取脚本实际读取 `.cache/material-index/reading.txt`，所以原始 PDF 和该缓存都应保留。

`verify_question_bank.py` 会生成 `data/questions/VERIFICATION.md`，其中列出每套题需要人工抽查的题目。必须将这些题目与纸质书逐题核对，确认题号、题干、选项和答案无误后，才可以执行：

```bash
python3 scripts/verify_question_bank.py --apply
```

`--apply` 会把所有题库文件的 `verified` 标记设为 `true`，不能在没有人工核对的情况下直接执行。

搭配库和词库由项目根目录的 Excel 源文件生成：

```bash
npm run collocations
npm run words
npm run verify-words   # 词库结构自检，生成 data/words/VERIFICATION.md
```

搭配库的真题关联来自题库扫描，不直接信任 Excel 中的旧题号；因此更新搭配库时应同时保留题库 JSON 和生成脚本。手工补录的条目（例如从题目解析里补的搭配）先写进 `data/collocations/*_additions.json` 作为初稿，改完 Excel 后在 `data/collocations/FIX_LOG.md` 留一条记录，写法与词库一致；源 Excel 含公式，同样只能用直接改写包内 sheet XML 的方式写入。

真题页会给每条搭配显示「原句」——从题库现算，填空题把横线补成正确答案、阅读题定位搭配所在的那一句（`lib/domain/collocation-example.ts`），只在套题已揭示时显示。题库里一次都没出现的搭配（当前 172 条）看不到原句，走自撰例句补录：

```bash
npm run examples -- --dry-run                 # 只打印样例 prompt
DEEPSEEK_API_KEY=... npm run examples         # 生成例句 + 译文，断点续跑
npm run examples -- --report-only             # 只重生成 EXAMPLE_FILL.md
npm run apply-examples -- --dry-run           # 看将回写哪些行
npm run apply-examples                        # 人工确认后回写 Excel 三列
npm run collocations                          # 重新生成 JSON
```

`fill_collocation_examples.py` 只挑 `sources` 为空的条目，结果写 `data/collocations/example_fill.jsonl` 与复核报告 `EXAMPLE_FILL.md`（含脚本用题库那套锚点匹配做的自动校验）；`apply_collocation_examples.py` 写入 `高频汇总` 的 `例句 / 例句译文 / 例句备注` 三列，写前备份、只改写 `xl/worksheets/sheet2.xml`、并在 `data/collocations/FIX_LOG.md` 追加记录。方案与验收标准见 `.scratch/collocation-examples/spec.md`。

`npm run verify-words` 只读，按九类问题（词条碎片、同形重复、释义域标签、释义过长、释义缺失、字段缺失、题库词频列、级别一致性、关联搭配）列出可疑条目，供人工对照 `单词本.xlsx` 逐条核对；它不提供 `--apply`，也不会修改任何数据。词频列的复算只是线索：`单词本.xlsx` 的 `题库总次数` 等列没有随仓库保留生成脚本。

词库释义的深度审查（对齐搭配库那次审计）分三步，前两步只读：

```bash
# 1. 结构自检 -> data/words/VERIFICATION.md
npm run verify-words

# 2. LLM 释义审查 -> data/words/llm_review.jsonl + data/words/LLM_REVIEW.md
#    需要 DEEPSEEK_API_KEY；按单词去重后审 4059 个唯一单词，可断点续跑
DEEPSEEK_API_KEY=... uv run scripts/review_words_llm.py --limit 20   # 试跑
DEEPSEEK_API_KEY=... uv run scripts/review_words_llm.py              # 全量

# 3. 人工确认 LLM_REVIEW.md 后回写 Excel（写入前自动备份）
uv run scripts/apply_word_fixes.py --from-llm
uv run scripts/apply_word_fixes.py --plan data/words/fix_plan.json --dry-run
uv run scripts/apply_word_fixes.py --plan data/words/fix_plan.json
npm run words
```

`review_words_llm.py` 会把每条单词的当前释义、英文简释和题库真实例句一起发给模型，结果只作建议；`apply_word_fixes.py` 只有在计划经人工确认后才会改 Excel，且每次写入都会先备份成 `单词本.bak-*.xlsx`，并把这一次改了什么追加到 `data/words/FIX_LOG.md`。

补齐缺字段（音标 / 英文简释）走同一条管线：

```bash
DEEPSEEK_API_KEY=... uv run scripts/fill_word_gaps.py     # -> gap_fill.jsonl + gap_fix_plan.json
uv run scripts/apply_word_fixes.py --plan data/words/gap_fix_plan.json
npm run words
```

注意两点：写回 Excel 用的是**直接改写 xlsx 包内 sheet XML**，不是 openpyxl 保存——`单词本.xlsx` 的 `序号` / `综合分` / `推荐级别` 是公式，openpyxl 重新保存会丢掉公式缓存值，`level` 和 `compositeScore` 会整列变空。另外词库的 `id` 由 `extract_words.py` 的 `assign_ids()` 统一分配：先做 ASCII 折叠（`résumé → resume-2`），再保证同一词表内唯一、同一单词跨词表一致。

如果同时更新了原始 PDF、题库或 Excel，建议按以下顺序重建：

```bash
pdftotext -layout -enc UTF-8 \
  resources/source-books/阅读全真模拟1000题.pdf \
  .cache/material-index/reading.txt
npm run extract
python3 scripts/verify_question_bank.py
# 人工完成 VERIFICATION.md 的抽查后
python3 scripts/verify_question_bank.py --apply
npm run collocations
npm run words
npm run verify-words
```

重新生成会覆盖静态 JSON，开始前应确认已有数据已备份，并避免在有其他人使用 Web 应用时更新题库。

## 常见问题

- **局域网设备打不开**：确认设备与运行 Web 的电脑在同一局域网，并检查操作系统防火墙是否放行对应端口。
- **`npm start` 失败**：先执行 `npm run build`，生产启动不能替代构建。
- **`better-sqlite3` 安装失败**：补齐 Node.js 原生模块编译工具后重新执行 `npm install`。
- **页面显示“未校验”**：对应题库 JSON 的 `verified` 仍为 `false`，需要完成 `data/questions/VERIFICATION.md` 的人工抽查。
- **修改 Excel 后数据没有变化**：重新执行 `npm run collocations` 或 `npm run words`，运行中的 Web 服务通常需要重启才能读取新的静态数据。
- **找不到旧的每日任务或 8 周计划**：这些内容属于 Hermes 训练目录，不属于当前 Web 应用。

## 关键规则

1. 首次闭卷模拟前不展示答案、解析或听力原文。
2. 复盘和重做不能覆盖首次成绩。
3. 没有合法换算表时，只报告正确率、完成率、未答数和趋势，不自行换算 TOEIC 量表分。
4. Web 写 SQLite；不自动写入外部学习计划或进度 Markdown。
5. 题库内容来自受版权保护的教材，只在本机或可信局域网使用，不做公网部署。

领域术语见 [CONTEXT.md](./CONTEXT.md)，架构决策见 [docs/adr/](./docs/adr/)。Hermes 的训练资料、每日任务和答案隔离规则不属于当前 Web 项目。
