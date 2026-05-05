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

## Deliverables

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
