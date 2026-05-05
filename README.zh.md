# due-date-hq

本项目基于 [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) 创建，技术栈包含 React、TanStack Router、Hono、tRPC、Drizzle、Cloudflare Workers/D1 等。

## 产品与技术规划

DueDateHQ 采用 Spec-Driven Development（规格驱动开发）。后续所有英文文档都应同步生成中文版本，中文版本使用 `.zh.md` 后缀，供产品 review 和方案讨论。

- Beta 总计划：[docs/due-date-hq-beta-plan.zh.md](docs/due-date-hq-beta-plan.zh.md)
- 产品方案：[docs/product/due-date-hq-product-plan.zh.md](docs/product/due-date-hq-product-plan.zh.md)
- 技术方案：[docs/technical/due-date-hq-beta-technical-plan.zh.md](docs/technical/due-date-hq-beta-technical-plan.zh.md)
- 功能规格索引：[specs/README.zh.md](specs/README.zh.md)

## 功能

- **TypeScript**：类型安全和更好的开发体验
- **TanStack Router**：类型安全的文件路由
- **TailwindCSS**：原子化 CSS
- **Shared UI package**：共享 shadcn/ui 组件位于 `packages/ui`
- **Hono**：轻量后端框架
- **tRPC**：端到端类型安全 API
- **workers**：Cloudflare Workers 运行时
- **Drizzle**：TypeScript-first ORM
- **SQLite/Turso / D1**：数据库引擎
- **Turborepo**：Monorepo 构建系统

## 开始使用

安装依赖：

```bash
pnpm install
```

启动开发服务：

```bash
pnpm run dev
```

Web 应用默认运行在 [http://localhost:5173](http://localhost:5173)。API 默认运行在 [http://localhost:3000](http://localhost:3000)。

## Demo CPA Accounts

本地 Server 可重复 seed demo 数据：

```bash
curl -X POST http://localhost:3000/api/demo/seed
```

该 seed path 会创建三个 CPA 登录账号，共用密码 `DueDateHQ-demo-2026!`：

- `demo-triage@duedatehq.test`：dashboard triage、Verified deadlines、firm target dates、export。
- `demo-coverage@duedatehq.test`：Coverage gaps、unsupported profiles、verification requests、带 Reference 的 entered deadlines。
- `demo-notices@duedatehq.test`：Source changed rules、official notice audit trail、date history。

非 loopback 环境需设置 `DEMO_SEED_TOKEN`，并在请求中发送 `X-Demo-Seed-Token`。

## 可用脚本

- `pnpm run dev`：启动所有应用
- `pnpm run build`：构建所有应用
- `pnpm run dev:web`：仅启动 Web 应用
- `pnpm run dev:server`：仅启动 Server
- `pnpm run check-types`：类型检查
- `pnpm run db:push`：推送数据库 schema
- `pnpm run db:generate`：生成数据库迁移/类型
