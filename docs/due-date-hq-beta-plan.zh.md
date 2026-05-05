# DueDateHQ Beta 总计划

## 目的

DueDateHQ 是面向 solo/independent CPA 的 Beta SaaS 产品，帮助他们管理约 30-100 个混合个人与小企业客户。产品支持 CPA 导入或手动录入 client relationships 和 filing/tax profiles，根据已核验税务规则生成可追溯的截止日期任务，并完成每周重点工作分诊。

核心产品原则：

```txt
Traceable tax deadlines, not black-box dates.
可追溯的税务截止日期，而不是黑盒日期。
```

DueDateHQ 维护透明税务义务与覆盖库，在 24 小时检测窗口内监听 supported 官方来源变化，并清晰区分已核验系统规则、needs-review、coverage-gap、用户手动录入日期和暂不支持义务。Beta 不承诺完整 50 州已核验覆盖；它承诺对 supported sources/states 明确展示覆盖状态。

竞品定位：DueDateHQ Beta 要在 File In Time 有价值的核心工作流上做到 parity 或更好，同时用云端工作流和已核验来源信任模型替代桌面时代的数据库、rollover 和报表负担。Parity 意味着 CPA 可以设置客户、导入文件、生成和分诊截止日期工作、筛选/排序任务、处理延期、导出工作量视图，并在产品内看到紧急程度，而不必退回表格。Better 意味着官方任务必须带有来源证据、核验状态、来源监听、规则版本，并且 verified recurring deadlines 不需要手动 rollover。

## 当前交付目标

- 构建真实 Beta 产品，而不是纯前端 Demo。
- 支持通过 Cloudflare 部署给外部用户访问。
- 使用 Spec-Driven Development：每个大功能先写 `specs/<feature>.md`。
- 覆盖两个 P0 用户故事：
  - 从 TaxDome、Drake、Karbon、QuickBooks CSV 导入客户。
  - 让 CPA 通过清晰的截止日期看板完成 dashboard triage。
- 增加客户和自定义截止日期的手动录入。
- 增加官方来源监听和税务规则核验队列。
- 增加功能完成进度页，让产品、工程和评审者看到完成状态。
- 覆盖 File In Time 有价值的 due-date 核心工作流，并做到 parity 或更好：client setup、CSV import review、obligation/service setup、task generation、weekly triage、filters/sorting、task status、extension handling、recurrence/upcoming tasks、exports、urgency surfaces，以及 admin/settings boundaries。
- 主 UI 保持简单，同时数据模型区分 `Client relationship -> Filing/Tax profile -> Deadline task`。
- 增加 P0 官方来源 allowlist 的 Official Notice Monitor，并在任何 workspace state 变更前要求 CPA 产品内确认。

## P0 用户故事验收目标

每周申报季分诊：

- Persona：服务约 80 个混合个人与小企业多州客户的 solo/independent CPA。
- 登录后，默认 dashboard 打开 `逾期`、`本周到期`、`本月预警`、`长期计划`。
- 登录并打开产品后 30 秒内，CPA 能看到本周所有需要行动的截止日期。
- 本周行显示具体剩余天数倒计时。逾期行显示已过期天数。
- 快速核心筛选覆盖客户、州、表单/义务类型、实体类型、税种、任务状态和核验状态；Beta 规模 solo CPA workspace 的目标响应时间为 `< 1 second`。
- 每个截止日期可一键标记为 `已完成`、`Waiting on client` 或 `进行中`。延期是独立的日期操作，记录新截止日期。
- Task workflow 也支持 `Waiting on client`，但 Beta 不加入 client portal、document upload、document checklist automation、e-signature 或 direct end-client notifications。
- 每周分诊流程可在 5 分钟内完成，对比当前 30-45 分钟的表格/日历流程。
- 智能优先级排序是 P0，Beta 阶段可以用确定性规则优先级实现。
- 可选 firm target dates 可用于 triage，但必须与 official due dates 明确区分。
- 轻量 bulk operations 覆盖 task status updates、firm target date updates 和 current filtered view export；不支持 bulk official due-date edits。

从 TaxDome 导入接管 30 个客户：

- Persona：从 TaxDome 迁移的 CPA；同时支持 Drake、Karbon、QuickBooks CSV 导出。
- 用户可在 30 分钟内完成 30 个客户导入；可衡量目标是 `P95 <= 30 minutes for a 30-client import`。
- 通过 adapter profiles 支持 TaxDome、Drake、Karbon、QuickBooks source CSV exports 的 client/profile import；当来源文档没有公开固定 schema 时，不承诺 exact fixed schemas。
- 当字段存在或可高置信推断时，字段映射自动识别 client name、EIN、state 和 entity type；不确定值进入 review。
- 模糊或缺失字段获得智能、非阻塞建议，不确定行进入 review，不阻塞整个导入。
- CSV import 可以建议个人与企业之间的潜在关系，但不能自动合并；CPA 必须确认 relationship suggestions。
- Import review 和结果 summary 按 filing/tax profile 和 problem type 分组，而不是按每个 generated task。
- 导入后，如果存在匹配的 Verified rules，立即为每个 ready filing/tax profile 生成当前税年和下一税年的 deadline tasks。已过期的 tasks 标记为逾期。
- Needs-review、coverage-gap 和 unsupported obligations 保持可见，但不是官方已确认截止日期。
- 相关 P0 能力包括 CSV import、field mapping、calendar/task auto-generation、entity type auto-recognition 和 intelligent field matching。

## 核心产品规则

```txt
Only Verified tax rules can create official system-generated deadline tasks.
只有 Verified 税务规则可以生成官方系统截止日期任务。

Entered deadlines can appear in the CPA firm's workspace,
but must be marked as not verified by DueDateHQ.
用户手动录入的截止日期可以出现在工作台中，
但必须标记为未经 DueDateHQ 核验。

Needs review, Source changed, and Unsupported rules must be transparent
but cannot be treated as confirmed deadlines.
Needs review、Source changed 和 Unsupported 规则必须透明展示，
但不能被当作已确认截止日期。
Coverage gaps 必须可见且可操作：request DueDateHQ verification、add entered deadline、ignore/dismiss for now。
Firm target dates 是规划信息，不是 official due dates。
延期是从 date events 派生的日期状态，不是工作进度状态。一个任务可以同时处于延期状态和任意工作进度状态。
```

## 文档

- 产品用户旅程地图：`docs/due-date-hq-user-journey.html`
- 产品方案：`docs/product/due-date-hq-product-plan.zh.md`
- 技术方案：`docs/technical/due-date-hq-beta-technical-plan.zh.md`
- SDD specs 索引：`specs/README.zh.md`

## SDD Specs

- `specs/auth.zh.md`
- `specs/csv-imports.zh.md`
- `specs/manual-client-and-deadline-entry.zh.md`
- `specs/tax-obligation-library.zh.md`
- `specs/tax-rule-verification.zh.md`
- `specs/official-source-monitoring.zh.md`
- `specs/coverage-matrix.zh.md`
- `specs/dashboard.zh.md`
- `specs/feature-progress-page.zh.md`
- `specs/gtm.zh.md`
- `specs/cloudflare-deployment.zh.md`

## Beta 范围边界

范围内：

- 邮箱密码注册和登录。
- 四类 CSV 来源的 client/profile 导入。
- 手动录入客户和截止日期。
- 已核验税务规则生成官方任务。
- Client relationships 下的 filing/tax profiles。
- 透明义务覆盖矩阵，展示 supported、needs-review、coverage-gap、source-changed、unsupported 和 verified 状态。
- 官方来源与 notice monitoring 设计和 API 表面，P0 allowlist 为 IRS、California FTB、New York Tax Department、Texas Comptroller、Florida Department of Revenue。
- 税务规则核验队列。
- Cloudflare 部署计划。
- 带 preview、mapping、review、duplicate handling 的来源专属 CSV adapters。
- CSV import 字段映射在字段存在或可高置信推断时覆盖 client name、EIN、state 和 entity type，并对不确定行提供非阻塞建议。
- Import 中由 CPA 确认 relationship suggestions。
- 产品内 notice surfaces：dashboard banner、notice inbox/alert center、affected review page。
- P0 工作流目标：30-client import 在 30 分钟内完成且达到 `P95 <= 30 minutes for a 30-client import`，每周分诊在 5 分钟内完成，核心 dashboard filters 在 Beta 规模 solo CPA workspace 内 `< 1 second` 响应。
- Dashboard/task exports，以及 due today、this week、this month 的产品内 urgency surfaces。
- 用于 dashboard triage 的确定性 smart priority sorting。
- 轻量 bulk task status updates、firm target date updates 和 current-filter export。

Beta 阶段不做：

- 生产级税务责任保证。
- 完整 OAuth、MFA、组织、邀请、角色权限。
- 未经核验的规则自动发布。
- 完整城市/县/行业级税务自动化。
- 未经人工审核的实时 AI 公告解释。
- 默认把 customer PII 发送给 AI model。
- Official notice monitoring 自动修改 CPA workspace data。
- Bulk official due-date edits。
- Client portal、document upload、document checklist automation、e-signature、direct end-client notifications，以及 email/SMS/Slack/calendar push。
- 桌面时代 File In Time 功能：local database administration、backup/restore UI、Crystal Reports-style reports、mail merge/labels、extension form printing、arbitrary field renaming、network-user maintenance 和 detailed rights matrices。
- Beta 阶段 Email、SMS、Slack、calendar push reminders/notifications；只有在产品内 urgency 和 notice surfaces 被验证后才重新考虑。

## GTM 摘要

第一批用户是管理混合个人与小企业客户的 solo/independent CPA，通常跨一个或多个州。目标定价是 Pro `$49/month`，前 20 个 Beta 用户免费，交换条件是完成 onboarding call、提供去敏 CSV 样本，并每周反馈。

初始获客动作是一个实用 lead magnet：公开的 “50-State Tax Deadline Coverage Tracker”。它使用和产品内部一致的税务义务库与核验状态模型。
