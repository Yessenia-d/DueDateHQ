# Coverage Matrix

## Goal

向用户展示 DueDateHQ 知道哪些州、税种和义务，哪些规则已核验，以及哪些来源正在被监听。

这是相比 File In Time-style bundled service lists 的透明度改进。用户应该直接看到 coverage gaps、source monitoring 和 verification status，而不是默认认为每个 known obligation 都可以安全安排。

## User Flow

1. 用户打开 `/coverage`。
2. 用户按 state、entity type、tax category 或 verification status 筛选。
3. 用户看到 coverage cells 和 monitor status。
4. 用户打开 coverage detail。
5. 用户可以查看 evidence 或 request coverage。

## Flow Diagram

```mermaid
flowchart TD
  A[Open coverage] --> B[Filter matrix]
  B --> C[Select state/tax category]
  C --> D{Verification status}
  D -- Verified --> E[Open evidence]
  D -- Needs review --> F[View review state]
  D -- Source changed --> G[View source change warning]
  D -- Unsupported --> H[Request coverage]
```

## Pages

- `/coverage`
  - Coverage matrix。
  - 筛选控件。
  - Rule detail panel。
  - Request coverage action。

## API

- `coverage.matrix`
- `coverage.getRule`
- `coverage.requestCoverage`

## Data Model

读取：

- `tax_obligations`
- `tax_rules`
- `official_sources`
- `source_check_runs`
- `verification_requests`

展示字段：

- State。
- Tax category。
- Obligation name。
- Verification status。
- Monitor status。
- Last checked。
- Last changed。
- Last verified。
- Source agency。

## Acceptance Criteria

- Matrix 包含 50 个州。
- Matrix 区分 known obligations 和 verified rules。
- Verified cells 链接到 evidence。
- Source changed cells 显示 warning。
- Unsupported cells 不暗示已支持安排。
- 存在官方来源时显示 monitor status。
- Needs-review 和 unsupported entries 可见，但不能被呈现为 verified official deadlines。

## Out of Scope

- Public SEO page 实现。
- Beta 阶段完整 city/county coverage。
