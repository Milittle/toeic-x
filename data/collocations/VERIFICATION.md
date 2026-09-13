# 搭配库校验清单

> 只读自检，逐类列出可疑条目供人工核对。核对后修改 Excel `高频汇总`，
> 再 `npm run collocations` 重新生成；真题链接用 `uv run scripts/collocation_sources.py` 重扫。

| 检查项 | 数量 |
|---|---|
| A 表达列为碎片/垃圾 | 0 |
| B 表达带括号/等号注解 | 12 |
| C 释义段落泄漏 | 0 |
| D 释义碎片/截断 | 2 |
| E 近似重复（精确归一化） | 5 |
| E 近似重复（前缀关系，展示 ≤80） | 35 |
| F 零真题链接 | 172 |
| G 链接虚高 (>40) | 19 |
| 字段缺失（释义/类型/优先级为空） | 0 |

总条目：902

## A. 表达列为碎片/垃圾（列对齐错乱，需删除或修复）

_无_

## B. 表达带括号/等号注解（决定是否剥离「见另」注解）

| 表达 | 释义 | 类型 | 优先级 | 链接 | Excel 行 |
|---|---|---|---|---|---|
| `canteen (= cafeteria)` | 食堂；自助餐厅 | 商务/名词词块 | A | 0 | 223 |
| `credit notice (= credit note)` | 贷项凭单 (退货时发给的凭证，可换取等值的商品) | 商务/名词词块 | A | 0 | 559 |
| `CV (=curriculum vitae)` | 简历 | 商务/名词词块 | B | 0 | 724 |
| `ext.(=extension)` | 分机号码 | 商务/名词词块 | A | 0 | 573 |
| `in a(n) ... fashion` | 以…方式 | 句型/结构 | B | 0 | 830 |
| `in the foreseeable future(=in the near future)` | 在可以预见的未来，在不久 的将来 | 介词/连接短语 | B | 0 | 748 |
| `loads of (=a load of)` | 大量，许多 | 商务/名词词块 | A | 0 | 473 |
| `next to impossible(= almost impossible)` | 几乎不可能 | 商务/名词词块 | A | 0 | 331 |
| `R&D Department (Research and Development Department)` | 研发部 | 商务/名词词块 | S | 0 | 147 |
| `RSVP(Respondez s’il vous plait)` | 请 回复 | 商务/名词词块 | A | 0 | 645 |
| `run low (on sth.)` | （某物）快用完，即将耗尽 | 句型/结构 | B | 5 | 861 |
| `upcoming (= forthcoming)` | 即将来临的，即将发生的 | 商务/名词词块 | S | 0 | 62 |

## C. 释义段落泄漏（正文被并进释义，>30 字）

_无_

## D. 释义碎片/截断（以「表示/和/包括/以及」开头、含「；be」或过短）

| 表达 | 释义 | 类型 | 优先级 | 链接 | Excel 行 |
|---|---|---|---|---|---|
| `as well as B` | 和；以及；除…之外（还） | 介词/连接短语 | A | 62 | 192 |
| `settle a lawsuit` | 和解诉讼；庭外解决诉讼 | 商务/名词词块 | B | 0 | 772 |

## E. 近似重复

### 精确归一化后相同（仅空格/标点差异）

  `follow up`（跟进，对…采取进一步行动；后续行动；后…）　`follow-up`（后续行动，后续事物）

  `full- time`（全职的）　`full-time`（全职的）

  `not only... but also...`（不仅…，而且…）　`not only...but also...`（不仅……而且……）

  `state-of-the- art`（最先进的）　`state-of-the-art`（最先进的）

  `toll free`（免费电话的；拨打免费的）　`toll-free`（（电话）免费的；免长途费的）

### 前缀关系（一者是另一者的省略形式，人工判断是否保留两条）

- `R&D` ⊂ `R&D Department`（研发 / 研发部门）
- `R&D` ⊂ `R&D Department (Research and Development Department)`（研发 / 研发部）
- `get to...` ⊂ `get together`（到达某地；开始做；有机会做 / 见面；碰头；聚会）
- `as well` ⊂ `as well as B`（也；同样 / 和；以及；除…之外（还））
- `in case` ⊂ `in case of`（以防；万一；假如 / 万一，如果发生）
- `make it` ⊂ `make it big`（成功做到；及时到达 / 飞黄腾达，发财致富；获得成功）
- `show up` ⊂ `show up to work`（出 现，露面 / 上班）
- `tax cut` ⊂ `tax cuts`（减税 / 减税）
- `ahead of` ⊂ `ahead of time`（领先于…；在…之前 / 提前）
- `ahead of` ⊂ `ahead of schedule`（领先于…；在…之前 / 提前）
- `at first` ⊂ `at first sight`（起初；最初 / 初看上去，乍一看）
- `check-in` ⊂ `checking account`（（酒店）入住登记；（机场）值机 / 支票账户）
- `fill out` ⊂ `fill out the form`（填写 / 填表）
- `look for` ⊂ `look forward to`（寻找 / 期待，盼望）
- `look for` ⊂ `look forward to doing sth.`（寻找 / 期待做某事）
- `as soon as` ⊂ `as soon as possible`（一…就… / 尽快）
- `at no cost` ⊂ `at no cost to sb.`（不花钱，免费 / 某 人不花一分钱）
- `be sure of` ⊂ `be sure of/about sth.`（对…有把握，确信… / 对某事有把握/确信）
- `part-time` ⊂ `part-time student`（兼职的；部分时间的；兼职地 / 非全日制学生）
- `result in` ⊂ `result in... being p.p.`（导致，引起 / 导致/使得…被…）
- `in addition` ⊂ `in addition to`（除此之外 / 除…之外（还），加之；另外）
- `well-versed` ⊂ `well versed in`（熟 知的，通晓的 / 通晓…，精通…）
- `have faith in` ⊂ `have faith in sth.`（对…有信心，相信… / 对……有信心/信任）
- `be expected to` ⊂ `be expected to do`（预计会；被期望 / 被期望做某事；预计会做某事）
- `be required to` ⊂ `be required to do`（被要求做某事 / 被要求做某事）
- `be supposed to` ⊂ `be supposed to do`（应该，应当 / 应该（做某事）；据说）
- `R&D Department` ⊂ `R&D Department (Research and Development Department)`（研发部门 / 研发部）
- `be committed to` ⊂ `be committed to doing`（致力于… / 致力于做某事）
- `look forward to` ⊂ `look forward to doing sth.`（期待，盼望 / 期待做某事）
- `be familiar with` ⊂ `be familiar with sth.`（熟悉… / 通晓某事，熟悉某事）
- `climate control` ⊂ `climate-controlled`（气候控制；温控系统 / 温控的；恒温恒湿的）
- `get in touch with` ⊂ `get in touch with sb.`（与…联系 / 与某人取得联系）
- `production line` ⊂ `production line worker`（生产线 / 生产线工人）
- `take advantage of` ⊂ `take advantage of sth.`（利用；占（某人）便宜 / 利用某物）
- `customer satisfaction` ⊂ `customer satisfaction survey`（客户满意度 / 顾客满意度调查）

## F. 零真题链接（未匹配到任何题目，需人工确认）

| 表达 | 释义 | 类型 | 优先级 | 链接 | Excel 行 |
|---|---|---|---|---|---|
| `advances in` | ……方面的进步 | 商务/名词词块 | A | 0 | 184 |
| `air on the radio` | 通过电台播出 | 商务/名词词块 | B | 0 | 699 |
| `arrange an interview` | 安排面试 | 动词搭配 | B | 0 | 700 |
| `associate with` | 与…有关；与…交往 | 商务/名词词块 | B | 0 | 702 |
| `at no additional cost` | 没有额外费用 | 介词/连接短语 | B | 0 | 703 |
| `at one’s fingertips` | 了如指掌的，精通的；近在手边的，随时可用的 | 句型/结构 | S | 0 | 93 |
| `at sb.’s request` | 应某人的要求 | 句型/结构 | B | 0 | 788 |
| `basis point` | 基点 | 商务/名词词块 | B | 0 | 704 |
| `be affiliated with` | 隶属于；与…有关联 | be + 补语/介词 | B | 0 | 706 |
| `be aimed at ~ing` | 旨在…；针对… | be + 补语/介词 | A | 0 | 197 |
| `be comprised of` | 由…组成 | be + 补语/介词 | B | 0 | 696 |
| `be consistent with` | 与…一致；符合 | be + 补语/介词 | A | 0 | 902 |
| `be designed to do` | 旨在做某事；被设计做某事 | be + 补语/介词 | A | 0 | 202 |
| `be fully aware that` | 十分清楚；充分意识到 | be + 补语/介词 | B | 0 | 711 |
| `be honored with` | 被授予…的荣誉 | be + 补语/介词 | B | 0 | 712 |
| `be one’s treat` | 记在某人的账上，某人请客 | 句型/结构 | B | 0 | 795 |
| `be out of proportion with` | 与…不相称，与…不成比例 | be + 补语/介词 | A | 0 | 212 |
| `be supposed to` | 应该，应当 | be + 补语/介词 | B | 0 | 798 |
| `be supposed to do` | 应该（做某事）；据说 | be + 补语/介词 | A | 0 | 215 |
| `be sure + clause` | 确信……；务必……（表提醒/要求） | 句型/结构 | A | 0 | 216 |
| `be sure of/about sth.` | 对某事有把握/确信 | 句型/结构 | A | 0 | 217 |
| `beyond one’s control` | 超出某人的控制能力 | 句型/结构 | A | 0 | 219 |
| `boarding pass` | 登机牌 | 商务/名词词块 | B | 0 | 718 |
| `botanical garden` | 植物园 | 商务/名词词块 | B | 0 | 800 |
| `break down` | 损坏；分解，细分；情绪崩溃 | 商务/名词词块 | B | 0 | 802 |
| `bring... to one’s attention` | 使…引起某人的注意 | 句型/结构 | B | 0 | 803 |
| `business partnership` | 商业伙伴关系 | 商务/名词词块 | B | 0 | 719 |
| `canteen (= cafeteria)` | 食堂；自助餐厅 | 商务/名词词块 | A | 0 | 223 |
| `car-manufacturer` | 汽车制造商 | 商务/名词词块 | A | 0 | 224 |
| `cash advance` | 现金预付款 | 商务/名词词块 | B | 0 | 804 |
| `change one’s mind` | 某人改 变主意 | 句型/结构 | B | 0 | 806 |
| `city slicker` | 精于城市生活却不熟悉农村的人（常含贬义） | 商务/名词词块 | B | 0 | 808 |
| `classified ad` | 分类广告 | 商务/名词词块 | A | 0 | 552 |
| `climate control` | 气候控制；温控系统 | 商务/名词词块 | B | 0 | 721 |
| `commensurate with` | 与…相应的；相称的；同量的 | 商务/名词词块 | A | 0 | 229 |
| `comply with` | 遵守；符合 | 短语动词/动词+介词 | A | 0 | 881 |
| `confirmation call` | 确认电话 | 商务/名词词块 | A | 0 | 233 |
| `credit line` | 信用额度 | 商务/名词词块 | B | 0 | 811 |
| `credit notice (= credit note)` | 贷项凭单 (退货时发给的凭证，可换取等值的商品) | 商务/名词词块 | A | 0 | 559 |
| `cross-share holding` | 相互持股 | 商务/名词词块 | B | 0 | 812 |
| `CV (=curriculum vitae)` | 简历 | 商务/名词词块 | B | 0 | 724 |
| `days written notice` | 提前若干天递交的书面通知 | 商务/名词词块 | A | 0 | 240 |
| `decline in` | 在…方面的下降 | 商务/名词词块 | A | 0 | 899 |
| `dedicate one’s time and effort` | 奉献某人的时间和精力 | 句型/结构 | B | 0 | 725 |
| `Defense Secretary` | 国防部长 | 商务/名词词块 | A | 0 | 242 |
| `delivery rates` | 运输费 | 商务/名词词块 | B | 0 | 726 |
| `departure time` | 出发时间；起飞时间 | 商务/名词词块 | B | 0 | 727 |
| `difference between` | …之间的差异 | 商务/名词词块 | A | 0 | 883 |
| `distinguish oneself` | 使自身杰出 | 商务/名词词块 | A | 0 | 244 |
| `do a background check` | 做背景调查 | 动词搭配 | B | 0 | 728 |
| `do one’s job` | 运作；做好自己的工作 | 句型/结构 | B | 0 | 729 |
| `drag out` | 拖延 | 商务/名词词块 | B | 0 | 813 |
| `expense allowance` | 费用津贴 | 商务/名词词块 | A | 0 | 250 |
| `expose...to any hazards` | 使…暴露在任何危险中 | 句型/结构 | B | 0 | 731 |
| `express cargo` | 特快货运 | 动词搭配 | B | 0 | 732 |
| `express mail` | 快件，快递 | 动词搭配 | B | 0 | 816 |
| `express one’s faith in` | 表达某人对…的信任 | 句型/结构 | A | 0 | 252 |
| `express one’s interest in` | 表达某人在…方面的兴趣 | 句型/结构 | B | 0 | 733 |
| `express one’s opinion on` | 就…发表 自己的意见 | 句型/结构 | B | 0 | 734 |
| `ext.(=extension)` | 分机号码 | 商务/名词词块 | A | 0 | 573 |
| `extend one’s gratitude` | 表达某人的感激之情 | 句型/结构 | B | 0 | 735 |
| `extend one’s sincere condolence` | 致以诚挚的哀悼 | 句型/结构 | A | 0 | 253 |
| `flight attendant` | 乘务员 | 商务/名词词块 | B | 0 | 736 |
| `get on the path to` | 开始走上…的道路；着手实现… | 短语动词/动词+介词 | B | 0 | 739 |
| `get one’s hands on sth.` | 得到某物；找到某物；弄到手 | 句型/结构 | B | 0 | 820 |
| `go out of one’s way` | 尽心尽力地，不怕麻烦地 | 句型/结构 | B | 0 | 742 |
| `government policy` | 政府政策 | 商务/名词词块 | A | 0 | 259 |
| `hand-deliver` | 专人递 送，亲手递送 | 商务/名词词块 | B | 0 | 824 |
| `hard cost` | 直接成本；硬成本 | 商务/名词词块 | B | 0 | 825 |
| `have a further discussion on` | 进一步讨论… | 动词搭配 | B | 0 | 743 |
| `hip-hop` | 嘻哈音乐；嘻哈文化 | 商务/名词词块 | B | 0 | 827 |
| `hold sth. against sb.` | 因某事对某人 怀恨在心 | 句型/结构 | B | 0 | 828 |
| `in a(n) ... fashion` | 以…方式 | 句型/结构 | B | 0 | 830 |
| `in celebration of` | 为庆祝… | 介词/连接短语 | A | 0 | 276 |
| `in close proximity` | 极其接近 | 介词/连接短语 | B | 0 | 747 |
| `in general terms` | 概括地，笼统地 | 介词/连接短语 | A | 0 | 277 |
| `in one’s defense` | 为某人辩护 | 句型/结构 | A | 0 | 278 |
| `in relation to` | 关于，涉及；与…相比 | 介词/连接短语 | A | 0 | 281 |
| `in the foreseeable future(=in the near future)` | 在可以预见的未来，在不久 的将来 | 介词/连接短语 | B | 0 | 748 |
| `inbound shipment` | 运入的货物；进港/到货的装运 | 商务/名词词块 | B | 0 | 831 |
| `instant player` | 即开型彩票玩家 | 商务/名词词块 | A | 0 | 468 |
| `interior fitting` | 室内装修 | 商务/名词词块 | A | 0 | 290 |
| `international banking law` | 国际银行法 | 商务/名词词块 | A | 0 | 291 |
| `investing technique` | 投资技术 | 商务/名词词块 | B | 0 | 749 |
| `job applicant` | 求职者 | 商务/名词词块 | A | 0 | 293 |
| `job rotation` | 岗位轮换，工作轮换 | 商务/名词词块 | A | 0 | 294 |
| `keep the ball rolling` | 继续某事 | 动词搭配 | B | 0 | 752 |
| `keep/break faith with sth.` | 对……守信/失信 | 句型/结构 | A | 0 | 296 |
| `keyless entry system` | 无钥匙出入系统 | 商务/名词词块 | A | 0 | 297 |
| `lay off` | 解雇 | 商务/名词词块 | B | 0 | 833 |
| `lay out` | 制定；布置，陈列；花费；详细说明 | 商务/名词词块 | A | 0 | 300 |
| `lead actor` | 主演；主角演员 | 动词搭配 | B | 0 | 753 |
| `leave behind` | 留下；忘带；把...抛在后面；超过 | 动词搭配 | B | 0 | 834 |
| `legal representative` | 法定代理人 | 商务/名词词块 | B | 0 | 835 |
| `loads of (=a load of)` | 大量，许多 | 商务/名词词块 | A | 0 | 473 |
| `lose no time` | 不失时机，抓紧时间 | 商务/名词词块 | A | 0 | 307 |
| `lose oneself in` | 沉浸于，专心致志于，对…入迷 | 商务/名词词块 | B | 0 | 757 |
| `make a move` | 采取行动；出发，动身 | 动词搭配 | B | 0 | 841 |
| `make a request` | 提出要求 | 动词搭配 | A | 0 | 314 |
| `make one’s debut` | 某人首次亮相 | 句型/结构 | B | 0 | 760 |
| `make one’s mark` | 成名，崭露头角，留下印记 | 句型/结构 | A | 0 | 316 |
| `make one’s way to` | 去；前往；前进 | 句型/结构 | A | 0 | 317 |
| `make up one’s mind` | 下定决心 | 句型/结构 | A | 0 | 318 |
| `meet one’s goal` | 达到某人的目标 | 句型/结构 | A | 0 | 322 |
| `meet the strict requirements` | 满足严格的要求 | 动词搭配 | A | 0 | 323 |
| `mention + that-clause` | 提到/说明…… | 句型/结构 | A | 0 | 324 |
| `miss the boat/bus` | 错失良机 | 商务/名词词块 | B | 0 | 844 |
| `mutual fund` | 共同基金 | 商务/名词词块 | B | 0 | 845 |
| `neither...nor...` | 既不……也不…… | 并列/句型结构 | A | 0 | 330 |
| `next to impossible(= almost impossible)` | 几乎不可能 | 商务/名词词块 | A | 0 | 331 |
| `no strings attached` | 无附带条件 | 商务/名词词块 | B | 0 | 846 |
| `offer B A` | 给B提供A | 动词搭配 | A | 0 | 336 |
| `on one’s own` | 独立地，独自地 | 句型/结构 | A | 0 | 339 |
| `opening remark` | 开场白 | 商务/名词词块 | A | 0 | 340 |
| `operating method` | 操作方法 | 商务/名词词块 | A | 0 | 341 |
| `outstanding loan` | 未偿贷款 | 商务/名词词块 | B | 0 | 849 |
| `pace oneself` | 调整自己的节奏，为自己定好速度 | 商务/名词词块 | B | 0 | 761 |
| `parking permit sticker` | 停车许可证贴纸 | 商务/名词词块 | B | 0 | 762 |
| `part-time student` | 非全日制学生 | 商务/名词词块 | A | 0 | 345 |
| `pet dislike` | 特别讨厌的事物 | 商务/名词词块 | B | 0 | 763 |
| `place an emphasis on` | 强调，将重点放在…上 | 动词搭配 | A | 0 | 347 |
| `pride oneself on` | 以…为荣；因…感到自豪 | 商务/名词词块 | A | 0 | 351 |
| `production cost` | 生产成本 | 商务/名词词块 | A | 0 | 352 |
| `production line worker` | 生产线工人 | 商务/名词词块 | A | 0 | 354 |
| `property tax` | 财产税；房产税 | 商务/名词词块 | B | 0 | 853 |
| `R&D` | 研发 | 商务/名词词块 | B | 0 | 855 |
| `R&D Department` | 研发部门 | 商务/名词词块 | S | 0 | 146 |
| `R&D Department (Research and Development Department)` | 研发部 | 商务/名词词块 | S | 0 | 147 |
| `raise one’s glass` | 举杯祝酒；举杯敬酒 | 句型/结构 | B | 0 | 765 |
| `raise the eyebrow` | 竖起眉毛 (表示惊讶或不满) | 动词搭配 | B | 0 | 856 |
| `rallying point` | 聚集点；号召力 | 商务/名词词块 | A | 0 | 359 |
| `receive rave reviews` | 受到好评，受到极力赞美 | 动词搭配 | A | 0 | 361 |
| `recreational vehicle` | 房车；休闲车；野营车 | 商务/名词词块 | A | 0 | 362 |
| `regular client` | 常客，老主顾 | 商务/名词词块 | A | 0 | 363 |
| `rent...to` | 将…租给 | 句型/结构 | B | 0 | 858 |
| `research position` | 研究型职位 | 商务/名词词块 | A | 0 | 364 |
| `RSVP(Respondez s’il vous plait)` | 请 回复 | 商务/名词词块 | A | 0 | 645 |
| `run short of` | 缺少/快用完 | 动词搭配 | A | 0 | 368 |
| `sales lead` | 销售线索；潜在客户 | 商务/名词词块 | B | 0 | 769 |
| `sales receipt` | 销售凭据，购物小票 | 商务/名词词块 | A | 0 | 372 |
| `security guard` | 保安 | 商务/名词词块 | B | 0 | 862 |
| `settle a conflict` | 解决冲突 | 商务/名词词块 | B | 0 | 770 |
| `settle a dispute` | 解决争端 | 商务/名词词块 | B | 0 | 771 |
| `settle a lawsuit` | 和解诉讼；庭外解决诉讼 | 商务/名词词块 | B | 0 | 772 |
| `sew up` | 敲定（交易）；垄断（市场） | 商务/名词词块 | B | 0 | 864 |
| `specialty store` | 专卖店；专门商店 | 商务/名词词块 | A | 0 | 380 |
| `spick-and-span` | 极干净整洁的；崭新的 | 商务/名词词块 | A | 0 | 660 |
| `spot sb. ~ing` | 看到或注意到某人正在做某事 | 句型/结构 | B | 0 | 775 |
| `stake-holder` | 利益相关者 | 商务/名词词块 | A | 0 | 382 |
| `state one’s opinion` | 陈述某人的观点；表达某人的看法 | 句型/结构 | A | 0 | 383 |
| `suit one’s needs` | 符合某人的需求 | 句型/结构 | B | 0 | 776 |
| `take steps` | 采取步骤，采取措施 | 动词搭配 | B | 0 | 778 |
| `take up residence` | 定居；开始居住 | 短语动词/动词+介词 | B | 0 | 780 |
| `talent spotter` | 星探；猎头；人才发掘者 | 商务/名词词块 | A | 0 | 388 |
| `tax audit` | 税务审计；税务稽查 | 商务/名词词块 | A | 0 | 389 |
| `tax cut` | 减税 | 商务/名词词块 | A | 0 | 390 |
| `terminate one’s employment` | 终止雇佣关系 | 句型/结构 | A | 0 | 395 |
| `the elderly` | 老人 | 商务/名词词块 | B | 0 | 871 |
| `the king of kings` | 王中之王 | 商务/名词词块 | B | 0 | 782 |
| `to a great extent` | 在很大程度上 | 商务/名词词块 | A | 0 | 397 |
| `traffic accident` | 交通事故，车祸 | 商务/名词词块 | A | 0 | 401 |
| `transportation cost` | 运输成本 | 商务/名词词块 | A | 0 | 402 |
| `turn out to be` | 结果是…，证明是… | 短语动词/动词+介词 | B | 0 | 783 |
| `under no obligation to do` | 没有义务做某事 | 介词/连接短语 | A | 0 | 404 |
| `under one’s supervision` | 在某人的管理下；在某人的监督下 | 句型/结构 | B | 0 | 784 |
| `under-report` | 少报(收入、人口等) | 介词/连接短语 | B | 0 | 785 |
| `upcoming (= forthcoming)` | 即将来临的，即将发生的 | 商务/名词词块 | S | 0 | 62 |
| `volunteer one’s time` | 志愿贡献时间（常指无偿） | 句型/结构 | A | 0 | 409 |
| `vow to do` | 发誓做某事，郑重承诺做某事 | 商务/名词词块 | A | 0 | 230 |
| `waterproof clothing` | 防水衣 | 商务/名词词块 | B | 0 | 875 |
| `wrap up` | 完成；结束 | 商务/名词词块 | A | 0 | 180 |
| `writing skill` | 写作技巧 | 商务/名词词块 | A | 0 | 415 |

## G. 链接虚高（>40 处，常见词过度匹配的假阳性排查）

| 表达 | 释义 | 类型 | 优先级 | 链接 | Excel 行 |
|---|---|---|---|---|---|
| `access to` | 使用或进入…的权利（机会） | 商务/名词词块 | A | 43 | 889 |
| `according to` | 根据 | 介词/连接短语 | S | 62 | 63 |
| `as well` | 也；同样 | 介词/连接短语 | S | 94 | 113 |
| `as well as B` | 和；以及；除…之外（还） | 介词/连接短语 | A | 62 | 192 |
| `at least` | 至少；无论如何 | 介词/连接短语 | S | 46 | 5 |
| `due to` | 由于…，归因于… | 介词/连接短语 | S | 65 | 7 |
| `e-mail` | 电子邮件 | 商务/名词词块 | S | 116 | 123 |
| `from... to...` | 从…到… | 句型/结构 | B | 89 | 738 |
| `get to...` | 到达某地；开始做；有机会做 | 短语动词/动词+介词 | S | 62 | 52 |
| `in addition` | 除此之外 | 介词/连接短语 | S | 41 | 92 |
| `in case` | 以防；万一；假如 | 介词/连接短语 | S | 43 | 54 |
| `invite... to...` | 邀请…做某事 | 句型/结构 | B | 49 | 750 |
| `let A know B` | 让A知道B | 动词搭配 | B | 72 | 755 |
| `look forward to` | 期待，盼望 | 动词搭配 | S | 63 | 31 |
| `look forward to doing sth.` | 期待做某事 | 句型/结构 | A | 63 | 306 |
| `look to` | 指望，依靠；展望，关注 | 短语动词/动词+介词 | B | 69 | 756 |
| `pick up` | 取回；获得；学习；接人；外卖自取 | 商务/名词词块 | S | 41 | 64 |
| `thank A for B` | 因B而感谢A | 动词搭配 | A | 110 | 886 |
| `would like to do` | 愿意/意欲做某事 | 商务/名词词块 | A | 60 | 165 |
