# 搭配自撰例句补录报告

- 模型：dsh-agent (no API key; authored directly)
- 目标：题库里没有用例（`sources` 为空）的搭配
- 已生成：172 条（有例句 172 / 其中未过自动校验 11 / 模型判为不成立 0 / 调用出错 0）

> 本报告供人工复核（回写前确认、或回写后抽查都行）；回写用
> `uv run scripts/apply_collocation_examples.py`（`npm run apply-examples`）。
> 「校验」列是脚本用题库那套锚点匹配复核的结果，未过不代表例句一定有错（占位符写法会让匹配器失手）。

| 表达 | 中文 | 例句 | 译文 | 校验 |
|---|---|---|---|---|
| `advances in` | ……方面的进步 | Recent advances in battery design have cut production costs sharply. | 电池设计方面的最新进步大幅降低了生产成本。 | ✅ |
| `air on the radio` | 通过电台播出 | The interview will air on the radio tonight at eight. | 这段采访今晚八点会在电台播出。 | ✅ |
| `arrange an interview` | 安排面试 | Our editor will arrange an interview with the new director. | 我们的编辑会安排一次对新总监的采访。 | ✅ |
| `associate with` | 与…有关；与…交往 | Customers associate this brand with reliable service. | 顾客把这个品牌与可靠的服务联系在一起。 | ✅ |
| `at no additional cost` | 没有额外费用 | Same-day delivery is available at no additional cost. | 当日送达不收取额外费用。 | ✅ |
| `at one’s fingertips` | 了如指掌的，精通的；近在手边的，随时可用的 | She keeps every client record at her fingertips. | 她随时都能查到每一位客户的记录。 | ✅ |
| `at sb.’s request` | 应某人的要求 | The meeting was moved at the manager’s request. | 会议应经理的要求改了时间。 | ✅ |
| `basis point` | 基点 | The yield fell by one basis point after the auction. | 拍卖后收益率下降了一个基点。 | ✅ |
| `be affiliated with` | 隶属于；与…有关联 | The clinic is affiliated with a major university hospital. | 这家诊所隶属于一所大型大学医院。 | ✅ |
| `be aimed at ~ing` | 旨在…；针对… | The campaign is aimed at attracting younger buyers. | 这场活动旨在吸引更年轻的买家。 | ✅ |
| `be comprised of` | 由…组成 | The committee is comprised of eight department heads. | 该委员会由八位部门负责人组成。 | ✅ |
| `be consistent with` | 与…一致；符合 | Your expenses must be consistent with company policy. | 你的开支必须符合公司政策。 | ✅ |
| `be designed to do` | 旨在做某事；被设计做某事 | The app is designed to simplify expense reports. | 这款应用旨在简化费用报销。 | ✅ |
| `be fully aware that` | 十分清楚；充分意识到 | We are fully aware that the schedule has changed. | 我们十分清楚日程已经改变。 | ✅ |
| `be honored with` | 被授予…的荣誉 | She was honored with the employee of the year award. | 她被授予年度最佳员工奖。 | ✅ |
| `be one’s treat` | 记在某人的账上，某人请客 | Lunch is my treat today, so order anything you like. | 今天午餐我请客，随便点。 | ✅ |
| `be out of proportion with` | 与…不相称，与…不成比例 | The reaction was out of proportion with the small mistake. | 这个反应与那个小错误并不相称。 | ✅ |
| `be supposed to` | 应该，应当 | The report is supposed to reach us by Friday. | 报告应该在周五前送到我们这里。 | ✅ |
| `be supposed to do` | 应该（做某事）；据说 | Staff are supposed to wear badges at all times. | 员工应该始终佩戴工牌。 | ✅ |
| `be sure + clause` | 确信……；务必……（表提醒/要求） | Be sure that all the windows are locked before leaving. | 离开前务必确认所有窗户都已锁好。 | ⚠️ 例句里没有按序出现：sure clause |
| `be sure of/about sth.` | 对某事有把握/确信 | Are you sure of the delivery date for the parts? | 你确定这些零件的交货日期吗？ | ⚠️ 例句里没有按序出现：sure of about |
| `beyond one’s control` | 超出某人的控制能力 | The flight delay was beyond our control. | 航班延误超出了我们的控制。 | ✅ |
| `boarding pass` | 登机牌 | Please have your boarding pass ready at the gate. | 请在登机口准备好登机牌。 | ✅ |
| `botanical garden` | 植物园 | The conference dinner will be held at the botanical garden. | 会议晚宴将在植物园举行。 | ✅ |
| `break down` | 损坏；分解，细分；情绪崩溃 | Printers break down most often when they are overloaded. | 打印机在超负荷时最容易出故障。 | ✅ |
| `bring... to one’s attention` | 使…引起某人的注意 | Please bring any billing errors to my attention. | 如有账单错误请提请我注意。 | ✅ |
| `business partnership` | 商业伙伴关系 | The two firms formed a business partnership last spring. | 两家公司去年春天建立了商业伙伴关系。 | ✅ |
| `canteen (= cafeteria)` | 食堂；自助餐厅 | The staff canteen, also called a cafeteria, serves hot meals. | 员工食堂也称作自助餐厅，供应热餐。 | ✅ |
| `car-manufacturer` | 汽车制造商 | A German car manufacturer will open a plant here. | 一家德国汽车制造商将在此建厂。 | ✅ |
| `cash advance` | 现金预付款 | He requested a cash advance before the business trip. | 他出差前申请了一笔现金预付款。 | ✅ |
| `change one’s mind` | 某人改 变主意 | The client changed his mind about the delivery date. | 客户改变了关于交货日期的想法。 | ✅ |
| `city slicker` | 精于城市生活却不熟悉农村的人（常含贬义） | The rancher teased the city slicker about his new boots. | 牧场主拿这位城里人的新靴子开玩笑。 | ✅ |
| `classified ad` | 分类广告 | They found the apartment through a classified ad. | 他们是通过分类广告找到这套公寓的。 | ✅ |
| `climate control` | 气候控制；温控系统 | Every guest room has individual climate control. | 每间客房都有独立的温控系统。 | ✅ |
| `commensurate with` | 与…相应的；相称的；同量的 | The salary is commensurate with experience and skills. | 薪资与经验和技能相称。 | ✅ |
| `comply with` | 遵守；符合 | All suppliers must comply with the new safety rules. | 所有供应商都必须遵守新的安全规定。 | ✅ |
| `confirmation call` | 确认电话 | We will make a confirmation call the day before your visit. | 我们会在您到访前一天打确认电话。 | ✅ |
| `credit line` | 信用额度 | The bank raised our credit line to fifty thousand dollars. | 银行把我们的信用额度提高到五万美元。 | ✅ |
| `credit notice (= credit note)` | 贷项凭单 (退货时发给的凭证，可换取等值的商品) | A credit notice, also called a credit note, lists returned goods. | 贷项凭单也叫贷项凭证，用于列明退回的货物。 | ✅ |
| `cross-share holding` | 相互持股 | The two automakers announced a cross-share holding agreement. | 两家汽车制造商宣布了相互持股协议。 | ✅ |
| `CV (=curriculum vitae)` | 简历 | Please attach your CV, or curriculum vitae, to the application. | 请把简历附在申请表后。 | ✅ |
| `days written notice` | 提前若干天递交的书面通知 | The lease requires thirty days written notice before moving out. | 租约要求搬出前提前三十天书面通知。 | ✅ |
| `decline in` | 在…方面的下降 | The decline in foot traffic worried the shop owners. | 客流量的下降让店主们担忧。 | ✅ |
| `dedicate one’s time and effort` | 奉献某人的时间和精力 | She dedicated her time and effort to the charity campaign. | 她把时间和精力投入到这场慈善活动中。 | ✅ |
| `Defense Secretary` | 国防部长 | The Defense Secretary toured the new research facility. | 国防部长参观了新的研究设施。 | ✅ |
| `delivery rates` | 运输费 | The courier raised its delivery rates last month. | 这家快递公司上个月提高了运费。 | ✅ |
| `departure time` | 出发时间；起飞时间 | Please check the departure time printed on your ticket. | 请核对票面上印的出发时间。 | ✅ |
| `difference between` | …之间的差异 | The report explains the difference between the two plans. | 报告解释了两个方案之间的差异。 | ✅ |
| `distinguish oneself` | 使自身杰出 | It is hard to distinguish oneself in a crowded market. | 在竞争激烈的市场中很难让自己脱颖而出。 | ✅ |
| `do a background check` | 做背景调查 | The agency will do a background check on every driver. | 公司会对每位司机做背景调查。 | ✅ |
| `do one’s job` | 运作；做好自己的工作 | The new engine does its job quietly and efficiently. | 新引擎安静高效地完成工作。 | ✅ |
| `drag out` | 拖延 | Do not drag out the negotiations any longer than necessary. | 不要让谈判不必要地拖延下去。 | ✅ |
| `expense allowance` | 费用津贴 | Managers receive a monthly expense allowance for travel. | 经理每月领取差旅费用津贴。 | ✅ |
| `expose...to any hazards` | 使…暴露在任何危险中 | The policy does not expose workers to any hazards. | 该政策不会让工人暴露在任何危险中。 | ✅ |
| `express cargo` | 特快货运 | The replacement parts arrived as express cargo. | 替换零件以特快货运方式送达。 | ✅ |
| `express mail` | 快件，快递 | Send the signed contract by express mail today. | 今天把签好的合同用快递寄出。 | ✅ |
| `express one’s faith in` | 表达某人对…的信任 | The board expressed its faith in the new chief executive. | 董事会对新任首席执行官表达了信任。 | ✅ |
| `express one’s interest in` | 表达某人在…方面的兴趣 | Several buyers expressed interest in the riverside property. | 有几位买家对河畔那处房产表达了兴趣。 | ✅ |
| `express one’s opinion on` | 就…发表 自己的意见 | Employees may express their opinion on the new policy. | 员工可以就新政策发表意见。 | ✅ |
| `ext.(=extension)` | 分机号码 | Dial ext. 245, the extension for the sales desk. | 请拨分机 245，销售台的分机号。 | ✅ |
| `extend one’s gratitude` | 表达某人的感激之情 | We extend our gratitude to everyone who helped. | 我们向所有提供帮助的人表达感激之情。 | ✅ |
| `extend one’s sincere condolence` | 致以诚挚的哀悼 | The company extends its sincere condolence to his family. | 公司向他的家人致以诚挚的哀悼。 | ✅ |
| `flight attendant` | 乘务员 | The flight attendant offered extra blankets to passengers. | 乘务员为乘客提供了额外的毯子。 | ✅ |
| `get on the path to` | 开始走上…的道路；着手实现… | She got on the path to management through the internship. | 她通过实习走上了管理岗位的道路。 | ✅ |
| `get one’s hands on sth.` | 得到某物；找到某物；弄到手 | We must get our hands on the original invoice. | 我们必须拿到原始发票。 | ✅ |
| `go out of one’s way` | 尽心尽力地，不怕麻烦地 | The staff went out of their way to help us. | 员工们不怕麻烦地帮助我们。 | ✅ |
| `government policy` | 政府政策 | The tax change follows a new government policy. | 这项税收调整依据的是新的政府政策。 | ✅ |
| `hand-deliver` | 专人递 送，亲手递送 | We will hand-deliver the invitation to his office. | 我们会把请柬专人送到他的办公室。 | ✅ |
| `hard cost` | 直接成本；硬成本 | The project's hard cost rose by ten percent. | 该项目的直接成本上涨了百分之十。 | ✅ |
| `have a further discussion on` | 进一步讨论… | Let us have a further discussion on the budget tomorrow. | 我们明天再进一步讨论预算。 | ✅ |
| `hip-hop` | 嘻哈音乐；嘻哈文化 | The festival features hip-hop and jazz performances. | 音乐节有嘻哈和爵士表演。 | ✅ |
| `hold sth. against sb.` | 因某事对某人 怀恨在心 | I hope you will not hold this mistake against me. | 希望你不要因这个失误对我怀恨在心。 | ✅ |
| `in a(n) ... fashion` | 以…方式 | She answered every question in a professional fashion. | 她以专业的方式回答了每个问题。 | ✅ |
| `in celebration of` | 为庆祝… | The office closed early in celebration of the anniversary. | 公司提前下班以庆祝周年纪念。 | ✅ |
| `in close proximity` | 极其接近 | The hotel is in close proximity to the airport. | 这家酒店离机场非常近。 | ✅ |
| `in general terms` | 概括地，笼统地 | Describe the project in general terms, without figures. | 请概括地描述这个项目，不要列数字。 | ✅ |
| `in one’s defense` | 为某人辩护 | In his defense, the deadline was extremely tight. | 为他辩护地说，截止期限非常紧。 | ✅ |
| `in relation to` | 关于，涉及；与…相比 | Please clarify the budget in relation to the new timeline. | 请结合新时间表说明预算。 | ✅ |
| `in the foreseeable future(=in the near future)` | 在可以预见的未来，在不久 的将来 | We expect no further increases in the foreseeable future, that is, in the near future. | 我们预计在可预见的未来不会再有涨价。 | ✅ |
| `inbound shipment` | 运入的货物；进港/到货的装运 | The inbound shipment was delayed at customs. | 运入的货物在海关被延误。 | ✅ |
| `instant player` | 即开型彩票玩家 | Every instant player hoped to win the grand prize. | 每位即开型彩票玩家都希望中大奖。 | ✅ |
| `interior fitting` | 室内装修 | The interior fitting of the new office took six weeks. | 新办公室的室内装修花了六周。 | ✅ |
| `international banking law` | 国际银行法 | She specializes in international banking law. | 她专攻国际银行法。 | ✅ |
| `investing technique` | 投资技术 | Diversification remains a sound investing technique. | 分散投资仍是一种稳健的投资技巧。 | ✅ |
| `job applicant` | 求职者 | Each job applicant must submit two references. | 每位求职者都必须提交两份推荐信。 | ✅ |
| `job rotation` | 岗位轮换，工作轮换 | The company uses job rotation to train new managers. | 公司用岗位轮换来培养新经理。 | ✅ |
| `keep the ball rolling` | 继续某事 | A short follow-up call will keep the ball rolling. | 一个简短的回访电话能让事情继续推进。 | ✅ |
| `keep/break faith with sth.` | 对……守信/失信 | The firm keeps faith with its long-term suppliers. | 该公司对长期供应商守信。 | ⚠️ 例句里没有按序出现：break faith with |
| `keyless entry system` | 无钥匙出入系统 | The building installed a keyless entry system last year. | 这栋楼去年安装了无钥匙出入系统。 | ✅ |
| `lay off` | 解雇 | The plant had to lay off twenty workers. | 工厂不得不解雇二十名工人。 | ✅ |
| `lay out` | 制定；布置，陈列；花费；详细说明 | Please lay out the payment options clearly in the brochure. | 请在手册中清楚列出各种付款方式。 | ✅ |
| `lead actor` | 主演；主角演员 | The lead actor arrived late for the rehearsal. | 主演排练迟到了。 | ✅ |
| `leave behind` | 留下；忘带；把...抛在后面；超过 | Please do not leave behind any personal items. | 请不要留下任何个人物品。 | ✅ |
| `legal representative` | 法定代理人 | Please sign in the presence of your legal representative. | 请在您的法定代理人在场时签字。 | ✅ |
| `loads of (=a load of)` | 大量，许多 | There were loads of applications, and a load of them arrived late. | 申请很多，其中一大批是迟交的。 | ✅ |
| `lose no time` | 不失时机，抓紧时间 | Please lose no time in confirming your attendance. | 请抓紧时间确认您是否出席。 | ✅ |
| `lose oneself in` | 沉浸于，专心致志于，对…入迷 | It is easy to lose oneself in routine tasks. | 人很容易沉浸在日常事务中。 | ✅ |
| `make a move` | 采取行动；出发，动身 | We should make a move before the market changes. | 我们应该在市场变化前采取行动。 | ✅ |
| `make a request` | 提出要求 | Guests may make a request for a late checkout. | 客人可以要求延迟退房。 | ✅ |
| `make one’s debut` | 某人首次亮相 | The singer made her debut at a charity gala. | 这位歌手在一场慈善晚会上首次亮相。 | ✅ |
| `make one’s mark` | 成名，崭露头角，留下印记 | He made his mark in the insurance industry. | 他在保险业崭露头角。 | ✅ |
| `make one’s way to` | 去；前往；前进 | Guests can make their way to the terrace for coffee. | 客人可以前往露台喝咖啡。 | ✅ |
| `make up one’s mind` | 下定决心 | She has made up her mind to accept the offer. | 她已下决心接受这份录用通知。 | ✅ |
| `meet one’s goal` | 达到某人的目标 | The team meets its sales goal every quarter. | 团队每个季度都达成销售目标。 | ✅ |
| `meet the strict requirements` | 满足严格的要求 | The new lab meets the strict requirements for certification. | 新实验室满足认证的严格要求。 | ✅ |
| `mention + that-clause` | 提到/说明…… | She mentioned that the invoice was already paid. | 她提到那张发票已经付过了。 | ⚠️ 例句里没有按序出现：that clause |
| `miss the boat/bus` | 错失良机 | If we hesitate, we will miss the boat on this opportunity. | 如果我们犹豫，就会错失这次机会。 | ⚠️ 例句里没有按序出现：the boat bus |
| `mutual fund` | 共同基金 | She invests in a low-cost mutual fund. | 她投资于一只低成本的共同基金。 | ✅ |
| `neither...nor...` | 既不……也不…… | Neither the manager nor the staff were informed. | 经理和员工都没有被告知。 | ✅ |
| `next to impossible(= almost impossible)` | 几乎不可能 | Meeting the deadline now seems next to impossible, almost impossible in fact. | 现在赶上截止期限几乎不可能。 | ✅ |
| `no strings attached` | 无附带条件 | The grant comes with no strings attached. | 这笔资助没有附带条件。 | ✅ |
| `offer B A` | 给B提供A | They offered the client a generous discount. | 他们向客户提供了大幅折扣。 | ⚠️ 没有可校验的实词锚点 |
| `on one’s own` | 独立地，独自地 | She handled the entire audit on her own. | 她独立完成了整场审计。 | ✅ |
| `opening remark` | 开场白 | Her opening remark put everyone at ease. | 她的开场白让大家放松下来。 | ✅ |
| `operating method` | 操作方法 | The manual describes the standard operating method. | 手册说明了标准操作方法。 | ✅ |
| `outstanding loan` | 未偿贷款 | The company repaid its outstanding loan ahead of schedule. | 公司提前偿还了未偿贷款。 | ✅ |
| `pace oneself` | 调整自己的节奏，为自己定好速度 | One must pace oneself during a full day of negotiations. | 一整天的谈判中必须调整好自己的节奏。 | ✅ |
| `parking permit sticker` | 停车许可证贴纸 | Display the parking permit sticker on the windshield. | 请把停车许可证贴纸贴在挡风玻璃上。 | ✅ |
| `part-time student` | 非全日制学生 | As a part-time student, he works during the day. | 作为非全日制学生，他白天上班。 | ✅ |
| `pet dislike` | 特别讨厌的事物 | Long meetings are her pet dislike. | 冗长的会议是她特别讨厌的事。 | ✅ |
| `place an emphasis on` | 强调，将重点放在…上 | The training places an emphasis on clear writing. | 培训强调清晰的写作。 | ✅ |
| `pride oneself on` | 以…为荣；因…感到自豪 | The hotel prides itself on its attentive service. | 这家酒店以细致的服务为荣。 | ⚠️ 例句里没有按序出现：oneself on |
| `production cost` | 生产成本 | Production cost fell after the equipment upgrade. | 设备升级后生产成本下降了。 | ✅ |
| `production line worker` | 生产线工人 | Every production line worker received safety training. | 每位生产线工人都接受了安全培训。 | ✅ |
| `property tax` | 财产税；房产税 | Property tax is due at the end of the quarter. | 房产税在季度末到期缴纳。 | ✅ |
| `R&D` | 研发 | She works in R&D at a medical device company. | 她在一家医疗器械公司做研发。 | ⚠️ 该表达剥掉占位符后不足两个锚点，无法自动校验 |
| `R&D Department` | 研发部门 | He was promoted to head of the R&D Department. | 他被提升为研发部门负责人。 | ⚠️ 没有可校验的实词锚点 |
| `R&D Department (Research and Development Department)` | 研发部 | She transferred to the R&D Department (Research and Development Department) in March. | 她三月份调到了研发部。 | ✅ |
| `raise one’s glass` | 举杯祝酒；举杯敬酒 | Let us raise our glass to the new partnership. | 让我们举杯庆祝新的合作关系。 | ✅ |
| `raise the eyebrow` | 竖起眉毛 (表示惊讶或不满) | His unusually low bid raised the eyebrow of the procurement team. | 他异常低的报价让采购团队竖起了眉毛。 | ✅ |
| `rallying point` | 聚集点；号召力 | The new café became a rallying point for local artists. | 这家新咖啡馆成了本地艺术家的聚集点。 | ✅ |
| `receive rave reviews` | 受到好评，受到极力赞美 | The new bistro received rave reviews from local critics. | 这家新餐厅受到本地评论家的极力赞美。 | ✅ |
| `recreational vehicle` | 房车；休闲车；野营车 | They rented a recreational vehicle for the site visit. | 他们租了一辆房车去现场考察。 | ✅ |
| `regular client` | 常客，老主顾 | She has been a regular client of the firm for years. | 她多年来一直是这家公司的老主顾。 | ✅ |
| `rent...to` | 将…租给 | They rent the spare space to a startup. | 他们把多余的空间租给一家初创公司。 | ✅ |
| `research position` | 研究型职位 | He applied for a research position at the institute. | 他申请了该研究所的研究型职位。 | ✅ |
| `RSVP(Respondez s’il vous plait)` | 请 回复 | Please RSVP (Respondez s’il vous plait) by Friday so we can confirm seats. | 请在周五前回复，以便我们确认座位。 | ✅ |
| `run short of` | 缺少/快用完 | We are running short of printer paper again. | 我们的打印纸又快用完了。 | ✅ |
| `sales lead` | 销售线索；潜在客户 | The website inquiry became a promising sales lead. | 网站上的咨询变成了一条有希望的销售线索。 | ✅ |
| `sales receipt` | 销售凭据，购物小票 | Keep the sales receipt for your records. | 请保留销售小票以备查。 | ✅ |
| `security guard` | 保安 | A security guard checked our badges at the gate. | 保安在门口检查了我们的工牌。 | ✅ |
| `settle a conflict` | 解决冲突 | The manager helped settle a conflict between two teams. | 经理帮忙解决了两个团队之间的冲突。 | ✅ |
| `settle a dispute` | 解决争端 | The two firms hired a mediator to settle a dispute over fees. | 两家公司聘请调解人来解决费用争端。 | ✅ |
| `settle a lawsuit` | 和解诉讼；庭外解决诉讼 | The supplier chose to settle a lawsuit rather than go to trial. | 供应商选择庭外和解而不是上法庭。 | ✅ |
| `sew up` | 敲定（交易）；垄断（市场） | They hope to sew up the deal before lunch. | 他们希望在午饭前敲定这笔交易。 | ✅ |
| `specialty store` | 专卖店；专门商店 | The specialty store sells imported teas. | 这家专卖店销售进口茶叶。 | ✅ |
| `spick-and-span` | 极干净整洁的；崭新的 | The lobby was spick-and-span before the inspection. | 检查前大堂一尘不染。 | ✅ |
| `spot sb. ~ing` | 看到或注意到某人正在做某事 | A guard spotted him leaving the warehouse early. | 一名保安看到他提前离开仓库。 | ⚠️ 没有可校验的实词锚点 |
| `stake-holder` | 利益相关者 | Every stakeholder was invited to comment on the merger. | 每位利益相关者都被邀请对合并发表意见。 | ⚠️ 例句里没有按序出现：holder |
| `state one’s opinion` | 陈述某人的观点；表达某人的看法 | Please state your opinion before we vote. | 请在表决前陈述你的观点。 | ✅ |
| `suit one’s needs` | 符合某人的需求 | The smaller model suits our needs better. | 较小的型号更符合我们的需求。 | ✅ |
| `take steps` | 采取步骤，采取措施 | The city will take steps to reduce downtown traffic. | 该市将采取措施减少市中心的车流。 | ✅ |
| `take up residence` | 定居；开始居住 | The new manager will take up residence in the city next month. | 新经理下个月将在这座城市定居。 | ✅ |
| `talent spotter` | 星探；猎头；人才发掘者 | The agency sent a talent spotter to the design fair. | 该机构派了一名星探去设计展。 | ✅ |
| `tax audit` | 税务审计；税务稽查 | The firm survived a lengthy tax audit. | 这家公司经历了一次漫长的税务审计。 | ✅ |
| `tax cut` | 减税 | The proposed tax cut would help small businesses. | 拟议的减税将有助于小企业。 | ✅ |
| `terminate one’s employment` | 终止雇佣关系 | The company terminated his employment last week. | 公司上周终止了对他的雇佣。 | ✅ |
| `the elderly` | 老人 | The city offers free bus rides to the elderly. | 该市为老人提供免费公交。 | ✅ |
| `the king of kings` | 王中之王 | The title the king of kings was once reserved for emperors. | “王中之王”这一称号曾专属于皇帝。 | ✅ |
| `to a great extent` | 在很大程度上 | Our results depend to a great extent on repeat customers. | 我们的业绩很大程度上依赖回头客。 | ✅ |
| `traffic accident` | 交通事故，车祸 | A traffic accident closed two lanes this morning. | 今天早上一起交通事故封闭了两条车道。 | ✅ |
| `transportation cost` | 运输成本 | Transportation cost accounts for a fifth of the budget. | 运输成本占预算的五分之一。 | ✅ |
| `turn out to be` | 结果是…，证明是… | The delay turned out to be a customs issue. | 这次延误原来是海关问题。 | ✅ |
| `under no obligation to do` | 没有义务做某事 | You are under no obligation to accept the offer. | 你没有义务接受这个报价。 | ✅ |
| `under one’s supervision` | 在某人的管理下；在某人的监督下 | All repairs were done under her supervision. | 所有维修都在她的监督下完成。 | ✅ |
| `under-report` | 少报(收入、人口等) | Some tenants under-report their income on purpose. | 有些租户故意少报收入。 | ✅ |
| `upcoming (= forthcoming)` | 即将来临的，即将发生的 | The upcoming (forthcoming) trade fair will keep us busy next month. | 即将到来的展会会让我们下个月很忙。 | ✅ |
| `volunteer one’s time` | 志愿贡献时间（常指无偿） | Many retirees volunteer their time at the shelter. | 许多退休人员在收容站志愿贡献时间。 | ✅ |
| `vow to do` | 发誓做某事，郑重承诺做某事 | They vow to deliver within five days. | 他们承诺五天内交货。 | ✅ |
| `waterproof clothing` | 防水衣 | Bring waterproof clothing for the site visit. | 现场考察请带防水衣物。 | ✅ |
| `wrap up` | 完成；结束 | Let us wrap up the meeting by noon. | 我们在中午前结束会议吧。 | ✅ |
| `writing skill` | 写作技巧 | Clear writing skill matters in client reports. | 在客户报告中，清晰的写作技巧很重要。 | ✅ |

## 未过自动校验（请重点看这几条）

- `be sure + clause`：例句里没有按序出现：sure clause
  - 例句：Be sure that all the windows are locked before leaving.
  - 说明：表达式含 + clause 占位符，校验器会标 ⚠️
- `be sure of/about sth.`：例句里没有按序出现：sure of about
  - 例句：Are you sure of the delivery date for the parts?
  - 说明：表达式含 of/about 两种写法，校验器会标 ⚠️
- `keep/break faith with sth.`：例句里没有按序出现：break faith with
  - 例句：The firm keeps faith with its long-term suppliers.
  - 说明：表达式含 keep/break 两种写法，校验器会标 ⚠️
- `mention + that-clause`：例句里没有按序出现：that clause
  - 例句：She mentioned that the invoice was already paid.
  - 说明：表达式含 + that-clause 占位符，校验器会标 ⚠️
- `miss the boat/bus`：例句里没有按序出现：the boat bus
  - 例句：If we hesitate, we will miss the boat on this opportunity.
  - 说明：表达式含 boat/bus 两种写法，校验器会标 ⚠️
- `offer B A`：没有可校验的实词锚点
  - 例句：They offered the client a generous discount.
  - 说明：表达式为 B/A 占位语序，校验器会标 ⚠️
- `pride oneself on`：例句里没有按序出现：oneself on
  - 例句：The hotel prides itself on its attentive service.
  - 说明：表达式用 oneself 作占位符，自然例句用反身代词，校验器会标 ⚠️
- `R&D`：该表达剥掉占位符后不足两个锚点，无法自动校验
  - 例句：She works in R&D at a medical device company.
  - 说明：表达只有 R&D，剥掉单字母占位符后无锚点，校验器会标 ⚠️
- `R&D Department`：没有可校验的实词锚点
  - 例句：He was promoted to head of the R&D Department.
  - 说明：表达含 R&D，剥掉单字母占位符后锚点不足，校验器会标 ⚠️
- `spot sb. ~ing`：没有可校验的实词锚点
  - 例句：A guard spotted him leaving the warehouse early.
  - 说明：表达式含 sb. ~ing 占位符，校验器会标 ⚠️
- `stake-holder`：例句里没有按序出现：holder
  - 例句：Every stakeholder was invited to comment on the merger.
  - 说明：表达写作 stake-holder，例句用标准的 stakeholders，校验器会标 ⚠️
