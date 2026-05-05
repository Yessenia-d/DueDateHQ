# DueDateHQ Beta 总计划

## 目的

DueDateHQ 是面向 solo CPA 和小型会计事务所的 Beta SaaS 产品，帮助他们管理多州小企业客户的税务义务。产品支持 CPA 导入或手动录入客户，根据已核验税务规则生成可追溯的截止日期任务，并完成每周重点工作分诊。

核心产品原则：

```txt
Traceable tax deadlines, not black-box dates.
可追溯的税务截止日期，而不是黑盒日期。
```

DueDateHQ 维护 50 州税务义务库，在 24 小时检测窗口内监听官方来源变化，并清晰区分已核验系统规则、未核验规则、用户手动录入日期和暂不支持义务。

## 当前交付目标

- 构建真实 Beta 产品，而不是纯前端 Demo。
- 支持通过 Cloudflare 部署给外部用户访问。
- 使用 Spec-Driven Development：每个大功能先写 `specs/<feature>.md`。
- 覆盖两个 P0 用户故事：
  - 从 TaxDome、Drake、Karbon、QuickBooks CSV 导入客户。
  - 让 CPA 通过清晰的截止日期看板完成 Monday triage。
- 增加客户和自定义截止日期的手动录入。
- 增加官方来源监听和税务规则核验队列。
- 增加功能完成进度页，让产品、工程和评审者看到完成状态。

## 核心产品规则

```txt
Only Verified tax rules can create official system-generated deadline tasks.
只有 Verified 税务规则可以生成官方系统截止日期任务。

User-provided deadlines can appear in the user's workspace,
but must be marked as not verified by DueDateHQ.
用户手动录入的截止日期可以出现在工作台中，
但必须标记为未经 DueDateHQ 核验。

Needs review, Source changed, and Unsupported rules must be transparent
but cannot be treated as confirmed deadlines.
Needs review、Source changed 和 Unsupported 规则必须透明展示，
但不能被当作已确认截止日期。
```

## 文档

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
- `specs/monday-triage-dashboard.zh.md`
- `specs/feature-progress-page.zh.md`
- `specs/gtm.zh.md`
- `specs/cloudflare-deployment.zh.md`

## Beta 范围边界

范围内：

- 邮箱密码注册和登录。
- 四类 CSV 来源导入。
- 手动录入客户和截止日期。
- 已核验税务规则生成官方任务。
- 50 州税务义务覆盖矩阵和核验状态。
- 官方来源监听设计和 API 表面。
- 税务规则核验队列。
- Cloudflare 部署计划。

Beta 阶段不做：

- 生产级税务责任保证。
- 完整 OAuth、MFA、组织、邀请、角色权限。
- 未经核验的规则自动发布。
- 完整城市/县/行业级税务自动化。
- 未经人工审核的实时 AI 公告解释。

## GTM 摘要

第一批用户是 solo 多州 CPA。目标定价是 Pro `$49/month`，前 20 个 Beta 用户免费，交换条件是完成 onboarding call、提供去敏 CSV 样本，并每周反馈。

初始获客动作是一个实用 lead magnet：公开的 “50-State Tax Deadline Coverage Tracker”。它使用和产品内部一致的税务义务库与核验状态模型。
