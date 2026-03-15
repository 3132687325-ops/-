const express = require('express');
const nodemailer = require('nodemailer');
const { getDb } = require('../database');

const router = express.Router();
const emailCodes = new Map();

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

function normalizeQq(input) {
  if (input == null) {
    return '';
  }

  const value = String(input).trim();
  const match = value.match(/^(\d{5,12})@qq\.com$/i);
  return match ? match[1] : value;
}

function resolveTarget(body = {}) {
  const rawEmail = body.email != null ? String(body.email).trim() : '';
  const rawQq = body.qq != null ? String(body.qq).trim() : '';

  let qq = normalizeQq(rawQq);
  let email = rawEmail;

  if (!qq && /^(\d{5,12})@qq\.com$/i.test(rawEmail)) {
    qq = normalizeQq(rawEmail);
    email = '';
  }

  if (qq) {
    if (!/^\d{5,12}$/.test(qq) || qq.startsWith('0')) {
      return { error: 'QQ 号格式不正确，请输入 5-12 位数字或 QQ 邮箱' };
    }

    return {
      qq,
      email: `${qq}@qq.com`,
      isQqTarget: true
    };
  }

  if (!email) {
    return { error: '请填写 QQ 号或邮箱地址' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: '邮箱格式不正确' };
  }

  return {
    qq: '',
    email,
    isQqTarget: false
  };
}

function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.163.com';
  const port = Number.parseInt(process.env.EMAIL_PORT || '465', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('Email SMTP credentials are missing.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

function getFromAddress() {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const configuredFrom = (process.env.EMAIL_FROM || '').trim();

  if (configuredFrom && /<[^>]+>/.test(configuredFrom)) {
    return configuredFrom;
  }

  if (configuredFrom && emailUser) {
    return `"${configuredFrom.replace(/"/g, '\\"')}" <${emailUser}>`;
  }

  return emailUser || 'CodeQuest';
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function verifyAndConsumeCode(email, code) {
  const normalizedEmail = resolveTarget({ email }).email;
  const normalizedCode = String(code || '').trim();
  const stored = emailCodes.get(normalizedEmail);

  if (!stored) {
    return { ok: false, error: '请先获取验证码' };
  }

  if (Date.now() > stored.expiresAt) {
    emailCodes.delete(normalizedEmail);
    return { ok: false, error: '验证码已过期' };
  }

  if (stored.code !== normalizedCode) {
    return { ok: false, error: '验证码错误' };
  }

  emailCodes.delete(normalizedEmail);
  return { ok: true };
}

router.post('/send-code', async (req, res) => {
  try {
    const db = getDb();
    const target = resolveTarget(req.body);

    if (target.error) {
      return res.status(400).json({ error: target.error });
    }

    if (target.isQqTarget) {
      const existingQq = getOne(db, 'SELECT id FROM users WHERE qq = ?', [target.qq]);
      if (existingQq) {
        return res.status(409).json({ error: '该 QQ 号已注册' });
      }
    } else {
      const existingEmail = getOne(db, 'SELECT id FROM users WHERE email = ?', [target.email]);
      if (existingEmail) {
        return res.status(409).json({ error: '该邮箱已注册' });
      }
    }

    const code = generateCode();
    const transporter = createTransporter();

    await transporter.sendMail({
      from: getFromAddress(),
      to: target.email,
      subject: 'CodeQuest 邮箱验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">CodeQuest</h2>
          <p>您好，</p>
          <p>您正在注册 CodeQuest，验证码如下：</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3b82f6;">${code}</span>
          </div>
          <p>验证码有效期：<strong>10 分钟</strong></p>
          <p>如果不是您本人操作，请忽略这封邮件。</p>
        </div>
      `
    });

    emailCodes.set(target.email, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    return res.json({
      success: true,
      message: '验证码已发送'
    });
  } catch (error) {
    console.error('Failed to send email verification code:', error);

    const message =
      error && typeof error.message === 'string' && error.message.includes('credentials')
        ? '邮箱服务未配置完成，请联系管理员'
        : '发送失败，请稍后重试';

    return res.status(500).json({ error: message });
  }
});

router.post('/verify-code', (req, res) => {
  try {
    const target = resolveTarget(req.body);
    const code = String(req.body?.code || '').trim();

    if (target.error) {
      return res.status(400).json({ error: target.error });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: '请输入 6 位验证码' });
    }

    const result = verifyAndConsumeCode(target.email, code);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: '验证码验证成功',
      email: target.email
    });
  } catch (error) {
    console.error('Failed to verify email code:', error);
    return res.status(500).json({ error: '验证码验证失败' });
  }
});

setInterval(() => {
  const now = Date.now();

  for (const [email, entry] of emailCodes.entries()) {
    if (now > entry.expiresAt) {
      emailCodes.delete(email);
    }
  }
}, 60 * 60 * 1000);

module.exports = {
  router,
  verifyAndConsumeCode
};
