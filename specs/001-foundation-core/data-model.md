# Data Model: 平台基础架构与核心能力

**Date**: 2025-11-06  
**Feature**: 001-foundation-core  
**Purpose**: 定义核心数据实体、字段、关系和验证规则

---

## 核心实体

### 1. Session (会话)

**描述**: 代表一个用户交互会话,所有文件和操作都归属于特定会话。

**字段**:

| 字段名    | 类型      | 必填 | 描述                | 验证规则           |
| --------- | --------- | ---- | ------------------- | ------------------ |
| id        | string    | ✅    | 唯一标识符(UUID v4) | UUID 格式          |
| createdAt | Date      | ✅    | 创建时间            | ISO 8601 时间戳    |
| expiresAt | Date      | ✅    | 过期时间            | 必须晚于 createdAt |
| language  | string    | ✅    | 用户语言偏好        | 'zh-CN' \| 'en-US' |
| files     | FileRef[] | ✅    | 关联的文件列表      | 数组               |
| metadata  | Record    | ❌    | 扩展元数据          | 键值对             |

**状态转换**:
```
[创建] → [活跃] → [过期] → [清理]
```

**TypeScript 定义**:
```typescript
export interface Session {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  language: 'zh-CN' | 'en-US';
  files: FileRef[];
  metadata?: Record<string, unknown>;
}
```

---

### 2. File (文件)

**描述**: 代表用户上传或系统生成的文件,包含元数据和存储位置。

**字段**:

| 字段名    | 类型         | 必填 | 描述                         | 验证规则                              |
| --------- | ------------ | ---- | ---------------------------- | ------------------------------------- |
| id        | string       | ✅    | 唯一标识符(UUID v4)          | UUID 格式                             |
| sessionId | string       | ✅    | 所属会话 ID                  | 关联 Session.id                       |
| name      | string       | ✅    | 原始文件名                   | 非空,长度 1-255                       |
| type      | FileType     | ✅    | 文件类型                     | 'image' \| 'pdf' \| 'office'          |
| mimeType  | string       | ✅    | MIME 类型                    | 有效的 MIME 类型                      |
| size      | number       | ✅    | 文件大小(字节)               | > 0, <= 200MB(可配置)                 |
| path      | string       | ✅    | 存储路径(相对于 data 目录)   | 有效路径                              |
| category  | Category     | ✅    | 存储类别                     | 'uploads' \| 'converted' \| 'results' |
| createdAt | Date         | ✅    | 创建时间                     | ISO 8601 时间戳                       |
| metadata  | FileMetadata | ❌    | 文件特定元数据(页数、尺寸等) | 根据 type 不同                        |

**子类型: FileMetadata**

- **ImageMetadata**:
  ```typescript
  {
    width: number;
    height: number;
    format: 'png' | 'jpg' | 'webp';
  }
  ```

- **PDFMetadata**:
  ```typescript
  {
    pages: number;
    title?: string;
    author?: string;
  }
  ```

- **OfficeMetadata**:
  ```typescript
  {
    format: 'docx' | 'xlsx' | 'pptx';
    convertedPdfId?: string; // 转换后的 PDF 文件 ID
  }
  ```

**TypeScript 定义**:
```typescript
export type FileType = 'image' | 'pdf' | 'office';
export type Category = 'uploads' | 'converted' | 'results';

export interface File {
  id: string;
  sessionId: string;
  name: string;
  type: FileType;
  mimeType: string;
  size: number;
  path: string;
  category: Category;
  createdAt: Date;
  metadata?: ImageMetadata | PDFMetadata | OfficeMetadata;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: 'png' | 'jpg' | 'webp';
}

export interface PDFMetadata {
  pages: number;
  title?: string;
  author?: string;
}

export interface OfficeMetadata {
  format: 'docx' | 'xlsx' | 'pptx';
  convertedPdfId?: string;
}
```

---

### 3. Task (任务)

**描述**: 代表长时间运行的异步任务(如 Office 转换、AI 处理),用于进度追踪和状态查询。

**字段**:

| 字段名      | 类型       | 必填 | 描述                | 验证规则                                          |
| ----------- | ---------- | ---- | ------------------- | ------------------------------------------------- |
| id          | string     | ✅    | 唯一标识符(UUID v4) | UUID 格式                                         |
| sessionId   | string     | ✅    | 所属会话 ID         | 关联 Session.id                                   |
| type        | TaskType   | ✅    | 任务类型            | 'convert' \| 'ocr' \| 'translate' 等              |
| status      | TaskStatus | ✅    | 任务状态            | 'pending' \| 'running' \| 'succeeded' \| 'failed' |
| progress    | number     | ✅    | 进度(0-100)         | 0 <= progress <= 100                              |
| stage       | string     | ❌    | 当前阶段描述        | 非空字符串                                        |
| createdAt   | Date       | ✅    | 创建时间            | ISO 8601 时间戳                                   |
| startedAt   | Date       | ❌    | 开始时间            | 必须 >= createdAt                                 |
| completedAt | Date       | ❌    | 完成时间            | 必须 >= startedAt                                 |
| eta         | Date       | ❌    | 预计完成时间        | 必须 >= 当前时间                                  |
| result      | TaskResult | ❌    | 任务结果            | status=succeeded 时必填                           |
| error       | TaskError  | ❌    | 错误信息            | status=failed 时必填                              |

**子类型: TaskResult**
```typescript
{
  fileId?: string;       // 生成的文件 ID
  data?: unknown;        // 任务特定结果数据
}
```

**子类型: TaskError**
```typescript
{
  code: string;          // 错误码
  message: string;       // 错误消息
  stack?: string;        // 错误堆栈
}
```

**状态转换**:
```
[pending] → [running] → [succeeded]
                     ↘ [failed]
```

**TypeScript 定义**:
```typescript
export type TaskType = 'convert' | 'ocr' | 'translate' | 'qa' | 'review' | 'extract' | 'writeback';
export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface Task {
  id: string;
  sessionId: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  stage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  eta?: Date;
  result?: TaskResult;
  error?: TaskError;
}

export interface TaskResult {
  fileId?: string;
  data?: unknown;
}

export interface TaskError {
  code: string;
  message: string;
  stack?: string;
}
```

---

### 4. Model (模型配置)

**描述**: 代表一个 AI 模型的配置信息,包括连接参数、限流设置等。

**字段**:

| 字段名         | 类型          | 必填 | 描述                              | 验证规则                    |
| -------------- | ------------- | ---- | --------------------------------- | --------------------------- |
| id             | string        | ✅    | 唯一标识符                        | 字母数字下划线              |
| name           | string        | ✅    | 模型名称                          | 非空                        |
| category       | ModelCategory | ✅    | 模型类别                          | 'ocr' \| 'translate' \| ... |
| provider       | string        | ✅    | 提供商(openai/anthropic/azure 等) | 非空                        |
| endpoint       | string        | ✅    | API 端点 URL                      | 有效 URL                    |
| apiKeyEnv      | string        | ✅    | API 密钥环境变量名                | 非空,不存储实际密钥         |
| model          | string        | ✅    | 模型标识符(如 gpt-4)              | 非空                        |
| timeout        | number        | ✅    | 超时时间(秒)                      | > 0, 默认 180               |
| maxConcurrency | number        | ✅    | 最大并发数                        | > 0, 默认 5                 |
| enabled        | boolean       | ✅    | 是否启用                          | true \| false               |
| parameters     | ModelParams   | ❌    | 模型参数(temperature/top_p 等)    | 键值对                      |

**子类型: ModelParams**
```typescript
{
  temperature?: number;    // 0-2
  top_p?: number;          // 0-1
  max_tokens?: number;     // > 0
  [key: string]: unknown;  // 其他自定义参数
}
```

**TypeScript 定义**:
```typescript
export type ModelCategory = 'ocr' | 'translate' | 'qa' | 'optimize' | 'review' | 'extract';

export interface Model {
  id: string;
  name: string;
  category: ModelCategory;
  provider: string;
  endpoint: string;
  apiKeyEnv: string;
  model: string;
  timeout: number;
  maxConcurrency: number;
  enabled: boolean;
  parameters?: ModelParams;
}

export interface ModelParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  [key: string]: unknown;
}
```

---

### 5. LogEntry (日志条目)

**描述**: 代表一条结构化日志记录,用于审计和调试。

**字段**:

| 字段名     | 类型      | 必填 | 描述                      | 验证规则                    |
| ---------- | --------- | ---- | ------------------------- | --------------------------- |
| timestamp  | string    | ✅    | ISO 8601 时间戳           | ISO 8601 格式               |
| level      | LogLevel  | ✅    | 日志级别                  | 'info' \| 'warn' \| 'error' |
| event      | string    | ✅    | 事件类型(如 upload.start) | 非空                        |
| traceId    | string    | ✅    | 请求追踪 ID               | UUID 格式                   |
| sessionId  | string    | ❌    | 会话 ID                   | UUID 格式                   |
| fileId     | string    | ❌    | 文件 ID                   | UUID 格式                   |
| userId     | string    | ❌    | 用户 ID(预留)             | 字符串                      |
| messageKey | string    | ✅    | i18n 消息 key             | 点分隔符格式                |
| message    | string    | ✅    | 本地化消息                | 非空                        |
| context    | Record    | ❌    | 上下文数据                | 键值对                      |
| error      | ErrorInfo | ❌    | 错误信息                  | level=error 时填写          |

**子类型: ErrorInfo**
```typescript
{
  name: string;        // 错误名称
  message: string;     // 错误消息
  stack?: string;      // 错误堆栈
  code?: string;       // 错误码
}
```

**TypeScript 定义**:
```typescript
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  traceId: string;
  sessionId?: string;
  fileId?: string;
  userId?: string;
  messageKey: string;
  message: string;
  context?: Record<string, unknown>;
  error?: ErrorInfo;
}

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}
```

---

## 辅助类型

### ApiResponse (API 响应)

**成功响应**:
```typescript
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  code: 'OK';
  message: string;       // i18n key
  timestamp: string;     // ISO 8601
  traceId: string;       // UUID
  data: T;
}
```

**错误响应**:
```typescript
export interface ApiErrorResponse {
  success: false;
  code: string;          // 错误码(VALIDATION_ERROR, UPLOAD_FAILED 等)
  message: string;       // i18n key
  timestamp: string;     // ISO 8601
  traceId: string;       // UUID
  details?: Record<string, unknown>;
}
```

**联合类型**:
```typescript
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
```

---

### Config (配置类型)

**系统配置**:
```typescript
export interface SystemConfig {
  upload: {
    maxSize: number;           // 最大文件大小(字节)
    allowedTypes: string[];    // 允许的 MIME 类型
    allowedExtensions: string[]; // 允许的扩展名
  };
  storage: {
    dataDir: string;           // 数据目录路径
    ttl: number;               // 文件 TTL(毫秒)
    cleanupInterval: number;   // 清理任务间隔(毫秒)
  };
  conversion: {
    timeout: number;           // LibreOffice 转换超时(毫秒)
    libreOfficePath?: string;  // LibreOffice 可执行文件路径
  };
  logging: {
    level: LogLevel;
    pretty: boolean;           // 开发模式美化输出
  };
  i18n: {
    defaultLanguage: 'zh-CN' | 'en-US';
    supportedLanguages: string[];
  };
}
```

---

## 关系图

```
Session (1) ─────< (N) File
   │
   └─────< (N) Task

Model (独立配置,无关联)

LogEntry (独立记录,通过 ID 关联)
```

---

## 验证规则总结

### 通用规则
- **UUID**: 所有 ID 字段必须符合 UUID v4 格式
- **时间戳**: 使用 ISO 8601 格式(如 `2025-11-06T09:30:45.123Z`)
- **非空字符串**: 长度 >= 1
- **文件大小**: 0 < size <= 200MB(可配置)

### 业务规则
- **会话过期**: `expiresAt` 必须晚于 `createdAt`
- **任务时间**: `startedAt >= createdAt`, `completedAt >= startedAt`
- **文件类型**: `type` 和 `mimeType` 必须匹配(如 type='image' → mimeType='image/*')
- **任务状态**: `status='succeeded'` 时必须有 `result`,`status='failed'` 时必须有 `error`

### 性能约束
- **并发限制**: Model.maxConcurrency 控制同类型模型调用并发数
- **超时控制**: Task.timeout、Model.timeout 强制终止超时操作
- **存储配额**: SystemConfig.storage 限制总磁盘使用

---

## 下一步

数据模型已定义完成,下一步:
1. 生成 API 契约(OpenAPI schema)
2. 创建快速入门文档
3. 更新 AI agent 上下文
