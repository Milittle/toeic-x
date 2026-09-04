# 作答会话由应用模块统一持有不变式

作答会话横跨页面、API、SQLite 和静态题库，不能由 Route Handler 分别拼接写入。`lib/application/attempts.ts` 作为深模块统一负责：

- 练习或模拟开始时创建 attempt，并把套题状态提升为“已见题”；
- 以数据库中的 `attempt_id` 解析套题、模式和开始时间，不信任客户端重复提交这些字段；
- 服务端根据只读题库判定正确性，客户端只提交选择；
- 模拟提交的答案、首次成绩锁定、错题复测排期和状态更新在同一 SQLite 事务中完成；
- 重复提交返回已持久化的结果，不覆盖首次成绩。

## 文件边界

`lib/domain/` 只放不依赖 Node/SQLite 的领域规则和类型；`lib/content/` 负责静态内容加载；`lib/application/` 编排用户用例并暴露稳定入口；`lib/adapters/sqlite/` 负责 SQLite schema、迁移和底层读写。页面和 API 只依赖 application/content/domain，不直接依赖 SQLite 适配器。

此边界是有意的最小分层：不引入通用 Repository、Ports 或服务容器。当前应用是单用户局域网工具，只有在出现第二种持久化实现或明确的跨用例事务需求时，才重新评估更重的抽象。
