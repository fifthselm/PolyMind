# 后端 Dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动
CMD ["npm", "run", "start:prod"]
