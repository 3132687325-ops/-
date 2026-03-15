# CodeQuest 服务器部署指南

## 📋 部署前准备

### 服务器信息
```
公网 IP: 114.132.80.203
用户名：root
系统：Ubuntu 22.04.5 LTS
```

---

## 🚀 快速部署（推荐）

### 方案 A：手动部署（简单直接）

#### 第 1 步：SSH 登录服务器

在你的电脑上执行：
```bash
ssh root@114.132.80.203
```

#### 第 2 步：检查并安装环境

```bash
# 检查 Node.js
node -v

# 如果没有安装 Node.js，执行：
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 检查版本（应该显示 v18.x）
node -v
npm -v
```

#### 第 3 步：安装 PM2

```bash
npm install -g pm2
```

#### 第 4 步：上传代码

**方法 1：使用 SCP（推荐）**

在**本地电脑**执行（不是 SSH 里）：
```bash
# 退出 SSH（如果已登录）
exit

# 上传整个项目
scp -r D:\Workspace\Projects\GameifyLearn root@114.132.80.203:/var/www/codequest
```

**方法 2：使用 Git**

在**服务器 SSH** 里执行：
```bash
cd /var/www
git clone <你的 Git 仓库地址> codequest
cd codequest
```

#### 第 5 步：安装依赖

```bash
cd /var/www/codequest/backend
npm install --production
```

#### 第 6 步：配置环境变量

```bash
# 编辑 .env 文件
nano .env
```

**修改以下内容**：
```env
# 生产环境
NODE_ENV=production

# JWT 密钥（生成随机字符串）
JWT_SECRET=这里填随机字符串_至少 32 位

# 邮箱配置（已有）
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_USER=17367893198@163.com
EMAIL_PASS=BEWZa329suAQy5Hs
EMAIL_FROM=CodeQuest 学习平台
```

**生成随机 JWT_SECRET**：
```bash
# 新开一个 SSH 窗口执行
openssl rand -hex 32
```

保存退出：`Ctrl+O` → `Enter` → `Ctrl+X`

#### 第 7 步：初始化数据库和超级管理员

```bash
# 删除旧数据库（如果有）
rm -f codequest.sqlite

# 启动一次服务器（会自动初始化）
node server.js
```

看到超级管理员账号信息后，按 `Ctrl+C` 停止。

#### 第 8 步：用 PM2 启动服务

```bash
# 启动服务
pm2 start server.js --name codequest

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup

# 查看状态
pm2 status
```

#### 第 9 步：配置 Nginx（可选，但推荐）

```bash
# 创建 Nginx 配置文件
nano /etc/nginx/sites-available/codequest
```

**粘贴以下内容**：
```nginx
server {
    listen 80;
    server_name 114.132.80.203;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

保存后执行：
```bash
# 启用配置
ln -s /etc/nginx/sites-available/codequest /etc/nginx/sites-enabled/

# 删除默认配置
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

#### 第 10 步：配置防火墙

```bash
# 允许 HTTP 和 SSH
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# 启用防火墙
ufw --force enable
```

---

## ✅ 验证部署

### 访问网站

在浏览器打开：
```
http://114.132.80.203
```
或
```
http://114.132.80.203:3000
```

### 测试登录

使用超级管理员账号：
```
邮箱：admin@codequest.com
密码：admin123456
```

### 查看日志

```bash
# 查看应用日志
pm2 logs codequest

# 查看 Nginx 日志
tail -f /var/log/nginx/codequest_access.log
tail -f /var/log/nginx/codequest_error.log
```

---

## 🔧 常用命令

### PM2 管理

```bash
# 查看状态
pm2 status

# 重启服务
pm2 restart codequest

# 停止服务
pm2 stop codequest

# 查看日志
pm2 logs codequest

# 删除服务
pm2 delete codequest
```

### 更新代码

```bash
# 方法 1：重新上传
scp -r D:\Workspace\Projects\GameifyLearn root@114.132.80.203:/var/www/codequest

# 方法 2：Git pull（如果用 Git）
cd /var/www/codequest
git pull

# 重启服务
pm2 restart codequest
```

### 数据库备份

```bash
# 备份数据库
cp /var/www/codequest/backend/codequest.sqlite /var/backups/codequest-$(date +%Y%m%d).sqlite

# 恢复数据库
cp /var/backups/codequest-20260315.sqlite /var/www/codequest/backend/codequest.sqlite
pm2 restart codequest
```

---

## 🐛 故障排查

### 问题 1：无法访问网站

```bash
# 检查服务是否运行
pm2 status

# 检查端口是否监听
netstat -tlnp | grep 3000

# 检查防火墙
ufw status

# 查看日志
pm2 logs codequest
```

### 问题 2：登录失败

```bash
# 查看后端日志
pm2 logs codequest --lines 100

# 检查数据库
cd /var/www/codequest/backend
sqlite3 codequest.sqlite "SELECT email, role FROM users;"
```

### 问题 3：邮件发送失败

```bash
# 检查 .env 配置
cat /var/www/codequest/backend/.env

# 测试邮箱连接
cd /var/www/codequest/backend
node test-email.js
```

---

## 📊 服务器监控

### 查看资源使用

```bash
# CPU 和内存
htop

# 磁盘使用
df -h

# 网络流量
iftop
```

### 设置监控（可选）

```bash
# 安装 PM2 Plus（免费监控）
pm2 plus
```

---

## 🎯 下一步

1. **配置 HTTPS**（推荐）
   ```bash
   # 安装 Certbot
   apt install -y certbot python3-certbot-nginx
   
   # 获取证书（如果有域名）
   certbot --nginx -d yourdomain.com
   ```

2. **配置域名**（如果有）
   - 在域名 DNS 添加 A 记录：`@ → 114.132.80.203`

3. **上线测试**
   - 邀请种子用户测试
   - 收集反馈
   - 迭代优化

---

## 📞 需要帮助？

遇到问题时：
1. 查看日志：`pm2 logs codequest`
2. 检查服务状态：`pm2 status`
3. 重启服务：`pm2 restart codequest`

---

**部署成功！开始你的创业之旅吧！** 🚀
