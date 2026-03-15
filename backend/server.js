const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ROOT = path.join(__dirname, '..');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(FRONTEND_ROOT));

app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes.router);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeQuest API is running' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

async function start() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`CodeQuest backend started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
