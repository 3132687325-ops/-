# CodeQuest 用户管理系统说明

## 🔐 新系统特性

### 严格的登录注册系统
- ✅ 必须注册后才能登录
- ✅ 必须有邀请码才能注册
- ✅ 密码严格验证
- ✅ 账号不存在时明确提示

### 三级用户架构
```
👑 超级管理员
     │
     └── 高级用户（通过超级管理员的邀请码注册）
          │
          └── 普通用户（通过高级用户的邀请码注册）
```

---

## 📋 初始账号信息

### 超级管理员账号
- **邮箱**: `admin@codequest.com`
- **密码**: `admin123456`
- **邀请码**: `SUPER1773549753901`（在数据库中查看）
- **角色**: 超级管理员（super_admin）

⚠️ **首次登录后请立即修改密码！**

---

## 🚀 使用流程

### 1. 超级管理员登录

1. 访问：http://localhost:3000/login-strict.html
2. 输入超级管理员账号登录
3. 自动跳转到管理员后台：http://localhost:3000/admin.html

### 2. 创建邀请码

在管理员后台：
1. 设置最大使用次数（-1 表示无限制）
2. 设置过期天数（-1 表示永不过期）
3. 点击"创建邀请码"
4. 复制生成的邀请码

### 3. 高级用户注册

1. 打开注册页面：http://localhost:3000/login-strict.html
2. 切换到"注册"标签
3. 输入邮箱、密码
4. 输入超级管理员创建的邀请码
5. 注册成功 → 自动成为**高级用户**

### 4. 高级用户邀请普通用户

1. 高级用户登录管理员后台
2. 查看自己的专属邀请码
3. 将邀请码分享给他人
4. 他人使用该邀请码注册 → 成为**普通用户**

---

## 🔑 邀请码规则

| 创建者 | 使用者成为 | 邀请权限 |
|--------|-----------|---------|
| 超级管理员 | 高级用户 | ✅ 可以创建邀请码 |
| 高级用户 | 普通用户 | ✅ 自动生成 1 个邀请码 |
| 普通用户 | ❌ 不能邀请 | ❌ 无邀请码 |

---

## 📁 重要文件

### 后端
- `backend/routes/auth.js` - 认证 API（注册/登录/邀请码）
- `backend/migrate-db.js` - 数据库迁移脚本
- `backend/database.js` - 数据库初始化

### 前端
- `login-strict.html` - 新的严格登录/注册页面 ⭐ **使用这个！**
- `admin.html` - 管理员后台
- `login.html` - 旧的登录页面（已废弃）

---

## 🧪 测试步骤

### 测试 1：超级管理员登录
```
1. 访问：http://localhost:3000/login-strict.html
2. 登录：admin@codequest.com / admin123456
3. 应跳转到 admin.html
```

### 测试 2：创建邀请码
```
1. 在管理员后台创建邀请码
2. 复制邀请码
```

### 测试 3：高级用户注册
```
1. 访问：http://localhost:3000/login-strict.html
2. 切换到"注册"
3. 输入新邮箱、密码、邀请码
4. 注册成功 → 成为高级用户
5. 登录后可以查看自己的邀请码
```

### 测试 4：普通用户注册
```
1. 使用高级用户的邀请码注册
2. 注册成功 → 成为普通用户
3. 登录后无管理员后台权限
```

### 测试 5：无效登录
```
1. 输入不存在的邮箱
2. 应提示"账号不存在"
3. 输入错误密码
4. 应提示"密码错误"
```

---

## 🔧 数据库结构

### users 表
```sql
- id: 用户 ID
- email: 邮箱（可选）
- qq: QQ 号（可选）
- password_hash: 密码哈希
- role: 角色（super_admin/admin/user）
- parent_id: 上级用户 ID
- invite_code: 个人邀请码
- used_invite_code: 注册时使用的邀请码
- created_at: 创建时间
- last_login: 最后登录时间
```

### invite_codes 表
```sql
- id: 邀请码 ID
- code: 邀请码字符串
- created_by: 创建者 ID
- max_uses: 最大使用次数（-1 无限制）
- used_count: 已使用次数
- is_active: 是否有效
- expires_at: 过期时间
- created_at: 创建时间
```

---

## ⚠️ 注意事项

1. **超级管理员密码**：首次登录后立即修改
2. **邀请码安全**：不要公开分享超级管理员邀请码
3. **数据库备份**：定期备份 `backend/codequest.sqlite`
4. **生产环境**：修改 JWT_SECRET 为随机字符串

---

## 🛠️ API 接口

### 注册
```
POST /api/auth/register
Body: { email, password, invite_code }
```

### 登录
```
POST /api/auth/login
Body: { email/qq, password }
```

### 验证邀请码
```
POST /api/auth/verify-invite-code
Body: { code }
```

### 获取用户信息
```
GET /api/auth/me
Headers: Authorization: Bearer <token>
```

### 创建邀请码（仅管理员）
```
POST /api/auth/invite-codes
Headers: Authorization: Bearer <token>
Body: { max_uses, expires_days }
```

### 获取下级用户
```
GET /api/auth/downline
Headers: Authorization: Bearer <token>
```

---

## 📞 问题排查

### 问题：邀请码无效
- 检查邀请码是否正确复制
- 检查邀请码是否过期
- 检查邀请码使用次数是否达到上限

### 问题：登录失败
- 检查邮箱/QQ 号格式
- 检查密码是否正确
- 确认账号是否已注册

### 问题：无法访问管理员后台
- 检查用户角色是否为 super_admin 或 admin
- 检查 token 是否有效

---

**系统已就绪！开始使用吧！** 🎉
