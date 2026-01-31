#!/bin/bash
# PolyMind 测试启动脚本

echo "=========================================="
echo "  PolyMind 全面测试启动"
echo "=========================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 进入后端目录
cd "$(dirname "$0")"

# 安装依赖
echo ""
echo "📦 安装测试依赖..."
npm install

# 运行单元测试
echo ""
echo "🧪 运行单元测试..."
npm run test

# 运行E2E测试
echo ""
echo "🔗 运行E2E测试..."
npm run test:e2e

# 生成覆盖率
echo ""
echo "📊 生成测试覆盖率..."
npm run test:cov

echo ""
echo "=========================================="
echo "  测试完成!"
echo "=========================================="
echo ""
echo "📄 测试报告位置: coverage/index.html"
echo "📄 E2E报告位置: coverage-e2e/index.html"
echo ""
