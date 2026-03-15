const { initDatabase, getDb } = require('./database');

async function check() {
  await initDatabase();
  const db = getDb();
  
  const users = db.exec('SELECT id, email, qq, password_hash, role FROM users');
  console.log('Users table:', users);
  
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@codequest.com');
  console.log('Admin user:', admin);
}

check();
