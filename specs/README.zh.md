# DueDateHQ SDD Specs

本目录包含 Spec-Driven Development（规格驱动开发）文档。每个大功能在实现前必须先有 spec。

## 文档语言约定

默认生成英文文档，同时必须生成对应中文版本供 review。

- 英文：`<name>.md`
- 中文：`<name>.zh.md`

后续新增或更新任何产品方案、技术方案或 feature spec 时，都要同步维护中文版本。

## 必要 Spec 结构

每个 spec 必须包含：

- Goal
- User Flow
- Flow Diagram
- Pages
- API
- Data Model
- Acceptance Criteria
- Out of Scope

## Specs

- `auth.zh.md`
- `csv-imports.zh.md`
- `manual-client-and-deadline-entry.zh.md`
- `tax-obligation-library.zh.md`
- `tax-rule-verification.zh.md`
- `official-source-monitoring.zh.md`
- `coverage-matrix.zh.md`
- `monday-triage-dashboard.zh.md`
- `feature-progress-page.zh.md`
- `gtm.zh.md`
- `cloudflare-deployment.zh.md`

## 开发规则

实现 agent 在修改代码前必须阅读相关 spec。如果 spec 没有回答某个产品或技术决策，应先更新 spec，再继续实现。

## 产品不变量

```txt
Only Verified tax rules can create official system-generated deadline tasks.
只有 Verified 税务规则可以创建官方系统截止日期任务。

User-provided deadlines can be shown as user tasks,
but must be marked as not verified by DueDateHQ.
用户手动录入的截止日期可以显示为用户任务，
但必须标记为未经 DueDateHQ 核验。
```

## 竞品 Parity Baseline

Feature specs 必须保留 DueDateHQ 的信任模型，同时在 File In Time 有价值的核心工作流上做到 parity 或更好：

- Client setup：包含税务相关 profile fields、notes、entity type、jurisdiction context，并支持 import/manual entry paths。
- CSV import：包含 preview、header handling、field mapping、row review、duplicate handling 和 commit summary。
- Obligation/service setup：可以生成任务，同时区分 known obligations、Verified rules、Needs review、Source changed、Unsupported 和 user-provided deadlines。
- Task generation：只有 Verified rules 可以生成 official system deadlines。
- Monday triage：包含 due today/this week/this month urgency、filters/sorting、task status、extension status 和 evidence/trust badges。
- Recurrence/upcoming tasks：来自维护过的 Verified rules，official recurring deadlines 不需要 manual rollover。
- 基础 dashboard/task exports，用于 workload sharing 和 review。
- Admin/settings boundaries：避免 desktop database administration 和 option sprawl。

DueDateHQ 应通过 source evidence、verification status、source monitoring、rule versioning、cloud workflow、source-specific CSV adapters 和透明 coverage gaps 强于 File In Time。

Beta 阶段排除这些桌面时代功能；只有后续明确重新排序时才重新评估：local DB admin、backup/restore UI、Crystal Reports-style reports、mail merge/labels、extension form printing、arbitrary field renaming、network-user maintenance、detailed rights matrices，以及 email/SMS/calendar reminders。
