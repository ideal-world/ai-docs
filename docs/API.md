# API 文档 / API Documentation

> 基于 OpenAPI 3.1.0 规范 - 详见 `specs/001-foundation-core/contracts/openapi.yaml`

## 基础信息 / Basic Information

- **Base URL**: `http://localhost:5173/api` (开发环境)
- **版本**: v0.1.0
- **认证**: 当前版本无需认证 (未来可扩展)
- **请求头**:
  - `Content-Type`: `application/json` (除文件上传外)
  - `X-Session-ID`: `<uuid>` (可选，用于会话关联)
  - `Accept-Language`: `zh-CN` 或 `en-US` (影响错误消息语言)

---

## 统一响应格式 / Unified Response Format

所有 API 端点遵循统一的 JSON 响应格式：

### 成功响应 (Success Response)

```json
{
	"success": true,
	"code": "OK",
	"message": "upload.success",
	"timestamp": "2025-01-06T09:30:45.123Z",
	"traceId": "abc-123-xyz-789",
	"data": {
		// 具体业务数据
	}
}
```

**字段说明**:

- `success`: 布尔值，表示请求是否成功
- `code`: 字符串状态码 (成功为 `"OK"`)
- `message`: i18n 消息键 (前端可根据当前语言显示本地化文本)
- `timestamp`: ISO 8601 格式的时间戳
- `traceId`: 请求追踪 ID (用于日志关联和问题排查)
- `data`: 业务数据对象

### 错误响应 (Error Response)

```json
{
	"success": false,
	"code": "VALIDATION_ERROR",
	"message": "error.upload.invalid_format",
	"timestamp": "2025-01-06T09:30:45.123Z",
	"traceId": "abc-123-xyz-789",
	"details": {
		"field": "file",
		"allowedFormats": ["jpg", "png", "pdf", "docx", "xlsx", "pptx"]
	}
}
```

**常见错误码**:

- `VALIDATION_ERROR` (400): 请求参数验证失败
- `NOT_FOUND` (404): 资源不存在
- `INTERNAL_ERROR` (500): 服务器内部错误
- `LIBREOFFICE_UNAVAILABLE` (503): LibreOffice 服务不可用

---

## API 端点列表 / API Endpoints

### 1. 健康检查 / Health Check

#### `GET /api/health`

检查系统健康状态，包括 LibreOffice 可用性和 AI 模型配置。

**请求示例**:

```bash
curl -X GET http://localhost:5173/api/health
```

**响应示例**:

```json
{
	"success": true,
	"code": "OK",
	"message": "health.check.ok",
	"timestamp": "2025-01-06T10:00:00.000Z",
	"traceId": "health-check-001",
	"data": {
		"status": "healthy",
		"libreoffice": {
			"available": true,
			"version": "7.5.3"
		},
		"models": {
			"loaded": true,
			"categories": ["ocr", "translate", "qa", "review", "extract"],
			"totalModels": 5
		},
		"uptime": 3600
	}
}
```

**字段说明**:

- `status`: 系统状态 (`healthy` | `degraded` | `unhealthy`)
- `libreoffice.available`: LibreOffice 是否可用 (影响 Office 文件转换)
- `models.loaded`: AI 模型配置是否已加载
- `uptime`: 服务运行时长 (秒)

---

### 2. 文件上传 / File Upload

#### `POST /api/upload`

上传主文档 (图片、PDF、Office 文档)。

**Content-Type**: `multipart/form-data`

**请求参数**:

- `files` (required): 一个或多个文件
- `X-Session-ID` (header, optional): 会话 ID (不提供则自动创建)

**支持的文件格式**:

- 图片: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- PDF: `.pdf`
- Office: `.docx`, `.xlsx`, `.pptx`

**请求示例**:

```bash
curl -X POST http://localhost:5173/api/upload \
  -H "X-Session-ID: my-session-123" \
  -F "files=@document.pdf" \
  -F "files=@image.png"
```

**响应示例** (图片/PDF):

```json
{
	"success": true,
	"code": "OK",
	"message": "upload.success",
	"timestamp": "2025-01-06T10:05:00.000Z",
	"traceId": "upload-001",
	"data": {
		"sessionId": "my-session-123",
		"files": [
			{
				"fileId": "file-001",
				"name": "document.pdf",
				"format": "pdf",
				"size": 2048576,
				"category": "main"
			},
			{
				"fileId": "file-002",
				"name": "image.png",
				"format": "image",
				"size": 512000,
				"category": "main"
			}
		]
	}
}
```

**响应示例** (Office 文件):

```json
{
	"success": true,
	"code": "OK",
	"message": "upload.success",
	"timestamp": "2025-01-06T10:05:00.000Z",
	"traceId": "upload-002",
	"data": {
		"sessionId": "my-session-123",
		"files": [
			{
				"fileId": "file-003",
				"name": "report.docx",
				"format": "docx",
				"size": 1024000,
				"category": "main",
				"conversionTaskId": "task-001"
			}
		]
	}
}
```

**注意事项**:

- Office 文件上传后会自动创建 PDF 转换任务 (`conversionTaskId`)
- 文件大小限制: 默认 200MB (可通过环境变量配置)
- 同一会话的文件会存储在 `./data/{sessionId}/main/` 目录

---

### 3. 附加文档上传 / Attachment Upload

#### `POST /api/attachments`

上传附加文档 (用于问答、审查、提取与填充等功能)。

**请求参数**: 同 `/api/upload`

**请求示例**:

```bash
curl -X POST http://localhost:5173/api/attachments \
  -H "X-Session-ID: my-session-123" \
  -F "files=@reference.pdf"
```

**响应示例**:

```json
{
	"success": true,
	"code": "OK",
	"message": "upload.attachment.success",
	"timestamp": "2025-01-06T10:10:00.000Z",
	"traceId": "attachment-001",
	"data": {
		"sessionId": "my-session-123",
		"files": [
			{
				"fileId": "attach-001",
				"name": "reference.pdf",
				"format": "pdf",
				"size": 1536000,
				"category": "attachment"
			}
		]
	}
}
```

**用途场景**:

- 问答功能: 作为上下文参考文档
- 审查功能: 作为审查规范文档 (必需)
- 提取与填充: 作为自动填充数据源

---

### 4. 任务查询 / Task Query

#### `GET /api/task/{taskId}`

查询异步任务的状态和进度 (如 Office 转 PDF 转换)。

**路径参数**:

- `taskId`: 任务 ID (由上传或其他 API 返回)

**请求示例**:

```bash
curl -X GET http://localhost:5173/api/task/task-001
```

**响应示例** (进行中):

```json
{
	"success": true,
	"code": "OK",
	"message": "task.query.success",
	"timestamp": "2025-01-06T10:15:00.000Z",
	"traceId": "task-query-001",
	"data": {
		"taskId": "task-001",
		"type": "convert",
		"status": "processing",
		"progress": 45,
		"createdAt": "2025-01-06T10:05:00.000Z"
	}
}
```

**响应示例** (已完成):

```json
{
	"success": true,
	"code": "OK",
	"message": "task.query.success",
	"timestamp": "2025-01-06T10:16:00.000Z",
	"traceId": "task-query-002",
	"data": {
		"taskId": "task-001",
		"type": "convert",
		"status": "completed",
		"progress": 100,
		"createdAt": "2025-01-06T10:05:00.000Z",
		"completedAt": "2025-01-06T10:06:30.000Z",
		"result": {
			"convertedFileId": "file-003-converted",
			"pages": 15
		}
	}
}
```

**状态值**:

- `pending`: 等待处理
- `processing`: 处理中
- `completed`: 已完成
- `failed`: 处理失败

---

### 5. 文件信息查询 / File Info

#### `GET /api/files/{fileId}`

获取文件详细信息。

**请求示例**:

```bash
curl -X GET http://localhost:5173/api/files/file-001
```

**响应示例**:

```json
{
	"success": true,
	"code": "OK",
	"message": "file.query.success",
	"timestamp": "2025-01-06T10:20:00.000Z",
	"traceId": "file-query-001",
	"data": {
		"fileId": "file-001",
		"name": "document.pdf",
		"format": "pdf",
		"size": 2048576,
		"category": "main",
		"uploadedAt": "2025-01-06T10:05:00.000Z",
		"sessionId": "my-session-123"
	}
}
```

---

### 6. 文件删除 / File Delete

#### `DELETE /api/files/{fileId}`

删除文件 (包括转换产物和相关任务)。

**请求示例**:

```bash
curl -X DELETE http://localhost:5173/api/files/file-001
```

**响应示例**:

```json
{
	"success": true,
	"code": "OK",
	"message": "file.delete.success",
	"timestamp": "2025-01-06T10:25:00.000Z",
	"traceId": "file-delete-001",
	"data": {
		"fileId": "file-001",
		"deleted": true
	}
}
```

---

### 7. 文件下载 / File Download

#### `GET /api/files/{fileId}/download`

下载文件 (原始文件或转换后的 PDF)。

**查询参数**:

- `type` (optional): `original` | `converted` (默认: `original`)

**请求示例**:

```bash
# 下载原始文件
curl -X GET http://localhost:5173/api/files/file-003/download \
  -o report.docx

# 下载转换后的 PDF
curl -X GET http://localhost:5173/api/files/file-003/download?type=converted \
  -o report.pdf
```

**响应**: 文件流 (Content-Type: application/octet-stream 或对应 MIME 类型)

---

### 8. 配置重载 / Config Reload

#### `POST /api/config/reload`

重新加载 AI 模型配置 (`config/models.yaml`)。

**使用场景**:

- 修改模型配置后立即生效
- 添加新模型后刷新系统

**请求示例**:

```bash
curl -X POST http://localhost:5173/api/config/reload
```

**响应示例**:

```json
{
	"success": true,
	"code": "OK",
	"message": "config.reload.success",
	"timestamp": "2025-01-06T10:30:00.000Z",
	"traceId": "config-reload-001",
	"data": {
		"categoriesLoaded": 5,
		"totalModels": 12,
		"categories": ["ocr", "translate", "qa", "review", "extract"]
	}
}
```

---

## 错误码参考 / Error Codes Reference

| 错误码                    | HTTP 状态 | 描述                   | 示例消息键                              |
| ------------------------- | --------- | ---------------------- | --------------------------------------- |
| `OK`                      | 200       | 成功                   | `upload.success`                        |
| `VALIDATION_ERROR`        | 400       | 请求参数验证失败       | `error.upload.invalid_format`           |
| `NOT_FOUND`               | 404       | 资源不存在             | `error.file.not_found`                  |
| `INTERNAL_ERROR`          | 500       | 服务器内部错误         | `error.internal`                        |
| `LIBREOFFICE_UNAVAILABLE` | 503       | LibreOffice 服务不可用 | `error.convert.libreoffice_unavailable` |
| `MODEL_ERROR`             | 500       | AI 模型调用失败        | `error.model.call_failed`               |

---

## 限制与配额 / Limits and Quotas

| 项目              | 限制    | 配置变量                                  |
| ----------------- | ------- | ----------------------------------------- |
| 文件大小          | 200 MB  | `MAX_FILE_SIZE`                           |
| 会话 TTL          | 24 小时 | `SESSION_TTL_HOURS`                       |
| 并发请求 (每模型) | 5       | `config/models.yaml` 中 `max_concurrency` |
| API 超时          | 60 秒   | `API_TIMEOUT`                             |

---

## 示例工作流 / Example Workflows

### 工作流 1: 上传并预览 PDF

```bash
# 1. 上传 PDF
RESPONSE=$(curl -s -X POST http://localhost:5173/api/upload \
  -F "files=@document.pdf")
FILE_ID=$(echo $RESPONSE | jq -r '.data.files[0].fileId')

# 2. 下载预览
curl -X GET "http://localhost:5173/api/files/$FILE_ID/download" \
  -o preview.pdf
```

### 工作流 2: 上传 Office 文件并等待转换

```bash
# 1. 上传 DOCX
RESPONSE=$(curl -s -X POST http://localhost:5173/api/upload \
  -F "files=@report.docx")
FILE_ID=$(echo $RESPONSE | jq -r '.data.files[0].fileId')
TASK_ID=$(echo $RESPONSE | jq -r '.data.files[0].conversionTaskId')

# 2. 轮询任务状态
while true; do
  TASK=$(curl -s "http://localhost:5173/api/task/$TASK_ID")
  STATUS=$(echo $TASK | jq -r '.data.status')

  if [ "$STATUS" = "completed" ]; then
    echo "Conversion completed!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Conversion failed!"
    exit 1
  fi

  echo "Status: $STATUS, waiting..."
  sleep 2
done

# 3. 下载转换后的 PDF
curl -X GET "http://localhost:5173/api/files/$FILE_ID/download?type=converted" \
  -o report.pdf
```

### 工作流 3: 清理会话文件

```bash
# 1. 获取会话中的所有文件
SESSION_ID="my-session-123"

# 2. 删除主文档
curl -X DELETE "http://localhost:5173/api/files/file-001"

# 3. 删除附加文档
curl -X DELETE "http://localhost:5173/api/files/attach-001"

# 注: 会话目录会在 TTL 到期后自动清理
```

---

## 未来扩展 API / Future APIs

以下 API 端点将在后续版本中实现：

### OCR 识别 (计划中)

```
POST /api/ocr
Body: { fileId, modelId, crossCheck?: boolean }
Returns: { taskId }
```

### 翻译 (计划中)

```
POST /api/translate
Body: { text, sourceLang, targetLang, modelId }
Returns: { taskId }
```

### 问答 (计划中)

```
POST /api/qa
Body: { prompt, modelId, attachmentIds?: [] }
Returns: { taskId }
```

### 审查 (计划中)

```
POST /api/review
Body: { mainFileId, specFileIds: [], modelId }
Returns: { taskId }
```

### 提取与填充 (计划中)

```
POST /api/extract
Body: { mainFileId, definitions: [], attachmentIds?: [], autofill?: boolean, modelId }
Returns: { taskId }
```

---

## 完整 OpenAPI 规范 / Full OpenAPI Spec

完整的 OpenAPI 3.1.0 规范文件位于:

```
specs/001-foundation-core/contracts/openapi.yaml
```

可使用以下工具查看交互式文档:

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://redocly.github.io/redoc/)
- [Stoplight](https://stoplight.io/)

---

**最后更新**: 2025-01-06  
**API 版本**: v0.1.0
