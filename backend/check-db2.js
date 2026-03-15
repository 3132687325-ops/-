const SQL = require('sql.js');
const fs = require('fs');

const db = new SQL.Database(fs.readFileSync('codequest.sqlite'));

console.log('Users:');
const users = db.exec('SELECT id, email, password_hash, role, invite_code FROM users');
console.log(users);

console.log('\nAdmin:');
const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@codequest.com');
console.log(admin);
