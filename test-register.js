const fetch = require('node-fetch');

async function test() {
  console.log('🧪 测试注册 API...\n');
  
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@qq.com',
        password: '123456'
      })
    });
    
    const data = await res.json();
    
    console.log('状态码:', res.status);
    console.log('响应:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

test();
