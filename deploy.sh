#!/bin/bash
# CodeQuest 一键部署脚本
# 使用方法：在服务器上执行 bash deploy.sh

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║       CodeQuest 一键部署脚本                           ║"
echo "║       服务器：114.132.80.203                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 root 用户运行此脚本"
    exit 1
fi

# 第 1 步：检查 Node.js
echo "[1/6] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js 未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    NODE_VERSION=$(node -v)
    echo "✅ Node.js 已安装：$NODE_VERSION"
fi

# 第 2 步：检查 PM2
echo "[2/6] 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 未安装，正在安装..."
    npm install -g pm2
else
    PM2_VERSION=$(pm2 -v)
    echo "✅ PM2 已安装：v$PM2_VERSION"
fi

# 第 3 步：创建应用目录
echo "[3/6] 创建应用目录..."
mkdir -p /var/www/codequest
cd /var/www/codequest

# 第 4 步：检查代码
echo "[4/6] 检查代码..."
if [ ! -f "package.json" ]; then
    echo "❌ 未找到代码，请先上传代码到 /var/www/codequest"
    echo ""
    echo "上传方法："
    echo "1. 在本地电脑执行：scp -r D:\\Workspace\\Projects\\GameifyLearn root@114.132.80.203:/var/www/codequest"
    echo "2. 然后重新运行此脚本"
    exit 1
else
    echo "✅ 代码已存在"
fi

# 第 5 步：安装依赖
echo "[5/6] 安装依赖..."
cd /var/www/codequest/backend
npm install --production

# 第 6 步：配置环境变量
echo "[6/6] 配置环境变量..."
cd /var/www/codequest/backend

if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，创建中..."
    
    # 生成随机 JWT_SECRET
    JWT_SECRET=$(openssl rand -hex 32)
    
    cat > .env <<EOF
# 生产环境配置
PORT=3000
JWT_SECRET=$JWT_SECRET
NODE_ENV=production

# 邮箱配置（163 邮箱）
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_USER=17367893198@163.com
EMAIL_PASS=BEWZa329suAQy5Hs
EMAIL_FROM=CodeQuest 学习平台
EOF
    
    echo "✅ .env 文件已创建"
    echo ""
    echo "🔑 JWT_SECRET 已自动生成"
else
    echo "✅ .env 文件已存在"
fi

# 第 7 步：初始化数据库
echo ""
echo "[7/7] 初始化数据库..."
cd /var/www/codequest/backend

# 删除旧数据库（如果存在）
if [ -f "codequest.sqlite" ]; then
    echo "⚠️  发现旧数据库，是否删除？(y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        rm -f codequest.sqlite
        echo "✅ 旧数据库已删除"
    fi
fi

# 启动一次以初始化数据库
echo "📦 初始化数据库..."
timeout 5 node server.js || true

echo ""
echo "✅ 数据库初始化完成！"

# 第 8 步：用 PM2 启动
echo ""
echo "[8/8] 启动服务..."
pm2 delete codequest 2>/dev/null || true
cd /var/www/codequest/backend
pm2 start server.js --name codequest --env production
pm2 save
pm2 startup | tail -n1 | bash 2>/dev/null || true

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                  部署成功！                            ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║                                                        ║"
echo "║  🌐 访问地址：http://114.132.80.203:3000               ║"
echo "║                                                        ║"
echo "║  📋 超级管理员账号：                                   ║"
echo "║     邮箱：admin@codequest.com                          ║"
echo "║     密码：admin123456                                  ║"
echo "║                                                        ║"
echo "║  🔧 常用命令：                                         ║"
echo "║     查看状态：pm2 status                               ║"
echo "║     查看日志：pm2 logs codequest                       ║"
echo "║     重启服务：pm2 restart codequest                    ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 显示超级管理员邀请码（从数据库读取）
echo "📝 正在获取超级管理员邀请码..."
sleep 2

cd /var/www/codequest/backend
node -e "
const SQL = require('sql.js');
const fs = require('fs');
const db = new SQL.Database(fs.readFileSync('codequest.sqlite'));
const admin = db.prepare('SELECT invite_code FROM users WHERE email = ?').get('admin@codequest.com');
if (admin) {
  console.log('');
  console.log('🎫 超级管理员邀请码：' + admin.invite_code);
  console.log('');
  console.log('⚠️  请保存此邀请码，注册新用户时需要！');
  console.log('');
}
" 2>/dev/null || echo "⚠️  无法读取邀请码，请查看 pm2 logs"

echo ""
echo "🎉 部署完成！现在可以访问网站了！"
