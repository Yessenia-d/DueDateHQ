# 增加 CPA 成就页和账号菜单

## 目标

增加一个需要登录后访问的账号菜单和 CPA 成就页。账号菜单从当前用户信息区域点击打开，提供用户相关页面入口和登出操作，不挤占主工作导航。成就页用来总结当前 workspace 自 CPA 开始使用 DueDateHQ 以来累计产生的工作量，帮助 CPA 快速理解已经使用了多少天、录入了多少工作、完成了多少、还剩多少、平均每天处理多少，以及自己已经处理过的 states、tax categories、entity types 的能力版图。页面应该让 CPA 随着使用时间变长更有专业成就感，同时保持 DueDateHQ 审计友好、可信、克制的产品语气。

## 已知信息

* 用户希望为已登录 CPA 增加一个新的成就页。
* 用户希望点击 sidebar 用户信息区域时弹出 menu / popover。
* 用户菜单需要支持查看当前登录用户详情、Settings、Achievements、Log out。
* 菜单导航项应进入对应的 user / account settings pages。
* 剩余交互细节可以由实现方保守补充。
* 页面需要记录 CPA 开始使用 DueDateHQ 以来的使用时长。
* 页面需要展示一共使用了多少天，并说明今天是使用周期中的第几天。
* 页面需要展示已录入的 Deadline Tasks 和 Client Relationships 总数。
* 页面需要展示已完成任务、剩余任务，以及平均每天处理量。
* 用户希望 `demo-triage@duedatehq.test` 的测试数据更丰富，让成就页能看到更多有意义的 completed work 示例。
* 成就页需要增加 processed states、tax categories、entity types 的 breakdown。
* 用户建议在合适时使用环图 / donut charts。
* 期望情绪效果是 professional momentum：CPA 应该感觉自己越来越能处理更广、更复杂的 client book。
* DueDateHQ 是面向 solo / independent CPAs 的登录后产品界面。
* 设计方向是 `Verified Operations Console`：light-first、信息密度高、冷静、精确、audit-friendly。
* 页面应避免装饰性游戏化、confetti、紫色 SaaS 渐变、glassmorphism、过大的应用内 hero，以及营销式卡片网格。

## 仓库上下文

* 登录后 app layout 由 `apps/web/src/routes/__root.tsx` 负责。
* Sidebar navigation 由 `apps/web/src/components/app-sidebar.tsx` 负责。
* Sidebar 底部现有 user block 当前展示 firm name、email，以及一个直接 `Log out` button。
* 新交互需要移除独立 logout button，并把 `Log out` 作为 dropdown menu item。
* `packages/ui/src/components/dropdown-menu.tsx` 已提供基于 Base UI 的 dropdown menu primitives。
* 路由文件位于 `apps/web/src/routes/`；`/` 通过 `apps/web/src/routes/index.tsx` 映射到 dashboard。
* 现有 dashboard 统计来自 `packages/api/src/routers/dashboard.ts`。
* 现有 client list 计数来自 `packages/api/src/routers/clients.ts`。
* Triage test account 的 demo seed data 位于 `packages/api/src/lib/demo-seed.ts`，对应测试位于 `packages/api/src/lib/demo-seed.test.ts`。
* 数据库 schema 中同时存在 `firms.createdAt` 和 `auth_users.createdAt`。
* `auth.session` 当前序列化 user id、email、name、firm id、firm name、owner id，但不包含创建时间。
* 当存在 auth session 时，`createContext` 会调用 `ensureFirmForUser`，因此 solo / personal CPA 也会获得一个单人 firm workspace record。
* 如果某个 user 真的没有可解析的 firm record，现有 authenticated business surface 本身就无法加载，因为 `requireFirmSession` 会拒绝请求。
* Deadline Task statuses 是 `not_started`、`in_progress`、`waiting_on_client`、`done`。
* 现有 task summary 已经基于 firm-scoped Deadline Tasks 计算 total 和 done task counts。

## 假设

* MVP scope 以当前 firm workspace 作为成就统计边界，而不是跨 firm 的全局 user 历史。
* “已完成”表示 Deadline Task status 为 `done`。
* “剩余”表示总 Deadline Tasks 减去 done Deadline Tasks，包括 `not_started`、`in_progress`、`waiting_on_client`。
* “平均每天处理多少”表示 completed Deadline Tasks 除以 inclusive usage day。
* “Handled states”、“handled tax categories”、“handled entity types” 默认应基于 completed Deadline Tasks，除非某个指标明确说明基于 all entered tasks。
* 多州 filing profile 的 `states` array 中每个州都计入 state coverage；federal task 可贡献一个 `Federal` bucket。
* `Handled` 相关指标属于 work achievements，不属于 daily usage metrics。
* Usage-period、current day、total clients、total tasks、done、remaining、daily average 属于 daily / workspace usage metrics。
* UI 必须把日常 workspace usage 和 completed-work achievements 视觉上区分开。
* 使用起点采用 firm workspace 创建日期，因为 DueDateHQ 的核心业务边界是 `Firm -> Client Relationship -> Filing Profile -> Deadline Task`。
* 对 personal / solo CPA 来说，`Firm` 表示内部 workspace 和 ownership boundary，不一定表示现实中的多人事务所。
* UI 应优先使用 `workspace` 语义，避免让 solo CPA 误以为必须属于一个独立 firm entity。
* MVP 不应 fallback 到 `auth_users.createdAt`；缺失 firm workspace 是 bootstrap / session integrity 问题，不是另一个 personal-account mode。
* Achievement navigation 应从主 sidebar work / management sections 移到 account menu，因为它属于 account / workspace context，而不是日常 tax work。
* Account Profile 和 Settings pages 需要可用，但 MVP 可以是 read-only，除非现有 API 已支持安全更新。
* Logout 保持为即时 menu action，而不是 route，并且不再作为 sidebar 独立按钮出现。

## 产品和 UI 方向

* Register：product。
* 使用场景：CPA 在 filing season 的工作间隙打开该页面，获得一个事实型 progress readout。
* Theme：light-first、restrained product UI，并遵守 `DESIGN.md`。
* 语气：带有 professional progress 的精确 achievement ledger，而不是 playful badges。
* Layout concept：
  * Sidebar user block 变成 full-width account menu trigger，展示 firm / user summary，并带 chevron 或 menu affordance。
  * Dropdown menu 先展示 account identity，再展示 Profile、Settings、Achievements、Log out。
  * Log out 与导航项在视觉上分隔，例如使用 menu separator。
  * Account pages 位于 account / settings 区域，并使用一致的 page chrome。
  * Achievement page header 展示 workspace name、usage day、usage start date。
  * Daily usage section 包含 usage-period card、紧凑 usage metric strip、work balance、processing rate。
  * Work achievements section 只包含 completed-work capability metrics 和 breakdowns。
  * `Handled jurisdiction buckets`、`Handled tax categories`、`Handled entity types` 不应出现在 daily usage metric strip 中。
  * Capability map 区域把 handled states / jurisdictions、tax categories、entity types 作为 completed-work achievements 展示。
  * 可以用 donut / ring charts 表达紧凑分类 breakdown，但必须始终有 text labels 和 counts。
  * 增加一句 factual 的 professional momentum 文案，例如 `You have handled work across 8 states, 5 tax categories, and 6 entity types.` 避免夸张营销语。
  * 对 zero tasks 或 first-day usage 提供明确的 empty / early-use state。
  * Profile 和 Settings pages 在 MVP 中使用紧凑 read-only field groups，不优先使用 modal editing。
* 文案应保持具体，例如 `Day 12 of this DueDateHQ workspace` 和 `18 done, 42 remaining`。
* 避免让 solo CPA 感觉必须属于一个额外的 firm entity；有 firm name 时可以展示 firm name，但统计口径应表达为 workspace stats。

## 需求

* 增加一个 authenticated route 作为成就页。
* 将 sidebar 中直接展示用户和 logout 的区域替换为可点击 account menu trigger。
* Account menu 必须包含 current user details / Profile、Settings、Achievements、Log out。
* Profile、Settings、Achievements 菜单项必须导航到 authenticated account pages。
* Logout 必须保留在 account menu 中，并沿用现有 sign-out 行为。
* 必须移除原先独立的 sidebar `Log out` button。
* 除非实现约束需要临时 fallback，不要把 achievement page 加入主 Work 或 Management sidebar navigation。
* 页面必须是 firm-scoped，并要求 authenticated firm session。
* 增加 Profile page，展示当前登录用户 name、email、workspace identity。
* 增加 Settings page，表达 account / workspace settings context；如果没有安全 mutation API，MVP 可以 read-only。
* 展示 usage start date。
* 展示从 usage start date 到今天的 inclusive total days。
* 展示今天是同一个 inclusive day number。
* 使用 `firm.createdAt` 作为 usage start date。
* 展示 Client Relationships 总数。
* 展示 Deadline Tasks 总数。
* 展示 completed Deadline Tasks。
* 展示 remaining Deadline Tasks。
* 展示 average completed tasks per day，并四舍五入为可读的小数。
* 展示基于 completed work 的 handled states 数量。
* 展示基于 completed work 的 handled tax categories 数量。
* 展示基于 completed work 的 handled entity types 数量。
* 展示 handled states、tax categories、entity types 的 breakdown rows 或 charts。
* 页面至少清晰分成两个视觉组：
  * daily / workspace usage
  * completed-work achievements
* Handled-work summary metrics 必须放在 completed-work achievements 组内。
* Chart segments 必须具备 accessible labels 和可见 text equivalents；不能只依赖颜色。
* 使用 DueDateHQ semantic colors。Charts 可以使用克制的 full palette 做 data visualization，但必须避免 purple SaaS gradients、glass、decorative blobs。
* 扩展 `demo-triage@duedatehq.test` seed data，增加足够多跨 states、tax categories、entity types 的 completed Deadline Tasks，让成就页视觉上有内容。
* Demo seed tests 应断言 richer completed-work coverage 存在。
* 处理 zero tasks，避免除零错误或误导性的成功语言。
* 保证 status 和 metric labels 在 desktop 和 mobile 都可读。
* Menu trigger 和 menu items 必须支持 keyboard accessibility，并有 screen-reader labels。
* 使用现有 DueDateHQ design tokens 和 component patterns。

## 验收标准

* [ ] 已登录 CPA 可以点击用户信息区域打开 account menu。
* [ ] Account menu 展示 Profile、Settings、Achievements、Log out。
* [ ] Logout 作为 menu item 出现，而不是用户信息下方的独立按钮。
* [ ] Profile、Settings、Achievements 菜单项导航到 authenticated account pages。
* [ ] Log out 仍然可以登出并重定向到 login。
* [ ] 已登录 CPA 可以从 account menu 进入成就页。
* [ ] 页面只允许 authenticated firm session 访问。
* [ ] Profile 展示当前 user name、email、workspace identity。
* [ ] Settings page 存在，且除非已接入真实 API，否则不展示可编辑控件。
* [ ] 页面展示 usage start date、total usage days，以及 current usage day number。
* [ ] Usage start 基于 `firm.createdAt` 计算。
* [ ] 页面展示 total clients、total tasks、completed tasks、remaining tasks、average completed tasks per day。
* [ ] 页面展示基于 completed firm-scoped Deadline Tasks 的 handled states、tax categories、entity types。
* [ ] Handled states / jurisdictions、tax categories、entity types 视觉上归入 work achievements，而不是混在 daily usage metrics 中。
* [ ] Daily usage metrics 和 completed-work achievements 有明确不同的 headings 和 layout sections。
* [ ] Handled-state、tax-category、entity-type visualizations 具备 text labels / counts，且不只依赖颜色。
* [ ] `demo-triage@duedatehq.test` 拥有跨多个 states、tax categories、entity types 的 richer completed demo data。
* [ ] Demo seed tests 断言 richer completed-work coverage。
* [ ] 所有计数只来自 firm-scoped records。
* [ ] `done` tasks 计为 completed；所有非 done statuses 计为 remaining。
* [ ] 第一天使用显示 day `1`，不是 day `0`。
* [ ] zero-task state 明确，且不展示误导性的 average。
* [ ] 现有 dashboard 和 client flows 继续正常工作。
* [ ] API tests 覆盖 metric calculation。
* [ ] Sidebar / account menu interaction 在 desktop 和 mobile navigation sheet 中都可用。
* [ ] Frontend 使用 `DESIGN.md` 中既有 product visual system。

## 不在范围内

* 公开分享或可打印的 achievement reports。
* Badges、streaks、rankings、confetti 或社交游戏化。
* 暗示 legal / tax competence、guaranteed compliance 或 complete coverage 的说法。
* 完整可编辑账号管理，超出 routes 和安全 read-only account / workspace 信息的部分不在范围内。
* Team member management、billing、password management、email change 或 notification preferences。
* 历史 daily time series charts，除非无需新增表即可从现有数据可靠推导。
* 跨账号或 multi-firm aggregation。
* 在现有数据库记录之外新增 analytics events。

## 待确认问题

* 无。计时起点使用 Firm workspace 创建日期。Solo / personal CPA 通过单人 workspace 表达。Account Profile 和 Settings 可以补充为 read-only MVP pages，除非现有 API 让 mutation 明确安全。

## Definition Of Done

* 用户确认 PRD。
* `implement.jsonl` 和 `check.jsonl` 包含相关 spec context。
* Task status 移动到 `in_progress`。
* Implementation 由 Trellis implement agent 处理。
* Trellis check 验证 spec compliance、lint、typecheck 和 focused tests。
* Finish 阶段完成 spec update judgment。
