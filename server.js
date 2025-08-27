const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
// Load configuration, falling back to example config if necessary
const config = require('./config');

const app = express();
const PORT = config.server.port || 3000;

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use('/public', express.static('public'));

// 确保数据目录存在
const ensureDirectories = () => {
  const dirs = [
    './data',
    './data/assignments',
    './data/submissions'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

// 路由
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const apiRoutes = require('./routes/api');

app.use('/admin', adminRoutes);
// Mount API-friendly namespace to avoid clashing with SPA routes
app.use('/admin/api', adminRoutes);
app.use('/student', studentRoutes);
app.use('/api', apiRoutes);

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '页面未找到' });
});

app.listen(PORT, () => {
  console.log(`🚀 FirePolEd-Hub 服务器运行在 http://localhost:${PORT}`);
  console.log(`📚 管理后台: http://localhost:${PORT}/admin`);
  console.log(`👨‍🎓 学生端: http://localhost:${PORT}/student`);
});

module.exports = app;