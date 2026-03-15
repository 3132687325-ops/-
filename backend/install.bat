@echo off
echo ========================================
echo CodeQuest 后端安装脚本
echo ========================================
echo.

echo [1/3] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未检测到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 已安装

echo.
echo [2/3] 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成

echo.
echo [3/3] 创建数据库...
node -e "require('./database.js')"
if errorlevel 1 (
    echo ❌ 数据库创建失败
    pause
    exit /b 1
)
echo ✅ 数据库创建完成

echo.
echo ========================================
echo ✅ 安装完成！
echo ========================================
echo.
echo 启动服务器：npm start
echo.
pause
