# Implementation Plan: 平台基础架构与核心能力

**Branch**: `001-foundation-core` | **Date**: 2025-11-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-foundation-core/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

建立 AI 文档处理平台的基础架构,包括:

- 前端开发环境(SvelteKit + Svelte 5 + FlyonUI + Tailwind CSS v4)
- 核心 UI 组件库与响应式布局系统
- 文件上传与预览能力(图片/PDF/Office,含 LibreOffice 转换)
- 统一服务端 API 架构、错误处理、日志记录
- AI 模型配置与 OpenAI 兼容调用适配层
- 文件存储与生命周期管理(无数据库,基于文件系统)
- 完整国际化基础设施(zh-CN/en-US)
- JS SDK 基础框架

技术方案:前后端一体化 SvelteKit 应用,服务端集成 LibreOffice headless 进行 Office 文档转换,所有 AI 能力通过统一的模型适配层调用 OpenAI 兼容接口,文件采用会话隔离存储并自动清理,全站 i18n 支持,提供独立的 npm SDK 包供编程式集成。

## Technical Context

**Language/Version**: TypeScript 5.x + Node.js 20.x (服务端) / 现代浏览器(前端)
**Primary Dependencies**:

- Frontend: SvelteKit (Svelte 5), FlyonUI, Tailwind CSS v4, pnpm
- Backend: SvelteKit endpoints, LibreOffice (headless mode for Office→PDF conversion)
- Build/Dev: Vite, Vitest, ESLint, Prettier
- i18n: svelte-i18n 或 SvelteKit 内置 i18n 方案
- PDF Viewer: PDF.js 或 compatible library
- HTTP Client (SDK): fetch API / axios

**Storage**:

- 配置: YAML 文件(模型配置、系统参数、i18n 资源)
- 文件存储: 本地文件系统 `/data/{sessionId}/{category}/`
- 会话管理: 内存或轻量 KV 存储(可使用 Map 或 better-sqlite3 临时缓存)
- 无持久化数据库(按宪章要求)

**Testing**: Vitest(单元测试 + 集成测试), Playwright(E2E 测试 - 可选)

**Target Platform**:

- 前端: 现代浏览器(Chrome/Firefox/Safari/Edge 最新版本)
- 服务端: Linux/macOS/Windows with Node.js 20.x
- 部署: 静态导出 + Node.js 服务器 或 SvelteKit adapter

**Project Type**: Web 应用(前后端一体化 SvelteKit monorepo + 独立 SDK 包)

**Performance Goals**:

- 页面首屏加载 < 2 秒
- HMR 热更新 < 1 秒
- 文件上传(50MB) < 30 秒(10Mbps 网络)
- Office 转换(10 页) < 60 秒
- API 响应(非 AI 调用) < 500ms
- 并发支持 10+ 用户同时上传

**Constraints**:

- 单文件上传限制 200MB(可配置)
- Office 转换超时 120 秒(可配置)
- 模型调用超时 180 秒(可配置)
- 会话文件 TTL 24 小时(可配置)
- 无外部数据库依赖
- 必须支持离线开发(除模型调用外)

**Scale/Scope**:

- 初期支持 < 100 并发用户
- 单实例文件存储 < 100GB
- 基础组件库 10+ 个可复用组件
- SDK API 覆盖所有核心功能
- i18n 覆盖 100% UI 文本

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- ✅ **Stack compliance**: SvelteKit (Svelte 5) + FlyonUI + Tailwind CSS v4 + pnpm - 完全符合
- ✅ **SDK-first**: 规划独立 SDK 包 `@idealworld/ai-docs-sdk`,所有核心操作可编程调用
- ✅ **OpenAI-compatible adapters**: 设计统一 ModelService 适配层,支持 ocr/translate/qa/review/extract
- ✅ **i18n**: 所有 UI 字符串使用 i18n key,zh-CN/en-US 资源文件,服务端响应本地化
- ✅ **Logging**: 结构化 JSON 日志(timestamp/level/traceId/context/error.stack),禁用 console.log
- ✅ **Unified API/Errors**: 统一响应格式 `{success, code, message, timestamp, traceId, data/details}`
- ✅ **Accessibility**: 语义 HTML,ARIA 标签,键盘导航,响应式设计
- ✅ **Tests**: Vitest 单元测试覆盖核心模块,包含正常/边界/错误路径
- ✅ **Quality gates**: 配置 `pnpm run check` / `pnpm lint` / `pnpm test` 通过门禁

**评估结果**: 无宪章违规,所有原则在设计阶段已纳入考虑。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

````text
### Source Code (repository root)

```text
# Web application structure (SvelteKit monorepo)

# 主应用
src/
├── routes/                     # SvelteKit 路由
│   ├── +page.svelte           # 主工作台页面
│   ├── +layout.svelte         # 全局布局
│   ├── api/                   # API 端点
│   │   ├── upload/
│   │   │   └── +server.ts     # POST /api/upload
│   │   ├── attachments/
│   │   │   └── +server.ts     # POST /api/attachments
│   │   ├── task/
│   │   │   └── [id]/+server.ts # GET /api/task/:id
│   │   └── health/
│   │       └── +server.ts     # GET /api/health
├── lib/                       # 共享代码库
│   ├── components/            # UI 组件
│   │   ├── layout/
│   │   │   ├── SplitPane.svelte
│   │   │   └── ResizablePanel.svelte
│   │   ├── ui/                # 基础 UI 组件
│   │   │   ├── Button.svelte
│   │   │   ├── Card.svelte
│   │   │   ├── Progress.svelte
│   │   │   ├── Modal.svelte
│   │   │   ├── Dropdown.svelte
│   │   │   └── Notification.svelte
│   │   ├── upload/
│   │   │   └── Uploader.svelte
│   │   └── preview/
│   │       ├── ImagePreview.svelte
│   │       └── PDFPreview.svelte
│   ├── services/              # 业务服务层
│   │   ├── model.service.ts   # 模型配置与调用
│   │   ├── office.service.ts  # LibreOffice 转换
│   │   ├── storage.service.ts # 文件存储管理
│   │   ├── logger.service.ts  # 结构化日志
│   │   └── i18n.service.ts    # 国际化服务
│   ├── stores/                # Svelte stores
│   │   ├── session.ts         # 会话状态
│   │   ├── documents.ts       # 文档状态
│   │   └── ui.ts              # UI 状态
│   ├── utils/                 # 工具函数
│   │   ├── api.ts             # API 客户端封装
│   │   ├── validation.ts      # 验证工具
│   │   └── format.ts          # 格式化工具
│   └── types/                 # TypeScript 类型定义
│       ├── api.ts             # API 契约类型
│       ├── models.ts          # 数据模型
│       └── config.ts          # 配置类型
├── i18n/                      # 国际化资源
│   ├── zh-CN.json
│   └── en-US.json
└── app.css                    # 全局样式(Tailwind)

# SDK 包(独立项目)
packages/
└── sdk/                       # @idealworld/ai-docs-sdk
    ├── src/
    │   ├── client.ts          # SDK 主入口
    │   ├── api/               # API 方法
    │   │   ├── upload.ts
    │   │   ├── task.ts
    │   │   └── index.ts
    │   ├── types/             # TypeScript 类型
    │   └── utils/             # SDK 工具
    ├── tests/                 # SDK 测试
    ├── package.json
    └── tsconfig.json

# 配置文件
config/
├── models.yaml                # 模型配置
├── system.yaml                # 系统配置(上传限制/TTL/超时等)
└── storage.yaml               # 存储配置

# 数据目录(运行时)
data/
└── {sessionId}/               # 按会话隔离
    ├── uploads/               # 原始上传文件
    ├── converted/             # 转换后的 PDF
    └── results/               # AI 处理结果

# 测试
tests/
├── unit/                      # 单元测试
│   ├── services/
│   ├── components/
│   └── utils/
├── integration/               # 集成测试
│   └── api/
└── e2e/                       # E2E 测试(可选)
    └── playwright/

# 项目配置
svelte.config.js               # SvelteKit 配置
vite.config.ts                 # Vite 配置
tailwind.config.js             # Tailwind 配置
vitest.config.ts               # Vitest 配置
tsconfig.json                  # TypeScript 配置
package.json                   # 项目依赖
pnpm-workspace.yaml            # pnpm workspace 配置
````

**Structure Decision**:
采用 SvelteKit monorepo 结构,主应用包含前后端一体化代码,SDK 作为独立 workspace 包。选择此结构的原因:

1. SvelteKit 天然支持前后端一体化,简化开发和部署
2. Monorepo 便于主应用和 SDK 共享类型定义和工具函数
3. 独立 SDK 包便于版本管理和外部集成
4. 文件系统存储无需复杂的数据层抽象
5. 符合宪章要求的"无数据库、配置文件化"原则

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**无违规**: 本项目完全符合宪章要求,无需复杂性追踪。
