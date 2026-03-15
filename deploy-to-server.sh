#!/bin/bash
# CodeQuest 服务器部署脚本
# 使用方法：bash deploy-to-server.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
SERVER_IP="114.132.80.203"
SERVER_USER="root"
REMOTE_DIR="/var/www/codequest"
LOCAL_DIR="D:/Workspace/Projects/GameifyLearn"

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}       CodeQuest 服务器部署脚本                      ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}       目标服务器：${SERVER_IP}                          ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 步骤 1：检查本地环境
echo -e "${YELLOW}[1/7]${NC} 检查本地环境..."

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git 未安装，请先安装 Git${NC}"
    exit 1
fi

if ! command -v ssh &> /dev/null; then
    echo -e "${RED}❌ SSH 未安装，请先安装 SSH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git 和 SSH 已安装${NC}"
echo ""

# 步骤 2：检查 Git 提交
echo -e "${YELLOW}[2/7]${NC} 检查 Git 提交状态..."
cd "$LOCAL_DIR" || exit 1

if git diff --quiet; then
    echo -e "${GREEN}✅ 工作区干净${NC}"
else
    echo -e "${YELLOW}⚠️  工作区有未提交的更改，是否继续？(y/n)${NC}"
    read -r response
    if [[ "$response" != "y" ]]; then
        echo "部署取消"
        exit 0
    fi
fi

# 步骤 3：创建生产环境 .env 文件
echo -e "${YELLOW}[3/7]${NC} 创建生产环境配置..."

cat > "$LOCAL_DIR/backend/.env.production" <<EOF
# 生产环境配置

# 服务器端口
PORT=3000

# JWT 密钥（生产环境请使用随机字符串）
JWT_SECRET=$(openssl rand -hex 32)

# 运行环境
NODE_ENV=production

# 邮箱配置（163 邮箱）
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_USER=17367893198@163.com
EMAIL_PASS=BEWZa329suAQy5Hs

# 发件人名称
EMAIL_FROM=CodeQuest 学习平台
EOF

echo -e "${GREEN}✅ 生产环境配置已创建${NC}"
echo ""

# 步骤 4：打包项目
echo -e "${YELLOW}[4/7]${NC} 打包项目..."

# 创建临时部署包
DEPLOY_PACKAGE="/tmp/codequest-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# 排除不需要的文件
tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='backend/codequest.sqlite' \
    -czf "$DEPLOY_PACKAGE" \
    -C "$(dirname "$LOCAL_DIR")" "$(basename "$LOCAL_DIR")"

echo -e "${GREEN}✅ 项目已打包：$DEPLOY_PACKAGE${NC}"
echo ""

# 步骤 5：上传到服务器
echo -e "${YELLOW}[5/7]${NC} 上传到服务器..."

# 创建远程目录
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR"

# 上传文件
scp "$DEPLOY_PACKAGE" "$SERVER_USER@$SERVER_IP:/tmp/"

echo -e "${GREEN}✅ 文件已上传${NC}"
echo ""

# 步骤 6：在服务器上部署
echo -e "${YELLOW}[6/7]${NC} 在服务器上部署..."

ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
#!/bin/bash
set -e

REMOTE_DIR="/var/www/codequest"
DEPLOY_PACKAGE="/tmp/codequest-deploy-*.tar.gz"

echo "📦 解压部署包..."
# 找到最新的部署包
LATEST_PACKAGE=$(ls -t $DEPLOY_PACKAGE | head -n1)
tar -xzf "$LATEST_PACKAGE" -C "$REMOTE_DIR"

echo "🔧 安装依赖..."
cd "$REMOTE_DIR/backend"
npm install --production

echo "📝 配置环境变量..."
if [ ! -f "$REMOTE_DIR/backend/.env" ]; then
    cp "$REMOTE_DIR/backend/.env.production" "$REMOTE_DIR/backend/.env"
fi

echo "🛑 停止旧服务..."
pm2 delete codequest 2>/dev/null || true

echo "🚀 启动新服务..."
cd "$REMOTE_DIR/backend"
pm2 start server.js --name codequest --env production

echo "💾 保存 PM2 配置..."
pm2 save

echo "✅ 部署完成！"
ENDSSH

echo -e "${GREEN}✅ 服务器部署完成${NC}"
echo ""

# 步骤 7：验证部署
echo -e "${YELLOW}[7/7]${NC} 验证部署..."

ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
echo "📊 服务状态："
pm2 status codequest

echo ""
echo "🌐 访问地址："
echo "  http://114.132.80.203:3000"
ENDSSH

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                    部署成功！                      ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                    ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  访问地址：http://114.132.80.203:3000              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                    ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  查看日志：ssh root@114.132.80.203 'pm2 logs codequest'${NC}"
echo -e "${GREEN}║${NC}  重启服务：ssh root@114.132.80.203 'pm2 restart codequest'${NC}"
echo -e "${GREEN}║${NC}  停止服务：ssh root@114.132.80.203 'pm2 stop codequest'${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

# 清理临时文件
rm -f "$DEPLOY_PACKAGE"
ssh "$SERVER_USER@$SERVER_IP" "rm -f /tmp/codequest-deploy-*.tar.gz"
