const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
// Use shared configuration loader
const config = require('../config');
const crypto = require('crypto');

// 会话存储（生产环境建议使用 Redis 或数据库）
const sessions = new Map();

// 生成会话ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 验证会话
const verifySession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  // 检查会话是否过期
  if (Date.now() - session.createdAt > config.admin.sessionTimeout) {
    sessions.delete(sessionId);
    return false;
  }
  
  // 更新最后访问时间
  session.lastAccess = Date.now();
  return true;
};

// 认证中间件
const requireAuth = (req, res, next) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  
  if (!sessionId || !verifySession(sessionId)) {
    return res.status(401).json({ error: '未授权访问，请先登录' });
  }
  
  next();
};

// 工具函数
const readJsonFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('读取文件错误:', error);
    return null;
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('写入文件错误:', error);
    return false;
  }
};

// 登录接口
router.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: '请输入密码' });
  }
  
  if (password !== config.admin.password) {
    return res.status(401).json({ error: '密码错误' });
  }
  
  // 创建会话
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    createdAt: Date.now(),
    lastAccess: Date.now(),
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || req.connection.remoteAddress
  });
  
  res.json({ 
    success: true, 
    sessionId,
    expiresIn: config.admin.sessionTimeout
  });
});

// 登出接口
router.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;
  
  if (sessionId) {
    sessions.delete(sessionId);
  }
  
  res.json({ success: true });
});

// 验证会话接口
router.get('/verify', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  
  if (!sessionId || !verifySession(sessionId)) {
    return res.status(401).json({ error: '会话无效或已过期' });
  }
  
  const session = sessions.get(sessionId);
  res.json({ 
    success: true,
    session: {
      createdAt: session.createdAt,
      lastAccess: session.lastAccess,
      expiresAt: session.createdAt + config.admin.sessionTimeout
    }
  });
});

// 登录页面路由
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin', 'login.html'));
});

// 管理后台主页
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin', 'index.html'));
});

// 获取所有作业列表
router.get('/assignments', requireAuth, (req, res) => {
  const indexData = readJsonFile(config.data.assignmentsIndex);
  if (!indexData) {
    return res.status(500).json({ error: '无法读取作业索引' });
  }
  res.json(indexData);
});

// 创建新作业
router.post('/assignments', requireAuth, (req, res) => {
  const { title, description, dueDate, questions } = req.body;
  
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: '标题和题目不能为空' });
  }
  
  const assignmentId = uuidv4();
  const now = moment().format();
  
  // 创建作业数据
  const assignmentData = {
    id: assignmentId,
    title,
    description: description || '',
    dueDate: dueDate || null,
    questions,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    settings: {
      allowLateSubmission: true,
      showResults: false,
      randomizeQuestions: false
    }
  };
  
  // 保存作业详情
  const assignmentFile = path.join(config.data.assignmentsDir, `${assignmentId}.json`);
  if (!writeJsonFile(assignmentFile, assignmentData)) {
    return res.status(500).json({ error: '保存作业失败' });
  }
  
  // 创建提交数据文件
  const submissionData = {
    assignmentId,
    submissions: [],
    statistics: {
      totalSubmissions: 0,
      averageScore: 0,
      completionRate: 0
    },
    lastUpdated: now
  };
  
  const submissionFile = path.join(config.data.submissionsDir, `${assignmentId}.json`);
  if (!writeJsonFile(submissionFile, submissionData)) {
    return res.status(500).json({ error: '创建提交文件失败' });
  }
  
  // 更新索引
  const indexData = readJsonFile(config.data.assignmentsIndex);
  indexData.assignments.push({
    id: assignmentId,
    title,
    description,
    dueDate,
    createdAt: now,
    status: 'active',
    submissionCount: 0
  });
  indexData.metadata.totalAssignments++;
  indexData.metadata.lastUpdated = now;
  
  if (!writeJsonFile(config.data.assignmentsIndex, indexData)) {
    return res.status(500).json({ error: '更新索引失败' });
  }
  
  res.json({ 
    success: true, 
    assignmentId,
    studentUrl: `${req.protocol}://${req.get('host')}/student/${assignmentId}`
  });
});

// 获取单个作业详情
router.get('/assignments/:id', requireAuth, (req, res) => {
  const assignmentFile = path.join(config.data.assignmentsDir, `${req.params.id}.json`);
  const assignmentData = readJsonFile(assignmentFile);
  
  if (!assignmentData) {
    return res.status(404).json({ error: '作业不存在' });
  }
  
  res.json(assignmentData);
});

// 获取作业提交统计
router.get('/assignments/:id/statistics', requireAuth, (req, res) => {
  const submissionFile = path.join(config.data.submissionsDir, `${req.params.id}.json`);
  const submissionData = readJsonFile(submissionFile);
  
  if (!submissionData) {
    return res.status(404).json({ error: '提交数据不存在' });
  }
  
  // 计算详细统计
  const submissions = submissionData.submissions;
  const statistics = {
    totalSubmissions: submissions.length,
    submissionsByClass: {},
    questionStatistics: [],
    timeDistribution: []
  };
  
  // 按班级统计
  submissions.forEach(sub => {
    const className = sub.studentInfo.className;
    if (!statistics.submissionsByClass[className]) {
      statistics.submissionsByClass[className] = 0;
    }
    statistics.submissionsByClass[className]++;
  });
  
  res.json({
    ...submissionData,
    detailedStatistics: statistics
  });
});

// 更新作业
router.put('/assignments/:id', requireAuth, (req, res) => {
  const assignmentFile = path.join(config.data.assignmentsDir, `${req.params.id}.json`);
  const assignmentData = readJsonFile(assignmentFile);
  
  if (!assignmentData) {
    return res.status(404).json({ error: '作业不存在' });
  }
  
  const { title, description, dueDate, questions, status } = req.body;
  
  // 更新作业数据
  if (title) assignmentData.title = title;
  if (description !== undefined) assignmentData.description = description;
  if (dueDate !== undefined) assignmentData.dueDate = dueDate;
  if (questions) assignmentData.questions = questions;
  if (status) assignmentData.status = status;
  assignmentData.updatedAt = moment().format();
  
  if (!writeJsonFile(assignmentFile, assignmentData)) {
    return res.status(500).json({ error: '更新作业失败' });
  }
  
  // 更新索引
  const indexData = readJsonFile(config.data.assignmentsIndex);
  const assignmentIndex = indexData.assignments.findIndex(a => a.id === req.params.id);
  if (assignmentIndex !== -1) {
    indexData.assignments[assignmentIndex] = {
      ...indexData.assignments[assignmentIndex],
      title: assignmentData.title,
      description: assignmentData.description,
      dueDate: assignmentData.dueDate,
      status: assignmentData.status
    };
    indexData.metadata.lastUpdated = assignmentData.updatedAt;
    writeJsonFile(config.data.assignmentsIndex, indexData);
  }
  
  res.json({ success: true });
});

// 删除作业
router.delete('/assignments/:id', requireAuth, (req, res) => {
  const assignmentFile = path.join(config.data.assignmentsDir, `${req.params.id}.json`);
  const submissionFile = path.join(config.data.submissionsDir, `${req.params.id}.json`);
  
  try {
    // 删除文件
    if (fs.existsSync(assignmentFile)) fs.unlinkSync(assignmentFile);
    if (fs.existsSync(submissionFile)) fs.unlinkSync(submissionFile);
    
    // 更新索引
    const indexData = readJsonFile(config.data.assignmentsIndex);
    indexData.assignments = indexData.assignments.filter(a => a.id !== req.params.id);
    indexData.metadata.totalAssignments--;
    indexData.metadata.lastUpdated = moment().format();
    
    writeJsonFile(config.data.assignmentsIndex, indexData);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除作业失败' });
  }
});

module.exports = router;