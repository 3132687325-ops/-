// 邮箱发送测试脚本

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('📧 邮箱配置检查...\n');

// 检查配置
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : '未设置');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

// 验证配置是否完整
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log('\n❌ 错误：EMAIL_USER 或 EMAIL_PASS 未配置');
  console.log('请编辑 backend/.env 文件，填入你的 QQ 邮箱和授权码\n');
  process.exit(1);
}

// 创建传输器
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.office365.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 测试发送
async function testSend() {
  console.log('\n🚀 开始测试发送...\n');
  
  try {
    // 验证连接
    await transporter.verify();
    console.log('✅ SMTP 连接成功！\n');
    
    // 发送测试邮件
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'CodeQuest 测试',
      to: process.env.EMAIL_USER, // 发送给自己测试
      subject: 'CodeQuest 邮箱测试 ✓',
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">🔥🔨 CodeQuest 学习平台</h2>
          <p>这是一封测试邮件</p>
          <p>如果收到这封邮件，说明邮箱配置正确！</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3b82f6;">888888</span>
          </div>
          <p>验证码：<strong>888888</strong></p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">
            CodeQuest - 在火焰中锻造你的编程技能
          </p>
        </div>
      `
    });
    
    console.log('✅ 邮件发送成功！');
    console.log('📬 请查看邮箱：', process.env.EMAIL_USER);
    console.log('📂 如果收件箱没有，请检查垃圾箱\n');
    
  } catch (error) {
    console.log('❌ 发送失败！\n');
    console.log('错误类型:', error.code || 'Unknown');
    console.log('错误信息:', error.message);
    console.log('\n💡 常见解决方案：');
    console.log('1. 检查 EMAIL_USER 是否是你的 QQ 邮箱');
    console.log('2. 检查 EMAIL_PASS 是否是 SMTP 授权码（不是邮箱密码）');
    console.log('3. 确认已在 QQ 邮箱设置中开启 SMTP 服务');
    console.log('4. 授权码是否复制正确（无空格）');
    console.log('\n获取授权码：https://mail.qq.com → 设置 → 账户 → POP3/SMTP 服务\n');
  }
}

testSend();
