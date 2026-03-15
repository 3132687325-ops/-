const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// 获取所有用户列表
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        id,
        name,
        email,
        qq,
        role,
        created_at,
        last_login
      FROM users
      ORDER BY created_at DESC
    `);
    
    const users = [];
    while (stmt.step()) {
      users.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个用户详情
router.get('/users/:qq', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT 
        u.id,
        u.qq,
        u.created_at,
        u.last_login,
        COUNT(p.id) as totalQuestions,
        SUM(CASE WHEN p.completed = 1 THEN 1 ELSE 0 END) as completedQuestions,
        SUM(p.xp) as totalXp,
        SUM(p.time_spent) as totalTime
      FROM users u
      LEFT JOIN progress p ON u.id = p.user_id
      WHERE u.qq = ?
      GROUP BY u.id
    `).get(req.params.qq);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 获取学习记录（最近 7 天）
    const studyRecords = db.prepare(`
      SELECT date, seconds
      FROM study_sessions
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT 7
    `).all(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        qq: user.qq,
        registeredAt: user.created_at,
        lastLogin: user.last_login,
        stats: {
          totalQuestions: user.totalQuestions || 0,
          completed: user.completedQuestions || 0,
          xp: user.totalXp || 0,
          studyTime: user.totalTime || 0
        },
        studyRecords: studyRecords
      }
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取平台总统计
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM progress').get().count;
    const completedQuestions = db.prepare('SELECT COUNT(*) as count FROM progress WHERE completed = 1').get().count;
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalQuestions,
        completedQuestions,
        completionRate: totalQuestions > 0 ? (completedQuestions / totalQuestions * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
