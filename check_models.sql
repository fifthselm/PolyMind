-- 查看所有AI模型的配置
-- 请复制到PostgreSQL客户端或Prisma Studio的Raw Query中执行

SELECT 
    id,
    provider,
    model_name,
    display_name,
    api_endpoint,
    CASE 
        WHEN api_key_encrypted IS NULL THEN 'NULL'
        WHEN LENGTH(api_key_encrypted) < 10 THEN 'Too short'
        ELSE SUBSTRING(api_key_encrypted, 1, 10) || '...'
    END as api_key_preview,
    is_active,
    created_by_id
FROM ai_models
ORDER BY created_at DESC;

-- 检查provider字段是否有非标准值
SELECT 
    provider,
    COUNT(*) as count
FROM ai_models
GROUP BY provider;

-- 检查model_name字段
SELECT 
    model_name,
    display_name,
    provider
FROM ai_models;
