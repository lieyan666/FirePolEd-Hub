# FirePolEd-Hub - 作业提交平台

一个基于 Node.js + Express 的在线作业提交平台，支持单选题、多选题和简答题的创建与答题。

## 功能特性

### 管理员功能
- 📝 创建作业：支持单选题、多选题、简答题
- 🔗 生成学生答题链接
- 📊 查看提交统计和学生答案
- 📈 实时数据统计面板
- 🗑️ 作业管理（查看、删除）

### 学生功能
- 👤 填写学生信息（班级、姓名、学号）
- ✏️ 在线答题（支持多种题型）
- 💾 自动保存答案
- 📋 答案检查和确认
- 🎯 即时得分反馈

### 技术特性
- 🎨 Material Design 界面设计
- 📱 响应式布局，支持移动端
- 💾 本地 JSON 文件存储
- 🔄 自动保存功能
- ⚡ 实时数据更新

## 技术栈

- **后端**: Node.js + Express
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **数据存储**: JSON 文件
- **UI框架**: Material Design
- **图标**: Material Icons

## 安全配置

### 管理员密码验证

系统使用基于会话的身份验证机制：

1. **密码设置**: 在 `config.json` 中设置 `admin.password`
2. **会话超时**: 默认1小时，可通过 `admin.sessionTimeout` 调整（毫秒）
3. **自动登出**: 会话过期后自动跳转到登录页面
4. **安全存储**: 会话信息存储在服务器内存中

### 配置文件安全

- `config.json` 包含敏感信息，已添加到 `.gitignore`
- 使用 `config.example.json` 作为配置模板
- 生产环境请使用强密码
- 定期更换管理员密码

## API 接口

### 管理员认证

- `POST /admin/login` - 管理员登录
- `POST /admin/logout` - 管理员登出  
- `GET /admin/verify` - 验证会话状态

### 作业管理（需要认证）

- `GET /admin/assignments` - 获取作业列表
- `POST /admin/assignments` - 创建作业
- `GET /admin/assignments/:id` - 获取作业详情
- `PUT /admin/assignments/:id` - 更新作业
- `DELETE /admin/assignments/:id` - 删除作业
- `GET /admin/assignments/:id/statistics` - 获取作业统计

### 学生端（无需认证）

- `GET /api/assignment/:id` - 获取作业信息
- `POST /api/submit` - 提交作业

## 项目结构

```
FirePolEd-Hub/
├── server.js                 # 主服务器文件
├── package.json              # 项目依赖配置
├── config.json               # 系统配置文件（需要创建）
├── config.example.json       # 配置文件模板
├── routes/                   # 路由文件
│   ├── admin.js             # 管理员路由（含认证）
│   ├── student.js           # 学生路由
│   └── api.js               # API路由
├── data/                     # 数据存储目录
│   ├── assignments-index.json  # 作业索引
│   ├── assignments/         # 作业详情目录
│   └── submissions/         # 提交数据目录
├── public/                   # 静态文件
│   ├── index.html           # 首页
│   ├── admin/               # 管理员页面
│   │   ├── index.html       # 管理后台主页
│   │   └── login.html       # 登录页面
│   ├── student/             # 学生页面
│   │   └── index.html
│   ├── css/                 # 样式文件
│   │   ├── material.css     # Material Design样式
│   │   ├── common.css       # 通用样式
│   │   ├── admin.css        # 管理员样式
│   │   └── student.css      # 学生样式
│   └── js/                  # JavaScript文件
│       ├── common.js        # 通用工具函数
│       ├── admin.js         # 管理员功能
│       └── student.js       # 学生功能
└── .gitignore               # Git 忽略文件
```

## 数据结构设计

### 1. 作业索引文件 (`data/assignments-index.json`)

```json
{
  "assignments": [
    {
      "id": "assignment-uuid",
      "title": "作业标题",
      "description": "作业描述",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "dueDate": "2024-01-07T23:59:59.000Z",
      "status": "active",
      "questionCount": 5,
      "submissionCount": 10,
      "totalPoints": 100
    }
  ],
  "metadata": {
    "totalAssignments": 1,
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### 2. 作业详情文件 (`data/assignments/{id}.json`)

```json
{
  "id": "assignment-uuid",
  "title": "作业标题",
  "description": "作业描述",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "dueDate": "2024-01-07T23:59:59.000Z",
  "status": "active",
  "questions": [
    {
      "id": "question-uuid",
      "type": "single-choice",
      "question": "题目内容",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correctAnswer": 0,
      "points": 10,
      "required": true
    },
    {
      "id": "question-uuid-2",
      "type": "multiple-choice",
      "question": "多选题内容",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correctAnswers": [0, 2],
      "points": 20,
      "required": true
    },
    {
      "id": "question-uuid-3",
      "type": "short-answer",
      "question": "简答题内容",
      "points": 30,
      "required": true
    }
  ],
  "settings": {
    "allowMultipleSubmissions": false,
    "showCorrectAnswers": false,
    "randomizeQuestions": false,
    "timeLimit": null
  }
}
```

### 3. 提交数据文件 (`data/submissions/{assignmentId}.json`)

```json
{
  "assignmentId": "assignment-uuid",
  "submissions": [
    {
      "id": "submission-uuid",
      "studentInfo": {
        "name": "学生姓名",
        "className": "班级",
        "studentId": "学号"
      },
      "answers": {
        "question-uuid": 0,
        "question-uuid-2": [0, 2],
        "question-uuid-3": "学生的简答内容"
      },
      "score": 60,
      "totalPoints": 100,
      "percentage": 60,
      "submittedAt": "2024-01-01T12:00:00.000Z",
      "startTime": "2024-01-01T11:30:00.000Z",
      "timeSpent": 1800
    }
  ],
  "statistics": {
    "totalSubmissions": 1,
    "averageScore": 60,
    "submissionsByClass": {
      "高一(1)班": 1
    }
  }
}
```

## 安装和运行

### 1. 克隆项目

```bash
git clone <repository-url>
cd FirePolEd-Hub
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置系统

复制配置文件模板并修改配置：

```bash
cp config.example.json config.json
```

编辑 `config.json` 文件，设置管理员密码：

```json
{
  "admin": {
    "password": "your_secure_password_here",
    "sessionTimeout": 3600000
  }
}
```

### 4. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 5. 访问应用

- 首页: http://localhost:3000
- 管理员登录: http://localhost:3000/admin/login
- 管理员页面: http://localhost:3000/admin
- 学生答题: http://localhost:3000/student/{作业ID}

## 使用说明

### 管理员使用流程

1. 访问管理员页面 `/admin`
2. 点击"创建作业"按钮
3. 填写作业基本信息（标题、描述、截止时间）
4. 添加题目：
   - 单选题：设置题目内容、选项、正确答案
   - 多选题：设置题目内容、选项、多个正确答案
   - 简答题：设置题目内容（无需选项）
5. 保存作业，获得学生答题链接
6. 将链接分享给学生
7. 在作业列表中查看提交情况和统计数据

### 学生使用流程

1. 通过老师提供的链接访问作业
2. 填写学生信息（班级、姓名、学号）
3. 开始答题：
   - 单选题：点击选择一个答案
   - 多选题：点击选择多个答案
   - 简答题：在文本框中输入答案
4. 系统自动保存答案
5. 完成后点击"检查答案"预览
6. 确认无误后提交作业
7. 查看得分和提交结果

## 配置说明

### 系统配置 (`config.json`)

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "data": {
    "assignmentsIndexPath": "./data/assignments-index.json",
    "assignmentsDir": "./data/assignments",
    "submissionsDir": "./data/submissions"
  },
  "ui": {
    "primaryColor": "#018eee",
    "theme": "light"
  },
  "features": {
    "maxFileSize": "10MB",
    "allowedFileTypes": [".jpg", ".png", ".pdf"],
    "autoSave": true,
    "autoSaveInterval": 30000
  }
}
```

## API 接口

### 管理员 API

- `GET /admin/assignments` - 获取作业列表
- `POST /admin/assignments` - 创建新作业
- `GET /admin/assignments/:id` - 获取作业详情
- `PUT /admin/assignments/:id` - 更新作业
- `DELETE /admin/assignments/:id` - 删除作业
- `GET /admin/assignments/:id/statistics` - 获取作业统计

### 学生 API

- `GET /student/:assignmentId` - 获取作业信息
- `POST /student/:assignmentId/submit` - 提交作业
- `GET /student/:assignmentId/check-submission` - 检查是否已提交

### 通用 API

- `GET /api/config` - 获取系统配置
- `GET /api/health` - 健康检查
- `GET /api/stats` - 系统统计

## 开发说明

### 添加新题型

1. 在前端添加题型选择器
2. 实现题型的渲染逻辑
3. 添加答案收集和验证
4. 在后端添加评分逻辑

### 自定义样式

- 修改 `config.json` 中的 `primaryColor` 更改主色调
- 编辑 CSS 文件自定义样式
- 所有样式基于 Material Design 规范

### 数据备份

建议定期备份 `data` 目录下的所有文件，包含完整的作业和提交数据。

## 注意事项

1. **数据安全**: 本项目使用本地文件存储，请确保定期备份数据
2. **并发处理**: 当前版本未处理高并发写入，适用于小规模使用
3. **文件权限**: 确保 Node.js 进程有读写 `data` 目录的权限
4. **浏览器兼容**: 建议使用现代浏览器（Chrome、Firefox、Safari、Edge）

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的作业创建和提交功能
- Material Design 界面
- 响应式设计
