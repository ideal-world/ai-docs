# AI 文档处理平台

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

> 为文档提供 OCR、翻译、问答、审查、提取与填充等 AI 能力的现代化 Web 平台

## 概述

AI 文档处理平台是一个基于 SvelteKit 构建的现代化 Web 应用，为图片、PDF、Office 文档提供智能处理能力。支持多模型对比、实时预览、结果导出等功能，并提供完整的 REST API 和即将推出的 JavaScript SDK。

### 核心特性

- 📄 **多格式支持**: 图片 (JPG/PNG/GIF/WEBP)、PDF、Office 文档 (DOCX/XLSX/PPTX)
- 🤖 **AI 能力集成**: OCR、翻译、问答、文档审查、信息提取
- 🔄 **Office 转换**: 基于 LibreOffice 的自动 PDF 转换
- 🌍 **国际化**: 完整的中英文双语支持
- 📊 **实时预览**: 支持文档预览、缩放、拖拽、旋转
- 🎨 **现代化 UI**: 基于 Svelte 5 + FlyonUI + Tailwind CSS v4
- 🔌 **RESTful API**: 统一的 API 架构，支持程序化调用
- 📦 **会话管理**: 自动会话隔离与 TTL 清理

### 技术栈

- **前端**: Svelte 5, SvelteKit 2.48, TypeScript 5.9
- **UI 框架**: FlyonUI 2.4, Tailwind CSS v4
- **国际化**: @inlang/paraglide-js 编译时 i18n
- **文档处理**: LibreOffice (headless), pdfjs-dist
- **文件上传**: busboy (multipart form data)
- **构建工具**: Vite 7, pnpm 9

## 快速开始

### 环境要求

- Node.js 20.x 或更高
- pnpm 9.x
- LibreOffice (用于 Office 文档转换)

### 安装

```bash
# 克隆仓库
git clone https://github.com/ideal-world/ai-docs.git
cd ai-docs

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 配置 OpenAI API Key 等

# 启动开发服务器
pnpm dev
```

### 配置

主要配置文件：

- `config/models.yaml` - AI 模型配置 (OpenAI/Azure)
- `.env` - 环境变量 (API Keys, 端口等)

```yaml
# config/models.yaml 示例
ocr:
  - id: ocr-openai-gpt4o
    name: GPT-4 Vision OCR
    provider: openai
    model: gpt-4o
    endpoint: https://api.openai.com/v1/chat/completions
    timeout: 60000
    max_concurrency: 5
    enabled: true
```

### 构建生产版本

```bash
pnpm build
pnpm preview
```

## API 文档

### 核心 API 端点

#### 健康检查

```http
GET /api/health
```

返回系统健康状态，包括 LibreOffice 可用性和 AI 模型状态。

#### 文件上传

```http
POST /api/upload
Content-Type: multipart/form-data
X-Session-ID: <session-id>

files: <file1>, <file2>, ...
```

#### 任务查询

```http
GET /api/task/{taskId}
```

#### 文件操作

```http
GET /api/files/{fileId}           # 获取文件信息
DELETE /api/files/{fileId}        # 删除文件
GET /api/files/{fileId}/download  # 下载文件
```

#### 配置重载

```http
POST /api/config/reload
```

完整 API 文档请参阅 `docs/API.md`

## 项目结构

```
ai-docs/
├── src/
│   ├── routes/              # SvelteKit 路由
│   │   ├── +page.svelte    # 主页面
│   │   └── api/            # API 端点
│   ├── lib/
│   │   ├── components/     # Svelte 组件
│   │   ├── services/       # 业务逻辑服务
│   │   ├── types/          # TypeScript 类型定义
│   │   └── utils/          # 工具函数
│   └── hooks.server.ts     # 服务器钩子 (中间件)
├── config/
│   └── models.yaml         # AI 模型配置
├── messages/               # i18n 消息文件
├── data/                   # 文件存储目录 (会话隔离)
└── specs/                  # 规格说明文档
```

## 开发指南

### 本地开发

```bash
# 开发模式 (热重载)
pnpm dev

# 类型检查
pnpm check

# 代码格式化
pnpm format

# Lint 检查
pnpm lint
```

### 测试

```bash
# 单元测试
pnpm test:unit

# 集成测试
pnpm test:integration

# E2E 测试
pnpm test:e2e
```

### 架构说明

- **会话管理**: 每个上传会话自动创建独立目录，支持 24 小时 TTL 自动清理
- **并发控制**: AI 模型调用支持并发限制和请求队列
- **错误处理**: 统一的错误响应格式，包含 traceId 用于追踪
- **日志系统**: 结构化 JSON 日志，支持事件追踪

详细架构文档请参阅 `docs/DEVELOPMENT.md`

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [SvelteKit](https://kit.svelte.dev/) - 出色的全栈框架
- [FlyonUI](https://flyonui.com/) - 优雅的 UI 组件库
- [LibreOffice](https://www.libreoffice.org/) - 强大的文档处理引擎

---

<details>
<summary><strong>原需求规格说明书 (V1.0) - 点击展开</strong></summary>

### 概述

- 目标：为主文档（图片/PDF/Office）提供 OCR、翻译、问答、审查、提取与填充等 AI 能力，支持多模型对比、预览与结果回写（Word），并提供 UI 与 JS SDK 双接口。
- 技术栈：SvelteKit（Svelte 5）+ FlyonUI + Tailwind v4 + pnpm；服务端 LibreOffice（含 UNO headless）完成 Office->PDF 转换与 Word 回写；模型调用遵循 OpenAI 兼容规范；无数据库（配置文件化）；全站 i18n（中/英）。
- 平台定位：可视化交互+SDK 可编程调用；组件化、可扩展、可维护。

[完整规格说明书请查看原 README.md 历史版本或 specs/ 目录]

</details>

## 7. 模型调用规范（OpenAI 兼容）

- 公共字段：model、input/prompt、temperature、top_p、max_tokens、stream（可选）。
- 类别化配置：ocr、translate、qa、optimize（预留）、review、extract 多模型可配置。
- 统一适配接口（伪 TypeScript，示例）：
  - OcrRequest: { model, fileRef, pages?: number[], options?: { languageHint?, layout?, granularity? } }
  - OcrResponse: { segments: [{ id, text, page, bbox, confidence }], fullText }
  - TranslateRequest: { model, sourceLang, targetLang, text }
  - QARequest: { model, prompt, attachments?: FileRef[], history?: Message[] }
  - ReviewRequest: { model, mainDocRef, specRefs: FileRef[] }
  - ExtractRequest: { model, mainDocRef, definitions: {id, description}[], attachments?: FileRef[], autofill?: boolean }
- 交叉比对：OcrService 在一主多从模型调用后，进行 token-level diff，输出差异标注集。

## 8. 接口契约与统一返回

- 统一返回结构
  - 成功：{ success: true, code: "OK", message: i18nKey, timestamp, traceId, data }
  - 失败：{ success: false, code, message: i18nKey, timestamp, traceId, details?: { … } }
- 错误码建议
  - VALIDATION_ERROR、UNSUPPORTED_FILE、CONVERSION_FAILED、OCR_FAILED、MODEL_TIMEOUT、WRITEBACK_FAILED、EXPORT_FAILED、ATTACHMENT_REQUIRED、PERMISSION_DENIED（预留）。
- 进度
  - GET /api/task/:id -> { status: "pending|running|succeeded|failed", progress: 0-100, stage, eta?, resultRef? }

## 9. 数据模型（TypeScript 约定，示例）

- FileRef: { id: string, name: string, type: "image|pdf|office", path: string, pages?: number }
- BBox: { page: number, x: number, y: number, w: number, h: number } // 坐标以 PDF 像素或 0-1 归一化（可配置）
- OcrSegment: { id: string, text: string, page: number, bbox: BBox, confidence: number, diffs?: DiffMark[] }
- DiffMark: { start: number, end: number, kind: "insert|delete|replace", comparedModel: string }
- ExtractDefinition: { id: string, description: string }
- ExtractResultItem: { id: string, value: string, confidence?: number, source?: { type: "main|attachment", page?: number, bbox?: BBox, fileId?: string } }

## 10. 处理流程（序列摘要）

1. 上传/转换

- 上传主文档 → 若为 Office → 转 PDF（task）→ 预览就绪。

2. OCR

- 选择模型/启用交叉比对 → 并发调用 → 合并主结果 + 差异标注 → 存储 JSON → UI 显示与区域联动。

3. 翻译

- 输入源/目标语言 → 调用模型 → 返回 Markdown。

4. 问答

- 输入提示词/选择模型/附加文档 → 构建上下文 → 模型应答 → 聊天式展示。

5. 审查

- 验证附加规范存在 → 模型审查 → 输出条目化问题清单。

6. 提取与填充

- 定义提取项/选择模型/选择是否自动填充 → 模型输出 JSON → UI 可改 → 如为 Word 且勾选回写 → UNO 写回 → 预览刷新。

7. 导出

- 将结果以所选格式导出（PDF/Word/MD/图片），含元数据与时间戳。

## 11. i18n 规范（中/英）

- 所有 UI、日志、返回 message 字段使用 i18n key，如：
  - ui.upload.title、ui.preview.title、action.ocr.run、result.export.success
  - error.validation.required、error.attachment.missing、error.conversion.failed
- 服务端日志同样记录 key 与本地化消息（便于跨语言支持）。
- 语言切换：前端用户可切换 zh-CN/en-US；服务端响应通过 Accept-Language 或请求参数决定本地化消息。

## 12. 日志与审计

- 结构化 JSON：
  - { ts: ISO8601, level: info|warn|error, event: string, traceId, userId?, fileId?, stage?, messageKey, message, error? }
- 关键事件：upload、convert.start|done、ocr.start|done、model.call、writeback.start|done、export.done、cleanup.run。
- 错误详细：包含 error.stack、model response code、超时信息。

## 13. 安全与合规

- 上传大小与类型校验；磁盘配额与 TTL 清理。
- 模型 API Key 不落盘，读取自环境变量/密钥管理服务（可扩展）。
- 简单防刷/限流（IP/会话级）。

## 14. 性能与可用性（非功能）

- 单文档最大：默认 200MB（可配置）。
- 转换/OCR/写回超时：默认 120s/180s/60s（可配置）。
- 并发控制：每类模型并发上限（可配置），排队可视化。
- 可靠性：长任务可恢复查询；中间产物落盘以便重试。

## 15. SDK 规范（JS）

- 安装：提供 @idealworld/ai-docs-sdk（本期交付 SDK 接口与示例）。
- 基本用法（示例）：
  - const sdk = createClient({ baseUrl, apiKey })
  - const { fileId } = await sdk.uploadMain(file)
  - await sdk.convert({ fileId })
  - const ocr = await sdk.ocr({ fileId, model: "ocr-1", crossCheck: true })
  - const trans = await sdk.translate({ text, sourceLang, targetLang, model })
  - const qa = await sdk.qa({ prompt, model, attachments: [id1, id2] })
  - const review = await sdk.review({ mainFileId, specFileIds: [id] })
  - const extract = await sdk.extract({ mainFileId, definitions, attachments, autofill })
  - await sdk.writebackWord({ fileId, values: { id1: "xxx" } })
  - const download = await sdk.export({ type: "pdf", taskId })
- 返回结构/错误与服务端一致（success/code/message/timestamp/traceId/data）。

## 16. Word 回写策略（UNO）

- 占位符优先：${FIELD_ID}（或书签/内容控件映射）→ 值替换。
- 映射表：提取 id → 文档内定位（占位符/书签名称） → UNO 替换。
- 回写完整性校验：回写前比对缺失映射项并提示；回写后生成回写报告。

## 17. 导出规范

- PDF：包含结果正文与元信息（标题、时间、模型、参数）。
- Word：可选择将结果插入到附录；或生成结果报告模板。
- Markdown：纯文本，保留结构。
- 图片：将当前结果视图渲染导出（单页/多页）。
