# Quick Start: 平台基础架构与核心能力

**Feature**: 001-foundation-core  
**Date**: 2025-11-06  
**Purpose**: 快速上手开发指南

---

## 📋 前置要求

### 必需工具
- **Node.js**: >= 20.x
- **pnpm**: >= 8.x (推荐使用 `npm install -g pnpm` 安装)
- **LibreOffice**: >= 7.x (用于 Office 文档转换)
  - Linux: `sudo apt-get install libreoffice`
  - macOS: `brew install libreoffice`
  - Windows: 下载安装包 https://www.libreoffice.org/download/

### 推荐工具
- **VS Code**: 配合 Svelte 插件
- **Git**: 版本控制

---

## 🚀 快速开始

### 1. 克隆仓库并安装依赖

```bash
# 克隆仓库
git clone https://github.com/ideal-world/ai-docs.git
cd ai-docs

# 切换到功能分支
git checkout 001-foundation-core

# 安装依赖
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件:

```bash
# 服务端口
PORT=5173

# 日志级别(development: debug, production: info)
LOG_LEVEL=debug

# 数据目录
DATA_DIR=./data

# LibreOffice 路径(可选,未设置则自动检测)
# LIBREOFFICE_PATH=/usr/bin/soffice

# 模型 API 密钥(后续功能需要)
# OPENAI_API_KEY=sk-xxx
# ANTHROPIC_API_KEY=sk-ant-xxx
```

### 3. 启动开发服务器

```bash
# 启动开发模式(HMR 热更新)
pnpm dev

# 服务启动后访问: http://localhost:5173
```

**预期输出**:
```
VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### 4. 验证环境

浏览器访问 `http://localhost:5173`,应该看到:
- ✅ 默认欢迎页面加载正常
- ✅ 语言切换功能可用(中文 ↔ 英文)
- ✅ 控制台无错误

检查后端健康:
```bash
curl http://localhost:5173/api/health
```

**预期响应**:
```json
{
  "success": true,
  "code": "OK",
  "message": "health.ok",
  "timestamp": "2025-11-06T09:30:45.123Z",
  "traceId": "abc-123-xyz",
  "data": {
    "status": "healthy",
    "services": {
      "libreoffice": {
        "available": true,
        "version": "7.6.4.1"
      }
    },
    "uptime": 10
  }
}
```

---

## 📂 项目结构概览

```
ai-docs/
├── src/
│   ├── routes/              # SvelteKit 路由
│   │   ├── +page.svelte    # 主页
│   │   ├── +layout.svelte  # 全局布局
│   │   └── api/            # API 端点
│   │       ├── upload/+server.ts
│   │       ├── task/[id]/+server.ts
│   │       └── health/+server.ts
│   ├── lib/                # 共享库
│   │   ├── components/     # UI 组件
│   │   ├── services/       # 业务服务
│   │   ├── stores/         # 状态管理
│   │   └── types/          # TypeScript 类型
│   └── i18n/               # 国际化资源
│       ├── zh-CN.json
│       └── en-US.json
├── packages/
│   └── sdk/                # JS SDK
├── config/                 # 配置文件
│   ├── models.yaml
│   └── system.yaml
├── tests/                  # 测试
│   ├── unit/
│   └── integration/
├── data/                   # 运行时数据(自动生成)
├── package.json
└── README.md
```

---

## 🛠️ 核心开发任务

### 任务 1: 创建新 UI 组件

示例:创建一个按钮组件

```svelte
<!-- src/lib/components/ui/Button.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  interface Props {
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    loading?: boolean;
  }
  
  let { variant = 'primary', disabled = false, loading = false }: Props = $props();
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    if (!disabled && !loading) {
      dispatch('click');
    }
  }
</script>

<button
  class="btn"
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:btn-danger={variant === 'danger'}
  disabled={disabled || loading}
  onclick={handleClick}
>
  {#if loading}
    <span class="loading loading-spinner"></span>
  {/if}
  <slot />
</button>

<style>
  .btn {
    @apply px-4 py-2 rounded font-medium transition-colors;
  }
  
  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
  }
  
  .btn-danger {
    @apply bg-red-600 text-white hover:bg-red-700;
  }
</style>
```

**使用组件**:
```svelte
<script>
  import Button from '$lib/components/ui/Button.svelte';
  
  function handleSubmit() {
    console.log('Submitted!');
  }
</script>

<Button variant="primary" on:click={handleSubmit}>
  提交
</Button>
```

### 任务 2: 添加 API 端点

示例:创建文件删除端点

```typescript
// src/routes/api/files/[fileId]/+server.ts
import type { RequestHandler } from './$types';
import { logger } from '$lib/services/logger.service';
import { storageService } from '$lib/services/storage.service';
import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';

export const DELETE: RequestHandler = async ({ params }) => {
  const traceId = uuidv4();
  const { fileId } = params;
  
  try {
    logger.info({ event: 'file.delete.start', traceId, fileId }, '开始删除文件');
    
    // 查询文件
    const file = await storageService.getFile(fileId);
    if (!file) {
      return json({
        success: false,
        code: 'FILE_NOT_FOUND',
        message: 'error.file.not_found',
        timestamp: new Date().toISOString(),
        traceId
      }, { status: 404 });
    }
    
    // 删除文件
    await storageService.deleteFile(fileId);
    
    logger.info({ event: 'file.delete.done', traceId, fileId }, '文件删除成功');
    
    return json({
      success: true,
      code: 'OK',
      message: 'file.delete.success',
      timestamp: new Date().toISOString(),
      traceId,
      data: { fileId }
    });
    
  } catch (error) {
    logger.error({ event: 'file.delete.failed', traceId, fileId, error: error.stack }, '文件删除失败');
    
    return json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'error.internal',
      timestamp: new Date().toISOString(),
      traceId,
      details: { error: error.message }
    }, { status: 500 });
  }
};
```

### 任务 3: 编写单元测试

示例:测试日志服务

```typescript
// tests/unit/services/logger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '$lib/services/logger.service';

describe('Logger Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should log info with traceId', () => {
    const spy = vi.spyOn(logger, 'info');
    const childLogger = logger.child({ traceId: 'test-123' });
    
    childLogger.info({ event: 'test.event' }, 'Test message');
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'test-123',
        event: 'test.event'
      }),
      'Test message'
    );
  });
  
  it('should log error with stack trace', () => {
    const spy = vi.spyOn(logger, 'error');
    const error = new Error('Test error');
    
    logger.error({ event: 'test.error', error: error.stack }, 'Error occurred');
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'test.error',
        error: expect.stringContaining('Error: Test error')
      }),
      'Error occurred'
    );
  });
});
```

**运行测试**:
```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test logger.test.ts

# 生成覆盖率报告
pnpm test:coverage
```

### 任务 4: 添加 i18n 翻译

编辑翻译文件:

```json
// src/i18n/zh-CN.json
{
  "ui": {
    "upload": {
      "title": "上传文档",
      "drop": "拖拽文件到此处或点击上传",
      "progress": "上传中... {progress}%"
    },
    "preview": {
      "title": "文档预览",
      "page": "第 {current} 页 / 共 {total} 页"
    }
  },
  "error": {
    "upload": {
      "size_exceeded": "文件大小超过限制: {limit}MB",
      "unsupported_type": "不支持的文件类型: {type}"
    },
    "file": {
      "not_found": "文件不存在"
    },
    "internal": "服务器内部错误"
  }
}
```

```json
// src/i18n/en-US.json
{
  "ui": {
    "upload": {
      "title": "Upload Document",
      "drop": "Drag files here or click to upload",
      "progress": "Uploading... {progress}%"
    },
    "preview": {
      "title": "Document Preview",
      "page": "Page {current} / {total}"
    }
  },
  "error": {
    "upload": {
      "size_exceeded": "File size exceeds limit: {limit}MB",
      "unsupported_type": "Unsupported file type: {type}"
    },
    "file": {
      "not_found": "File not found"
    },
    "internal": "Internal server error"
  }
}
```

**使用翻译**:
```svelte
<script>
  import * as m from '$lib/paraglide/messages';
</script>

<h1>{m.ui_upload_title()}</h1>
<p>{m.error_upload_size_exceeded({ limit: 200 })}</p>
```

---

## 🧪 测试与验证

### 运行质量检查

```bash
# TypeScript 类型检查
pnpm run check

# ESLint 代码检查
pnpm lint

# 自动修复 lint 错误
pnpm lint:fix

# 代码格式化
pnpm format

# 运行单元测试
pnpm test

# 测试覆盖率
pnpm test:coverage
```

### 手动测试上传功能

```bash
# 测试图片上传
curl -X POST http://localhost:5173/api/upload \
  -F "file=@test.png"

# 测试 PDF 上传
curl -X POST http://localhost:5173/api/upload \
  -F "file=@test.pdf"

# 测试 Office 上传(返回 taskId)
curl -X POST http://localhost:5173/api/upload \
  -F "file=@test.docx"

# 查询任务状态
curl http://localhost:5173/api/task/{taskId}
```

---

## 🏗️ 构建与部署

### 开发构建

```bash
# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 生产部署

```bash
# 使用 Node.js adapter
pnpm build

# 启动生产服务器
node build/index.js
```

**环境变量配置** (生产环境):
```bash
export NODE_ENV=production
export PORT=3000
export LOG_LEVEL=info
export DATA_DIR=/var/lib/ai-docs/data
```

---

## 📚 常用命令速查

| 命令                 | 说明                |
| -------------------- | ------------------- |
| `pnpm dev`           | 启动开发服务器      |
| `pnpm build`         | 构建生产版本        |
| `pnpm preview`       | 预览生产构建        |
| `pnpm test`          | 运行测试            |
| `pnpm test:coverage` | 生成测试覆盖率报告  |
| `pnpm lint`          | 运行 ESLint         |
| `pnpm format`        | 格式化代码          |
| `pnpm run check`     | TypeScript 类型检查 |

---

## 🐛 故障排除

### LibreOffice 未找到

**问题**: `/api/health` 返回 `libreoffice.available: false`

**解决**:
1. 确认已安装 LibreOffice: `which soffice`
2. 设置环境变量: `export LIBREOFFICE_PATH=/path/to/soffice`
3. 重启服务

### 端口占用

**问题**: `Error: listen EADDRINUSE: address already in use :::5173`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :5173

# 杀死进程
kill -9 <PID>

# 或使用其他端口
export PORT=3000
pnpm dev
```

### 依赖安装失败

**问题**: `pnpm install` 报错

**解决**:
```bash
# 清除缓存
pnpm store prune

# 删除 node_modules 和 lockfile
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

---

## 📖 延伸阅读

- [SvelteKit 官方文档](https://kit.svelte.dev/docs)
- [Svelte 5 Runes](https://svelte-5-preview.vercel.app/docs/runes)
- [FlyonUI 组件库](https://flyonui.com/)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
- [Paraglide-JS i18n](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
- [Vitest 测试框架](https://vitest.dev/)
- [API 契约文档](./contracts/openapi.yaml)

---

## ✅ 下一步

基础架构搭建完成后,可以开始开发具体功能:
1. **OCR 功能**: 实现图片/PDF 文本识别
2. **翻译功能**: 实现文档翻译
3. **问答功能**: 实现基于文档的 AI 问答
4. **审查功能**: 实现文档合规审查
5. **提取与填充**: 实现结构化数据提取和 Word 回写

每个功能的详细规格说明请参考对应的 `specs/` 目录。
