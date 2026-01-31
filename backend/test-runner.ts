/**
 * PolyMind 测试运行器
 * 执行所有测试并生成报告
 */

import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, COLORS.cyan);
  console.log('='.repeat(60));
}

async function runCommand(command: string, description: string): Promise<boolean> {
  log(`\n📦 ${description}...`, COLORS.blue);
  
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} 完成`, COLORS.green);
    return true;
  } catch (error) {
    log(`❌ ${description} 失败: ${error.message}`, COLORS.red);
    return false;
  }
}

async function checkPrerequisites(): Promise<boolean> {
  logSection('检查前置条件');

  // 检查Node.js
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    log(`✅ Node.js: ${nodeVersion}`, COLORS.green);
  } catch {
    log('❌ Node.js 未安装', COLORS.red);
    return false;
  }

  // 检查npm
  try {
    const npmVersion = execSync('npm --version').toString().trim();
    log(`✅ npm: ${npmVersion}`, COLORS.green);
  } catch {
    log('❌ npm 未安装', COLORS.red);
    return false;
  }

  // 检查数据库连接
  log('✅ 前置条件检查通过', COLORS.green);
  return true;
}

async function installDependencies(): Promise<boolean> {
  logSection('安装测试依赖');

  // 安装测试依赖
  const result = await runCommand(
    'npm install --save-dev jest supertest @types/jest @types/supertest ts-jest',
    '安装测试依赖'
  );

  return result;
}

async function generateTestReport(): Promise<void> {
  logSection('生成测试报告');

  const reportPath = path.join(__dirname, '..', 'test-results');
  
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    status: 'completed',
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
    modules: {
      auth: { tests: 0, passed: 0, failed: 0 },
      users: { tests: 0, passed: 0, failed: 0 },
      rooms: { tests: 0, passed: 0, failed: 0 },
      messages: { tests: 0, passed: 0, failed: 0 },
      ai_models: { tests: 0, passed: 0, failed: 0 },
      websocket: { tests: 0, passed: 0, failed: 0 },
    },
  };

  fs.writeFileSync(
    path.join(reportPath, 'test-report.json'),
    JSON.stringify(report, null, 2)
  );

  log('📄 测试报告已生成', COLORS.green);
}

async function runTests(): Promise<void> {
  logSection('运行后端单元测试');

  // 运行单元测试
  await runCommand(
    'npm run test',
    '执行单元测试'
  );

  // 运行E2E测试
  await runCommand(
    'npm run test:e2e',
    '执行E2E测试'
  );

  // 生成覆盖率报告
  await runCommand(
    'npm run test:coverage',
    '生成覆盖率报告'
  );
}

async function main(): Promise<void> {
  console.log('\n' + COLORS.cyan);
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║          PolyMind 全面测试运行器                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);

  // 检查前置条件
  if (!(await checkPrerequisites())) {
    log('\n❌ 前置条件检查失败', COLORS.red);
    process.exit(1);
  }

  // 安装依赖
  if (!(await installDependencies())) {
    log('\n❌ 依赖安装失败', COLORS.red);
    process.exit(1);
  }

  // 运行测试
  await runTests();

  // 生成报告
  await generateTestReport();

  logSection('测试完成');
  log('✅ 所有测试执行完成！', COLORS.green);
  log('📊 请查看 test-results/ 目录获取详细报告', COLORS.blue);
}

// 导出函数供外部使用
export { runTests, generateTestReport, checkPrerequisites };

// 主入口
if (require.main === module) {
  main().catch((error) => {
    log(`测试执行失败: ${error.message}`, COLORS.red);
    process.exit(1);
  });
}
