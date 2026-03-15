const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.CODEQUEST_DB_PATH || path.join(__dirname, 'codequest.sqlite');
const SUPER_ADMIN_EMAIL = 'admin@codequest.com';
const SUPER_ADMIN_PASSWORD = 'admin123456';
const FIXED_REGISTER_CODE = '8888';

let db = null;
let autoSaveStarted = false;

function getOne(query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function createUsersTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(64),
      qq VARCHAR(12) UNIQUE,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      email_verified BOOLEAN DEFAULT 0,
      role VARCHAR(20) DEFAULT 'user',
      parent_id INTEGER,
      invite_code VARCHAR(32),
      used_invite_code VARCHAR(32),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);
  try {
    db.run('ALTER TABLE users ADD COLUMN name VARCHAR(64)');
  } catch (e) {
    if (!e.message || !e.message.includes('duplicate column')) throw e;
  }
}

function createProgressTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      completed BOOLEAN DEFAULT 0,
      xp INTEGER DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, question_id)
    )
  `);
}

function createStudySessionsTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      seconds INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    )
  `);
}

function createInviteCodesTable() {
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
}

function generateSuperAdminInviteCode() {
  return `SUPER${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function hasUsablePasswordHash(passwordHash) {
  return typeof passwordHash === 'string' && passwordHash.trim().length > 0;
}

function ensureInviteCodeRecord(code, createdBy) {
  const existingRecord = getOne(
    `
      SELECT id, created_by, max_uses, is_active
      FROM invite_codes
      WHERE code = ?
    `,
    [code]
  );

  if (!existingRecord) {
    db.prepare(`
      INSERT INTO invite_codes (code, created_by, max_uses, is_active)
      VALUES (?, ?, -1, 1)
    `).run([code, createdBy]);

    return true;
  }

  if (
    existingRecord.created_by !== createdBy ||
    existingRecord.max_uses !== -1 ||
    existingRecord.is_active !== 1
  ) {
    db.prepare(`
      UPDATE invite_codes
      SET created_by = ?, max_uses = -1, is_active = 1
      WHERE id = ?
    `).run([createdBy, existingRecord.id]);

    return true;
  }

  return false;
}

function ensureSuperAdminInviteCode(existingCode) {
  let inviteCode =
    typeof existingCode === 'string' && existingCode.trim().length > 0
      ? existingCode.trim()
      : null;

  while (!inviteCode) {
    const candidate = generateSuperAdminInviteCode();
    const userConflict = getOne('SELECT id FROM users WHERE invite_code = ?', [candidate]);
    const inviteConflict = getOne('SELECT id FROM invite_codes WHERE code = ?', [candidate]);

    if (!userConflict && !inviteConflict) {
      inviteCode = candidate;
    }
  }

  return inviteCode;
}

function ensureSuperAdmin() {
  const adminPasswordHash = bcrypt.hashSync(SUPER_ADMIN_PASSWORD, 10);
  const existingAdmin = getOne(
    `
      SELECT id, email, password_hash, role, invite_code
      FROM users
      WHERE email = ?
    `,
    [SUPER_ADMIN_EMAIL]
  );

  let adminId = null;
  let inviteCode = null;
  let changed = false;

  if (!existingAdmin) {
    inviteCode = ensureSuperAdminInviteCode(null);

    db.prepare(`
      INSERT INTO users (name, email, password_hash, role, invite_code, created_at)
      VALUES (?, ?, ?, 'super_admin', ?, CURRENT_TIMESTAMP)
    `).run(['管理员', SUPER_ADMIN_EMAIL, adminPasswordHash, inviteCode]);

    adminId = getOne('SELECT last_insert_rowid() AS id').id;
    changed = true;
    console.log('Created default super admin account.');
  } else {
    adminId = existingAdmin.id;
    inviteCode = ensureSuperAdminInviteCode(existingAdmin.invite_code);

    const nextPasswordHash = hasUsablePasswordHash(existingAdmin.password_hash)
      ? existingAdmin.password_hash
      : adminPasswordHash;
    const needsRepair =
      nextPasswordHash !== existingAdmin.password_hash ||
      existingAdmin.role !== 'super_admin' ||
      inviteCode !== existingAdmin.invite_code;

    if (needsRepair) {
      db.prepare(`
        UPDATE users
        SET password_hash = ?, role = 'super_admin', invite_code = ?
        WHERE id = ?
      `).run([nextPasswordHash, inviteCode, adminId]);

      changed = true;
      console.log('Repaired default super admin account data.');
    }
  }

  if (ensureInviteCodeRecord(inviteCode, adminId)) {
    changed = true;
  }

  if (ensureInviteCodeRecord(FIXED_REGISTER_CODE, adminId)) {
    changed = true;
  }

  return changed;
}

function startAutoSave() {
  if (autoSaveStarted) {
    return;
  }

  setInterval(saveDatabase, 60000);
  autoSaveStarted = true;
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  createUsersTable();
  createProgressTable();
  createStudySessionsTable();
  createInviteCodesTable();

  const changed = ensureSuperAdmin();
  saveDatabase();
  startAutoSave();

  if (changed) {
    console.log('Database initialized and super admin verified.');
  } else {
    console.log('Database initialized.');
  }
}

function saveDatabase() {
  if (!db) {
    return;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});

module.exports = {
  getDb: () => db,
  initDatabase,
  saveDatabase
};
