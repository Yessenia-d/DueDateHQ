# CSV Imports

## Goal

让 CPA 从 TaxDome、Drake、Karbon、QuickBooks CSV 导出中导入客户，preview rows、review 字段映射、处理 likely duplicates、修正缺失字段，并且只在导入客户匹配 Verified tax rules 时创建官方全年 deadline tasks。P0 迁移目标是 CPA 在 30 分钟内完成 30-client import。

## User Flow

1. 用户打开 `/import`。
2. 用户选择来源系统。
3. 用户上传 CSV。
4. 系统在可能时自动识别 client name、EIN、state 和 entity type 字段映射。
5. 系统预览字段映射。
6. 系统检测 headers、validation issues、模糊或缺失字段和 likely duplicate clients。
7. 系统提供智能、非阻塞建议，并将不确定行送入 review。
8. 用户 review 不确定行和 duplicate candidates。
9. 用户提交导入。
10. 系统创建客户。
11. 系统只根据 verified tax rules 创建每个客户的全年官方 deadline calendar/tasks。
12. 用户看到导入摘要并可打开 dashboard。

## Flow Diagram

```mermaid
flowchart TD
  A[Select source] --> B[Upload CSV]
  B --> C[Parse with source adapter]
  C --> D[Detect headers and auto-map key fields]
  D --> E[Preview canonical client shape]
  E --> N{Likely duplicate?}
  N -- Yes --> O[Duplicate review]
  N -- No --> P[Validation review]
  O --> P
  P --> Q{Fuzzy or missing fields?}
  Q -- Yes --> F[Intelligent suggestions and review queue]
  F --> G[User accepts or fixes fields]
  Q -- No --> H[Preview summary]
  G --> H
  H --> I[Commit import]
  I --> J[Create clients]
  J --> K[Match verified tax rules]
  K --> L[Create full-year official deadline tasks]
  L --> M[Show import result]
```

## Pages

- `/import`
  - 来源选择。
  - 文件上传。
  - Header detection。
  - 映射预览。
  - Duplicate review。
  - 行 review。
  - 提交摘要。

## API

- `imports.preview`
  - 输入：来源系统、CSV 文件或文本。
  - 输出：batch id、header detection result、列映射、自动识别的关键字段、mapping confidence、accepted rows、review rows、duplicate candidates、suggestions、validation messages。

- `imports.commit`
  - 输入：batch id、已修正行和 duplicate resolutions。
  - 输出：创建客户数、updated/skipped duplicate count、创建全年 deadline task 数、needs-review 义务数、unsupported 义务数。

## Data Model

`import_batches`

- 来源系统。
- 状态。
- 总行数。
- Accepted rows。
- Review rows。
- Duplicate rows。
- Header detected。
- Adapter version。

`clients`

- 从 canonical import rows 创建。

`deadline_tasks`

- 只从 verified rules 生成。

Canonical client shape：

- Client name。
- EIN。
- Entity type。
- States。
- County。
- Fiscal year type。
- Source system。
- Source row id。

Duplicate candidate shape：

- Incoming row id。
- Existing client id。
- Matched fields。
- Differing fields。
- Suggested action：create、update existing 或 skip。

## Competitor Parity Notes

File In Time 把 import 当作 review workflow，而不是盲目 upload。DueDateHQ 必须覆盖 preview、mapping、header handling、commit 前 review 和 duplicate resolution。DueDateHQ 应该通过 source-specific adapters 做得更好，让 TaxDome、Drake、Karbon、QuickBooks 用户不必每次从 generic delimited file 开始手工 mapping。

## Acceptance Criteria

- TaxDome adapter 支持代表性 TaxDome client export 字段。
- Drake adapter 支持代表性 Drake client export 字段。
- Karbon adapter 支持代表性 Karbon contact export 字段。
- QuickBooks adapter 支持代表性 QuickBooks customer export 字段。
- 从 TaxDome 迁移的 CPA 可在 30 分钟内完成 30 个客户导入。
- 导入性能目标为 `P95 <= 30 minutes for a 30-client import`。
- 系统自动识别 client name、EIN、state 和 entity type 字段映射。
- 模糊或缺失字段获得智能、非阻塞建议，不确定行进入 review，而不是阻塞整个导入。
- 缺失必填字段可以 review，不会被静默丢弃。
- Header detection 和 mapping preview 在 commit 前可见。
- Likely duplicate clients 展示 field differences，并由用户选择处理方式。
- Import commit 创建客户。
- 导入后，匹配的 Verified rules 立即生成每个客户的全年 deadline calendar/tasks。
- 只有 verified rules 生成官方 deadline tasks。
- Needs-review 和 unsupported obligations 保持可见，但不是官方已确认截止日期。
- 相关 P0 能力包括 CSV import、field mapping、calendar/task auto-generation、entity type auto-recognition 和 intelligent field matching。
- 导入摘要解释 generated、needs-review、unsupported obligations。

## Out of Scope

- 完美兼容每一种历史导出格式。
- 与来源产品直接 API 集成。
- 永久存储原始 CSV 文件。
- 与 deadline onboarding 无关的 mail merge、labels 或 client export formats。
