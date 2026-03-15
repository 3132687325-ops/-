const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'codequest-secret-key-change-in-production';

// 中间件：验证 token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.qq = decoded.qq;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token 无效' });
  }
}

// 保存题目进度
router.post('/questions', authMiddleware, (req, res) => {
  try {
    const { questionId, completed, xp, timeSpent } = req.body;
    const db = getDb();
    
    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM progress WHERE user_id = ? AND question_id = ?').get(req.userId, questionId);
    
    if (existing) {
      // 更新
      db.prepare(`
        UPDATE progress 
        SET completed = ?, xp = ?, time_spent = time_spent + ?, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND question_id = ?
      `).run([completed ? 1 : 0, xp, timeSpent || 0, req.userId, questionId]);
    } else {
      // 插入
      db.prepare(`
        INSERT INTO progress (user_id, question_id, completed, xp, time_spent, attempts)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run([req.userId, questionId, completed ? 1 : 0, xp, timeSpent || 0]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('保存进度失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户进度
router.get('/progress', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const progress = db.prepare(`
      SELECT question_id, completed, xp, time_spent, attempts
      FROM progress
      WHERE user_id = ?
    `).all(req.userId);
    
    res.json({
      success: true,
      progress: progress.reduce((acc, p) => {
        acc[p.question_id] = {
          completed: p.completed === 1,
          xp: p.xp,
          timeSpent: p.time_spent,
          attempts: p.attempts
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('获取进度失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 保存学习时长（按天）
router.post('/study-time', authMiddleware, (req, res) => {
  try {
    const { seconds } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const db = getDb();
    
    const existing = db.prepare('SELECT id FROM study_sessions WHERE user_id = ? AND date = ?').get(req.userId, today);
    
    if (existing) {
      db.prepare('UPDATE study_sessions SET seconds = seconds + ? WHERE user_id = ? AND date = ?').run([seconds, req.userId, today]);
    } else {
      db.prepare('INSERT INTO study_sessions (user_id, date, seconds) VALUES (?, ?, ?)').run([req.userId, today, seconds]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('保存学习时间失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户统计
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalQuestions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completedQuestions,
        SUM(xp) as totalXp,
        SUM(time_spent) as totalTime
      FROM progress
      WHERE user_id = ?
    `).get(req.userId);
    
    res.json({
      success: true,
      stats: {
        completed: stats.completedQuestions || 0,
        xp: stats.totalXp || 0,
        studyTime: stats.totalTime || 0
      }
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
