#!/bin/bash
# 全面修复 PolyMind 后端编译错误

cd /root/.openclaw/workspace/PolyMind/backend

echo "=== 修复 meetings summaries 导入路径 ==="
sed -i "s|from '../../providers/prisma.service'|from '../../../providers/prisma.service'|g" src/modules/meetings/summaries/summary.service.ts
sed -i "s|from '../../providers/llm/llm.service'|from '../../../providers/llm/llm.service'|g" src/modules/meetings/summaries/summary.service.ts

echo "=== 修复 rag.service langchain 导入 ==="
sed -i "s|from '@langchain/langchain/text_splitter'|from 'langchain/text_splitter'|g" src/modules/rag/rag.service.ts

echo "=== 修复 files.controller jwt-auth 导入 ==="
sed -i "s|from '../../common/guards/jwt-auth.guard'|from '../../guards/jwt-auth.guard'|g" src/modules/files/files.controller.ts

echo "=== 修复 debates.service metadata 问题 ==="
sed -i "s/metadata: {/metadata: { [key: string]: any }/g" src/modules/debates/debates.service.ts

echo "=== 添加缺失的类型定义 ==="

# 在 rag.service.ts 的 vector store 定义处添加类型注解
cat > /tmp/rag_fix.patch << 'EOF'
--- a/src/modules/rag/rag.service.ts
+++ b/src/modules/rag/rag.service.ts
@@ -11,7 +11,7 @@ const mammoth = require('mammoth');
 export class RAGService {
   private readonly logger = new Logger(RAGService.name);
   private embeddings: OpenAIEmbeddings;
-  private vectorStore: any = null;
+  private vectorStore: Chroma | null = null;
   private initialized = false;
 
   constructor(private readonly prisma: PrismaService) {
EOF

echo "=== 重新生成 Prisma 客户端 ==="
npx prisma generate

echo "=== 重新编译 ==="
npm run build
