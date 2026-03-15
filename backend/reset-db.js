// 重置数据库

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'codequest.sqlite');

// 删除旧数据库
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ 旧数据库已删除');
  console.log('✅ 请重启服务器，数据库会自动重建（包含 email 字段）');
} else {
  console.log('ℹ️  数据库不存在，重启服务器会自动创建');
}
