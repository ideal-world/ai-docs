# 开发指南 / Development Guide

## 目录 / Table of Contents

- [架构概览 / Architecture Overview](#架构概览--architecture-overview)
- [代码组织 / Code Organization](#代码组织--code-organization)
- [开发规范 / Development Conventions](#开发规范--development-conventions)
- [开发工作流 / Development Workflow](#开发工作流--development-workflow)
- [测试策略 / Testing Strategy](#测试策略--testing-strategy)
- [调试技巧 / Debugging Tips](#调试技巧--debugging-tips)

---

## 架构概览 / Architecture Overview

### 系统架构 / System Architecture

AI 文档处理平台采用全栈式架构，基于 SvelteKit 构建前后端一体化应用：

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Svelte 5 + FlyonUI Components              │  │
│  │  (Upload, Preview, OCR, Translate, QA, Extract...)   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────────────┐
│                   SvelteKit Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          API Routes (/api/*)                         │  │
│  │  - upload, health, task, files, config/reload        │  │
│  └──────────────────────┬───────────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │          Business Services                           │  │
│  │  - ModelService (AI模型调用与管理)                   │  │
│  │  - CleanupService (会话过期与清理)                   │  │
│  │  - StorageService (文件存储与生命周期)               │  │
│  └──────────────────────┬───────────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │          Middleware (hooks.server.ts)                │  │
│  │  - Request Logging (traceId生成)                     │  │
│  │  - i18n Language Detection (Accept-Language)         │  │
│  │  - Cleanup Scheduler (定期任务初始化)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬──────────────┬───────────────────────┘
                      │              │
         ┌────────────▼──────┐  ┌────▼─────────────┐
         │  File Storage     │  │  OpenAI API /    │
         │  (./data/)        │  │  Compatible      │
         │  Session-based    │  │  Model Services  │
         └───────────────────┘  └──────────────────┘
```

### 核心设计原则 / Core Design Principles

1. **会话隔离 / Session Isolation**: 每个上传会话创建独立的 `./data/{sessionId}/` 目录，避免跨会话干扰
2. **文件化配置 / File-based Configuration**: 使用 `config/models.yaml` 配置 AI 模型，无需数据库
3. **内存注册表 / In-memory Registries**: 文件和任务信息存储在内存 Map 中，简化状态管理
4. **统一响应格式 / Unified Response Format**: 所有 API 遵循 `{ success, code, message, timestamp, traceId, data }` 结构
5. **编译时 i18n / Compile-time i18n**: 使用 @inlang/paraglide-js 实现零运行时开销的国际化

---

## 代码组织 / Code Organization

### 目录结构 / Directory Structure

```
ai-docs/
├── src/
│   ├── routes/                     # SvelteKit 路由
│   │   ├── +page.svelte           # 主页面 (UI 工作台)
│   │   ├── +layout.svelte         # 全局布局 (语言切换器)
│   │   └── api/                   # API 端点
│   │       ├── health/            # 健康检查
│   │       ├── upload/            # 文件上传
│   │       ├── task/[id]/         # 任务查询
│   │       ├── files/             # 文件操作
│   │       ├── attachments/       # 附加文档管理
│   │       └── config/reload/     # 配置重载
│   ├── lib/
│   │   ├── components/            # Svelte 组件
│   │   │   ├── upload/           # 上传组件 (Card.svelte, ImagePreview.svelte)
│   │   │   └── ui/               # 通用 UI 组件 (ResizablePanel.svelte)
│   │   ├── services/             # 业务逻辑服务
│   │   │   ├── model.service.ts  # AI 模型选择与调用
│   │   │   └── cleanup.service.ts # 会话清理与 TTL 管理
│   │   ├── types/                # TypeScript 类型定义
│   │   │   └── index.ts          # 共享类型 (FileRecord, TaskRecord)
│   │   └── utils/                # 工具函数
│   │       ├── api.ts            # API 响应格式化与 i18n 解析
│   │       ├── storage.ts        # 文件系统操作
│   │       └── logger.ts         # 结构化日志记录
│   └── hooks.server.ts           # 服务器钩子 (中间件)
├── config/
│   └── models.yaml               # AI 模型配置
├── messages/                     # i18n 消息文件
│   ├── zh-cn.json               # 简体中文
│   └── en-us.json               # 美式英语
├── data/                         # 运行时文件存储 (gitignored)
│   └── {sessionId}/             # 按会话隔离的目录
│       ├── main/                # 主文档
│       ├── attachments/         # 附加文档
│       └── results/             # 处理结果
├── tests/
│   ├── unit/                    # 单元测试
│   └── integration/             # 集成测试
├── docs/                        # 开发文档
└── specs/                       # 需求规格说明
```

### 文件命名规范 / File Naming Conventions

- **组件**: PascalCase (e.g., `Card.svelte`, `ImagePreview.svelte`)
- **工具/服务**: camelCase with `.ts` (e.g., `model.service.ts`, `logger.ts`)
- **类型**: camelCase with `.d.ts` 或 `index.ts` (e.g., `types/index.ts`)
- **路由**: kebab-case 目录 + `+page.svelte` (e.g., `api/config/reload/+server.ts`)

---

## 开发规范 / Development Conventions

### TypeScript 规范

1. **严格模式**: 项目启用 TypeScript strict mode
2. **显式类型**: 所有公共函数和服务方法必须显式声明参数和返回类型
3. **避免 any**: 除非必要（如动态 JSON 解析），使用 `unknown` 替代 `any`
4. **类型导入**: 使用 `import type` 导入仅类型引用

```typescript
// ✅ 推荐
import type { FileRecord, TaskRecord } from '$lib/types';
export function createFileRecord(data: unknown): FileRecord {
	// ...
}

// ❌ 避免
export function createFileRecord(data: any) {
	// ...
}
```

### Svelte 5 Runes 规范

项目使用 Svelte 5 的 runes 模式，而非传统的响应式语法：

```svelte
<script lang="ts">
	// ✅ 使用 runes
	let count = $state(0);
	let doubled = $derived(count * 2);

	function increment() {
		count += 1;
	}

	// ❌ 避免旧式语法
	// let count = 0;  // 不会触发响应式更新
	// $: doubled = count * 2;  // 已废弃
</script>
```

### API 设计规范

所有 API 端点遵循以下规范：

1. **统一返回格式**: 使用 `src/lib/utils/api.ts` 的辅助函数

```typescript
import { apiSuccess, apiError } from '$lib/utils/api';

// 成功响应
return apiSuccess({ fileId: '123', name: 'doc.pdf' });

// 错误响应
return apiError(400, 'error.upload.invalid_format', {
	allowedFormats: ['jpg', 'png', 'pdf']
});
```

2. **TraceId 传播**: 从 `event.locals.traceId` 获取并传递

```typescript
export async function POST({ request, locals }) {
	const traceId = locals.traceId;
	logger.info('File uploaded', { eventType: 'upload', traceId });
	// ...
}
```

3. **错误处理**: 捕获所有异常并返回结构化错误

```typescript
try {
	// 业务逻辑
} catch (err) {
	logger.error('Upload failed', {
		eventType: 'upload.error',
		error: err instanceof Error ? err.message : String(err),
		traceId
	});
	return apiError(500, 'error.upload.failed');
}
```

### 日志规范

使用 `src/lib/utils/logger.ts` 记录结构化日志：

```typescript
import { logger } from '$lib/utils/logger';

// ✅ 携带上下文信息
logger.info('Model selected', {
	eventType: 'model.select',
	modelId: 'gpt-4o',
	category: 'ocr',
	traceId
});

// ❌ 避免纯字符串日志
console.log('Model selected: gpt-4o');
```

**关键事件类型** (`eventType` 字段):

- `upload`, `upload.error`
- `convert.start`, `convert.done`, `convert.error`
- `model.select`, `model.call`, `model.error`
- `cleanup.start`, `cleanup.done`
- `session.expire`

---

## 开发工作流 / Development Workflow

### 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填写 OpenAI API Key

# 3. 启动开发服务器 (热重载)
pnpm dev

# 4. 访问应用
# http://localhost:5173
```

### 构建与预览

```bash
# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 质量检查

```bash
# TypeScript 类型检查
pnpm check

# ESLint 代码检查
pnpm lint

# Prettier 格式化
pnpm format

# 运行所有质量检查
pnpm test && pnpm lint && pnpm check
```

### 添加新功能流程

1. **阅读规格说明**: 参考 `specs/001-foundation-core/spec.md` 和 `tasks.md`
2. **创建分支**: `git checkout -b feature/your-feature-name`
3. **编写代码**:
   - 如为 API: 在 `src/routes/api/` 创建端点
   - 如为组件: 在 `src/lib/components/` 创建组件
   - 如为服务: 在 `src/lib/services/` 创建服务
4. **添加类型**: 在 `src/lib/types/index.ts` 定义 TypeScript 类型
5. **更新 i18n**: 在 `messages/zh-cn.json` 和 `messages/en-us.json` 添加消息键
6. **编写测试**: 在 `tests/unit/` 或 `tests/integration/` 添加测试
7. **质量检查**: 运行 `pnpm check && pnpm lint`
8. **提交代码**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

---

## 测试策略 / Testing Strategy

### 单元测试 (Unit Tests)

**位置**: `tests/unit/`

**覆盖范围**:

- 工具函数 (`logger.ts`, `storage.ts`, `api.ts`)
- 服务逻辑 (`model.service.ts`, `cleanup.service.ts`)
- 数据验证和转换

**示例**:

```typescript
// tests/unit/logger.test.ts
import { describe, it, expect } from 'vitest';
import { logger } from '$lib/utils/logger';

describe('Logger', () => {
	it('should format log with eventType', () => {
		const log = logger.info('Test', { eventType: 'test' });
		expect(log).toContain('"level":"info"');
		expect(log).toContain('"eventType":"test"');
	});
});
```

### 集成测试 (Integration Tests)

**位置**: `tests/integration/`

**覆盖范围**:

- 完整上传流程
- 文件转换流程
- 会话清理流程
- API 端点集成

**示例**:

```typescript
// tests/integration/upload.test.ts
import { describe, it, expect } from 'vitest';

describe('Upload Flow', () => {
	it('should upload file and create session', async () => {
		const formData = new FormData();
		formData.append('files', new File(['test'], 'test.jpg'));

		const response = await fetch('http://localhost:5173/api/upload', {
			method: 'POST',
			body: formData,
			headers: { 'X-Session-ID': 'test-session' }
		});

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.data.files).toHaveLength(1);
	});
});
```

### E2E 测试 (End-to-End Tests)

**工具**: Playwright (可选，未来添加)

**覆盖范围**:

- 用户完整工作流 (上传 → 预览 → OCR → 导出)
- 跨浏览器兼容性
- 可访问性测试

### 运行测试

```bash
# 运行所有单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 运行所有测试
pnpm test

# 生成覆盖率报告
pnpm test:coverage
```

---

## 调试技巧 / Debugging Tips

### 日志调试

在开发模式下，所有日志会输出到控制台：

```typescript
// 服务器端日志
logger.info('Debug info', { eventType: 'debug', data: yourVariable });

// 客户端日志
console.log('[DEBUG]', yourVariable);
```

### TraceId 追踪

每个请求都有唯一的 `traceId`，可用于追踪完整调用链：

```bash
# 在日志中搜索特定请求
grep "traceId\":\"abc-123" logs/app.log
```

### 模型配置调试

```bash
# 重载模型配置
curl -X POST http://localhost:5173/api/config/reload

# 检查健康状态
curl http://localhost:5173/api/health
```

### 会话调试

```bash
# 查看当前会话目录
ls -la data/{sessionId}/

# 手动触发清理
# (在 hooks.server.ts 中修改 cleanupInterval 为更短时间)
```

### 构建调试

```bash
# 查看详细构建日志
pnpm build --verbose

# 分析包大小
pnpm build && du -sh .svelte-kit/output/client/_app/immutable/chunks/*
```

---

## 常见问题 / FAQ

### Q1: 为什么使用文件系统而不是数据库？

**A**: 本项目为 MVP 阶段，文件系统足以满足需求：

- 简化部署 (无需数据库配置)
- 天然的会话隔离 (目录结构)
- 易于清理 (TTL 删除整个目录)

未来可扩展为数据库存储。

### Q2: 如何添加新的 AI 模型？

**A**: 编辑 `config/models.yaml`:

```yaml
ocr:
  - id: my-new-model
    name: My New OCR Model
    provider: openai
    model: gpt-4-vision-preview
    endpoint: https://api.openai.com/v1/chat/completions
    apiKey: ${OPENAI_API_KEY}
    timeout: 60000
    max_concurrency: 5
    enabled: true
```

然后调用 `/api/config/reload` 重载配置。

### Q3: 如何扩展支持新文件格式？

**A**:

1. 在 `src/lib/types/index.ts` 的 `FileFormat` 类型添加格式
2. 在上传验证逻辑中添加 MIME 类型检查
3. 如需转换，更新 LibreOffice 调用逻辑

### Q4: 为什么使用 Svelte 5 runes 而不是传统语法？

**A**: Svelte 5 runes 提供：

- 更好的性能 (细粒度响应式)
- 更清晰的响应式语义 (`$state`, `$derived`, `$effect`)
- 更好的 TypeScript 支持

---

## 参考资源 / References

- [SvelteKit 文档](https://kit.svelte.dev/docs)
- [Svelte 5 Runes 指南](https://svelte.dev/docs/svelte/$state)
- [FlyonUI 组件库](https://flyonui.com/docs/getting-started)
- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)
- [@inlang/paraglide-js i18n](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)

---

**最后更新**: 2025-01-06
