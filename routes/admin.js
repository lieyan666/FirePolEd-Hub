const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
// Use shared configuration loader
const config = require('../config');
const SessionManager = require('../utils/sessionManager');
const RateLimiter = require('../utils/rateLimiter');
const WriteTracker = require('../utils/writeTracker');

// Initialize utilities
const sessionManager = new SessionManager({
  sessionTimeout: config.admin.sessionTimeout,
  sessionFile: path.join(__dirname, '../data/admin-sessions.json')
});

const rateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100 // 100 requests per minute for admin
});

const writeTracker = new WriteTracker();

// Apply rate limiting to all admin routes
router.use(rateLimiter.middleware());

// 认证中间件
const requireAuth = (req, res, next) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  
  if (!sessionId || !sessionManager.verifySession(sessionId)) {
    console.log(`Authentication failed for IP ${req.ip}: invalid session`);
    return res.status(401).json({ error: '未授权访问，请先登录' });
  }
  
  next();
};

// 工具函数
const readJsonFile = (filePath) => {
  return writeTracker.readJsonFile(filePath);
};

const writeJsonFile = async (filePath, data, metadata = {}) => {
  const result = await writeTracker.writeJsonFile(filePath, data, metadata);
  return result.success;
};

// 登录接口
router.post('/login', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    console.log(`Login attempt failed from IP ${req.ip}: no password provided`);
    return res.status(400).json({ error: '请输入密码' });
  }
  
  // Use crypto.timingSafeEqual to prevent timing attacks
  const providedPassword = Buffer.from(password, 'utf8');
  const correctPassword = Buffer.from(config.admin.password, 'utf8');
  
  if (providedPassword.length !== correctPassword.length || 
      !require('crypto').timingSafeEqual(providedPassword, correctPassword)) {
    console.log(`Login attempt failed from IP ${req.ip}: incorrect password`);
    return res.status(401).json({ error: '密码错误' });
  }
  
  try {
    // 创建会话
    const { sessionId } = sessionManager.createSession(
      req.headers['user-agent'] || '', 
      req.ip || req.connection.remoteAddress
    );
    
    console.log(`Admin login successful from IP ${req.ip}`);
    
    res.json({ 
      success: true, 
      sessionId,
      expiresIn: config.admin.sessionTimeout
    });
  } catch (error) {
    console.error(`Session creation failed for IP ${req.ip}: ${error.message}`);
    return res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 登出接口
router.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;
  
  if (sessionId) {
    sessionManager.deleteSession(sessionId);
    console.log(`Admin logout from IP ${req.ip}`);
  }
  
  res.json({ success: true });
});

// 验证会话接口
router.get('/verify', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  
  if (!sessionId || !sessionManager.verifySession(sessionId)) {
    console.log(`Session verification failed from IP ${req.ip}: invalid session`);
    return res.status(401).json({ error: '会话无效或已过期' });
  }
  
  const session = sessionManager.getSessionInfo(sessionId);
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
router.post('/assignments', requireAuth, async (req, res) => {
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
  if (!(await writeJsonFile(assignmentFile, assignmentData, { type: 'assignment', operation: 'create' }))) {
    console.error(`Failed to save assignment ${assignmentId} to ${assignmentFile}`);
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
  if (!(await writeJsonFile(submissionFile, submissionData, { type: 'submission', operation: 'create' }))) {
    console.error(`Failed to create submission file ${submissionFile}`);
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
  
  if (!(await writeJsonFile(config.data.assignmentsIndex, indexData, { type: 'index', operation: 'update' }))) {
    console.error(`Failed to update assignments index`);
    return res.status(500).json({ error: '更新索引失败' });
  }
  
  console.log(`Assignment created successfully: ${assignmentId} by IP ${req.ip}`);
  
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
router.put('/assignments/:id', requireAuth, async (req, res) => {
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
  
  if (!(await writeJsonFile(assignmentFile, assignmentData, { type: 'assignment', operation: 'update' }))) {
    console.error(`Failed to update assignment ${req.params.id}`);
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
    await writeJsonFile(config.data.assignmentsIndex, indexData, { type: 'index', operation: 'update' });
  }
  
  console.log(`Assignment updated successfully: ${req.params.id} by IP ${req.ip}`);
  
  res.json({ success: true });
});

// 删除作业
router.delete('/assignments/:id', requireAuth, async (req, res) => {
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
    
    await writeJsonFile(config.data.assignmentsIndex, indexData, { type: 'index', operation: 'delete' });
    
    console.log(`Assignment deleted successfully: ${req.params.id} by IP ${req.ip}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete assignment ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: '删除作业失败' });
  }
});

// Admin monitoring endpoints
router.get('/system/status', requireAuth, async (req, res) => {
  try {
    const sessionStats = sessionManager.getStats();
    const rateLimitStats = rateLimiter.getStats();
    const writeStats = await writeTracker.getOperationStats(24);
    const failedOps = await writeTracker.getFailedOperations(24);
    
    console.log(`System status checked by IP ${req.ip}`);
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      sessions: sessionStats,
      rateLimit: rateLimitStats,
      writeOperations: writeStats,
      recentFailures: failedOps.length,
      version: '1.1.0'
    });
  } catch (error) {
    console.error(`System status check failed: ${error.message}`);
    res.status(500).json({ error: '系统状态检查失败' });
  }
});

router.get('/system/failed-operations', requireAuth, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const failedOps = await writeTracker.getFailedOperations(hours);
    
    console.log(`Failed operations report requested by IP ${req.ip} for ${hours} hours`);
    
    res.json({
      period: `${hours}h`,
      count: failedOps.length,
      operations: failedOps
    });
  } catch (error) {
    console.error(`Failed to get failed operations report: ${error.message}`);
    res.status(500).json({ error: '获取失败操作报告失败' });
  }
});

module.exports = router;