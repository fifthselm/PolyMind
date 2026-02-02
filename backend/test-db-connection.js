const { Client } = require('pg');

// 测试不同的数据库配置
const configs = [
  // 默认无密码
  { user: 'postgres', password: '', database: 'postgres', host: 'localhost', port: 5432 },
  // 密码postgres
  { user: 'postgres', password: 'postgres', database: 'postgres', host: 'localhost', port: 5432 },
  // 密码空
  { user: 'postgres', password: '', database: 'postgres', host: 'localhost', port: 5432 },
  // 常见密码
  { user: 'postgres', password: '123456', database: 'postgres', host: 'localhost', port: 5432 },
  { user: 'postgres', password: 'admin', database: 'postgres', host: 'localhost', port: 5432 },
  { user: 'postgres', password: 'password', database: 'postgres', host: 'localhost', port: 5432 },
];

async function testConnection(config, index) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`✅ 配置${index + 1}成功:`);
    console.log(`   用户: ${config.user}`);
    console.log(`   密码: ${config.password || '(空)'}`);
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ 配置${index + 1}失败: ${error.message}`);
    return false;
  }
}

async function findWorkingConfig() {
  console.log('🔍 正在测试PostgreSQL连接...\n');
  
  for (let i = 0; i < configs.length; i++) {
    if (await testConnection(configs[i], i)) {
      console.log('\n✨ 找到可用配置！\n');
      console.log('请在 backend/.env 中设置:');
      console.log(`DATABASE_URL="postgresql://${configs[i].user}:${configs[i].password}@localhost:5432/polymind?schema=public"`);
      return;
    }
  }
  
  console.log('\n⚠️ 所有预设配置都失败了！\n');
  console.log('请手动确认PostgreSQL配置:');
  console.log('1. PostgreSQL是否运行?');
  console.log('2. 端口号是否正确(默认5432)?');
  console.log('3. 用户名和密码是什么?');
  console.log('\n或者使用Docker启动PostgreSQL:');
  console.log('docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15');
}

findWorkingConfig();
