#!/bin/bash

# CodeQuest 部署脚本（Ubuntu 服务器）

echo "╔═══════════════════════════════════════════╗"
echo "║   CodeQuest 部署脚本                      ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# 检查 Node.js
echo "[1/5] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "✅ Node.js 版本：$(node --version)"

# 进入项目目录
echo ""
echo "[2/5] 进入项目目录..."
cd "$(dirname "$0")"
echo "✅ 项目目录：$(pwd)"

# 安装后端依赖
echo ""
echo "[3/5] 安装后端依赖..."
cd backend
npm install --production
echo "✅ 依赖安装完成"

# 初始化数据库
echo ""
echo "[4/5] 初始化数据库..."
node -e "require('./database.js')"
echo "✅ 数据库初始化完成"

# 创建 systemd 服务
echo ""
echo "[5/5] 创建系统服务..."
sudo tee /etc/systemd/system/codequest.service > /dev/null <<EOF
[Unit]
Description=CodeQuest Learning Platform
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
sudo systemctl daemon-reload
sudo systemctl enable codequest
sudo systemctl start codequest

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   ✅ 部署完成！                           ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "服务状态：$(sudo systemctl is-active codequest)"
echo "访问地址：http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "常用命令:"
echo "  查看状态：sudo systemctl status codequest"
echo "  重启服务：sudo systemctl restart codequest"
echo "  查看日志：sudo journalctl -u codequest -f"
echo ""
