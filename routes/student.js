const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const config = require('../config.json');

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
router.post('/api/:assignmentId/submit', (req, res) => {
  const { studentInfo, answers } = req.body;
  
  if (!studentInfo || !studentInfo.name || !studentInfo.className) {
    return res.status(400).json({ error: '学生信息不完整' });
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
  
  // 检查是否已经提交过
  const existingSubmission = submissionData.submissions.find(
    sub => sub.studentInfo.name === studentInfo.name && 
           sub.studentInfo.className === studentInfo.className
  );
  
  if (existingSubmission) {
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
  
  if (!writeJsonFile(submissionFile, submissionData)) {
    return res.status(500).json({ error: '保存提交失败' });
  }
  
  // 更新索引中的提交计数
  const indexData = readJsonFile(config.data.assignmentsIndex);
  const assignmentIndex = indexData.assignments.findIndex(a => a.id === req.params.assignmentId);
  if (assignmentIndex !== -1) {
    indexData.assignments[assignmentIndex].submissionCount = submissionData.submissions.length;
    writeJsonFile(config.data.assignmentsIndex, indexData);
  }
  
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
  const { name, className } = req.query;
  
  if (!name || !className) {
    return res.status(400).json({ error: '缺少学生信息' });
  }
  
  const submissionFile = path.join(config.data.submissionsDir, `${req.params.assignmentId}.json`);
  const submissionData = readJsonFile(submissionFile);
  
  if (!submissionData) {
    return res.json({ hasSubmitted: false });
  }
  
  const existingSubmission = submissionData.submissions.find(
    sub => sub.studentInfo.name === name && 
           sub.studentInfo.className === className
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