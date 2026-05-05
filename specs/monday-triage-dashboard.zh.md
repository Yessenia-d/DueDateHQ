# Monday Triage Dashboard

## Goal

为 CPA 提供快速的每周截止日期分诊工作台，并为每个官方或 user-provided deadline 提供清晰核验证据、urgency surfaces、filters/sorting、extension handling 和 export。

## User Flow

1. 用户登录。
2. 用户进入 dashboard。
3. 用户查看 due today、`Due this week`、`This month`、`Long range`。
4. 用户筛选并排序任务。
5. 用户为可疑日期打开 evidence。
6. 用户更新任务状态或标记 verified extension state。
7. 用户导出当前 task view 进行 workload review。

## Flow Diagram

```mermaid
flowchart TD
  A[Dashboard] --> B[Due this week]
  A --> C[This month]
  A --> D[Long range]
  A --> L[Due today urgency]
  B --> E[Open evidence drawer]
  B --> F[Update task status]
  A --> G[Filter and sort by client/state/entity/tax/status/verification]
  E --> H{Verification status}
  H -- Verified --> I[Show official source]
  H -- Source changed --> J[Show warning]
  H -- User provided --> K[Show user source note]
  A --> M[Export current view]
```

## Pages

- `/`
  - Dashboard sections。
  - Filters。
  - Task rows。
  - Evidence drawer。

## API

- `dashboard.summary`
- `dashboard.export`
- `tasks.updateStatus`
- `tasks.getEvidence`

## Data Model

读取：

- `clients`
- `deadline_tasks`
- `tax_rules`
- `tax_rule_versions`
- `official_sources`
- `source_check_runs`

Task statuses：

- `not_started`
- `in_progress`
- `extended`
- `done`

Task row fields：

- Client。
- Obligation。
- Jurisdiction/state。
- Tax category。
- Due date。
- Days remaining。
- Status。
- 支持时显示 extension status 和 extension due date。
- Verification badge。

Source types：

- `verified_rule`
- `user_provided`

## Competitor Parity Notes

File In Time 支持 weekly task views、status updates、extension flags、startup reminders、calendar counts、filtering/sorting 和 Excel export。DueDateHQ 应以默认 Monday triage surface、更强 trust badges、evidence drawer access、dashboard 内 due today/this week/this month urgency，以及 current task view export 覆盖有价值工作流。外部 reminder channels 和重型 reporting 不进入 Beta。

## Acceptance Criteria

- Dashboard 将任务分为三个时间区间。
- Dashboard 内可见 due today、due this week、due this month urgency。
- Task row 显示 due date、countdown、client、jurisdiction、tax category、task status、verification badge。
- Filters 和 sorting 覆盖 date horizon、client、jurisdiction/state、entity type、tax type、task status 和 verification status。
- Verified tasks 可以打开 evidence drawer。
- Source changed tasks 显示 warning。
- User-provided tasks 显示 not verified label。
- Rule evidence 支持时，verified extension dates 和 `extended` status 可见。
- Task status 可以更新。
- Current task view 可以导出用于 workload sharing 或 review。

## Out of Scope

- Calendar sync。
- Email/SMS reminders。
- 多用户任务分配工作流。
- Crystal Reports-style reports。
- Mail merge 和 labels。
- Extension form printing。
- Arbitrary field renaming 和重型 saved-view configuration。
