# Research: 平台基础架构与核心能力

**Date**: 2025-11-06  
**Feature**: 001-foundation-core  
**Purpose**: 解决技术选型和实现方案的关键决策点

## 研究任务总览

本研究解决以下关键技术决策:

1. SvelteKit + Svelte 5 最佳实践与项目结构
2. FlyonUI + Tailwind CSS v4 集成方案
3. LibreOffice headless 模式集成与 Office 转换
4. PDF 预览库选型
5. i18n 方案选型(svelte-i18n vs paraglide-js)
6. 结构化日志实现方案
7. 会话管理与文件存储策略
8. SDK 开发与发布最佳实践
9. Vitest 测试策略

---

## 1. SvelteKit + Svelte 5 最佳实践

### Decision

使用 SvelteKit 作为全栈框架,采用 Svelte 5 的 runes 模式进行状态管理。

### Rationale

- **全栈一体化**: SvelteKit 原生支持服务端和客户端代码,减少技术栈复杂度
- **Svelte 5 runes**: 新的响应式模型更简洁、性能更优,适合复杂状态管理
- **文件系统路由**: `src/routes` 目录自动映射路由,简化 API 端点定义
- **Adapter 灵活性**: 支持多种部署方式(Node.js、静态、Vercel 等)
- **TypeScript 原生支持**: 开箱即用的类型检查

### Implementation Details

- 使用 `$state` rune 替代传统 store(组件内部状态)
- 使用 `$derived` rune 计算派生状态
- 跨组件状态仍使用 Svelte stores(兼容性好,支持订阅)
- API 端点使用 `+server.ts` 约定,返回标准 JSON 响应
- 使用 `$lib` alias 简化导入路径

### Alternatives Considered

- **Next.js + React**: 被拒绝,因为宪章明确要求 SvelteKit
- **纯 Svelte + Express**: 被拒绝,SvelteKit 提供更好的全栈集成和开发体验

### References

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte 5 Runes](https://svelte-5-preview.vercel.app/docs/runes)

---

## 2. FlyonUI + Tailwind CSS v4 集成

### Decision

使用 FlyonUI 作为基础组件库,基于 Tailwind CSS v4 的 utility-first 理念扩展自定义组件。

### Rationale

- **FlyonUI**: 提供预制的 DaisyUI 兼容组件,加速开发
- **Tailwind v4**: 最新版本,性能优化(JIT 编译)、更好的类型支持
- **组件扩展性**: FlyonUI 提供基础,自定义组件可直接使用 Tailwind classes
- **主题定制**: 支持通过 CSS 变量自定义颜色、间距等

### Implementation Details

- 安装 `flyonui` 和 `tailwindcss@next`(v4)
- 配置 `tailwind.config.js`:
  ```js
  export default {
  	plugins: [require('flyonui')],
  	content: ['./src/**/*.{html,js,svelte,ts}']
  };
  ```
- 全局样式入口(`src/app.css`):
  ```css
  @import 'tailwindcss';
  @import 'flyonui';
  ```
- 自定义组件继承 FlyonUI 基础样式,通过 Tailwind utilities 扩展

### Alternatives Considered

- **Skeleton UI**: 被拒绝,FlyonUI 社区更活跃且符合宪章要求
- **纯 Tailwind 手写组件**: 被拒绝,开发效率低,FlyonUI 提供成熟的基础组件

### References

- [FlyonUI Documentation](https://flyonui.com/)
- [Tailwind CSS v4 Alpha](https://tailwindcss.com/blog/tailwindcss-v4-alpha)

---

## 3. LibreOffice Headless 集成

### Decision

使用 LibreOffice headless 模式通过命令行调用进行 Office→PDF 转换,封装为 `OfficeService`。

### Rationale

- **成熟稳定**: LibreOffice 对 Office 格式支持广泛(docx/xlsx/pptx)
- **跨平台**: 支持 Linux/macOS/Windows
- **免费开源**: 无许可费用
- **Headless 模式**: 适合服务端自动化处理

### Implementation Details

- 安装 LibreOffice:
  - Linux: `apt-get install libreoffice`
  - macOS: `brew install libreoffice`
  - Windows: 下载安装包
- 命令行调用:
  ```bash
  soffice --headless --convert-to pdf --outdir /output /input/document.docx
  ```
- `OfficeService` 封装:
  ```typescript
  async convertToPdf(inputPath: string, outputDir: string): Promise<string> {
    const cmd = `soffice --headless --convert-to pdf --outdir ${outputDir} ${inputPath}`;
    await execAsync(cmd, { timeout: 120000 }); // 120s 超时
    return path.join(outputDir, `${basename(inputPath, extname(inputPath))}.pdf`);
  }
  ```
- 错误处理:
  - 检查 LibreOffice 是否安装(`which soffice`)
  - 捕获转换失败(损坏文件、不支持格式)
  - 超时自动终止进程

### Alternatives Considered

- **Aspose**: 被拒绝,商业许可费用高
- **Pandoc**: 被拒绝,对复杂 Office 格式支持不如 LibreOffice
- **在线 API(CloudConvert)**: 被拒绝,宪章要求本地处理,避免外部依赖

### References

- [LibreOffice Headless Guide](https://wiki.documentfoundation.org/Faq/General/038)

---

## 4. PDF 预览库选型

### Decision

使用 **PDF.js**(Mozilla 官方)作为 PDF 预览库。

### Rationale

- **官方维护**: Mozilla 长期维护,兼容性和安全性有保障
- **功能完整**: 支持渲染、缩放、翻页、文本选择、搜索
- **Canvas 渲染**: 高保真度,支持复杂 PDF
- **无服务端依赖**: 纯前端渲染,减轻服务端压力
- **自定义能力**: 支持区域高亮(OCR 结果联动需求)

### Implementation Details

- 安装: `pnpm add pdfjs-dist`
- Svelte 组件封装(`PDFPreview.svelte`):

  ```typescript
  import * as pdfjsLib from 'pdfjs-dist';
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

  let pdfDoc = $state(null);
  let pageNum = $state(1);

  async function loadPDF(url: string) {
  	pdfDoc = await pdfjsLib.getDocument(url).promise;
  	renderPage(pageNum);
  }

  async function renderPage(num: number) {
  	const page = await pdfDoc.getPage(num);
  	const viewport = page.getViewport({ scale: 1.5 });
  	const canvas = canvasRef;
  	const context = canvas.getContext('2d');
  	canvas.width = viewport.width;
  	canvas.height = viewport.height;
  	await page.render({ canvasContext: context, viewport }).promise;
  }
  ```

- 区域高亮: 在 canvas 上层叠加 SVG/div 实现高亮框

### Alternatives Considered

- **react-pdf**: 被拒绝,基于 React,不适合 Svelte 项目
- **Viewer.js**: 被拒绝,维护不活跃,兼容性差
- **浏览器原生 `<embed>`**: 被拒绝,无法实现区域高亮等自定义功能

### References

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)

---

## 5. i18n 方案选型

### Decision

使用 **paraglide-js**(Inlang 项目)配合 SvelteKit adapter。

### Rationale

- **类型安全**: 自动生成 TypeScript 类型,编译时检测缺失翻译
- **性能优异**: 编译时优化,无运行时开销,打包体积小
- **SvelteKit 集成**: 官方提供 `@inlang/paraglide-sveltekit` adapter
- **开发体验**: CLI 工具自动提取字符串,同步更新翻译文件
- **社区活跃**: Inlang 项目积极维护,支持多框架

### Implementation Details

- 安装:
  ```bash
  pnpm add -D @inlang/paraglide-js @inlang/paraglide-sveltekit
  ```
- 初始化:
  ```bash
  npx @inlang/paraglide-js init
  ```
- 配置 `project.inlang/settings.json`:
  ```json
  {
  	"sourceLanguageTag": "zh-CN",
  	"languageTags": ["zh-CN", "en-US"],
  	"modules": [
  		"https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-empty-pattern@latest/dist/index.js"
  	]
  }
  ```
- 翻译文件(`messages/zh-CN.json`):
  ```json
  {
  	"ui.upload.title": "上传文档",
  	"ui.upload.drop": "拖拽文件到此处或点击上传",
  	"error.upload.size": "文件大小超过限制: {limit}MB"
  }
  ```
- 使用:

  ```svelte
  <script>
  	import * as m from '$lib/paraglide/messages';
  </script>

  <h1>{m.ui_upload_title()}</h1><p>{m.error_upload_size({ limit: 200 })}</p>
  ```

- 语言切换:
  ```typescript
  import { setLanguageTag } from '$lib/paraglide/runtime';
  setLanguageTag('en-US');
  ```

### Alternatives Considered

- **svelte-i18n**: 被拒绝,运行时解析性能开销大,无类型安全
- **typesafe-i18n**: 功能类似但社区较小,Inlang 生态更完善

### References

- [Paraglide-JS Documentation](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
- [SvelteKit Adapter](https://inlang.com/m/dxnzrydw/paraglide-sveltekit-i18n)

---

## 6. 结构化日志实现

### Decision

使用 **Pino** 作为结构化日志库,配置 JSON 格式输出。

### Rationale

- **性能优异**: 异步日志,低开销(比 Winston 快 5-10 倍)
- **结构化输出**: 原生支持 JSON Lines 格式
- **子日志**: 支持 child logger,自动继承上下文(traceId)
- **生态完善**: 插件丰富(日志轮转、过滤、传输)
- **TypeScript 支持**: 完整类型定义

### Implementation Details

- 安装:
  ```bash
  pnpm add pino pino-pretty
  ```
- 配置(`src/lib/services/logger.service.ts`):

  ```typescript
  import pino from 'pino';

  export const logger = pino({
  	level: process.env.LOG_LEVEL || 'info',
  	formatters: {
  		level: (label) => ({ level: label })
  	},
  	timestamp: pino.stdTimeFunctions.isoTime,
  	base: { pid: process.pid, hostname: process.env.HOSTNAME }
  });

  // 开发环境美化输出
  if (process.env.NODE_ENV === 'development') {
  	logger = pino({
  		transport: {
  			target: 'pino-pretty',
  			options: { colorize: true }
  		}
  	});
  }
  ```

- 使用:

  ```typescript
  import { logger } from '$lib/services/logger.service';

  const childLogger = logger.child({ traceId: generateTraceId() });

  childLogger.info({ event: 'upload.start', fileId, fileName }, '文件上传开始');
  childLogger.error({ event: 'upload.failed', error: err.stack }, '文件上传失败');
  ```

- 输出示例:
  ```json
  {
  	"level": "info",
  	"time": "2025-11-06T09:30:45.123Z",
  	"pid": 12345,
  	"hostname": "app-server",
  	"traceId": "abc-123-xyz",
  	"event": "upload.start",
  	"fileId": "f-001",
  	"fileName": "document.pdf",
  	"msg": "文件上传开始"
  }
  ```

### Alternatives Considered

- **Winston**: 被拒绝,性能较低,配置复杂
- **Bunyan**: 被拒绝,维护不活跃
- **自定义 console 封装**: 被拒绝,功能不完整,难以扩展

### References

- [Pino Documentation](https://getpino.io/)

---

## 7. 会话管理与文件存储策略

### Decision

使用 **基于 UUID 的会话 ID** + **文件系统存储**,会话元数据存储在内存 Map(可选持久化到 SQLite)。

### Rationale

- **无数据库约束**: 宪章要求无持久化数据库,文件系统满足需求
- **会话隔离**: 每个会话独立目录,避免冲突和数据泄漏
- **简单高效**: 文件读写直接,无 ORM 开销
- **TTL 清理**: 定时任务扫描目录,删除过期文件

### Implementation Details

- 会话 ID 生成:

  ```typescript
  import { v4 as uuidv4 } from 'uuid';

  export function createSession(): Session {
  	const sessionId = uuidv4();
  	const session = {
  		id: sessionId,
  		createdAt: new Date(),
  		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  		language: 'zh-CN',
  		files: []
  	};
  	sessions.set(sessionId, session);
  	return session;
  }
  ```

- 文件存储结构:
  ```
  /data/{sessionId}/
    ├── uploads/       # 原始文件
    ├── converted/     # PDF 转换结果
    └── results/       # AI 处理结果
  ```
- 存储服务(`storage.service.ts`):

  ```typescript
  export async function saveFile(
  	sessionId: string,
  	category: 'uploads' | 'converted' | 'results',
  	fileName: string,
  	buffer: Buffer
  ): Promise<FileMetadata> {
  	const dir = path.join(DATA_DIR, sessionId, category);
  	await fs.mkdir(dir, { recursive: true });
  	const fileId = uuidv4();
  	const ext = path.extname(fileName);
  	const filePath = path.join(dir, `${fileId}${ext}`);
  	await fs.writeFile(filePath, buffer);

  	return {
  		id: fileId,
  		name: fileName,
  		path: filePath,
  		size: buffer.length,
  		createdAt: new Date()
  	};
  }
  ```

- 清理任务(cron):

  ```typescript
  import cron from 'node-cron';

  // 每小时执行一次
  cron.schedule('0 * * * *', async () => {
  	const now = Date.now();
  	for (const [id, session] of sessions.entries()) {
  		if (session.expiresAt.getTime() < now) {
  			await cleanupSession(id);
  			sessions.delete(id);
  		}
  	}
  });

  async function cleanupSession(sessionId: string) {
  	const dir = path.join(DATA_DIR, sessionId);
  	await fs.rm(dir, { recursive: true, force: true });
  	logger.info({ event: 'cleanup.done', sessionId }, '会话清理完成');
  }
  ```

### Alternatives Considered

- **Redis + 文件系统**: 被拒绝,引入额外依赖,违反无数据库约束
- **纯内存存储**: 被拒绝,重启丢失数据,不适合文件存储
- **SQLite 持久化会话**: 保留为可选方案,初期使用内存 Map 简化实现

### References

- [Node.js fs/promises API](https://nodejs.org/api/fs.html#promises-api)
- [node-cron](https://www.npmjs.com/package/node-cron)

---

## 8. SDK 开发与发布最佳实践

### Decision

使用 **TypeScript** 开发 SDK,打包为 ESM + CJS 双格式,发布到 npm。

### Rationale

- **类型安全**: TypeScript 提供完整类型定义,提升开发体验
- **双格式支持**: ESM(现代)+ CJS(兼容),覆盖更多环境
- **Tree-shaking**: ESM 支持按需导入,减小打包体积
- **标准化**: npm 发布标准流程,易于集成

### Implementation Details

- SDK 结构(`packages/sdk/`):
  ```
  src/
    ├── client.ts          # 主入口
    ├── api/
    │   ├── upload.ts
    │   ├── task.ts
    │   └── index.ts
    ├── types/
    │   └── index.ts
    └── utils/
        └── request.ts
  ```
- 主入口(`client.ts`):

  ```typescript
  import { UploadAPI } from './api/upload';
  import { TaskAPI } from './api/task';

  export interface ClientConfig {
  	baseUrl: string;
  	apiKey?: string;
  	timeout?: number;
  }

  export class AIDocsClient {
  	public upload: UploadAPI;
  	public task: TaskAPI;

  	constructor(config: ClientConfig) {
  		this.upload = new UploadAPI(config);
  		this.task = new TaskAPI(config);
  	}
  }

  export function createClient(config: ClientConfig): AIDocsClient {
  	return new AIDocsClient(config);
  }
  ```

- 构建配置(`tsconfig.json`):
  ```json
  {
  	"compilerOptions": {
  		"target": "ES2020",
  		"module": "ESNext",
  		"declaration": true,
  		"outDir": "./dist",
  		"strict": true
  	}
  }
  ```
- 打包(`package.json`):
  ```json
  {
  	"name": "@idealworld/ai-docs-sdk",
  	"version": "0.1.0",
  	"main": "./dist/index.cjs",
  	"module": "./dist/index.mjs",
  	"types": "./dist/index.d.ts",
  	"exports": {
  		".": {
  			"import": "./dist/index.mjs",
  			"require": "./dist/index.cjs",
  			"types": "./dist/index.d.ts"
  		}
  	},
  	"scripts": {
  		"build": "tsup src/index.ts --format esm,cjs --dts"
  	},
  	"devDependencies": {
  		"tsup": "^8.0.0"
  	}
  }
  ```
- 发布流程:
  ```bash
  cd packages/sdk
  pnpm build
  pnpm test
  npm publish --access public
  ```

### Alternatives Considered

- **纯 JavaScript**: 被拒绝,缺少类型定义,开发体验差
- **仅 ESM**: 被拒绝,部分环境(如旧版 Node.js)不支持
- **Rollup/Webpack**: 被拒绝,tsup 更简单高效,专为库打包设计

### References

- [tsup Documentation](https://tsup.egoist.dev/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

---

## 9. Vitest 测试策略

### Decision

使用 **Vitest** 进行单元测试和集成测试,采用 **测试驱动开发(TDD)** 原则。

### Rationale

- **Vite 原生集成**: 与 Vite/SvelteKit 无缝集成,配置简单
- **快速执行**: 基于 Vite,热更新快,测试反馈迅速
- **兼容 Jest API**: 迁移成本低,生态丰富(mock 库等)
- **ESM 原生支持**: 无需额外配置,直接测试 ESM 代码
- **并行执行**: 默认并行,大幅提升测试速度

### Implementation Details

- 配置(`vitest.config.ts`):

  ```typescript
  import { defineConfig } from 'vitest/config';
  import { sveltekit } from '@sveltejs/kit/vite';

  export default defineConfig({
  	plugins: [sveltekit()],
  	test: {
  		globals: true,
  		environment: 'jsdom',
  		include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  		coverage: {
  			provider: 'v8',
  			reporter: ['text', 'json', 'html'],
  			exclude: ['node_modules/', 'tests/']
  		}
  	}
  });
  ```

- 单元测试示例(`tests/unit/services/logger.test.ts`):

  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { logger } from '$lib/services/logger.service';

  describe('Logger Service', () => {
  	it('should log info with traceId', () => {
  		const spy = vi.spyOn(logger, 'info');
  		const childLogger = logger.child({ traceId: 'test-123' });

  		childLogger.info({ event: 'test' }, 'Test message');

  		expect(spy).toHaveBeenCalledWith(
  			expect.objectContaining({ traceId: 'test-123', event: 'test' }),
  			'Test message'
  		);
  	});
  });
  ```

- 集成测试示例(`tests/integration/api/upload.test.ts`):

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { createTestServer } from '../helpers/server';

  describe('POST /api/upload', () => {
  	it('should upload file and return fileId', async () => {
  		const server = await createTestServer();
  		const formData = new FormData();
  		formData.append('file', new Blob(['test'], { type: 'image/png' }), 'test.png');

  		const response = await fetch('http://localhost:5173/api/upload', {
  			method: 'POST',
  			body: formData
  		});

  		expect(response.ok).toBe(true);
  		const json = await response.json();
  		expect(json).toMatchObject({
  			success: true,
  			data: { fileId: expect.any(String) }
  		});
  	});
  });
  ```

- 测试覆盖目标:
  - 核心服务(logger/storage/model): 90%+ 覆盖率
  - API 端点: 80%+ 覆盖率
  - UI 组件: 关键交互逻辑 70%+ 覆盖率
  - 优先测试:正常路径 → 边界条件 → 错误处理

### Alternatives Considered

- **Jest**: 被拒绝,ESM 支持差,配置复杂,速度慢
- **Mocha + Chai**: 被拒绝,API 不统一,生态分散

### References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/)

---

## 总结

所有技术决策已完成,关键选型如下:

| 领域        | 选型                       | 核心理由                         |
| ----------- | -------------------------- | -------------------------------- |
| 前端框架    | SvelteKit + Svelte 5       | 全栈一体化,性能优异,宪章要求     |
| UI 组件     | FlyonUI + Tailwind v4      | 预制组件 + 高度可定制            |
| Office 转换 | LibreOffice headless       | 成熟稳定,跨平台,免费             |
| PDF 预览    | PDF.js                     | 官方维护,功能完整,支持自定义     |
| 国际化      | Paraglide-JS               | 类型安全,编译时优化,零运行时开销 |
| 日志        | Pino                       | 高性能,结构化 JSON,子日志支持    |
| 会话存储    | UUID + 文件系统 + 内存 Map | 简单高效,无数据库,符合宪章       |
| SDK         | TypeScript + tsup + npm    | 类型安全,双格式,标准发布流程     |
| 测试        | Vitest                     | Vite 集成,快速,兼容 Jest API     |

**下一步**: 进入 Phase 1,生成数据模型、API 契约和快速入门文档。
