// 数据库迁移脚本 - 添加用户层级和邀请码支持

require('dotenv').config();
const { initDatabase, getDb, saveDatabase } = require('./database');

async function migrate() {
  console.log('🔄 开始数据库迁移...\n');
  
  await initDatabase();
  const db = getDb();
  
  try {
    // 1. 修改 users 表 - 添加新字段
    console.log('📝 更新 users 表结构...');
    
    db.run(`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`);
    console.log('  ✅ 添加 role 字段');
    
    db.run(`ALTER TABLE users ADD COLUMN parent_id INTEGER`);
    console.log('  ✅ 添加 parent_id 字段');
    
    db.run(`ALTER TABLE users ADD COLUMN invite_code VARCHAR(32)`);
    console.log('  ✅ 添加 invite_code 字段');
    
    db.run(`ALTER TABLE users ADD COLUMN used_invite_code VARCHAR(32)`);
    console.log('  ✅ 添加 used_invite_code 字段');
    
    // 2. 创建 invite_codes 表
    console.log('\n📝 创建 invite_codes 表...');
    
    db.run(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(32) UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        max_uses INTEGER DEFAULT -1,
        used_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('  ✅ invite_codes 表创建完成');
    
    // 3. 创建超级管理员账号（如果不存在）
    console.log('\n📝 创建超级管理员账号...');
    
    const bcrypt = require('bcryptjs');
    const adminPassword = bcrypt.hashSync('admin123456', 10);
    const superAdminCode = 'SUPER' + Date.now();
    
    db.run(`
      INSERT OR IGNORE INTO users (email, password_hash, role, invite_code, created_at)
      VALUES (?, ?, 'super_admin', ?, CURRENT_TIMESTAMP)
    `, ['admin@codequest.com', adminPassword, superAdminCode]);
    
    console.log('  ✅ 超级管理员账号创建完成');
    console.log('     邮箱：admin@codequest.com');
    console.log('     密码：admin123456');
    console.log(`     邀请码：${superAdminCode}`);
    
    // 4. 为现有用户生成邀请码
    console.log('\n📝 为现有用户生成邀请码...');
    
    const users = db.exec('SELECT id, role FROM users WHERE invite_code IS NULL');
    if (users.length > 0 && users[0].values.length > 0) {
      for (const user of users[0].values) {
        const userId = user[0];
        const userRole = user[1] || 'user';
        const inviteCode = 'INV' + userId + Date.now();
        
        db.run('UPDATE users SET invite_code = ? WHERE id = ?', [inviteCode, userId]);
        
        // 高级用户和超级管理员自动创建邀请码记录
        if (userRole === 'super_admin' || userRole === 'admin') {
          db.run(`
            INSERT INTO invite_codes (code, created_by, max_uses, is_active)
            VALUES (?, ?, -1, 1)
          `, [inviteCode, userId]);
        }
      }
      console.log('  ✅ 现有用户邀请码生成完成');
    }
    
    // 保存数据库
    saveDatabase();
    
    console.log('\n✅ 数据库迁移完成！\n');
    console.log('═══════════════════════════════════════════');
    console.log('超级管理员账号信息：');
    console.log('  邮箱：admin@codequest.com');
    console.log('  密码：admin123456');
    console.log('  ⚠️  首次登录后请立即修改密码！');
    console.log('═══════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  }
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
