# AI Docs 开发协作指引（面向 AI 编程助手）

> 目标：让智能代理在首次接入本仓库时即可高效、合规、稳定地产出代码。严格遵守“中文优先”与“质量门禁”原则。

## 0. English Summary (Concise)
```
AI Docs Collaboration Guide (Summary)
Principles: Chinese-first i18n, unified API response (traceId), context-driven, test-first, SDK-friendly types.
Patterns: Singleton services; streaming upload -> quota check -> async Office conversion; taskRegistry state machine; modelService centralizes OpenAI-compatible calls; structured JSON logging; directory schema /data/{sessionId}/{uploads|converted|results}/.
Quality Gates: pnpm check + lint + test all green; every visible string via i18n key; no hardcoded secrets; responses use createSuccessResponse/createErrorResponse; logs include traceId & minimal context; tasks registered; types strict.
Logs: resource.action naming (upload.start, conversion.complete, model.failure, cleanup.run).
Errors: UPPER_CASE codes; extend with MODEL_CALL_FAILED, TASK_TIMEOUT, WRITEBACK_FAILED, EXPORT_FAILED, DIFF_GENERATION_FAILED as needed.
Clarification: Enumerate unknowns, ask targeted questions, use Context7 search before coding.
```

## 1. 核心理念
- 中文优先：所有新增/修改的用户可见文本 & 返回 message 必须使用 i18n key（`messages/zh-cn.json` / `messages/en-us.json`），英文仅作回退。
- 统一返回结构：成功/失败统一格式 + `traceId`，使用 `createSuccessResponse` / `createErrorResponse`。
- 上下文驱动：实现前先阅读 `README.md`、`specs/001-foundation-core/spec.md`、相关服务/路由现有实现，勿凭主观假设。
- 测试先行：核心逻辑（存储/上传/模型适配/清理）需具备单测与边界用例；出现缺失时应补齐。
- SDK 可用：新增能力的类型定义放在 `src/lib/types/`，接口形态便于未来 SDK 封装。
- 易用性：界面设计要简洁直观、现代美观，确保用户操作流畅。关键字段要有tooltip或帮助说明。

## 2. 目录速览（关键聚焦）
| 关注点 | 位置 |
| ------ | ---- |
| 服务单例（业务逻辑） | `src/lib/services/*.ts` |
| API 路由实现 | `src/routes/api/**/+server.ts` |
| 类型定义 | `src/lib/types/` |
| 工具与通用函数 | `src/lib/utils/` |
| 会话/文件/任务注册表 | `src/lib/server/*.ts` |
| i18n 消息源 | `messages/*.json` |
| 配置文件 | `config/system.yaml`, `config/models.yaml` |
| 中间件 / 钩子 | `src/hooks.server.ts` |
| 状态存储（前端） | `src/lib/stores/` |
| 单元测试 | `tests/unit/` |
| 端到端测试 | `e2e/` |

## 3. 关键模式
### 3.1 服务层单例
```ts
class StorageService { /* IO & 路径 */ }
export const storageService = new StorageService();
```
集中封装：存储、清理、模型调用、办公文件转换、日志。新增能力遵循此模式，避免散落的函数式实现。

### 3.2 请求追踪 & 日志
`hooks.server.ts` 注入 `event.locals.traceId`；所有日志使用 `logger.logEvent` / `logger.error`，带上下文与 traceId。禁止使用裸 `console.log`。

### 3.3 上传与转换流程
`upload/+server.ts` 模式：Busboy 流式解析 → 类型/大小早期校验 → 磁盘配额检查 → 写入 `/data/{sessionId}/uploads/` → Office 文件异步排队转换（登记任务）。

### 3.4 异步任务
`taskRegistry` 记录：`pending → running → succeeded|failed`，客户端轮询 `GET /api/task/:id`。新增长耗时逻辑必须登记并及时更新进度。

### 3.5 i18n
后端响应：优先使用 `event.locals.preferredLanguage`；未找到 key 时返回原 key。新增文本先在中文文件添加，再补英文回退。

### 3.6 模型配置与调用
模型定义于 `config/models.yaml`，通过 `model.service.ts` 统一调度；禁止在路由中直接拼接外部 AI 接口；并发与超时依赖配置项，不得硬编码。

### 3.7 文件与生命周期
目录结构固定：`/data/{sessionId}/{uploads|converted|results}/`；清理策略由 `cleanup.service.ts` 定时执行；新增文件类别需同步清理策略。

## 4. 质量门禁 Checklist（提交前逐项自检）
1. 运行 `pnpm check` 无类型/编译错误。
2. 运行 `pnpm lint` 无未通过规则，`pnpm format` 已整理格式。
3. 运行 `pnpm test` 单元测试全部通过；涉及核心路径改动建议加/更新测试。
4. 所有新增/修改的可见字符串使用 i18n key；对应中英文资源均已更新。
5. API 响应通过 `createSuccessResponse` / `createErrorResponse`；包含 `traceId`。
6. 日志：新增逻辑含结构化日志（事件名、上下文、traceId、错误堆栈）。
7. 无硬编码机密：模型/外部服务密钥使用环境变量（例如 `OPENAI_API_KEY`）。
8. 避免 `any`：类型补齐；若需兼容外部响应，使用窄化或自定义接口。
9. 存储路径：符合既定目录；长任务已登记并可查询。
10. 无重复逻辑/未使用导入；公共逻辑抽取到 `src/lib/utils/` 或服务层。

## 5. 常见新增任务操作规范
### 5.1 新增 API 路由
1. 创建：`src/routes/api/<name>/+server.ts`
2. 获取 traceId：`const traceId = event.locals.traceId;`
3. 参数校验：使用 `validation.ts` 中工具（若无需则自行扩展）。
4. 日志：开始、结束、错误均记录。
5. 返回：统一响应格式 + i18n key。
6. 测试：新增单测验证正常与错误路径（建议 Mock 依赖）。

### 5.2 新增模型配置
1. 编辑 `config/models.yaml` 添加条目（含 `id/name/provider/model/timeout/max_concurrency/enabled`）。
2. 使用环境变量注入密钥/端点；不写死字符串。
3. 在调用侧经 `modelService.callModel(category, id, payload)` 使用。
4. 若新增类别，需扩展类型定义与调用分发逻辑。

### 5.3 扩展文件处理
1. 确认是否需要新类别目录（如 `processed/`）。
2. 更新 `storage.service.ts` 相关路径方法。
3. 更新清理策略：在 `cleanup.service.ts` 中包含新目录。
4. 补充测试：创建、读取、清理场景。

### 5.4 新增结果类型写入
1. 统一写入 `results/`。
2. 元数据记录：建议扩展服务器端 registry 以便后续追踪。
3. 返回数据遵循统一结构并含 i18n key。

## 6. 调试 & 排错建议
- 用 traceId 贯穿：接口响应 → 日志检索。
- 上传/转换失败：检查磁盘配额(`cleanupService.checkQuota`)与 MIME 校验。
- i18n 缺失：响应 message 显示原 key 即为缺失提示。
- 模型超时：优先查看 `config/models.yaml` 的 `timeout` 与并发限制是否过低。
- 清理异常：查看 `cleanup.service.ts` 是否启动或 interval 配置。

## 7. 性能与安全注意
- 避免一次性将大文件读入内存：参考上传流式处理模式。
- 新增外部请求需带超时与重试（遵循现有模型调用策略）。
- 校验所有输入（文件、JSON、查询参数），早失败、少分支。
- 响应错误信息：对用户友好，不泄露内部堆栈；堆栈只写日志。

## 8. 禁止事项（发现需立即修正）
- 直接使用 `console.log`
- 硬编码 API Key / 密钥 / 端点
- 未使用 i18n key 的中文或英文裸字符串
- 拼接/绕过服务层直接访问外部模型接口
- 将临时/转换文件写到非规范目录

## 9. 后续演进建议（可选）
- 引入持久任务队列（Redis）提升可靠性
- 扩展 SDK 专用目录与打包流程
- 增加日志采集与可观测（集中式收集）
- 引入访问控制与鉴权层

## 10. 快速命令备忘
```bash
pnpm install
pnpm dev
pnpm check
pnpm lint
pnpm test
pnpm test:e2e
pnpm format
```

## 11. 最终提交前“超快核对”三行版
```text
(check|lint|test 全绿) & (所有新增字符串已 i18n & 无硬编码密钥) & (统一响应 + traceId + 日志完善)
```

## 12. 日志事件命名规范
事件名格式：`资源.动作` 或 `资源.阶段`，统一小写，层级 ≤3。
推荐：`request.received` / `request.completed` / `upload.start` / `upload.complete` / `conversion.queued` / `conversion.start` / `conversion.complete` / `conversion.failed` / `model.call` / `model.success` / `model.failure` / `model.timeout` / `cleanup.run` / `cleanup.deleted` / `export.start` / `export.complete` / `writeback.start` / `writeback.failed`。
结构化日志字段建议：`{ ts, level, event, traceId, context{}, error? }`，`context` 保留最小定位（sessionId/fileId/taskId/modelId）。禁止使用含糊事件名（如 `test.event`，`do.something`）。

## 13. 错误码扩展建议
新增错误码遵循：全大写 + 下划线分隔 + 语义清晰 + 与业务阶段直接相关。维护处：`src/lib/types/api.ts` + i18n 资源。
候选预留：`MODEL_CALL_FAILED`、`MODEL_CONFIG_INVALID`、`TASK_TIMEOUT`、`WRITEBACK_FAILED`、`EXPORT_FAILED`、`RATE_LIMITED`、`DIFF_GENERATION_FAILED`。新增后需：
1. 更新类型声明
2. 增加 i18n key (`error.<lowercase>`)
3. 单测覆盖映射与分支（包括异常路径）

## 14. 需求不清楚时的澄清流程
遇到模糊需求：
1. 列出“已知”与“不确定”要点
2. 针对不确定点提出最小澄清问题（避免一次性猜测）
3. 使用 Context7 检索相关服务/路由/类型以验证假设
4. 根据澄清结果输出最小实现方案与补丁计划
5. 若仍有高风险假设，提交说明中标记“需确认”，并控制改动范围

## 15. 清理与更新策略
发现内容过期或缺漏：最小增量补充；不删除仍有效规范；更新后通过质量门禁；在提交说明添加“指引更新说明”。

## 参考
- `specs/001-foundation-core/spec.md`
- `README.md`
- SvelteKit Docs: https://svelte.dev/docs/kit
- Inlang Paraglide: https://inlang.com/m/gerre34r/library-inlang-paraglideJs

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

