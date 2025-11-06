## AI 文档处理平台 — 需求规格说明书（V1.0）

### 概述

- 目标：为主文档（图片/PDF/Office）提供 OCR、翻译、问答、审查、提取与填充等 AI 能力，支持多模型对比、预览与结果回写（Word），并提供 UI 与 JS SDK 双接口。
- 技术栈：SvelteKit（Svelte 5）+ FlyonUI + Tailwind v4 + pnpm；服务端 LibreOffice（含 UNO headless）完成 Office->PDF 转换与 Word 回写；模型调用遵循 OpenAI 兼容规范；无数据库（配置文件化）；全站 i18n（中/英）。
- 平台定位：可视化交互+SDK 可编程调用；组件化、可扩展、可维护。

## 1. 范围与角色

- 范围：文档上传/预览、附加文档管理、AI 能力执行（OCR/翻译/问答/审查/提取与填充）、跨模型对比、导出与结果回写、统一日志/错误/返回格式、SDK 集成、单元测试。
- 不在范围：账号与鉴权、计费/额度管理、后台任务调度集群、长期持久化数据库（本期无 DB）。
- 用户角色
  - 普通用户：上传主文档；按功能执行 AI 操作；查看/导出结果；回写 Word。
  - 高级用户/集成方：通过 JS SDK 无 UI 集成能力，批量/自动化处理。
  - 维护人员：配置模型、日志排障、检查服务健康。

## 2. 术语

- 主文档：用户上传并预览、处理的核心文档。
- 附加文档：辅助处理的规范/参考资料，适用于问答、优化、审查、提取与填充。
- 段落分段：OCR/抽取时的逻辑段（含页码与坐标）。
- 区域映射：从分段/字段指向原始页面区域（page, x, y, w, h）。
- 交叉比对：以选定模型为基准，与配置的多个模型输出比对，标记差异。

## 3. 关键用例

1) 上传与预览
- 用户上传主文档（图片/PDF/Office）。Office 自动转 PDF 以预览；图片/PDF 直接预览。
- UI 左上显示主文档预览；左下在选择问答/优化/审查/提取与填充后显示附加文档区。

2) OCR（仅图片/PDF）
- 选择 OCR 模型；可启用交叉比对（同时调用多个模型）。
- 展示分段结果（Markdown）；选择某段时在预览上框选对应区域。
- 当交叉比对开启且多个结果就绪，标注差异内容。

3) 翻译
- 选择源/目标语言、翻译模型；显示 Markdown 结果。

4) 问答（可附加多个文档）
- 输入提示词；选择问答模型；展示聊天式问答（含多轮）。

5) 审查（必须有附加文档）
- 上传“审查规范”；选择审查模型；输出 Markdown 的合规问题列表（条目化）。

6) 提取与填充（可附加多个文档）
- 结构化定义多组“提取定义”：id、描述（作为提示词的一部分）。
- 可选自动填充值（从附加文档中检索/匹配）。
- 返回 JSON 结构（id->值），支持 UI 修改。
- 主文档为 Word 时，可回写内容并即时刷新预览。

7) 导出
- 结果区头部提供导出下拉：图片、PDF、Word、Markdown。

## 4. 交互与信息架构

- 布局：左右分栏；左侧上下分栏（可拖拽调整）。
  - 左上：主文档预览（默认显示主文档；点击附加文档时可暂时在预览区显示，并标注“附加文档”，可关闭以返回主文档）。
  - 左下：附加文档区（在功能为问答/优化/审查/提取与填充时显示）；可添加/删除/点击查看。
  - 右侧：操作区（默认显示使用说明；上传主文档后依上下文显示功能；图片/PDF 时先显示 OCR 并在完成后开启其它功能；已识别则出现“查看识别结果”）。
- 操作区功能项
  - 各功能显示对应“操作选项子区”和“执行按钮”；执行中显示进度条；完成后展示“执行结果区”。
  - 执行结果区包含公共头（导出）+ 功能特定的结果内容子区。
- 细节交互
  - OCR 分段→点击同步高亮原文区域；交叉比对差异以高亮或标注符号展示。
  - 提取列表支持行内编辑；回写触发确认并刷新预览。

## 5. 功能需求详细

### 5.1 上传与预览
- 支持：图片（png/jpg/webp）、PDF、Office（docx/xlsx/pptx）。
- Office 转 PDF：服务端调用 LibreOffice headless 完成转换；预览采用 PDF viewer。
- 预览能力：分页浏览、缩放、选区高亮渲染（供 OCR/提取区域映射）。
- 大文件/超时处理：上传后生成任务 ID；前端轮询/SSE 获取转换与预览准备状态。

### 5.2 OCR
- 适用：图片、PDF。
- 选项：
  - 选择一个主 OCR 模型（OpenAI 兼容接口）。
  - 可启用交叉比对（使用配置中“OCR 类别”的多个模型并发调用）。
- 输出：
  - 段落化 Markdown 文本；每段含元数据：page、bbox、confidence。
  - UI 支持段落-区域双向联动。
  - 交叉比对：在主结果中标注与其它模型有差异的 token/短语（diff 粒度可配置）。
- 异常：
  - 文件不可识别、页损坏时报错并给出可下载的错误报告。

### 5.3 翻译
- 选项：源语言、目标语言、翻译模型。
- 输入：主文档内容（Office/PDF/图片经 OCR 后的纯文本）或用户选择的段落范围。
- 输出：Markdown；保留段落结构；可下载为多格式。

### 5.4 问答
- 选项：提示词、问答模型；可附加多个文档参与上下文。
- 行为：聊天式多轮；上下文融合主文档与附加文档（采用检索式拼接或模型上下文拼接策略，具体由后端服务选择实现）。
- 输出：对话消息列表（消息角色、时间、来源片段可选显示）。

### 5.5 审查
- 约束：必须上传“审查规范”作为附加文档。
- 选项：审查模型。
- 输出：Markdown 的问题条目列表，包含：
  - 问题标题、严重级别、定位片段/页码/区域映射、建议修正、规范来源引用（附加文档页与段）。

### 5.6 提取与填充
- 选项：
  - 多组提取定义：id（唯一）、描述（语义化/字段含义）。
  - 可选“自动填充值”（从附加文档中检索/匹配）。
  - 选择提取模型。
- 输出：
  - JSON：[{ id, value, source: { type: main|attachment, page?, bbox?, fileId? }, confidence }]
  - UI 可编辑值；保留来源与置信度。
- 回写（仅 Word 主文档）：
  - 通过 UNO headless 将提取/修改后的值写回；支持关键字段映射（基于占位符，或样式/书签/内容控件策略，方案见后）。
  - 回写后刷新预览（重新转 PDF 或增量渲染）。

## 6. 技术架构与模块

### 6.1 前端（SvelteKit + FlyonUI + Tailwind4）
- 页面
  - 主工作台（布局 + 三区 UI）。
- 组件
  - Uploader（主/附加）、Previewer（PDF/Image/Word 转 PDF）、OCRResultViewer（带区域联动）、QAChat、ReviewList、ExtractEditor、ResultHeader（导出）、ProgressBar等，每个功能都有一个或多个组件。
- 状态管理：Svelte store（文档、任务状态、识别结果、会话）。
- i18n：基于消息字典（zh-CN/en-US），所有 UI 文本取 i18n key。

### 6.2 服务端（SvelteKit endpoints + 适配层）
- 路由（示例）
  - POST /api/upload (主文档)；POST /api/attachments
  - POST /api/ocr
  - POST /api/translate
  - POST /api/qa
  - POST /api/review
  - POST /api/extract
  - POST /api/writeback
  - GET /api/task/:id (查询任务进度)
  - GET /api/export (导出结果)
- 服务
  - ModelService（按“类别”选择模型、OpenAI 兼容调用）
  - OcrService（含分段与区域映射、交叉比对、差异标注）
  - TranslateService、QAService、ReviewService、ExtractService
  - OfficeService（LibreOffice 转换、UNO 回写）
  - ExportService（PDF/Word/Markdown/图片导出）
  - StorageService（本地文件系统，临时目录与生命周期）
  - I18nService（服务端日志/错误/返回值国际化）
- 结构化日志：JSON 行日志（ISO8601 时间、level、event、traceId、context、error.stack）。
- 任务执行：短任务同步返回；长任务返回 taskId + 进度查询（或 SSE）。

### 6.3 数据与存储
- 无数据库；本地文件系统（/data/{sessionId|taskId}/）存放：
  - 原始文件、转换后的 PDF、OCR JSON、结果快照、导出文件。
- 生命周期：配置 TTL 定时清理；导出结果可短期保留。
- 配置文件化：/config/*.yaml（模型列表、类别分组、限流/超时、存储路径、清理策略、导出选项、i18n 开关）。

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

1) 上传/转换
- 上传主文档 → 若为 Office → 转 PDF（task）→ 预览就绪。
2) OCR
- 选择模型/启用交叉比对 → 并发调用 → 合并主结果 + 差异标注 → 存储 JSON → UI 显示与区域联动。
3) 翻译
- 输入源/目标语言 → 调用模型 → 返回 Markdown。
4) 问答
- 输入提示词/选择模型/附加文档 → 构建上下文 → 模型应答 → 聊天式展示。
5) 审查
- 验证附加规范存在 → 模型审查 → 输出条目化问题清单。
6) 提取与填充
- 定义提取项/选择模型/选择是否自动填充 → 模型输出 JSON → UI 可改 → 如为 Word 且勾选回写 → UNO 写回 → 预览刷新。
7) 导出
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


