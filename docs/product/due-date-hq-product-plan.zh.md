# DueDateHQ 产品方案

## 产品定位

DueDateHQ 是面向 solo/independent CPA 的税务截止日期操作系统，服务对象是管理混合个人与小企业客户的税务专业人士。

它替代分散的 Excel、日历、人工州税局网站检查和不确定的截止日期笔记，提供：

- 面向 supported federal/state sources 的透明义务覆盖库。
- 可追溯的截止日期证据。
- CSV 和手动客户 onboarding。
- dashboard triage 工作台。
- 官方来源变化的核验工作流。

产品承诺：

```txt
Know what is due, why it is due, and whether the source is verified.
知道什么到期、为什么到期，以及来源是否已核验。
```

## 竞品 Parity 与 Better 目标

DueDateHQ 不应该只是零散借鉴 File In Time 的几个想法。对于 CPA due-date operations 的核心流程，Beta 规划目标是在税务专业人士已经理解的工作流上做到 parity 或更好，然后用 verified source evidence、source monitoring、rule versioning 和 cloud workflow 做出改进。

| Workflow area | File In Time baseline | DueDateHQ Beta direction |
|---|---|---|
| Client setup | Client records 包含税务相关字段、notes、client/entity type、jurisdiction context，并支持 manual/import paths | 覆盖安排截止日期所需的实用 filing/tax profile fields，并在数据层建模 `Client relationship -> Filing/Tax profile -> Deadline task`；主 UI 使用 CPA 友好词汇，避免内部 tax-subject jargon |
| CSV import | Delimited-file preview、header handling、drag/drop mapping、commit 前 review、duplicate resolution | 通过 TaxDome、Drake、Karbon、QuickBooks 来源专属 client/profile adapters 做得更好，在字段存在或可高置信推断时自动识别 client name/EIN/state/entity type，提供非阻塞 review suggestions、CPA-confirmed relationship suggestions，并处理 duplicates |
| Obligation/service setup | Services 定义 work type、frequency、due dates 和 extension dates | 将 services 映射为 tax obligations 和 verified tax rules，同时区分 known、verified、needs-review、unsupported 和 user-provided items |
| Task generation | 将 services 分配给 clients 来创建 due-date tasks | 只有 Verified rules 生成官方任务；unsupported 或 needs-review obligations 可见，但不能伪装成官方截止日期 |
| Dashboard triage | Task view 可以过滤到 this week | 默认提供一等公民的 `逾期`、`本周到期`、`本月预警`、`长期计划` 分区，登录后 30 秒内看到所有本周工作，并以 5 分钟完成分诊为目标 |
| Filters and sorting | Date、client、type、service、status、key person 和 saved views | 覆盖 horizon、client、jurisdiction/state、form/obligation type、entity type、tax type、task status、verification status 核心过滤；advanced saved views 可以后置 |
| Task status | Status codes、dates、notes、extension flag | 用 `Not started`、`进行中` (`In progress`)、`Waiting on client`、`已完成` (`Done`) 覆盖简单工作进度状态，并附带从 date events 派生的 `Extended` badge，使延期与工作状态独立 |
| Extensions and date changes | Service-supported extension dates 和 extension state | 跟踪 current due date、original due date、可选 firm target date，以及 official extensions、official relief/change、user-provided adjustments 和 firm target changes 的 date event history；extension form printing 不进入 Beta；dashboard 只显示 current due date，date history 在 evidence drawer 中 |
| Recurrence/upcoming tasks | 手动 rollover 创建下一周期任务 | 由维护过的 Verified rules 生成 upcoming official tasks，official recurring deadlines 不需要手动 rollover |
| Exports | Excel/task view export 和 printed reports | 支持实用 dashboard/task export，用于 workload sharing 和 review；不做 Crystal Reports-style builders |
| Bulk operations | Batch status、due date、target date、extension 和 notes changes | 支持轻量 bulk task status updates、firm target date updates 和 current-filter export；不支持 bulk official due-date edits |
| Reminders/urgency | Startup reminder 和 due today/this week/month 的 calendar counts | 先做 dashboard 内 due today、this week、this month urgency surfaces；外部 email/SMS/calendar reminders 后置 |
| Admin/settings | Desktop database tools、backups、network users、rights、display options | 云端数据库操作不暴露给用户，Beta settings 只保留 account/workflow clarity |

DueDateHQ 必须更好的地方：

- 官方任务展示 source evidence、verification status、source last checked/changed times 和 rule version。
- Source monitoring 会创建透明的 `Source changed` review 工作，而不是静默信任过期 bundled dates。
- Rule publishing 需要人工批准后才能成为 `Verified`。
- Source-specific CSV adapters 比通用 delimited-file importer 减少手工 mapping。
- Official recurring deadlines 来自维护过的规则，而不是用户手动 rollover。
- Unsupported、needs-review、source-changed 和 user-provided items 可见，但不能被表现为 verified official deadlines。
- 用户不需要管理 desktop installs、shared database files、check/optimize tools 或 backup/restore screens。

桌面时代功能在 Beta 阶段排除，只有后续明确重新排序时才重新评估：

- Local database administration、multiple database files、backup/restore UI 和 network workstation maintenance。
- Crystal Reports-style reports、mail merge、labels 和 extension form printing。
- Arbitrary field renaming、广泛 custom task fields、detailed rights matrices、employee network-user maintenance 和 supervisor messaging。
- Email、SMS、calendar reminders，直到产品内 urgency surfaces 被验证。
- Client portal、document upload、document checklist automation、e-signature、direct end-client notifications，以及 Beta 阶段 email/SMS/Slack/calendar push。

## 目标用户

主要 ICP：

- Solo CPA 或 1-3 人小型事务所。
- 服务 30-100 个混合个人与小企业客户。
- 通常处理多州客户。
- 使用 Excel、Outlook/Google Calendar、TaxDome、Drake、Karbon、QuickBooks 或混合工具。
- 极度担心漏掉截止日期，但无法承受昂贵复杂的企业级事务所管理工具。

主要 Persona：

- Sarah Mitchell, CPA。
- 80 个混合个人与小企业客户，多州经营。
- 申报季每周开始时要花 30-45 分钟确认本周到底要做什么，之后才能开始真正税务工作。

## 核心用户故事

### Story 1：Dashboard triage

作为一名服务约 80 个混合个人与小企业多州客户的 solo/independent CPA，我希望打开产品 30 秒内看到本周需要行动的所有截止日期，这样我就能安排本周优先级，而不必交叉检查表格、日历和笔记。

验收标准：

- Persona 是服务约 80 个混合个人与小企业多州客户的 solo/independent CPA。
- 登录后，默认 dashboard 将截止日期分为 `逾期`、`本周到期`、`本月预警`、`长期计划`。
- 登录并打开产品后 30 秒内，CPA 能看到本周所有需要行动的截止日期。
- 本周项目显示具体剩余天数倒计时。
- 逾期项目显示已过期天数。
- Dashboard 每行任务只显示 current due date。原始到期日和日期变更记录通过 evidence drawer 查看。
- 快速筛选支持按客户、州、表单/义务类型、实体类型、税种、任务状态和核验状态过滤。
- 核心 dashboard 筛选在 Beta 规模 solo CPA workspace 内目标响应时间为 `< 1 second`。
- 每个截止日期支持一键状态标记：`已完成`、`Waiting on client`、`进行中`；`Not started` 保留为默认未开始状态。延期是独立的日期操作，记录新截止日期并显示 "Extended" badge。
- 可选 firm target dates 帮助 triage，但绝不展示为 official due dates。
- 智能优先级排序将最紧急的本周工作排在前面；Beta 阶段可以用确定性规则优先级实现，不要求实时 AI。
- 完整每周分诊流程可在 5 分钟内完成，对比当前 30-45 分钟的表格/日历流程。

### Story 2：CSV 导入

作为从 TaxDome、Drake、Karbon 或 QuickBooks 迁移的 CPA，我希望从 CSV 导入客户并自动生成可用日历，这样我可以在繁忙申报季快速开始使用产品。

验收标准：

- 存在四类 client/profile import CSV 来源 adapter profiles。
- 从 TaxDome 迁移的 CPA 可在 30 分钟内完成 30 个客户导入；可衡量目标是 `P95 <= 30 minutes for a 30-client import`。
- 通过 adapter profiles 支持 TaxDome、Drake、Karbon、QuickBooks source CSV exports 的 client/profile import；当来源文档没有公开固定 schema 时，不承诺 exact fixed schemas。
- 提交前展示 header handling、字段映射、duplicate candidates 和 import preview。
- 当字段存在或可高置信推断时，字段映射自动识别 client name、EIN、state 和 entity type；不确定值进入 review。
- 模糊或缺失字段获得智能、非阻塞建议，不确定行进入 review，而不是阻塞整个导入。
- Import 可以建议个人与企业之间的潜在关系，但绝不自动合并；CPA 必须确认。
- Import review 和最终 summary 按 filing/tax profile 与 problem type 分组，用平实语言展示 ready profiles、generated verified tasks、profile review items 和 coverage gaps。
- 导入后，当存在匹配的 Verified tax rules 时，立即生成每个 ready filing/tax profile 当前税年和下一税年的 deadline tasks。已过期的 tasks 标记为逾期。
- Unsupported、Coverage gap 和 Needs review 义务可见，但不会作为官方已确认截止日期被安排。
- 相关 P0 能力包括 CSV import、field mapping、calendar/task auto-generation、entity type recognition/review 和 intelligent field matching。

### Story 3：手动录入

作为要新增客户或特殊义务的 CPA，我希望手动创建客户和截止日期，让 DueDateHQ 仍然作为单一工作台。

验收标准：

- CPA 可以手动添加客户。
- CPA 可以在 client relationship 下添加一个或多个 filing/tax profiles。
- CPA 可以添加一次性或重复的自定义截止日期。
- 手动添加的截止日期显示在 dashboard。
- 手动截止日期标记为 `User provided · Not verified by DueDateHQ`。
- 用户可以请求 DueDateHQ 核验手动截止日期。

### Story 4：官方来源监听

作为依赖 DueDateHQ 的 CPA，我希望平台监听官方税务来源，这样变更截止日期和新政策能被快速发现，不会静默过期。

验收标准：

- 每个官方来源都有监听状态和最后检查时间。
- 来源变化会创建规则变更候选。
- 受影响规则变为 `Source changed`。
- Source changed 规则不能生成新的官方任务。
- 更新规则必须人工核验后才能发布。
- Proposed notice impacts 在 CPA 查看 before/after diffs 并确认前，不得改变 CPA workspace。
- Beta notice notifications 只在产品内。

## 产品模块

### Auth

Beta 用户使用邮箱和密码注册登录。因为 CSV 和客户截止日期是用户级数据，所以需要认证。OAuth、MFA、组织成员、密码重置是后续阶段功能。

### Client Onboarding

两个入口：

- CSV 导入，用于迁移和批量初始化。
- 手动录入，用于新增客户、边界情况和快速补充。

CSV 导入支持 TaxDome、Drake、Karbon、QuickBooks，通过来源专属 adapter 归一化为统一客户结构。Adapter 应在可能时自动识别 client name、EIN、state 和 entity type，并用确定性智能匹配建议处理模糊字段；不确定行进入 review，不阻塞整个导入。调研显示这些产品没有一个稳定共享 schema：TaxDome 和 Karbon 高度依赖 firm-specific custom fields，Drake Tax 公开文档确认 CSV/export workflows 但没有固定 client-list schema，QuickBooks customer exports 主要是 accounting contact data。因此 DueDateHQ 应在 commit 前展示 detected source profile、adapter version、recognized columns、unmapped columns 和需要 review 的字段。

导入工作流应该达到或超过 File In Time 的实用导入流程：preview rows、detect headers、map columns、标记缺失或不确定数据、commit 前展示 likely duplicates，并汇总 created client relationships、ready filing/tax profiles、generated verified tasks、profile review items、needs-review obligations 和 coverage gaps。系统可以建议个人与企业之间的潜在关系，但不能自动合并；必须由 CPA 确认。Beta 成功标准要求 CPA 在 30 分钟内完成 30-client import，指标为 `P95 <= 30 minutes for a 30-client import`。

数据模型分三层：

- `Client relationship`：CPA 与某个人、企业、家庭或相关组的关系。
- `Filing profile` / `Tax profile`：用于匹配义务和规则的具体个人或企业税务上下文。
- `Deadline task`：由 verified rule 生成或用户创建的申报/付款/延期任务。

### Tax Obligation Library

DueDateHQ 维护联邦和州税务义务库。义务是否已知与是否已有已核验截止日期规则是两回事。Beta 覆盖必须明确 supported sources/states，不能承诺完整 50 州已核验覆盖。

关键区分：

```txt
Known obligation does not mean verified deadline.
知道某项义务存在，不代表已有可确认截止日期。
```

义务库保存：

- 管辖区。
- 机构。
- 税种分类。
- 适用实体类型。
- 申报/付款/延期义务。
- 官方来源。
- 核验状态。
- 规则版本。
- 最后检查和最后核验时间。

### Verification Status System

税务规则核验状态：

| 状态 | 含义 | 是否可生成官方任务 | 主要展示位置 |
|---|---|---:|---|
| `Verified` | 官方来源和规则已审核，可安全使用 | 是 | Dashboard、Coverage、Evidence |
| `Needs review` | 存在候选规则，但审核未完成 | 否 | Verification Queue、Coverage |
| `Source changed` | 之前已核验的来源发生变化，需要重新核验 | 不生成新任务 | Dashboard warning、Verification Queue |
| `Unsupported` | 已知义务，但 DueDateHQ 暂不能安全安排 | 否 | Coverage Matrix |
| `Coverage gap` | DueDateHQ 尚未核验或暂不支持该 source/state/category 组合 | 否 | Coverage Matrix |

手动截止日期来源状态：

| 来源类型 | 含义 | Dashboard 行为 |
|---|---|---|
| `User provided` | 用户手动录入截止日期 | 作为用户任务显示，但明确标注未经 DueDateHQ 核验 |

### Evidence Drawer

每个官方截止日期任务都可以打开 Deadline Evidence 抽屉。

展示：

- Client relationship 和 filing/tax profile。
- 规则名称。
- 当前 official due date。
- Original due date。
- 可选 firm target date，并与 official due dates 明确区分。
- 日期计算解释。
- 官方来源名称和 URL。
- 核验状态。
- 来源最后检查时间。
- 来源最后变化时间。
- 当前规则版本。
- 上一版本。
- Date event history：official extensions、official relief/change、user-provided adjustments、firm target changes。
- 审计记录。
- 操作：`Mark reviewed`、`Report issue`、`Request re-verification`。

### Coverage Matrix

Coverage Matrix 是产品透明度层，展示所有州和主要税种的核验与监听状态。

字段包括：

- State。
- Tax category。
- Source agency。
- Verification status。
- Monitor status。
- Last checked。
- Last changed。
- Last verified。
- 可用操作：request DueDateHQ verification、add user-provided deadline、ignore/dismiss for now。

Coverage Matrix 必须明确 coverage gaps，不能暗示完整 50 州覆盖。P0 官方来源 allowlist 是 IRS、California FTB、New York Tax Department、Texas Comptroller、Florida Department of Revenue。

### Official Source and Notice Monitoring

DueDateHQ 用 24 小时检测 SLA 监听官方来源和 official notices。

产品原则：

```txt
24h detect, not blindly auto-verify.
24 小时内发现变化，但不盲目自动核验。
```

系统可以检测变化、创建候选、进入核验队列，但不能未经审核自动发布新的 Verified 规则，也不能未经 CPA 确认自动改变 workspace state。

Official Notice Monitor Beta 规则：

- AI provider/API key 由 DueDateHQ 平台配置，不由每个 CPA 配置。
- AI 只分析 official notices。默认不把 customer PII 发给模型。
- DueDateHQ 在本地匹配受影响 clients 和 filing/tax profiles。
- Auto-detected likely relevant notices 可以创建产品内提醒，但 proposed changes 必须由 CPA 确认。
- Proposed changes 可以是 task updates 或 coverage/review status updates。
- CPA 看到 before/after diffs，并可以单个或批量 approve、reject、decide later。
- Proposed change statuses 为 `pending`、`approved`、`rejected`、`decide_later`；`rejected` 表示 CPA 明确拒绝 proposed change。
- 每个操作都 audit logged。
- Notifications 只在产品内：dashboard banner、notice inbox/alert center、affected review page。
- Confidence labels 是可解释 gate，不是虚假百分比分数。High/medium + local workspace match 提醒 CPA，medium 标记 AI-detected/needs review；low 只进入内部队列。
- Notice UI 分两层：先 notice detail，再 affected task/profile diffs。

P0 monitor scope：

- IRS：federal individual 和 small-business filing/payment/extension/estimated tax deadlines，以及 IRS disaster/tax relief deadline changes；不是所有 IRS tax-law news。
- California FTB：personal income、business/franchise、disaster/tax relief。
- New York Tax Department：personal income、business/corporate、disaster/tax relief。
- Texas Comptroller：franchise、sales/use、disaster/tax relief。
- Florida Department of Revenue：corporate income、sales/use、reemployment、disaster/tax relief。

### Verification Queue

用于维护义务库的内部工作流。

队列：

- `Needs review`：新的或不确定的规则。
- `Source changed`：已核验官方来源发生变化。
- `User requested`：用户请求核验手动截止日期或缺失覆盖。

审核员可批准或拒绝候选。批准会发布新的 tax rule version，并恢复 `Verified` 状态。

### Dashboard

CPA 的主要工作台。

分区：

- `逾期`。
- `本周到期`。
- `本月预警`。
- `长期计划`。

每行任务包括：

- Client relationship 和 filing/tax profile。
- 义务。
- 管辖区。
- 当前到期日（只显示此日期；原始到期日和日期变更历史在 evidence drawer 中）。
- 剩余天数或逾期天数。
- 任务状态。
- 可选 firm target date。
- 适用时展示 Extended badge（从 date events 派生）。
- 核验 badge。
- Evidence drawer 入口。

Dashboard controls 必须支持按 due horizon、client relationship、filing/tax profile、jurisdiction/state、form/obligation type、entity type、tax type、task status 和 verification status 过滤/排序。Dashboard urgency surfaces 应该在 Beta 阶段先展示 due today、due this week、due this month，而不是加入外部 reminder channels。基础 dashboard/task export 支持 CPA 在系统外分享和复核 workload。Product-specific task export 不是通用 Beta 承诺；从已调研的官方文档看，Karbon work-item export 是唯一较可信的 optional target，而 TaxDome、Drake、QuickBooks 在 P0 中仍作为 source client/profile import targets，除非后续确认官方 task-import schemas。

核心筛选在 Beta 规模 solo CPA workspaces 内应以 `< 1 second` 更新。默认 priority sort 应根据 official due date、firm target date、days remaining、verification warning state、extension state 和 unfinished task status 等确定性因素，将本周工作排在前面；Beta 不需要实时 AI 来满足 smart priority sorting。

Beta 工作进度状态包含 `Not started`、`In progress`、`Waiting on client`、`Done`。延期是从 date events 派生的日期状态，显示为 badge，不是工作进度状态；一个任务可以同时处于延期状态和任意工作进度状态。轻量 bulk operations 支持 bulk task status updates、bulk firm target date updates 和 bulk export current filtered view。不支持 bulk official due-date edits。

### Feature Progress Page

内部和评审页面，用于展示产品 readiness。

分组：

- Auth。
- CSV imports。
- Manual entry。
- Tax obligation library。
- Source monitoring。
- Verification queue。
- Coverage matrix。
- Dashboard。
- Deployment。
- GTM。
- Docs/specs。

状态：

- `Done`。
- `In progress`。
- `Blocked`。
- `Not started`。

## GTM 方案

### 第一批用户

目标第一批用户：

- 管理混合个人与小企业客户的 solo/independent CPA。
- 使用表格或基础日历的 CPA owner。
- 活跃在专业社区的 CPA。

选择原因：

- 痛点最强。
- 决策链最短。
- 最可能提供真实 CSV 样本。
- 最容易感受到来源证据带来的信任价值。

### 定价

Beta：

- 前 20 个用户免费。
- 要求完成 onboarding call。
- 要求提供去敏 CSV 样本或手动录入 walkthrough。
- 要求 Beta 期间每周反馈。

付费：

- Pro：`$49/month`。
- 后续可提供年付 20% 折扣。

定价理由：

- Solo CPA 能承受。
- 能传达专业合规工具价值。
- 与一次漏报成本或 CPA 一小时工时相比有明确 ROI。

### 渠道

- Reddit：r/taxpros、r/Accounting。
- 面向 CPA firm owner 的 LinkedIn 内容。
- 州 CPA Society 群组。
- AICPA 和 CPA 会议社区。
- CPA Practice Advisor 内容和产品目录。
- 围绕州申报截止日和 PTE election 截止日的搜索内容。

### Lead Magnet

公开的 “Tax Deadline Coverage Tracker”。

它使用和产品内部一致的模型：

- State。
- Tax category。
- Verification status。
- Coverage gap status。
- Last checked。
- Last verified。
- Request coverage。

### 早期指标

第一里程碑：

- 20 个 waitlist signups。
- 10 个 onboarding calls。
- 5 个真实 CSV imports。
- 3 个付费转化意向。

激活指标：

```txt
User imports or manually enters at least 10 clients and completes one dashboard triage session.
用户导入或手动录入至少 10 个客户，并完成一次 dashboard triage。
```

## 产品风险

### 税务准确性风险

缓解：

- 核验状态。
- 官方来源链接。
- Evidence drawer。
- 发布前人工 review。
- 未核验规则不生成官方任务。

### 覆盖风险

缓解：

- Coverage matrix。
- 明确 needs-review、unsupported 和 coverage-gap 州和税种。
- 用户可 request DueDateHQ verification、add user-provided deadline、ignore/dismiss for now。

### 信任风险

缓解：

- 在上下文中展示来源证据。
- 不过度承诺 “all deadlines verified”。
- 区分官方系统生成任务和用户手动任务。
- 区分 official due dates 和 firm target dates。
- Official notice impacts 应用前要求 CPA 确认。

### Onboarding 风险

缓解：

- 四类 CSV adapters。
- 手动录入兜底。
- 不确定字段进入 review queue。

## Beta 验收标准

- CPA 可以注册、导入或手动录入客户，并看到截止日期任务。
- 服务约 80 个混合个人与小企业客户的 solo/independent CPA 登录并打开产品后，能在 30 秒内看到本周所有需要行动的截止日期。
- CPA 可在 5 分钟内完成每周分诊，依靠 `逾期`、`本周到期`、`本月预警`、`长期计划`、按天倒计时、一键 `已完成`/`Waiting on client`/`进行中` 状态标记、延期日期操作、快速筛选和确定性智能优先级排序。
- 从 TaxDome 迁移的 CPA 可在 30 分钟内导入 30 个客户，指标为 `P95 <= 30 minutes for a 30-client import`，同时支持 Drake、Karbon、QuickBooks CSV 导出。
- 导入在字段存在或可高置信推断时自动识别 client name、EIN、state 和 entity type；模糊或缺失字段获得非阻塞建议并进入 review rows。
- CPA 可以理解一个 Verified 截止日期为什么存在、来自哪里。
- 导入后，匹配的 Verified rules 立即生成当前税年和下一税年的 deadline tasks；已过期的 tasks 标记为逾期；needs-review、coverage-gap 和 unsupported obligations 保持可见，但不是官方已确认截止日期。
- 产品清楚标注未核验、来源变化、暂不支持和用户手动录入项。
- 系统设计支持 24 小时官方来源/notice 变化检测，且不会自动发布未审核规则或自动修改 CPA workspace data。
- Official Notice Monitor 支持 P0 source allowlist、可解释 confidence gates、in-app-only alerts、before/after diffs、CPA confirmation、proposal statuses 和 audit logging。
- 产品支持可选 firm target dates，并且不与 official due dates 混淆。
- 产品支持轻量 bulk status updates、firm target date updates 和 current-filter export，但不支持 bulk official due-date edits。
- 产品覆盖 File In Time 核心工作流 parity 或更好：client setup、import、obligation setup、task generation、triage、filters、status、extensions、recurrence、exports、urgency、admin/settings boundaries。
- 产品有明确的前 20 个 Beta 用户 GTM 动作。
