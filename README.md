# CodeQuest - Python 编程学习平台

一个游戏化的 Python 编程学习网站，包含学习路径、关卡挑战、排行榜和成就系统。

## 技术栈

- 静态 HTML
- [Tailwind CSS](https://tailwindcss.com/) (CDN)
- [Lucide Icons](https://lucide.dev/)
- [Vite](https://vitejs.dev/) 开发服务器

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器会自动打开 http://localhost:3000

## 项目结构

```
GameifyLearn/
├── index.html        # 首页 / 学习仪表盘
├── levels.html       # 关卡地图
├── leaderboard.html  # 完整排行榜
├── backpack.html     # 我的成就
├── css/
│   └── shared.css    # 共享样式
├── js/
│   └── shared.js     # 共享脚本
├── package.json
├── vite.config.js
└── README.md
```

## 构建与部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

构建产物在 `dist/` 目录，可部署到任意静态托管服务（Vercel、Netlify、GitHub Pages 等）。
