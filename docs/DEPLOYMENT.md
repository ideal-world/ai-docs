# 部署指南 / Deployment Guide

## 目录 / Table of Contents

- [环境要求 / Requirements](#环境要求--requirements)
- [生产环境配置 / Production Configuration](#生产环境配置--production-configuration)
- [构建流程 / Build Process](#构建流程--build-process)
- [部署选项 / Deployment Options](#部署选项--deployment-options)
- [监控与维护 / Monitoring and Maintenance](#监控与维护--monitoring-and-maintenance)

---

## 环境要求 / Requirements

### 系统要求 / System Requirements

- **操作系统**: Linux (推荐 Ubuntu 20.04+ / CentOS 8+), macOS 11+, Windows 10+ (WSL2)
- **Node.js**: 20.x 或更高版本
- **pnpm**: 9.x
- **LibreOffice**: 7.5+ (用于 Office 文档转换)
- **内存**: 至少 2GB RAM (推荐 4GB+)
- **磁盘**: 至少 10GB 可用空间 (根据文件存储需求调整)

### 安装 LibreOffice (必需)

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y libreoffice
```

#### CentOS/RHEL

```bash
sudo yum install -y libreoffice
```

#### macOS

```bash
brew install --cask libreoffice
```

#### 验证安装

```bash
soffice --version
# 应输出: LibreOffice 7.x.x.x
```

---

## 生产环境配置 / Production Configuration

### 1. 环境变量 / Environment Variables

创建生产环境配置文件 `.env.production`:

```bash
# Node.js 环境
NODE_ENV=production

# 服务器配置
HOST=0.0.0.0
PORT=3000
ORIGIN=https://your-domain.com

# OpenAI API 配置
OPENAI_API_KEY=sk-your-openai-api-key-here

# 文件存储配置
DATA_DIR=./data
MAX_FILE_SIZE=209715200  # 200MB in bytes
SESSION_TTL_HOURS=24

# LibreOffice 配置
LIBREOFFICE_PATH=/usr/bin/soffice

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json

# 清理调度 (每小时检查一次过期会话)
CLEANUP_INTERVAL_MS=3600000

# 模型配置文件
MODELS_CONFIG_PATH=./config/models.yaml
```

### 2. 模型配置 / Model Configuration

编辑 `config/models.yaml` 配置生产环境的 AI 模型:

```yaml
ocr:
  - id: ocr-gpt4o
    name: GPT-4 Vision OCR
    provider: openai
    model: gpt-4o
    endpoint: https://api.openai.com/v1/chat/completions
    apiKey: ${OPENAI_API_KEY} # 从环境变量读取
    timeout: 60000
    max_concurrency: 10 # 生产环境提高并发限制
    enabled: true

translate:
  - id: translate-gpt4o
    name: GPT-4 Translator
    provider: openai
    model: gpt-4o
    endpoint: https://api.openai.com/v1/chat/completions
    apiKey: ${OPENAI_API_KEY}
    timeout: 30000
    max_concurrency: 15
    enabled: true
# 其他类别配置...
```

### 3. 存储目录权限 / Storage Directory Permissions

```bash
# 创建数据目录
mkdir -p ./data

# 设置适当权限 (确保应用有读写权限)
chmod 755 ./data

# 如果使用非 root 用户运行
chown -R your-app-user:your-app-group ./data
```

---

## 构建流程 / Build Process

### 1. 安装依赖 / Install Dependencies

```bash
pnpm install --prod
```

### 2. 构建应用 / Build Application

```bash
pnpm build
```

构建产物位于 `.svelte-kit/output/` 目录。

### 3. 验证构建 / Verify Build

```bash
# 本地预览生产构建
pnpm preview

# 访问 http://localhost:4173 测试
```

---

## 部署选项 / Deployment Options

### 选项 1: Node.js 服务器 (推荐)

使用 Node.js 直接运行构建后的应用。

#### 使用 PM2 (进程管理器)

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start build/index.js --name ai-docs

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs ai-docs

# 重启应用
pm2 restart ai-docs

# 停止应用
pm2 stop ai-docs
```

#### 使用 systemd (Linux)

创建服务文件 `/etc/systemd/system/ai-docs.service`:

```ini
[Unit]
Description=AI Docs Platform
After=network.target

[Service]
Type=simple
User=your-app-user
WorkingDirectory=/path/to/ai-docs
Environment="NODE_ENV=production"
EnvironmentFile=/path/to/ai-docs/.env.production
ExecStart=/usr/bin/node /path/to/ai-docs/build/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ai-docs

[Install]
WantedBy=multi-user.target
```

启动服务:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-docs
sudo systemctl start ai-docs

# 查看状态
sudo systemctl status ai-docs

# 查看日志
sudo journalctl -u ai-docs -f
```

---

### 选项 2: Docker 容器

#### Dockerfile

创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile --prod

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产镜像
FROM node:20-alpine

# 安装 LibreOffice
RUN apk add --no-cache libreoffice

WORKDIR /app

# 从构建阶段复制文件
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/config ./config
COPY --from=builder /app/messages ./messages

# 创建数据目录
RUN mkdir -p /app/data && chmod 755 /app/data

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动应用
CMD ["node", "build/index.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  ai-docs:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
      - ./config/models.yaml:/app/config/models.yaml
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 部署命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

### 选项 3: Nginx 反向代理

在生产环境中推荐使用 Nginx 作为反向代理。

#### Nginx 配置示例

创建 `/etc/nginx/sites-available/ai-docs`:

```nginx
upstream ai_docs {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # 文件上传大小限制
    client_max_body_size 200M;

    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://ai_docs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://ai_docs;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置:

```bash
sudo ln -s /etc/nginx/sites-available/ai-docs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 监控与维护 / Monitoring and Maintenance

### 1. 健康检查 / Health Check

应用提供健康检查端点:

```bash
curl http://localhost:3000/api/health
```

定期监控此端点确保服务正常运行。

### 2. 日志管理 / Log Management

#### 应用日志

应用使用结构化 JSON 日志，输出到 stdout/stderr。

在生产环境中，建议使用日志聚合工具:

- **PM2**: 自动捕获日志到 `~/.pm2/logs/`
- **systemd**: 使用 `journalctl -u ai-docs` 查看
- **Docker**: 使用 `docker logs` 或 ELK 栈

#### 日志轮转

使用 logrotate 管理日志文件 (如果写入文件):

```bash
# /etc/logrotate.d/ai-docs
/var/log/ai-docs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0644 your-app-user your-app-group
}
```

### 3. 性能监控 / Performance Monitoring

推荐工具:

- **Node.js APM**: New Relic, Datadog, PM2 Plus
- **资源监控**: Prometheus + Grafana
- **错误追踪**: Sentry

### 4. 备份策略 / Backup Strategy

#### 数据目录备份

```bash
# 每日备份脚本 (cron job)
#!/bin/bash
BACKUP_DIR="/backup/ai-docs/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# 备份数据目录
tar -czf "$BACKUP_DIR/data.tar.gz" /path/to/ai-docs/data

# 备份配置文件
cp /path/to/ai-docs/config/models.yaml "$BACKUP_DIR/"
cp /path/to/ai-docs/.env.production "$BACKUP_DIR/"

# 删除 30 天前的备份
find /backup/ai-docs -type d -mtime +30 -exec rm -rf {} \;
```

添加到 crontab:

```bash
# 每天凌晨 2 点执行备份
0 2 * * * /path/to/backup.sh
```

### 5. 会话清理 / Session Cleanup

应用自动清理过期会话 (默认 24 小时 TTL)。

手动触发清理 (如需):

```bash
# 删除超过 24 小时的会话目录
find ./data -type d -mtime +1 -exec rm -rf {} \;
```

### 6. 磁盘空间管理 / Disk Space Management

监控数据目录大小:

```bash
du -sh ./data
```

设置告警阈值 (推荐使用 Nagios/Zabbix):

```bash
# 检查磁盘使用率
df -h /path/to/data | awk 'NR==2 {print $5}' | sed 's/%//'
```

---

## 故障排查 / Troubleshooting

### 常见问题 / Common Issues

#### 1. LibreOffice 不可用

**症状**: `/api/health` 返回 `libreoffice.available: false`

**解决方法**:

```bash
# 检查 LibreOffice 是否安装
which soffice

# 检查权限
ls -la /usr/bin/soffice

# 重新安装 LibreOffice
sudo apt-get install --reinstall libreoffice
```

#### 2. 文件上传失败

**症状**: 上传返回 413 Payload Too Large

**解决方法**:

- 检查 `MAX_FILE_SIZE` 环境变量
- 如果使用 Nginx，检查 `client_max_body_size`

#### 3. AI 模型调用失败

**症状**: API 返回 `error.model.call_failed`

**解决方法**:

```bash
# 检查 API Key
echo $OPENAI_API_KEY

# 测试模型端点连通性
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"test"}]}'

# 重载模型配置
curl -X POST http://localhost:3000/api/config/reload
```

#### 4. 内存泄漏

**症状**: Node.js 进程内存持续增长

**解决方法**:

```bash
# 使用 PM2 自动重启 (内存限制)
pm2 start build/index.js --name ai-docs --max-memory-restart 1G

# 手动重启
pm2 restart ai-docs
```

---

## 安全加固 / Security Hardening

### 1. 防火墙配置

```bash
# 仅允许 Nginx 访问应用端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # 阻止外部直接访问
sudo ufw enable
```

### 2. HTTPS 证书

推荐使用 Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. 环境变量保护

```bash
# .env.production 文件权限
chmod 600 .env.production
chown your-app-user:your-app-group .env.production
```

### 4. Rate Limiting

在 Nginx 配置中添加速率限制:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://ai_docs;
}
```

---

## 扩展与优化 / Scaling and Optimization

### 水平扩展 / Horizontal Scaling

使用负载均衡器 (如 Nginx) 分发请求到多个实例:

```nginx
upstream ai_docs_cluster {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    # ... 其他配置
    location / {
        proxy_pass http://ai_docs_cluster;
    }
}
```

### 共享存储

多实例部署时使用共享存储 (NFS/S3):

```bash
# 挂载 NFS
sudo mount -t nfs nas-server:/export/ai-docs-data /path/to/ai-docs/data
```

---

**最后更新**: 2025-01-06  
**文档版本**: v1.0
