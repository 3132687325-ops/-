// 初始化超级管理员账号

require('dotenv').config();
const { initDatabase, getDb, saveDatabase } = require('./database');
const bcrypt = require('bcryptjs');

async function init() {
  await initDatabase();
  const db = getDb();
  
  console.log('📝 检查超级管理员账号...');
  
  // 检查是否已存在
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@codequest.com');
  
  if (existing) {
    console.log('✅ 超级管理员账号已存在');
    return;
  }
  
  // 创建超级管理员
  console.log('📝 创建超级管理员账号...');
  
  const adminPassword = bcrypt.hashSync('admin123456', 10);
  const superAdminCode = 'SUPER' + Date.now();
  
  db.run(`
    INSERT INTO users (email, password_hash, role, invite_code, created_at)
    VALUES (?, ?, 'super_admin', ?, CURRENT_TIMESTAMP)
  `, ['admin@codequest.com', adminPassword, superAdminCode]);
  
  // 创建邀请码记录
  db.run(`
    INSERT INTO invite_codes (code, created_by, max_uses, is_active)
    VALUES (?, ?, -1, 1)
  `, [superAdminCode, 1]);
  
  saveDatabase();
  
  console.log('✅ 超级管理员账号创建完成！\n');
  console.log('═══════════════════════════════════════════');
  console.log('超级管理员账号信息：');
  console.log('  邮箱：admin@codequest.com');
  console.log('  密码：admin123456');
  console.log(`  邀请码：${superAdminCode}`);
  console.log('═══════════════════════════════════════════\n');
}

init().catch(err => {
  console.error('初始化失败:', err);
  process.exit(1);
});
