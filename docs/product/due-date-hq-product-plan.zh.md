# DueDateHQ 产品方案

## 产品定位

DueDateHQ 是面向 solo CPA 和小型会计事务所的税务截止日期操作系统，服务对象是管理多州小企业客户的税务专业人士。

它替代分散的 Excel、日历、人工州税局网站检查和不确定的截止日期笔记，提供：

- 50 州税务义务库。
- 可追溯的截止日期证据。
- CSV 和手动客户 onboarding。
- Monday triage 工作台。
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
| Client setup | Client records 包含税务相关字段、notes、client/entity type、jurisdiction context，并支持 manual/import paths | 覆盖安排截止日期所需的实用 tax profile fields，保留 notes，但避免桌面软件式任意 custom-field 膨胀 |
| CSV import | Delimited-file preview、header handling、drag/drop mapping、commit 前 review、duplicate resolution | 通过 TaxDome、Drake、Karbon、QuickBooks 来源专属 adapters 做得更好，自动识别 client name/EIN/state/entity type，提供非阻塞 review suggestions，并处理 duplicates |
| Obligation/service setup | Services 定义 work type、frequency、due dates 和 extension dates | 将 services 映射为 tax obligations 和 verified tax rules，同时区分 known、verified、needs-review、unsupported 和 user-provided items |
| Task generation | 将 services 分配给 clients 来创建 due-date tasks | 只有 Verified rules 生成官方任务；unsupported 或 needs-review obligations 可见，但不能伪装成官方截止日期 |
| Monday triage | Task view 可以过滤到 this week | 默认提供一等公民的 `本周到期`、`本月预警`、`长期计划` 分区，登录后 30 秒内看到所有本周工作，并以 5 分钟完成分诊为目标 |
| Filters and sorting | Date、client、type、service、status、key person 和 saved views | 覆盖 horizon、client、jurisdiction/state、form/obligation type、entity type、tax type、task status、verification status 核心过滤；advanced saved views 可以后置 |
| Task status | Status codes、dates、notes、extension flag | 用 `Not started`、`进行中` (`In progress`)、`已延期` (`Extended`)、`已完成` (`Done`) 覆盖简单运营状态，并附带 source/trust badges |
| Extensions | Service-supported extension dates 和 extension state | 当官方规则证据支持时显示 extension status 和 verified extension due dates；extension form printing 不进入 Beta |
| Recurrence/upcoming tasks | 手动 rollover 创建下一周期任务 | 由维护过的 Verified rules 生成 upcoming official tasks，official recurring deadlines 不需要手动 rollover |
| Exports | Excel/task view export 和 printed reports | 支持实用 dashboard/task export，用于 workload sharing 和 review；不做 Crystal Reports-style builders |
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

## 目标用户

主要 ICP：

- Solo CPA 或 1-3 人小型事务所。
- 服务 30-100 个小企业客户。
- 处理多州客户。
- 使用 Excel、Outlook/Google Calendar、TaxDome、Drake、Karbon、QuickBooks 或混合工具。
- 极度担心漏掉截止日期，但无法承受昂贵复杂的企业级事务所管理工具。

主要 Persona：

- Sarah Mitchell, CPA。
- 80 个客户，多州经营。
- 申报季每周一早上要花 30-45 分钟确认本周到底要做什么，之后才能开始真正税务工作。

## 核心用户故事

### Story 1：Monday Triage

作为一名服务约 80 个多州客户的 solo/independent CPA，我希望打开产品 30 秒内看到本周需要行动的所有截止日期，这样我就能安排本周优先级，而不必交叉检查表格、日历和笔记。

验收标准：

- Persona 是服务约 80 个多州客户的 solo/independent CPA。
- 登录后，默认 dashboard 将截止日期分为 `本周到期`、`本月预警`、`长期计划`。
- 登录并打开产品后 30 秒内，CPA 能看到本周所有需要行动的截止日期。
- 本周项目显示具体剩余天数倒计时。
- 快速筛选支持按客户、州、表单/义务类型、实体类型、税种、任务状态和核验状态过滤。
- 核心 dashboard 筛选在 Beta 规模 solo CPA workspace 内目标响应时间为 `< 1 second`。
- 每个截止日期支持一键状态标记：`已完成`、`已延期`、`进行中`；`Not started` 保留为默认未开始状态。
- 智能优先级排序将最紧急的本周工作排在前面；Beta 阶段可以用确定性规则优先级实现，不要求实时 AI。
- 完整每周分诊流程可在 5 分钟内完成，对比当前 30-45 分钟的表格/日历流程。

### Story 2：CSV 导入

作为从 TaxDome、Drake、Karbon 或 QuickBooks 迁移的 CPA，我希望从 CSV 导入客户并自动生成可用日历，这样我可以在繁忙申报季快速开始使用产品。

验收标准：

- 存在四类 CSV 来源 adapter。
- 从 TaxDome 迁移的 CPA 可在 30 分钟内完成 30 个客户导入；可衡量目标是 `P95 <= 30 minutes for a 30-client import`。
- 支持 TaxDome、Drake、Karbon、QuickBooks 导出的 CSV。
- 提交前展示 header handling、字段映射、duplicate candidates 和 import preview。
- 字段映射自动识别 client name、EIN、state 和 entity type。
- 模糊或缺失字段获得智能、非阻塞建议，不确定行进入 review，而不是阻塞整个导入。
- 导入后，当存在匹配的 Verified tax rules 时，立即生成每个客户的全年 deadline calendar/tasks。
- Unsupported 和 Needs review 义务可见，但不会作为官方已确认截止日期被安排。
- 相关 P0 能力包括 CSV import、field mapping、calendar/task auto-generation、entity type auto-recognition 和 intelligent field matching。

### Story 3：手动录入

作为要新增客户或特殊义务的 CPA，我希望手动创建客户和截止日期，让 DueDateHQ 仍然作为单一工作台。

验收标准：

- CPA 可以手动添加客户。
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

## 产品模块

### Auth

Beta 用户使用邮箱和密码注册登录。因为 CSV 和客户截止日期是用户级数据，所以需要认证。OAuth、MFA、组织成员、密码重置是后续阶段功能。

### Client Onboarding

两个入口：

- CSV 导入，用于迁移和批量初始化。
- 手动录入，用于新增客户、边界情况和快速补充。

CSV 导入支持 TaxDome、Drake、Karbon、QuickBooks，通过来源专属 adapter 归一化为统一客户结构。Adapter 应在可能时自动识别 client name、EIN、state 和 entity type，并用确定性智能匹配建议处理模糊字段；不确定行进入 review，不阻塞整个导入。

导入工作流应该达到或超过 File In Time 的实用导入流程：preview rows、detect headers、map columns、标记缺失或不确定数据、commit 前展示 likely duplicates，并汇总 created clients、generated tasks、needs-review obligations 和 unsupported obligations。Beta 成功标准要求 CPA 在 30 分钟内完成 30-client import，指标为 `P95 <= 30 minutes for a 30-client import`。

### Tax Obligation Library

DueDateHQ 维护联邦和 50 州税务义务库。义务是否已知与是否已有已核验截止日期规则是两回事。

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

手动截止日期来源状态：

| 来源类型 | 含义 | Dashboard 行为 |
|---|---|---|
| `User provided` | 用户手动录入截止日期 | 作为用户任务显示，但明确标注未经 DueDateHQ 核验 |

### Evidence Drawer

每个官方截止日期任务都可以打开 Deadline Evidence 抽屉。

展示：

- 客户。
- 规则名称。
- 计算出的到期日期。
- 日期计算解释。
- 官方来源名称和 URL。
- 核验状态。
- 来源最后检查时间。
- 来源最后变化时间。
- 当前规则版本。
- 上一版本。
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
- Request coverage。

### Official Source Monitoring

DueDateHQ 用 24 小时检测 SLA 监听官方来源。

产品原则：

```txt
24h detect, not blindly auto-verify.
24 小时内发现变化，但不盲目自动核验。
```

系统可以检测变化、创建候选、进入核验队列，但不能未经审核自动发布新的 Verified 规则。

### Verification Queue

用于维护义务库的内部工作流。

队列：

- `Needs review`：新的或不确定的规则。
- `Source changed`：已核验官方来源发生变化。
- `User requested`：用户请求核验手动截止日期或缺失覆盖。

审核员可批准或拒绝候选。批准会发布新的 tax rule version，并恢复 `Verified` 状态。

### Monday Triage Dashboard

CPA 的主要工作台。

分区：

- `本周到期`。
- `本月预警`。
- `长期计划`。

每行任务包括：

- 客户。
- 义务。
- 管辖区。
- 到期日。
- 剩余天数。
- 任务状态。
- 当 verified evidence 支持时展示 extension status 和 extension due date。
- 核验 badge。
- 来源证据入口。

Dashboard controls 必须支持按 due horizon、client、jurisdiction/state、form/obligation type、entity type、tax type、task status 和 verification status 过滤/排序。Dashboard urgency surfaces 应该在 Beta 阶段先展示 due today、due this week、due this month，而不是加入外部 reminder channels。基础 dashboard/task export 支持 CPA 在系统外分享和复核 workload。

核心筛选在 Beta 规模 solo CPA workspaces 内应以 `< 1 second` 更新。默认 priority sort 应根据 due date、days remaining、verification warning state、extension state 和 unfinished task status 等确定性因素，将本周工作排在前面；Beta 不需要实时 AI 来满足 smart priority sorting。

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

- Solo 多州 CPA。
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

公开的 “50-State Tax Deadline Coverage Tracker”。

它使用和产品内部一致的模型：

- State。
- Tax category。
- Verification status。
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
User imports or manually enters at least 10 clients and completes one Monday triage session.
用户导入或手动录入至少 10 个客户，并完成一次 Monday triage。
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
- 明确 unsupported 州和税种。
- Request coverage 操作。

### 信任风险

缓解：

- 在上下文中展示来源证据。
- 不过度承诺 “all deadlines verified”。
- 区分官方系统生成任务和用户手动任务。

### Onboarding 风险

缓解：

- 四类 CSV adapters。
- 手动录入兜底。
- 不确定字段进入 review queue。

## Beta 验收标准

- CPA 可以注册、导入或手动录入客户，并看到截止日期任务。
- 服务约 80 个多州客户的 solo/independent CPA 登录并打开产品后，能在 30 秒内看到本周所有需要行动的截止日期。
- CPA 可在 5 分钟内完成每周分诊，依靠 `本周到期`、`本月预警`、`长期计划`、按天倒计时、一键 `已完成`/`已延期`/`进行中` 状态标记、快速筛选和确定性智能优先级排序。
- 从 TaxDome 迁移的 CPA 可在 30 分钟内导入 30 个客户，指标为 `P95 <= 30 minutes for a 30-client import`，同时支持 Drake、Karbon、QuickBooks CSV 导出。
- 导入自动识别 client name、EIN、state 和 entity type；模糊或缺失字段获得非阻塞建议并进入 review rows。
- CPA 可以理解一个 Verified 截止日期为什么存在、来自哪里。
- 导入后，匹配的 Verified rules 立即生成全年 deadline calendar/tasks；needs-review 和 unsupported obligations 保持可见，但不是官方已确认截止日期。
- 产品清楚标注未核验、来源变化、暂不支持和用户手动录入项。
- 系统设计支持 24 小时官方来源变化检测，且不会自动发布未审核规则。
- 产品覆盖 File In Time 核心工作流 parity 或更好：client setup、import、obligation setup、task generation、triage、filters、status、extensions、recurrence、exports、urgency、admin/settings boundaries。
- 产品有明确的前 20 个 Beta 用户 GTM 动作。
