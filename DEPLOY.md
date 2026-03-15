# CodeQuest 部署文档

## 📦 本地开发（Windows）

### 1. 安装 Node.js
下载并安装：https://nodejs.org/

### 2. 安装后端依赖
```bash
cd backend
install.bat
```

### 3. 启动服务器
```bash
npm start
```

访问：http://localhost:3000

---

## 🚀 Ubuntu 服务器部署

### 1. 上传代码到服务器
```bash
# 方式 1: SCP
scp -r GameifyLearn user@your-server:/home/user/

# 方式 2: Git
git clone <your-repo>
```

### 2. 执行部署脚本
```bash
cd GameifyLearn
chmod +x deploy.sh
./deploy.sh
```

### 3. 配置防火墙（如果需要）
```bash
sudo ufw allow 3000
```

### 4. 访问
```
http://你的服务器IP:3000
```

---

## 📊 管理后台

访问：http://你的服务器 IP:3000/admin.html

**功能**：
- 查看所有用户
- 用户学习统计
- 平台数据概览

---

## 🔧 常用命令

### 查看服务状态
```bash
sudo systemctl status codequest
```

### 重启服务
```bash
sudo systemctl restart codequest
```

### 查看日志
```bash
sudo journalctl -u codequest -f
```

### 停止服务
```bash
sudo systemctl stop codequest
```

---

## 📱 API 接口

### 用户认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 学习进度
- `POST /api/progress/questions` - 保存题目进度
- `GET /api/progress/progress` - 获取用户进度
- `POST /api/progress/study-time` - 保存学习时长

### 管理后台
- `GET /api/admin/users` - 用户列表
- `GET /api/admin/users/:qq` - 用户详情
- `GET /api/admin/stats` - 平台统计

---

## 🔐 安全建议

### 生产环境配置
1. 修改 `backend/.env` 中的 `JWT_SECRET`
2. 使用 Nginx 反向代理 + HTTPS
3. 配置防火墙只开放必要端口
4. 定期备份数据库

### 数据库备份
```bash
# 备份
cp backend/codequest.db backend/codequest.db.backup.$(date +%Y%m%d)

# 恢复
cp backend/codequest.db.backup.20260315 backend/codequest.db
```

---

## 📞 技术支持

遇到问题？检查以下步骤：

1. **服务未启动**
   ```bash
   sudo systemctl start codequest
   ```

2. **端口被占用**
   ```bash
   sudo lsof -i :3000
   sudo kill <PID>
   ```

3. **数据库错误**
   ```bash
   cd backend
   rm codequest.db
   node -e "require('./database.js')"
   ```

4. **查看错误日志**
   ```bash
   sudo journalctl -u codequest -n 100
   ```

---

**部署完成！** 🎉
