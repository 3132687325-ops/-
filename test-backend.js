// 后端 API 测试脚本

const API_BASE = 'http://localhost:3000/api';

async function test() {
  console.log('🧪 开始测试后端 API...\n');
  
  // 1. 健康检查
  console.log('1️⃣ 健康检查');
  const health = await fetch(`${API_BASE}/health`);
  console.log('✅', await health.json());
  
  // 2. 用户注册
  console.log('\n2️⃣ 用户注册');
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qq: '12345678',
      password: '123456'
    })
  });
  const register = await registerRes.json();
  console.log(register.success ? '✅ 注册成功' : '❌', register);
  
  // 3. 用户登录
  console.log('\n3️⃣ 用户登录');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qq: '12345678',
      password: '123456'
    })
  });
  const login = await loginRes.json();
  console.log(login.success ? '✅ 登录成功' : '❌', login);
  
  if (!login.token) {
    console.log('❌ 登录失败，终止测试');
    return;
  }
  
  // 4. 获取用户信息
  console.log('\n4️⃣ 获取用户信息');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${login.token}` }
  });
  const me = await meRes.json();
  console.log(me.success ? '✅ 获取成功' : '❌', me);
  
  // 5. 保存学习进度
  console.log('\n5️⃣ 保存学习进度');
  const progressRes = await fetch(`${API_BASE}/progress/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${login.token}`
    },
    body: JSON.stringify({
      questionId: 1,
      completed: true,
      xp: 10,
      timeSpent: 30
    })
  });
  const progress = await progressRes.json();
  console.log(progress.success ? '✅ 保存成功' : '❌', progress);
  
  // 6. 获取平台统计
  console.log('\n6️⃣ 获取平台统计');
  const statsRes = await fetch(`${API_BASE}/admin/stats`);
  const stats = await statsRes.json();
  console.log(stats.success ? '✅ 获取成功' : '❌', stats);
  
  console.log('\n✅ 所有测试完成！');
}

test().catch(console.error);
