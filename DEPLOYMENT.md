# PolyMind 生产环境部署指南

## 概述

本文档介绍如何在生产环境部署 PolyMind 系统。

## 部署方式

### 方式一：Docker Compose（推荐小型部署）

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/polymind.git
cd polymind

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置必要的配置

# 3. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 4. 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 5. 检查服务状态
docker-compose -f docker-compose.prod.yml ps
```

### 方式二：Kubernetes（推荐生产部署）

#### 前置要求
- Kubernetes 1.20+
- Helm 3.x
- Ingress Controller (如 nginx-ingress)
- PV Provisioner

#### 部署步骤

```bash
# 1. 创建命名空间
kubectl create namespace polymind

# 2. 创建配置和密钥
kubectl apply -f k8s/config.yaml -n polymind

# 3. 部署 PostgreSQL
kubectl apply -f k8s/postgres/ -n polymind

# 4. 部署 Redis
kubectl apply -f k8s/redis/ -n polymind

# 5. 部署 Backend
kubectl apply -f k8s/backend/ -n polymind

# 6. 部署 Frontend
kubectl apply -f k8s/frontend/ -n polymind

# 7. 部署 Ingress
kubectl apply -f k8s/ingress/ -n polymind

# 8. 检查状态
kubectl get pods -n polymind
kubectl get svc -n polymind
kubectl get ingress -n polymind
```

#### Helm 部署（可选）

```bash
# 添加 Helm 仓库
helm repo add polymind https://yourusername.github.io/polymind-charts

# 安装
helm install polymind polymind/polymind \
  --namespace polymind \
  --values values.yaml
```

## 环境配置

### 必需配置项

```bash
# .env 文件

# 数据库
POSTGRES_USER=polymind
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=polymind

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# CORS
CORS_ORIGIN=https://your-domain.com
```

### 可选配置项

```bash
# OpenAI (如果使用)
OPENAI_API_KEY=sk-xxx

# Anthropic Claude (如果使用)
ANTHROPIC_API_KEY=xxx

# Google Gemini (如果使用)
GOOGLE_API_KEY=xxx

# 阿里云通义千问 (如果使用)
ALIYUN_API_KEY=xxx

# 百度文心一言 (如果使用)
BAIDU_API_KEY=xxx
BAIDU_SECRET_KEY=xxx
```

## SSL/HTTPS 配置

### 使用 Let's Encrypt

```bash
# 安装 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 创建 ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF

# 更新 Ingress 添加 TLS
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: polymind-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - polymind.example.com
      secretName: polymind-tls
  # ... 其他配置
EOF
```

## 监控

### Prometheus + Grafana

```bash
# 添加监控
kubectl apply -f k8s/monitoring/
```

### 日志聚合

```bash
# 使用 Loki + Grafana
kubectl apply -f https://raw.githubusercontent.com/grafana/loki/main/production/helm/loki-stack.yaml
```

## 备份与恢复

### PostgreSQL 备份

```bash
# 备份
kubectl exec -n polymind postgres-0 -- pg_dump -U polymind polymind > backup.sql

# 恢复
kubectl exec -i -n polymind postgres-0 -- psql -U polymind -d polymind < backup.sql
```

### 自动备份 (CronJob)

```bash
kubectl apply -f k8s/backup/cronjob.yaml
```

## 扩缩容

### 手动扩缩容

```bash
# 扩缩 Backend
kubectl scale deployment backend -n polymind --replicas=4

# 扩缩 Frontend
kubectl scale deployment frontend -n polymind --replicas=3
```

### 自动扩缩容

HorizontalPodAutoscaler 已配置，自动根据 CPU 和内存使用率扩缩容。

## 故障排查

### 检查日志

```bash
# Backend 日志
kubectl logs -f deployment/backend -n polymind

# Frontend 日志
kubectl logs -f deployment/frontend -n polymind

# PostgreSQL 日志
kubectl logs -f postgres-0 -n polymind
```

### 检查服务状态

```bash
# 检查 Pods
kubectl get pods -n polymind

# 检查 Services
kubectl get svc -n polymind

# 检查 Endpoints
kubectl get endpoints -n polymind
```

### 常见问题

1. **数据库连接失败**
   - 检查 DATABASE_URL 配置
   - 检查 PostgreSQL Pod 状态
   - 检查网络策略

2. **WebSocket 连接失败**
   - 检查 Ingress 配置
   - 检查 WebSocket 超时设置
   - 检查防火墙规则

3. **内存不足**
   - 增加 Pod 内存限制
   - 启用 Redis 缓存
   - 优化数据库查询

## 更新部署

### Docker Compose

```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes

```bash
# 更新镜像
kubectl set image deployment/backend backend=ghcr.io/yourusername/polymind-backend:latest -n polymind
kubectl set image deployment/frontend frontend=ghcr.io/yourusername/polymind-frontend:latest -n polymind

# 查看滚动更新
kubectl rollout status deployment/backend -n polymind
kubectl rollout status deployment/frontend -n polymind
```

## 安全加固

1. **启用 RBAC**
2. **使用 NetworkPolicy**
3. **加密敏感数据**
4. **定期更新镜像版本**
5. **启用审计日志**

## 性能优化

1. **数据库优化**
   - 启用连接池
   - 优化查询
   - 使用索引

2. **缓存策略**
   - Redis 缓存热点数据
   - CDN 静态资源

3. **负载均衡**
   - 使用 HPA 自动扩缩容
   - 配置资源限制
