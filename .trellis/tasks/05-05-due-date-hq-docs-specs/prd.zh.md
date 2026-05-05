# 落地 DueDateHQ 产品方案、技术方案和 SDD Specs

## Goal

在开始实现前，将完整 DueDateHQ 规划文档落到仓库。

本任务只处理文档。不要修改应用代码、数据库 schema、生成路由文件、package manifests 或部署配置。

## Scope

为以下内容创建可持续维护的仓库文档：

- 完整产品方案
- 完整技术方案
- Spec-Driven Development feature specs
- 官方来源监听与规则更新设计
- 核验状态体系
- 手动客户和截止日期录入
- Go-to-market 方案
- 功能进度追踪方案
- 会影响 Beta 范围的竞品功能取舍
- 核心竞品能力 parity，并在竞品流程过时或较弱的地方做出 DueDateHQ 自己的改进

## Deliverables

- `.trellis/tasks/05-05-due-date-hq-docs-specs/research/file-in-time-competitor-research.md`
- `docs/due-date-hq-beta-plan.md` / `docs/due-date-hq-beta-plan.zh.md`
- `docs/product/due-date-hq-product-plan.md` / `docs/product/due-date-hq-product-plan.zh.md`
- `docs/technical/due-date-hq-beta-technical-plan.md` / `docs/technical/due-date-hq-beta-technical-plan.zh.md`
- `specs/README.md` / `specs/README.zh.md`
- `specs/auth.md` / `specs/auth.zh.md`
- `specs/csv-imports.md` / `specs/csv-imports.zh.md`
- `specs/manual-client-and-deadline-entry.md` / `specs/manual-client-and-deadline-entry.zh.md`
- `specs/tax-obligation-library.md` / `specs/tax-obligation-library.zh.md`
- `specs/tax-rule-verification.md` / `specs/tax-rule-verification.zh.md`
- `specs/official-source-monitoring.md` / `specs/official-source-monitoring.zh.md`
- `specs/coverage-matrix.md` / `specs/coverage-matrix.zh.md`
- `specs/monday-triage-dashboard.md` / `specs/monday-triage-dashboard.zh.md`
- `specs/feature-progress-page.md` / `specs/feature-progress-page.zh.md`
- `specs/gtm.md` / `specs/gtm.zh.md`
- `specs/cloudflare-deployment.md` / `specs/cloudflare-deployment.zh.md`

## Research Inputs

- File In Time 用户手册竞品调研：`.trellis/tasks/05-05-due-date-hq-docs-specs/research/file-in-time-competitor-research.md`

## Product Direction Update

产品目标不是挑几个竞品点做参考。对于 CPA due-date operations 的核心流程，DueDateHQ 要覆盖 File In Time 中有价值的能力，并通过现代 Web 工作流、官方来源证据、规则监听和更低运维负担做得更好。

产品/spec 规划必须体现以下竞品核心能力：

- 客户档案：包含税务相关 profile fields、notes、entity/client type、jurisdiction context，并支持导入和手动录入。
- CSV 导入：包含 preview、字段映射、提交前 review、header handling，以及重复客户检测/处理。
- Service/obligation library：能生成客户 deadline tasks，同时保留 DueDateHQ 对 known obligations、verified schedulable rules、unsupported obligations 和 user-provided deadlines 的区分。
- 紧凑任务行：围绕 client、obligation、jurisdiction、due date、days remaining、status 和 evidence/trust state 展示。
- 一等公民的 weekly triage，以及按 date horizon、client、jurisdiction/state、entity type、tax type、task status 和 verification status 过滤/排序。
- Deadline extension handling：当 verified rule evidence 支持延期日期时，任务流程里要可见 extension status。
- Recurring/upcoming task generation：从 verified rules 或明确标记为 user-provided 的 recurring deadlines 生成，官方 deadline 不依赖用户手动 rollover。
- 基础运营导出：dashboard/task views 可导出，方便 CPA 在系统外留存、分享或复核 workload data。
- 简单 reminder/urgency surfaces：覆盖 due today/this week/this month，优先在 dashboard 内解决，再考虑 email/SMS/calendar 外部渠道。
- 对桌面时代重功能做明确排除或后置：local database administration、backup/restore UI、Crystal Reports-style report builders、mail merge/labels、extension form printing、arbitrary field renaming、network-user maintenance 和 detailed rights matrices。

DueDateHQ 必须在这些方面强于 File In Time：

- Trust：每个 official task 都有 source evidence、verification status、versioning 和 source-change visibility。
- Automation：official recurring deadlines 来自维护过的规则，而不是手动 rollover。
- Transparency：unsupported、needs-review、source-changed 和 user-provided deadlines 可见，但不能伪装成 verified official deadlines。
- Cloud workflow：用户不需要管理 desktop installs、shared drives、database files、optimization 或 backups。
- Onboarding：source-specific CSV adapters 要优于通用 delimited-file mapping。

## Constraints

- 不实现代码。
- 不修改 TypeScript、TSX、schema、API、package 或部署文件。
- Beta 产品文案必须保持透明：DueDateHQ 可以监听和核验来源，但未核验规则不能被呈现为官方截止日期。
- 后续所有英文文档都必须同步生成中文版本，中文文件使用 `.zh.md` 后缀。

## Acceptance Criteria

- 产品方案和技术方案存在，并从总计划链接。
- 每个大功能都有独立 SDD spec。
- 每个 spec 都包含目标、用户流程、Mermaid 流程图、页面/API、数据模型、验收标准和不做范围。
- 核验状态规则包含 `Verified`、`Needs review`、`Source changed`、`Unsupported` 和用户手动截止日期。
- 官方来源监听设计包含 24h 检测、变更候选、核验队列，以及发布 verified rules 前必须人工批准。
- 所有新增/更新的英文 Markdown 文档都有对应中文版本。
- 产品方案和 feature specs 要在相关位置吸收 File In Time 竞品调研结论，尤其是 CSV 导入 review、Monday triage、任务过滤、导出能力和 Beta 不做范围。
- 产品方案和 feature specs 要明确说明 DueDateHQ 如何在每个 File In Time 核心流程上做到 parity 或更好：client setup、import、obligation/service setup、task generation、triage、filtering、status/extension handling、recurrence/upcoming tasks、exports、reminders/urgency，以及 admin/settings boundaries。
