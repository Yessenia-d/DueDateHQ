# DueDateHQ 产品方案

## 产品定位

DueDateHQ 是面向 solo CPA 和小型会计事务所的税务截止日期操作系统，服务对象是管理多州小企业客户的税务专业人士。

它替代分散的 Excel、日历、人工州税局网站检查和不确定的截止日期笔记，提供：

- 50 州税务义务库。
- 可追溯的截止日期证据。
- CSV 和手动客户 onboarding。
- Monday triage 工作台。
- 官方来源变化的核验工作流。

产品承诺：

```txt
Know what is due, why it is due, and whether the source is verified.
知道什么到期、为什么到期，以及来源是否已核验。
```

## 目标用户

主要 ICP：

- Solo CPA 或 1-3 人小型事务所。
- 服务 30-100 个小企业客户。
- 处理多州客户。
- 使用 Excel、Outlook/Google Calendar、TaxDome、Drake、Karbon、QuickBooks 或混合工具。
- 极度担心漏掉截止日期，但无法承受昂贵复杂的企业级事务所管理工具。

主要 Persona：

- Sarah Mitchell, CPA。
- 80 个客户，多州经营。
- 申报季每周一早上要花 30-45 分钟确认本周到底要做什么，之后才能开始真正税务工作。

## 核心用户故事

### Story 1：Monday Triage

作为一名服务 80 个多州客户的 solo CPA，我希望打开产品 30 秒内看到本周需要行动的所有截止日期，这样我就能安排本周优先级，而不必交叉检查表格、日历和笔记。

验收标准：

- Dashboard 默认分为 `Due this week`、`This month`、`Long range`。
- 每个任务显示倒计时、客户、州、表单/义务、核验状态和来源证据入口。
- 支持按客户、州、实体类型、税种、任务状态、核验状态筛选。
- 任务可标记为 `Not started`、`In progress`、`Extended`、`Done`。

### Story 2：CSV 导入

作为从 TaxDome、Drake、Karbon 或 QuickBooks 迁移的 CPA，我希望从 CSV 导入客户并自动生成可用日历，这样我可以在繁忙申报季快速开始使用产品。

验收标准：

- 存在四类 CSV 来源 adapter。
- 提交前展示字段映射。
- 缺失或不确定字段进入 review 步骤。
- 导入后只有 Verified 税务规则会生成官方任务。
- Unsupported 和 Needs review 义务可见，但不会作为已确认截止日期被安排。

### Story 3：手动录入

作为要新增客户或特殊义务的 CPA，我希望手动创建客户和截止日期，让 DueDateHQ 仍然作为单一工作台。

验收标准：

- CPA 可以手动添加客户。
- CPA 可以添加一次性或重复的自定义截止日期。
- 手动添加的截止日期显示在 dashboard。
- 手动截止日期标记为 `User provided · Not verified by DueDateHQ`。
- 用户可以请求 DueDateHQ 核验手动截止日期。

### Story 4：官方来源监听

作为依赖 DueDateHQ 的 CPA，我希望平台监听官方税务来源，这样变更截止日期和新政策能被快速发现，不会静默过期。

验收标准：

- 每个官方来源都有监听状态和最后检查时间。
- 来源变化会创建规则变更候选。
- 受影响规则变为 `Source changed`。
- Source changed 规则不能生成新的官方任务。
- 更新规则必须人工核验后才能发布。

## 产品模块

### Auth

Beta 用户使用邮箱和密码注册登录。因为 CSV 和客户截止日期是用户级数据，所以需要认证。OAuth、MFA、组织成员、密码重置是后续阶段功能。

### Client Onboarding

两个入口：

- CSV 导入，用于迁移和批量初始化。
- 手动录入，用于新增客户、边界情况和快速补充。

CSV 导入支持 TaxDome、Drake、Karbon、QuickBooks，通过来源专属 adapter 归一化为统一客户结构。

### Tax Obligation Library

DueDateHQ 维护联邦和 50 州税务义务库。义务是否已知与是否已有已核验截止日期规则是两回事。

关键区分：

```txt
Known obligation does not mean verified deadline.
知道某项义务存在，不代表已有可确认截止日期。
```

义务库保存：

- 管辖区。
- 机构。
- 税种分类。
- 适用实体类型。
- 申报/付款/延期义务。
- 官方来源。
- 核验状态。
- 规则版本。
- 最后检查和最后核验时间。

### Verification Status System

税务规则核验状态：

| 状态 | 含义 | 是否可生成官方任务 | 主要展示位置 |
|---|---|---:|---|
| `Verified` | 官方来源和规则已审核，可安全使用 | 是 | Dashboard、Coverage、Evidence |
| `Needs review` | 存在候选规则，但审核未完成 | 否 | Verification Queue、Coverage |
| `Source changed` | 之前已核验的来源发生变化，需要重新核验 | 不生成新任务 | Dashboard warning、Verification Queue |
| `Unsupported` | 已知义务，但 DueDateHQ 暂不能安全安排 | 否 | Coverage Matrix |

手动截止日期来源状态：

| 来源类型 | 含义 | Dashboard 行为 |
|---|---|---|
| `User provided` | 用户手动录入截止日期 | 作为用户任务显示，但明确标注未经 DueDateHQ 核验 |

### Evidence Drawer

每个官方截止日期任务都可以打开 Deadline Evidence 抽屉。

展示：

- 客户。
- 规则名称。
- 计算出的到期日期。
- 日期计算解释。
- 官方来源名称和 URL。
- 核验状态。
- 来源最后检查时间。
- 来源最后变化时间。
- 当前规则版本。
- 上一版本。
- 审计记录。
- 操作：`Mark reviewed`、`Report issue`、`Request re-verification`。

### Coverage Matrix

Coverage Matrix 是产品透明度层，展示所有州和主要税种的核验与监听状态。

字段包括：

- State。
- Tax category。
- Source agency。
- Verification status。
- Monitor status。
- Last checked。
- Last changed。
- Last verified。
- Request coverage。

### Official Source Monitoring

DueDateHQ 用 24 小时检测 SLA 监听官方来源。

产品原则：

```txt
24h detect, not blindly auto-verify.
24 小时内发现变化，但不盲目自动核验。
```

系统可以检测变化、创建候选、进入核验队列，但不能未经审核自动发布新的 Verified 规则。

### Verification Queue

用于维护义务库的内部工作流。

队列：

- `Needs review`：新的或不确定的规则。
- `Source changed`：已核验官方来源发生变化。
- `User requested`：用户请求核验手动截止日期或缺失覆盖。

审核员可批准或拒绝候选。批准会发布新的 tax rule version，并恢复 `Verified` 状态。

### Monday Triage Dashboard

CPA 的主要工作台。

分区：

- `Due this week`。
- `This month`。
- `Long range`。

每行任务包括：

- 客户。
- 义务。
- 管辖区。
- 到期日。
- 剩余天数。
- 任务状态。
- 核验 badge。
- 来源证据入口。

### Feature Progress Page

内部和评审页面，用于展示产品 readiness。

分组：

- Auth。
- CSV imports。
- Manual entry。
- Tax obligation library。
- Source monitoring。
- Verification queue。
- Coverage matrix。
- Dashboard。
- Deployment。
- GTM。
- Docs/specs。

状态：

- `Done`。
- `In progress`。
- `Blocked`。
- `Not started`。

## GTM 方案

### 第一批用户

目标第一批用户：

- Solo 多州 CPA。
- 使用表格或基础日历的 CPA owner。
- 活跃在专业社区的 CPA。

选择原因：

- 痛点最强。
- 决策链最短。
- 最可能提供真实 CSV 样本。
- 最容易感受到来源证据带来的信任价值。

### 定价

Beta：

- 前 20 个用户免费。
- 要求完成 onboarding call。
- 要求提供去敏 CSV 样本或手动录入 walkthrough。
- 要求 Beta 期间每周反馈。

付费：

- Pro：`$49/month`。
- 后续可提供年付 20% 折扣。

定价理由：

- Solo CPA 能承受。
- 能传达专业合规工具价值。
- 与一次漏报成本或 CPA 一小时工时相比有明确 ROI。

### 渠道

- Reddit：r/taxpros、r/Accounting。
- 面向 CPA firm owner 的 LinkedIn 内容。
- 州 CPA Society 群组。
- AICPA 和 CPA 会议社区。
- CPA Practice Advisor 内容和产品目录。
- 围绕州申报截止日和 PTE election 截止日的搜索内容。

### Lead Magnet

公开的 “50-State Tax Deadline Coverage Tracker”。

它使用和产品内部一致的模型：

- State。
- Tax category。
- Verification status。
- Last checked。
- Last verified。
- Request coverage。

### 早期指标

第一里程碑：

- 20 个 waitlist signups。
- 10 个 onboarding calls。
- 5 个真实 CSV imports。
- 3 个付费转化意向。

激活指标：

```txt
User imports or manually enters at least 10 clients and completes one Monday triage session.
用户导入或手动录入至少 10 个客户，并完成一次 Monday triage。
```

## 产品风险

### 税务准确性风险

缓解：

- 核验状态。
- 官方来源链接。
- Evidence drawer。
- 发布前人工 review。
- 未核验规则不生成官方任务。

### 覆盖风险

缓解：

- Coverage matrix。
- 明确 unsupported 州和税种。
- Request coverage 操作。

### 信任风险

缓解：

- 在上下文中展示来源证据。
- 不过度承诺 “all deadlines verified”。
- 区分官方系统生成任务和用户手动任务。

### Onboarding 风险

缓解：

- 四类 CSV adapters。
- 手动录入兜底。
- 不确定字段进入 review queue。

## Beta 验收标准

- CPA 可以注册、导入或手动录入客户，并看到截止日期任务。
- CPA 可以理解一个 Verified 截止日期为什么存在、来自哪里。
- 产品清楚标注未核验、来源变化、暂不支持和用户手动录入项。
- 系统设计支持 24 小时官方来源变化检测，且不会自动发布未审核规则。
- 产品有明确的前 20 个 Beta 用户 GTM 动作。
