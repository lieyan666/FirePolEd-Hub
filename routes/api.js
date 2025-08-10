const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
// Use shared configuration loader
const config = require('../config');

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
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('写入文件错误:', error);
    return false;
  }
};

// 获取系统配置
router.get('/config', (req, res) => {
  const publicConfig = {
    ui: config.ui,
    features: {
      maxFileSize: config.features.maxFileSize,
      allowedFileTypes: config.features.allowedFileTypes,
      autoSave: config.features.autoSave,
      autoSaveInterval: config.features.autoSaveInterval
    }
  };
  res.json(publicConfig);
});

// 获取班级列表
router.get('/classes', (req, res) => {
  const classesData = readJsonFile(config.data.classesFile);
  if (!classesData) {
    return res.status(500).json({ error: '无法读取班级数据' });
  }
  res.json({
    classes: classesData.classes || [],
    metadata: classesData.metadata
  });
});

// 更新班级列表（管理员功能）
router.put('/classes', (req, res) => {
  const { classes } = req.body;
  
  if (!Array.isArray(classes)) {
    return res.status(400).json({ error: '班级列表格式错误' });
  }
  
  const classesData = {
    classes: classes,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalClasses: classes.length
    }
  };
  
  if (writeJsonFile(config.data.classesFile, classesData)) {
    res.json({ success: true, message: '班级列表更新成功' });
  } else {
    res.status(500).json({ error: '保存班级数据失败' });
  }
});

// 添加班级
router.post('/classes', (req, res) => {
  const { className } = req.body;
  
  if (!className || typeof className !== 'string') {
    return res.status(400).json({ error: '班级名称不能为空' });
  }
  
  const classesData = readJsonFile(config.data.classesFile);
  if (!classesData) {
    return res.status(500).json({ error: '无法读取班级数据' });
  }
  
  if (classesData.classes.includes(className)) {
    return res.status(400).json({ error: '班级已存在' });
  }
  
  classesData.classes.push(className);
  classesData.metadata = {
    lastUpdated: new Date().toISOString(),
    totalClasses: classesData.classes.length
  };
  
  if (writeJsonFile(config.data.classesFile, classesData)) {
    res.json({ success: true, message: '班级添加成功' });
  } else {
    res.status(500).json({ error: '保存班级数据失败' });
  }
});

// 删除班级
router.delete('/classes/:className', (req, res) => {
  const { className } = req.params;
  
  const classesData = readJsonFile(config.data.classesFile);
  if (!classesData) {
    return res.status(500).json({ error: '无法读取班级数据' });
  }
  
  const index = classesData.classes.indexOf(className);
  if (index === -1) {
    return res.status(404).json({ error: '班级不存在' });
  }
  
  classesData.classes.splice(index, 1);
  classesData.metadata = {
    lastUpdated: new Date().toISOString(),
    totalClasses: classesData.classes.length
  };
  
  if (writeJsonFile(config.data.classesFile, classesData)) {
    res.json({ success: true, message: '班级删除成功' });
  } else {
    res.status(500).json({ error: '保存班级数据失败' });
  }
});

// 健康检查
router.get('/health', (req, res) => {
  const indexData = readJsonFile(config.data.assignmentsIndex);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    dataStatus: indexData ? 'ok' : 'error'
  });
});

// 获取系统统计信息
router.get('/stats', (req, res) => {
  const indexData = readJsonFile(config.data.assignmentsIndex);
  
  if (!indexData) {
    return res.status(500).json({ error: '无法读取系统数据' });
  }
  
  let totalSubmissions = 0;
  let activeAssignments = 0;
  
  indexData.assignments.forEach(assignment => {
    if (assignment.status === 'active') {
      activeAssignments++;
    }
    totalSubmissions += assignment.submissionCount || 0;
  });
  
  res.json({
    totalAssignments: indexData.metadata.totalAssignments,
    activeAssignments,
    totalSubmissions,
    lastUpdated: indexData.metadata.lastUpdated
  });
});

// 验证作业ID是否存在
router.get('/validate-assignment/:id', (req, res) => {
  const assignmentFile = path.join(config.data.assignmentsDir, `${req.params.id}.json`);
  const exists = fs.existsSync(assignmentFile);
  
  if (exists) {
    const assignmentData = readJsonFile(assignmentFile);
    res.json({
      exists: true,
      title: assignmentData.title,
      status: assignmentData.status,
      dueDate: assignmentData.dueDate
    });
  } else {
    res.json({ exists: false });
  }
});

// 导出数据（管理员功能）
router.get('/export/:assignmentId', (req, res) => {
  const assignmentFile = path.join(config.data.assignmentsDir, `${req.params.assignmentId}.json`);
  const submissionFile = path.join(config.data.submissionsDir, `${req.params.assignmentId}.json`);
  
  const assignmentData = readJsonFile(assignmentFile);
  const submissionData = readJsonFile(submissionFile);
  
  if (!assignmentData || !submissionData) {
    return res.status(404).json({ error: '数据不存在' });
  }
  
  const exportData = {
    assignment: assignmentData,
    submissions: submissionData,
    exportedAt: new Date().toISOString(),
    exportedBy: 'admin'
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="assignment-${req.params.assignmentId}-export.json"`);
  res.json(exportData);
});

// 批量操作接口
router.post('/batch', (req, res) => {
  const { operation, assignmentIds } = req.body;
  
  if (!operation || !assignmentIds || !Array.isArray(assignmentIds)) {
    return res.status(400).json({ error: '参数错误' });
  }
  
  const results = [];
  
  switch (operation) {
    case 'activate':
    case 'deactivate':
      const newStatus = operation === 'activate' ? 'active' : 'inactive';
      
      assignmentIds.forEach(id => {
        const assignmentFile = path.join(config.data.assignmentsDir, `${id}.json`);
        const assignmentData = readJsonFile(assignmentFile);
        
        if (assignmentData) {
          assignmentData.status = newStatus;
          assignmentData.updatedAt = new Date().toISOString();
          
          if (writeJsonFile(assignmentFile, assignmentData)) {
            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: '写入失败' });
          }
        } else {
          results.push({ id, success: false, error: '作业不存在' });
        }
      });
      break;
      
    default:
      return res.status(400).json({ error: '不支持的操作' });
  }
  
  res.json({ results });
});

module.exports = router;