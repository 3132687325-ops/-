const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'backend/codequest.sqlite');

async function check() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  
  console.log('当前用户数:', result.count);
  console.log('');
  console.log('用户列表:');
  
  const users = db.prepare('SELECT id, email, qq, role, created_at FROM users ORDER BY id');
  while (users.step()) {
    const user = users.getAsObject();
    console.log(`  ${user.id}. ${user.email || user.qq} (${user.role}) - ${user.created_at}`);
  }
  users.free();
  
  console.log('');
  console.log('📊 账号限制说明：');
  console.log('  - SQLite 数据库没有内置用户数量限制');
  console.log('  - 理论上可以创建无限个账号');
  console.log('  - 实际限制取决于服务器存储空间');
  console.log('  - email 和 qq 字段有 UNIQUE 约束，不能重复');
  console.log('  - 建议：生产环境可限制单 IP 注册频率，防止滥用');
  
  db.close();
  process.exit(0);
}

check();
