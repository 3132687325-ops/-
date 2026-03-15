#!/bin/bash
# CodeQuest 服务器初始化脚本（在服务器上执行）
# 使用方法：ssh root@114.132.80.203 'bash -s' < setup-server.sh

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║       CodeQuest 服务器初始化                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 更新系统
echo "[1/6] 更新系统..."
apt update && apt upgrade -y

# 安装 Node.js 18
echo "[2/6] 安装 Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo "Node.js 版本：$(node -v)"
echo "npm 版本：$(npm -v)"

# 安装 PM2
echo "[3/6] 安装 PM2..."
npm install -g pm2

# 安装 Nginx
echo "[4/6] 安装 Nginx..."
apt install -y nginx

# 创建应用目录
echo "[5/6] 创建应用目录..."
mkdir -p /var/www/codequest
cd /var/www/codequest

# 配置防火墙
echo "[6/6] 配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable

echo ""
echo "✅ 服务器初始化完成！"
echo ""
echo "下一步："
echo "1. 上传代码到 /var/www/codequest"
echo "2. cd /var/www/codequest/backend"
echo "3. npm install"
echo "4. cp .env.example .env (并编辑配置)"
echo "5. pm2 start server.js --name codequest"
echo "6. pm2 save"
echo "7. pm2 startup"
