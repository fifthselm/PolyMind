#!/bin/bash
# 修复 PolyMind 后端编译错误

cd /root/.openclaw/workspace/PolyMind/backend

echo "=== 1. 安装缺失的 langchain 依赖 ==="
npm install @langchain/openai @langchain/community langchain

echo ""
echo "=== 2. 修复导入路径 ==="

# 修复 agent-team 模块的导入路径
sed -i "s|from '../../common/guards/jwt-auth.guard'|from '../../guards/jwt-auth.guard'|g" src/modules/agent-team/agent-team.controller.ts
sed -i "s|from '../../common/guards/jwt-auth.guard'|from '../../guards/jwt-auth.guard'|g" src/modules/rag/rag.controller.ts

# 修复 debates 模块的导入路径
sed -i "s|from '../auth/jwt-auth.guard'|from '../../guards/jwt-auth.guard'|g" src/modules/debates/debates.controller.ts

# 修复 meetings 模块的导入路径
sed -i "s|from '../../providers/prisma.service'|from '../providers/prisma.service'|g" src/modules/meetings/summaries/summary.service.ts
sed -i "s|from '../../providers/llm/llm.service'|from '../providers/llm/llm.service'|g" src/modules/meetings/summaries/summary.service.ts

# 修复 role-scenarios 模块的导入路径
sed -i "s|from '../../providers/prisma.module'|from '../providers/prisma.module'|g" src/modules/role-scenarios/role-scenarios.module.ts

echo ""
echo "=== 3. 重新生成 Prisma 客户端 ==="
npx prisma generate

echo ""
echo "=== 4. 重新编译 ==="
npm run build
