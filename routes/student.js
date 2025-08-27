const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
// Use shared configuration loader
const config = require('../config');
const RateLimiter = require('../utils/rateLimiter');
const WriteTracker = require('../utils/writeTracker');

// Initialize utilities
const rateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 30 // 30 requests per minute for students
});

const writeTracker = new WriteTracker();

// Apply rate limiting to student routes
router.use(rateLimiter.middleware());

// 工具函数
const readJsonFile = (filePath) => {
  return writeTracker.readJsonFile(filePath);
};

const writeJsonFile = async (filePath, data, metadata = {}) => {
  const result = await writeTracker.writeJsonFile(filePath, data, metadata);
  return result.success;
};

// Student info validation
const validateStudentInfo = (studentInfo) => {
  const errors = [];
  
  if (!studentInfo || typeof studentInfo !== 'object') {
    return ['学生信息格式错误'];
  }
  
  // Validate name
  if (!studentInfo.name || typeof studentInfo.name !== 'string') {
    errors.push('姓名不能为空');
  } else if (studentInfo.name.trim().length < 2 || studentInfo.name.trim().length > 20) {
    errors.push('姓名长度必须在2-20个字符之间');
  }
  
  // Validate student ID
  if (!studentInfo.studentId || typeof studentInfo.studentId !== 'string') {
    errors.push('学号不能为空');
  } else if (!/^[0-9a-zA-Z]{6,20}$/.test(studentInfo.studentId.trim())) {
    errors.push('学号格式不正确（只能包含数字和字母，6-20位）');
  }
  
  // Validate class name
  if (!studentInfo.className || typeof studentInfo.className !== 'string') {
    errors.push('班级不能为空');
  } else if (studentInfo.className.trim().length < 1 || studentInfo.className.trim().length > 50) {
    errors.push('班级名称长度不能超过50个字符');
  }
  
  return errors;
};

// 学生主页
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student', 'index.html'));
});

// 学生答题页面
router.get('/assignment/:assignmentId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student', 'index.html'));
});

// 获取作业信息（学生视图）
router.get('/api/:assignmentId', (req, res) => {
  const assignmentFile = path.join(config.data.assignmentsDir, `${req.params.assignmentId}.json`);
  const assignmentData = readJsonFile(assignmentFile);
  
  if (!assignmentData) {
    return res.status(404).json({ error: '作业不存在' });
  }
  
  if (assignmentData.status !== 'active') {
    return res.status(403).json({ error: '作业已关闭' });
  }
  
  // 检查是否过期
  if (assignmentData.dueDate && moment().isAfter(moment(assignmentData.dueDate))) {
    if (!assignmentData.settings.allowLateSubmission) {
      return res.status(403).json({ error: '作业已过期' });
    }
  }
  
  // 返回学生需要的信息（不包含答案等敏感信息）
  const studentView = {
    id: assignmentData.id,
    title: assignmentData.title,
    description: assignmentData.description,
    dueDate: assignmentData.dueDate,
    questions: assignmentData.questions.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options || [],
      required: q.required || false,
      points: q.points || 1
    })),
    settings: {
      allowLateSubmission: assignmentData.settings.allowLateSubmission,
      randomizeQuestions: assignmentData.settings.randomizeQuestions
    }
  };
  
  res.json(studentView);
});

// 提交作业
router.post('/api/:assignmentId/submit', async (req, res) => {
  const { studentInfo, answers } = req.body;
  
  // Validate student information
  const validationErrors = validateStudentInfo(studentInfo);
  if (validationErrors.length > 0) {
    console.log(`Student submission validation failed from IP ${req.ip}: ${validationErrors.join(', ')}`);
    return res.status(400).json({ error: validationErrors[0] });
  }
  
  if (!answers || Object.keys(answers).length === 0) {
    return res.status(400).json({ error: '答案不能为空' });
  }
  
  const assignmentFile = path.join(config.data.assignmentsDir, `${req.params.assignmentId}.json`);
  const assignmentData = readJsonFile(assignmentFile);
  
  if (!assignmentData) {
    return res.status(404).json({ error: '作业不存在' });
  }
  
  if (assignmentData.status !== 'active') {
    return res.status(403).json({ error: '作业已关闭' });
  }
  
  // 检查是否过期
  const isLate = assignmentData.dueDate && moment().isAfter(moment(assignmentData.dueDate));
  if (isLate && !assignmentData.settings.allowLateSubmission) {
    return res.status(403).json({ error: '作业已过期，不允许迟交' });
  }
  
  const submissionFile = path.join(config.data.submissionsDir, `${req.params.assignmentId}.json`);
  const submissionData = readJsonFile(submissionFile);
  
  if (!submissionData) {
    return res.status(500).json({ error: '提交数据文件不存在' });
  }
  
  // 检查是否已经提交过（使用学号和姓名双重检查）
  const existingSubmission = submissionData.submissions.find(
    sub => (
      sub.studentInfo.studentId === studentInfo.studentId ||
      (sub.studentInfo.name === studentInfo.name && 
       sub.studentInfo.className === studentInfo.className)
    )
  );
  
  if (existingSubmission) {
    console.log(`Duplicate submission attempt from IP ${req.ip}: student ${studentInfo.studentId || studentInfo.name}`);
    return res.status(409).json({ error: '您已经提交过此作业' });
  }
  
  // 计算得分（简单实现）
  let totalScore = 0;
  let maxScore = 0;
  const questionResults = [];
  
  assignmentData.questions.forEach(question => {
    const studentAnswer = answers[question.id];
    const points = question.points || 1;
    maxScore += points;
    
    let isCorrect = false;
    let score = 0;
    
    if (question.type === 'single-choice') {
      isCorrect = studentAnswer === question.correctAnswer;
      score = isCorrect ? points : 0;
    } else if (question.type === 'multiple-choice') {
      // 多选题评分逻辑（后续可优化）
      const correctAnswers = question.correctAnswers || [];
      const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [];
      
      if (correctAnswers.length === studentAnswers.length &&
          correctAnswers.every(ans => studentAnswers.includes(ans))) {
        isCorrect = true;
        score = points;
      }
    } else if (question.type === 'short-answer') {
      // 简答题暂时不自动评分
      score = 0;
    }
    
    totalScore += score;
    questionResults.push({
      questionId: question.id,
      studentAnswer,
      isCorrect,
      score,
      maxScore: points
    });
  });
  
  // 创建提交记录
  const submission = {
    id: uuidv4(),
    studentInfo,
    answers,
    questionResults,
    score: totalScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
    submittedAt: moment().format(),
    isLate,
    ipAddress: req.ip || req.connection.remoteAddress
  };
  
  // 保存提交
  submissionData.submissions.push(submission);
  submissionData.statistics.totalSubmissions++;
  submissionData.lastUpdated = moment().format();
  
  // 重新计算统计信息
  const scores = submissionData.submissions.map(s => s.percentage);
  submissionData.statistics.averageScore = scores.length > 0 ? 
    Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  
  if (!(await writeJsonFile(submissionFile, submissionData, { 
    type: 'submission', 
    operation: 'student_submit',
    studentId: studentInfo.studentId,
    assignmentId: req.params.assignmentId
  }))) {
    console.error(`Failed to save student submission for assignment ${req.params.assignmentId} from IP ${req.ip}`);
    return res.status(500).json({ error: '保存提交失败' });
  }
  
  // 更新索引中的提交计数
  const indexData = readJsonFile(config.data.assignmentsIndex);
  const assignmentIndex = indexData.assignments.findIndex(a => a.id === req.params.assignmentId);
  if (assignmentIndex !== -1) {
    indexData.assignments[assignmentIndex].submissionCount = submissionData.submissions.length;
    await writeJsonFile(config.data.assignmentsIndex, indexData, { type: 'index', operation: 'submission_count_update' });
  }
  
  console.log(`Student submission successful: assignment ${req.params.assignmentId}, student ${studentInfo.studentId || studentInfo.name} from IP ${req.ip}`);
  
  res.json({ 
    success: true, 
    submissionId: submission.id,
    score: totalScore,
    maxScore,
    percentage: submission.percentage,
    message: isLate ? '提交成功（迟交）' : '提交成功'
  });
});

// 检查学生是否已提交
router.get('/api/:assignmentId/check-submission', (req, res) => {
  const { name, className, studentId } = req.query;
  
  if ((!name || !className) && !studentId) {
    console.log(`Check submission request failed from IP ${req.ip}: missing student info`);
    return res.status(400).json({ error: '缺少学生信息' });
  }
  
  const submissionFile = path.join(config.data.submissionsDir, `${req.params.assignmentId}.json`);
  const submissionData = readJsonFile(submissionFile);
  
  if (!submissionData) {
    return res.json({ hasSubmitted: false });
  }
  
  const existingSubmission = submissionData.submissions.find(
    sub => {
      if (studentId) {
        return sub.studentInfo.studentId === studentId;
      }
      return sub.studentInfo.name === name && 
             sub.studentInfo.className === className;
    }
  );
  
  if (existingSubmission) {
    res.json({ 
      hasSubmitted: true,
      submissionInfo: {
        submittedAt: existingSubmission.submittedAt,
        score: existingSubmission.score,
        maxScore: existingSubmission.maxScore,
        percentage: existingSubmission.percentage
      }
    });
  } else {
    res.json({ hasSubmitted: false });
  }
});

module.exports = router;