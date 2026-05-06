# 为 CSV Import Review 添加源文件行级对比

## 目标

让 CSV import review 足够安全，适合 CPA 做客户迁移。当前 raw CSV text 展示价值很低，应该改成源文件行级、字段级对比：把 source file 中的原始值和 DueDateHQ 即将提交的 canonical filing/tax profile 放在一起审。

用户必须能对每一行回答：source file 写了什么，DueDateHQ 会保存什么，哪里被改了，哪里需要 review，以及这一行是否可以安全 commit。

## 已知事实

- CSV import 是高信任工作流。错误 import 可能创建错误的 Client Relationships、Filing Profiles，以及后续生成的 Deadline Tasks。
- 当前 import page 已经支持解析 source CSV text、field mapping preview、accepted/review rows、duplicate candidates、relationship suggestions、corrections 和 commit。
- 当前大 CSV textarea 主要展示 raw input。它对 paste fallback 有用，但对行级 review 没什么用。
- API preview response 已经包含 `rowIndex`、`sourceRowId`、`canonicalProfile`、`sourceFields`、mapping metadata、accepted rows 和 review rows。
- 项目规则要求 imported source IDs 只能作为外部 source IDs，不能成为 DueDateHQ internal IDs。
- raw CSV files 不能永久存储。现有 import metadata 目标是在不保存整份 raw CSV 的前提下支持 audit。
- DueDateHQ 产品设计偏向 dense、calm、audit-friendly tables、明确 status badges、drawers 和 before/after diffs。
- 用户要求本任务同步生成中文文档。保持本 PRD 和 `prd.md` 同步。

## 需求

### Upload 和 Preview 入口

- 保留 file upload 和 paste/manual CSV text 两种输入方式。
- preview 成功后，把 raw CSV textarea 降级为输入 affordance，不再作为主要 review surface。
- 显著展示 import source metadata：file name（如果有）、detected source profile、adapter version、total rows、header detection、recognized/unmapped columns 和 mapping confidence。
- commit 前继续展示 validation messages。

### 行级 Source Comparison

- 每个 accepted row 和 review row 都必须能查看 source row evidence。
- 主 review table 继续展示 DueDateHQ 即将 commit 的 canonical profile values。
- 每行必须显示 `sourceRowId` 和 source row number。
- 打开某一行后，显示 source comparison panel 或 drawer，包含：
  - source row id 和 row index
  - canonical profile values
  - 原始 source fields 的 key/value pairs
  - mapped fields 和 unmapped fields 分组或高亮区分
  - review messages 和 problem types
  - 如果存在 duplicate 或 relationship suggestion，也展示相关 context

### 字段级 Comparison

- 对高风险或需要 review 的字段，UI 必须在 editable DueDateHQ value 附近展示原始 source column/value。
- 范围内字段：
  - client name
  - filing profile name
  - entity type
  - state/states
  - EIN
  - SSN last four
  - source client id
- 如果用户编辑字段，UI 必须让 edited value 和 original source value 可区分。
- 如果字段没有从 source column map 出来，UI 必须明确说明，不能暗示 source 已确认。

### Duplicate 和 Relationship Review

- Duplicate candidate review 应该对比 incoming source row values 和 existing DueDateHQ client relationship values。
- Relationship suggestions 仍然必须是 CPA 显式决策。comparison view 不能暗示自动 merge。
- Bulk actions 可以保留，但 selected rows 仍然必须保留 row-level evidence。

### Commit Safety

- 必须等 required duplicate 和 relationship decisions resolved 后，Commit 才能启用。
- Commit copy 应该提 reviewed rows/profiles，不要围绕 raw CSV text 表达。
- Commit result 继续总结 created/matched clients、filing profiles、verified tasks、review items、coverage gaps 和 unsupported obligations。
- commit 后只有 Verified Tax Rules 可以生成 official Deadline Tasks。

### Data 和 Privacy 边界

- 不永久存储 raw CSV file 或 full raw CSV text。
- 可以持久化 audit 和 row comparison 所需的 row-level `sourceFields`、mapping metadata、adapter version、detected profile 和 review decisions。
- identifiers 必须按字符串保留，包括 leading zeros。
- 本任务不把 customer PII 发送给 AI services。

### Documentation

- 保持本任务的 `prd.md` 和 `prd.zh.md` 同步。
- 如果本任务修改 `docs/` 或 `specs/` 下的英文 markdown，同一 change set 必须更新对应 `.zh.md` 文件。
- 如果 implementation 改变 CSV import product contract，更新 `specs/csv-imports.md` 和 `specs/csv-imports.zh.md`。

## 推荐 UX 方案

采用 “A plus targeted B”：

- 主模式：row evidence drawer。review table 保持 dense，每一行可以打开 source comparison drawer。
- 局部 inline evidence：对 low-confidence、needs-review、unmapped 或 user-edited fields，在 input 附近直接显示 original source value。
- MVP 不做完整 side-by-side raw CSV grid。它实现更重，也会把 CPA 拉回手动读 source columns，而不是审系统决策。

## 验收标准

- [ ] preview 成功后，raw CSV textarea 不再主导 review step。
- [ ] 每个 review row 都有明确入口打开 source row comparison。
- [ ] Source comparison 展示同一行的 canonical profile values 和 original source fields。
- [ ] mapped 和 unmapped source fields 在视觉上可区分。
- [ ] low-confidence、review-required、unmapped 或 edited fields 在 editable field 附近展示 source evidence。
- [ ] duplicate rows 在 review flow 中展示 incoming vs existing differences。
- [ ] relationship suggestions 仍然是明确 accept/reject decisions。
- [ ] raw CSV 不被永久存储。
- [ ] 如果 API shape 变化，更新或扩展现有 import preview/commit tests。
- [ ] Web route changes 通过 type-check。
- [ ] Browser verification 确认 import review 在 desktop 上可快速扫描，在 mobile 上可用。

## 不在范围内

- 完整 spreadsheet-style raw CSV diffing。
- 永久 raw CSV file storage。
- 与 TaxDome、Drake、Karbon 或 QuickBooks 的 direct API integrations。
- AI-based import correction。
- 直接从 imported CSV data 创建 official deadlines。
- 重写整个 import adapter system。

## 技术备注

- 可能涉及 frontend file：`apps/web/src/routes/import.tsx`。
- 如果 response shape 需要变化，可能涉及 API file：`packages/api/src/routers/imports.ts`。
- 现有 API row shape 已经包含 `sourceFields`、`rowIndex` 和 `sourceRowId`，所以 MVP 可能主要是 frontend work。
- 现有 feature spec：`specs/csv-imports.md`。
- 产品设计 source：`DESIGN.md`，尤其是 Import Review、Tables、Drawers、Diff Panels 和 Accessibility。
