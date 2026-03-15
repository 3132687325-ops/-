# 邮箱验证配置指南

## 📧 QQ 邮箱配置（推荐）

### 1. 获取 SMTP 授权码

**步骤**：
1. 登录 QQ 邮箱网页版
2. 点击"设置" → "账户"
3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV 服务"
4. 开启"IMAP/SMTP 服务"
5. 点击"生成授权码"
6. 按提示发送短信验证
7. 获得授权码（16 位字符串）

### 2. 配置环境变量

编辑 `backend/.env` 文件：

```env
# 邮箱配置（以 QQ 邮箱为例）
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=465
EMAIL_USER=你的 QQ 号@qq.com
EMAIL_PASS=你的 SMTP 授权码
EMAIL_FROM=CodeQuest 学习平台
```

**示例**：
```env
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=465
EMAIL_USER=12345678@qq.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_FROM=CodeQuest 学习平台
```

---

## 📮 其他邮箱配置

### 163 邮箱
```env
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_USER=your@163.com
EMAIL_PASS=你的授权码
```

### Gmail
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=你的应用专用密码
```

### Outlook/Hotmail
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=your@outlook.com
EMAIL_PASS=你的密码
```

---

## 🧪 测试邮箱发送

**1. 重启后端服务器**
```bash
# 停止当前运行（Ctrl+C）
cd backend
node server.js
```

**2. 测试发送**

打开浏览器访问：http://localhost:3000/login-email.html

- 输入你的邮箱
- 点击"发送验证码"
- 查看邮箱是否收到

**3. 检查后端日志**

如果发送失败，查看后端输出：
```
发送邮件失败：Error: ...
```

---

## 🔧 常见问题

### 1. 授权码错误
**错误**：`Invalid login`
**解决**：
- 确认使用的是 SMTP 授权码，不是邮箱密码
- 重新生成授权码
- 检查是否开启了 SMTP 服务

### 2. 连接超时
**错误**：`Connection timeout`
**解决**：
- 检查防火墙设置
- 确认端口正确（465 或 587）
- 尝试切换网络

### 3. 邮件进入垃圾箱
**解决**：
- 设置发件人名称
- 使用固定邮箱发送
- 添加 SPF/DKIM 记录

---

## 📱 测试账号

开发阶段可以用这些测试邮箱：

- QQ 邮箱：`@qq.com`（推荐）
- 163 邮箱：`@163.com`
- Gmail：`@gmail.com`
- Outlook：`@outlook.com`

---

## 🚀 生产环境建议

### 1. 使用专业邮件服务

**推荐**：
- SendGrid（免费 100 封/天）
- Mailgun（免费 5000 封/月）
- 阿里云邮件推送（免费 200 封/天）

### 2. 配置域名邮箱

```
noreply@yourdomain.com
support@yourdomain.com
```

### 3. 添加邮件签名

```html
<div style="color: #9ca3af; font-size: 12px;">
  CodeQuest - 在火焰中锻造你的编程技能
  <a href="https://yourdomain.com">yourdomain.com</a>
</div>
```

---

## ✅ 验证配置

配置完成后，运行测试：

```bash
node test-backend.js
```

看到以下输出表示成功：
```
✅ 验证码已发送
```

---

**配置完成！** 🎉
