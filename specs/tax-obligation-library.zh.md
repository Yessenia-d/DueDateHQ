# Tax Obligation Library

## Goal

维护结构化的 50 州税务义务库，区分已知税务义务和已核验可安排的 deadline rules，并用透明 obligations、rules、evidence、recurrence 和 extension handling 替代 File In Time-style services。

## User Flow

1. 用户查看 coverage matrix。
2. 用户选择州和税种分类。
3. 用户看到已知义务及其核验状态。
4. Verified rules 可以解释截止日期、extensions 和 recurrence。
5. Unsupported 或 Needs review 义务可以请求覆盖。
6. Upcoming official tasks 从维护过的 Verified rules 生成，而不是依赖 manual rollover。

## Flow Diagram

```mermaid
flowchart TD
  A[Tax obligation library] --> B[Known obligations]
  B --> C{Has verified rule?}
  C -- Yes --> D[Can generate official tasks]
  C -- Needs review --> E[Verification Queue]
  C -- Unsupported --> F[Coverage request]
  D --> G[Evidence drawer]
  G --> H[Generate upcoming tasks]
  G --> I[Show verified extension date]
```

## Pages

- `/coverage`
  - 州和税种分类矩阵。
  - 义务详情。
  - 核验和监听状态。

## API

- `coverage.matrix`
- `coverage.getRule`
- `coverage.requestCoverage`

## Data Model

`tax_obligations`

- Jurisdiction。
- Jurisdiction level。
- Agency。
- Tax category。
- Obligation name。
- Applicable entity types。
- Known status。

`tax_rules`

- 绑定到 obligations 的已核验或未核验规则。
- Filing/payment/extension marker。
- 规则 recurring 时的 recurrence pattern。
- Upcoming generation horizon。
- 官方证据支持 extension handling 时的 extension due date rule。

## Competitor Parity Notes

File In Time 使用 services 定义 work type、frequency、due dates、extension dates 和 task rollover。DueDateHQ 将这个有价值模型映射为 obligations 和 tax rules，但保持信任显式：

- `Verified` rules 可以生成 official tasks、extension dates 和 upcoming recurring tasks。
- `Needs review`、`Source changed`、`Unsupported` obligations 保持可见，但不创建 official tasks。
- User-provided custom deadlines 保持 user-provided，不能伪装成 verified service。
- Official recurring deadlines 应由维护过的 rules 生成。用户不应该为 official deadlines 执行 manual rollover。

## Acceptance Criteria

- Library 可以表示 federal 和 50-state obligations。
- Known obligations 不等于 verified deadlines。
- Verified rules 明确链接官方来源。
- Unsupported obligations 可以展示但不生成任务。
- Verified extension dates 只有在 rule evidence 支持时展示。
- Verified recurring rules 可以在不需要 user rollover 的情况下创建 upcoming official tasks。
- 产品文案清楚解释覆盖状态。

## Out of Scope

- Beta 初期完整城市和县级税务覆盖。
- 行业特定规则自动化。
- 保证每个 known obligation 都有 verified rule。
- Extension form printing。
- 显示为 verified official rules 的用户自定义 services。
- Official recurring deadlines 的 manual rollover。
