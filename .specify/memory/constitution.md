<!--
Sync Impact Report (v1.0.0):
- Version: Initial → 1.0.0
- Ratification: 2025-11-06
- Changes: Established baseline constitution with 5 core principles
- Templates: ✅ Aligned with plan/spec/tasks templates
- Follow-up: None
-->

# AI Docs 项目宪章

## 核心原则

### 1. 中文优先 (Chinese First)

UI/文档/指令必须使用中文,除非用户明确要求其它语言。所有字符串必须 i18n 化(zh-CN/en-US),英文作为回退。

### 2. 上下文驱动开发 (Context-Driven)

实现前必须:读取仓库上下文与模板 → 需求不明时澄清 → 不确定时查阅文档。禁止主观假设。

### 3. 测试先行 (Test-Driven)

核心功能必须有 Vitest 单元测试,覆盖正常/边界/错误路径。遵循 Red-Green-Refactor。

### 4. SDK 优先 (SDK-First)

所有操作必须通过 JS SDK 可用(无 UI 可集成)。数据契约必须强类型定义。

### 5. 统一模型接口 (Unified Model Abstraction)

所有模型调用(ocr/translate/qa/review/extract)必须遵循 OpenAI 兼容规范,支持多模型配置与热切换。
必须提供:结构化日志(timestamp/level/traceId/stack) + 统一返回格式(success/code/message/data/traceId)。

### 6. 上下文驱动开发 (Context-Driven Development)

实现前必须:

1. 使用 Context7 理解现有模式、依赖关系和接口
2. 如果需求不明确，主动询问以澄清，而不是假设
3. 如果对 API 不确定，查阅官方文档
4. 模式: 阅读 → 澄清 → 实现

## 技术约束

**技术栈**: SvelteKit(Svelte 5) + FlyonUI + Tailwind CSS v4 + pnpm  
**文档处理**: LibreOffice(Office→PDF 转换 + UNO headless 回写)，PDF需要先转成Markdown再处理(可能涉及OCR)，支持 “表格、表单、方程式、代码块、链接、引用”等提取。以Node技术栈优先，如果功能受限，可考虑其它技术栈
**存储**: 无数据库,配置文件化,临时文件带 TTL  
**模型类别**: ocr/translate/qa/optimize/review/extract(OpenAI 兼容)  
**i18n**: zh-CN/en-US(页面/日志/返回值),英文回退  
**返回格式**:

- 成功: `{ success: true, data, locale, traceId }`
- 失败: `{ success: false, error: { code, message, details }, locale, traceId }`

**日志**: 结构化 JSON(timestamp/level/event/traceId/context/error.stack),禁止 console.log  
**A11y**: 语义 HTML + ARIA 标签 + 键盘导航 + 响应式  
**安全**: 文件类型白名单 + 大小限制 + 超时/重试 + 脱敏存储

## 质量门禁

**完成定义**:

1. `pnpm check` = 0 错误
2. `pnpm lint` 通过
3. `pnpm test` 通过

**代码质量**:

- 无未使用导入,无重复逻辑
- 统一使用 logger(支持 i18n)
- 类型完备,避免 any
- 错误处理规范(用户友好提示 + 详细内部日志)

**i18n 合规**:

- 所有可见字符串使用 i18n key
- 新增/修改时同步更新语言资源

**优先级**: 本宪章优先于个人偏好。如有冲突,以本宪章为准。

## 治理

**修订流程**: 提案 → 评审 → 批准 → 版本号递增 → 更新 Sync Impact Report  
**版本规则**: MAJOR(不兼容变更) / MINOR(新增原则) / PATCH(措辞优化)  
**合规审查**: 每个 feature spec/plan 必须包含 Constitution Check 章节
