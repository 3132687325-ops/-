const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDatabase } = require('../database');
const { verifyAndConsumeCode } = require('./email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'codequest-secret-key-change-in-production';
const SUPER_ADMIN_EMAIL = 'admin@codequest.com';
const SUPER_ADMIN_PASSWORD = 'admin123456';

function generateInviteCode() {
  return `INV${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeQq(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{5,12})@qq\.com$/i);
  return match ? match[1] : text;
}

function getOne(db, query, params = []) {
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

function getAll(db, query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }

  stmt.free();
  return rows;
}

function hasUsablePasswordHash(passwordHash) {
  return typeof passwordHash === 'string' && passwordHash.trim().length > 0;
}

function repairSuperAdminPasswordHash(db, user) {
  const repairedHash = bcrypt.hashSync(SUPER_ADMIN_PASSWORD, 10);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run([repairedHash, user.id]);
  saveDatabase();

  return {
    ...user,
    password_hash: repairedHash
  };
}

router.post('/register', (req, res) => {
  try {
    const { name, email, qq, password, invite_code, email_code } = req.body;
    const db = getDb();

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: '请填写您的姓名或昵称' });
    }
    const nameTrim = String(name).trim();
    if (nameTrim.length > 64) {
      return res.status(400).json({ error: '姓名或昵称最多 64 个字符' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    if (!invite_code) {
      return res.status(400).json({ error: '请输入邀请码' });
    }

    function normalizeQq(input) {
      if (input == null) return '';
      const s = String(input).trim();
      const m = s.match(/^(\d{5,12})@qq\.com$/i);
      return m ? m[1] : s;
    }
    let qqStr = qq != null ? normalizeQq(qq) : '';
    if (!qqStr && email && /^(\d{5,12})@qq\.com$/i.test(String(email).trim())) {
      qqStr = String(email).trim().match(/^(\d{5,12})@qq\.com$/i)[1];
    }
    const useQq = qqStr && /^\d{5,12}$/.test(qqStr) && !qqStr.startsWith('0');
    const qqTrim = useQq ? qqStr : null;
    const qqEmail = qqTrim ? `${qqTrim}@qq.com` : null;

    if (qqStr && !useQq) {
      return res.status(400).json({ error: 'QQ 号格式不正确（5-12 位数字，且不能以 0 开头）' });
    }

    if (useQq) {
      if (!email_code || String(email_code).trim().length !== 6) {
        return res.status(400).json({ error: '请输入 6 位邮箱验证码' });
      }
      const verifyResult = verifyAndConsumeCode(qqEmail, String(email_code).trim());
      if (!verifyResult.ok) {
        return res.status(400).json({ error: verifyResult.error });
      }
    }

    const inviteRecord = getOne(
      db,
      'SELECT * FROM invite_codes WHERE code = ? AND is_active = 1',
      [invite_code]
    );

    if (!inviteRecord) {
      const userWithCode = getOne(db, 'SELECT id, role FROM users WHERE invite_code = ?', [invite_code]);

      if (!userWithCode) {
        return res.status(400).json({ error: '邀请码无效' });
      }

      if (userWithCode.role === 'user') {
        return res.status(400).json({ error: '该邀请码不可用' });
      }
    } else {
      if (inviteRecord.max_uses !== -1 && inviteRecord.used_count >= inviteRecord.max_uses) {
        return res.status(400).json({ error: '邀请码已达到使用上限' });
      }

      if (inviteRecord.expires_at && new Date(inviteRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: '邀请码已过期' });
      }
    }

    let uniqueField = '';
    let uniqueValue = '';

    if (useQq && qqTrim) {
      uniqueField = 'qq';
      uniqueValue = qqTrim;
    } else if (email) {
      const emailStr = String(email).trim();
      const qqFromEmail = normalizeQq(emailStr);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        return res.status(400).json({ error: '账号格式不正确，请填写 QQ 号（5-12 位）或 QQ 邮箱（如 xxx@qq.com）' });
      }
      uniqueField = 'email';
      uniqueValue = emailStr;
    } else {
      return res.status(400).json({ error: '请填写账号（QQ 号 5-12 位数字）' });
    }

    const existing = getOne(db, `SELECT id FROM users WHERE ${uniqueField} = ?`, [uniqueValue]);
    if (existing) {
      return res.status(409).json({ error: '该账号已注册' });
    }

    let parentRole = 'user';
    let parentId = null;

    const inviteCreator = getOne(db, 'SELECT created_by FROM invite_codes WHERE code = ?', [invite_code]);
    if (inviteCreator) {
      parentId = inviteCreator.created_by;
    } else {
      const userWithCode = getOne(db, 'SELECT id, role FROM users WHERE invite_code = ?', [invite_code]);
      if (userWithCode) {
        parentId = userWithCode.id;
        parentRole = userWithCode.role;
      }
    }

    let newUserRole = 'user';
    if (parentRole === 'super_admin') {
      newUserRole = 'admin';
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userInviteCode = newUserRole !== 'user' ? generateInviteCode() : null;

    db.prepare(`
      INSERT INTO users (name, ${uniqueField}, password_hash, role, parent_id, invite_code, used_invite_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run([nameTrim, uniqueValue, passwordHash, newUserRole, parentId, userInviteCode, invite_code]);

    const userId = getOne(db, 'SELECT last_insert_rowid() AS id').id;

    if (newUserRole !== 'user') {
      db.prepare(`
        INSERT INTO invite_codes (code, created_by, max_uses, is_active)
        VALUES (?, ?, -1, 1)
      `).run([userInviteCode, userId]);
    }

    if (inviteRecord) {
      db.prepare('UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ?').run([inviteRecord.id]);
    }

    const token = jwt.sign({ userId, email, qq: uniqueField === 'qq' ? uniqueValue : undefined }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      user: {
        id: userId,
        name: nameTrim,
        email: uniqueField === 'email' ? uniqueValue : undefined,
        qq: uniqueField === 'qq' ? uniqueValue : undefined,
        role: newUserRole,
        invite_code: userInviteCode,
        token
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, qq, password } = req.body;
    const db = getDb();

    if (!password) {
      return res.status(400).json({ error: '请输入密码' });
    }

    let user = null;

    if (email) {
      const emailStr = String(email).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        return res.status(400).json({ error: '账号格式不正确，请填写 QQ 号或邮箱' });
      }
      if (/^\d{5,12}$/.test(qqFromEmail) && !qqFromEmail.startsWith('0')) {
        user = getOne(db, 'SELECT * FROM users WHERE qq = ?', [qqFromEmail]);
      }

      if (!user) {
        user = getOne(db, 'SELECT * FROM users WHERE email = ?', [emailStr]);
      }
    } else if (qq) {
      user = getOne(db, 'SELECT * FROM users WHERE qq = ?', [normalizeQq(qq)]);
    } else {
      return res.status(400).json({ error: '需要提供邮箱或 QQ 号' });
    }

    if (!user) {
      return res.status(404).json({ error: '账号不存在' });
    }

    if (!hasUsablePasswordHash(user.password_hash)) {
      if (user.email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
        user = repairSuperAdminPasswordHash(db, user);
      } else if (user.email === SUPER_ADMIN_EMAIL) {
        return res.status(401).json({ error: '密码错误' });
      } else {
        return res.status(500).json({ error: '账号密码数据异常，请联系管理员' });
      }
    }

    let valid = false;
    try {
      valid = bcrypt.compareSync(password, user.password_hash);
    } catch (compareError) {
      console.error('Password hash compare failed:', compareError);
      return res.status(500).json({ error: '账号密码数据异常，请联系管理员' });
    }

    if (!valid) {
      return res.status(401).json({ error: '密码错误' });
    }

    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run([user.id]);

    const token = jwt.sign(
      { userId: user.id, email: user.email, qq: user.qq, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        qq: user.qq,
        role: user.role,
        invite_code: user.invite_code,
        token
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/verify-invite-code', (req, res) => {
  try {
    const { code } = req.body;
    const db = getDb();

    if (!code) {
      return res.status(400).json({ error: '请输入邀请码' });
    }

    const inviteRecord = getOne(
      db,
      'SELECT * FROM invite_codes WHERE code = ? AND is_active = 1',
      [code]
    );

    if (inviteRecord) {
      if (inviteRecord.max_uses !== -1 && inviteRecord.used_count >= inviteRecord.max_uses) {
        return res.status(400).json({ error: '邀请码已达到使用上限' });
      }

      if (inviteRecord.expires_at && new Date(inviteRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: '邀请码已过期' });
      }

      const creator = getOne(db, 'SELECT role FROM users WHERE id = ?', [inviteRecord.created_by]);

      return res.json({
        success: true,
        valid: true,
        creator_role: creator?.role || 'unknown'
      });
    }

    const userWithCode = getOne(db, 'SELECT role FROM users WHERE invite_code = ?', [code]);
    if (userWithCode) {
      if (userWithCode.role === 'user') {
        return res.status(400).json({ error: '该邀请码不可用' });
      }

      return res.json({
        success: true,
        valid: true,
        creator_role: userWithCode.role
      });
    }

    return res.json({
      success: true,
      valid: false,
      error: '邀请码无效'
    });
  } catch (error) {
    console.error('验证邀请码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();

    const user = getOne(
      db,
      'SELECT id, name, qq, email, role, parent_id, invite_code, created_at, last_login FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const stats = getOne(db, `
      SELECT
        COUNT(*) AS totalQuestions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completedQuestions,
        SUM(xp) AS totalXp,
        SUM(time_spent) AS totalTime
      FROM progress
      WHERE user_id = ?
    `, [decoded.userId]);

    res.json({
      success: true,
      user: {
        ...user,
        stats: {
          completed: stats.completedQuestions || 0,
          xp: stats.totalXp || 0,
          studyTime: stats.totalTime || 0
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(401).json({ error: 'Token 无效' });
  }
});

router.post('/invite-codes', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();

    const user = getOne(db, 'SELECT role FROM users WHERE id = ?', [decoded.userId]);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return res.status(403).json({ error: '权限不足' });
    }

    const { max_uses, expires_days } = req.body;
    const code = generateInviteCode();
    const expiresAt = expires_days
      ? new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    db.prepare(`
      INSERT INTO invite_codes (code, created_by, max_uses, expires_at)
      VALUES (?, ?, ?, ?)
    `).run([code, decoded.userId, max_uses || -1, expiresAt]);

    res.status(201).json({
      success: true,
      code,
      max_uses: max_uses || -1,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('创建邀请码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/downline', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();

    const downline = getAll(db, `
      SELECT id, email, qq, role, created_at, last_login
      FROM users
      WHERE parent_id = ?
      ORDER BY created_at DESC
    `, [decoded.userId]);

    res.json({
      success: true,
      downline
    });
  } catch (error) {
    console.error('获取下级用户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
