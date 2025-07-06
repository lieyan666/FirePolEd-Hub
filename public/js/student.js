// Student Panel JavaScript

class StudentPanel {
  constructor() {
    this.assignmentId = null;
    this.assignment = null;
    this.studentInfo = null;
    this.answers = {};
    this.startTime = null;
    this.autoSaveTimer = null;
    this.init();
  }
  
  init() {
    this.assignmentId = this.getAssignmentIdFromUrl();
    if (!this.assignmentId) {
      this.showError('无效的作业链接');
      return;
    }
    
    this.loadClasses();
    this.loadSavedStudentInfo();
    this.loadAssignment();
    this.setupEventListeners();
  }
  
  getAssignmentIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    // URL format: /student/assignment/{assignmentId}
    const assignmentIndex = pathParts.indexOf('assignment');
    if (assignmentIndex !== -1 && assignmentIndex + 1 < pathParts.length) {
      return pathParts[assignmentIndex + 1];
    }
    return pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
  }
  
  setupEventListeners() {
    // Student info form
    const studentForm = document.getElementById('student-info-form');
    if (studentForm) {
      studentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitStudentInfo();
      });
    }
    
    // Assignment form
    const assignmentForm = document.getElementById('assignment-form');
    if (assignmentForm) {
      assignmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.reviewAnswers();
      });
      
      // Auto-save on input change
      assignmentForm.addEventListener('input', Utils.debounce(() => {
        this.autoSave();
      }, 2000));
      
      assignmentForm.addEventListener('change', () => {
        this.updateProgress();
        this.autoSave();
      });
    }
    
    // Prevent accidental page leave
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '您有未保存的答案，确定要离开吗？';
      }
    });
  }
  
  async loadAssignment() {
    try {
      // Load assignment first
      const data = await API.get(`/student/api/${this.assignmentId}`);
      this.assignment = data;
      
      this.hideLoading();
      this.showStudentInfoForm();
    } catch (error) {
      console.error('加载作业失败:', error);
      this.showError(error.message || '加载作业失败，请检查链接是否正确');
    }
  }
  
  hideLoading() {
    document.getElementById('loading-state').style.display = 'none';
  }
  
  showError(message) {
    this.hideLoading();
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-state').style.display = 'block';
  }
  
  showStudentInfoForm() {
    document.getElementById('student-info-section').style.display = 'block';
  }
  
  async loadClasses() {
    try {
      const response = await API.get('/api/classes');
      const classSelect = document.getElementById('class-select');
      
      // Clear loading option
      classSelect.innerHTML = '<option value="">请选择班级</option>';
      
      // Add class options
      response.classes.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        classSelect.appendChild(option);
      });
    } catch (error) {
      console.error('加载班级列表失败:', error);
      const classSelect = document.getElementById('class-select');
      classSelect.innerHTML = '<option value="">加载班级失败，请刷新重试</option>';
    }
  }
  
  loadSavedStudentInfo() {
    try {
      const savedInfo = localStorage.getItem('studentInfo');
      if (savedInfo) {
        const info = JSON.parse(savedInfo);
        
        // Wait for classes to load first
        setTimeout(() => {
          const form = document.getElementById('student-info-form');
          if (form) {
            const classSelect = form.querySelector('[name="className"]');
            const nameInput = form.querySelector('[name="studentName"]');
            const idInput = form.querySelector('[name="studentId"]');
            
            if (classSelect && info.className) {
              classSelect.value = info.className;
            }
            if (nameInput && info.name) {
              nameInput.value = info.name;
            }
            if (idInput && info.studentId) {
              idInput.value = info.studentId;
            }
          }
        }, 500); // Wait for classes to load
      }
    } catch (error) {
      console.error('加载保存的学生信息失败:', error);
    }
  }
  
  saveStudentInfo(studentInfo) {
    try {
      localStorage.setItem('studentInfo', JSON.stringify(studentInfo));
    } catch (error) {
      console.error('保存学生信息失败:', error);
    }
  }
  
  async submitStudentInfo() {
    const form = document.getElementById('student-info-form');
    const formData = new FormData(form);
    
    this.studentInfo = {
      className: formData.get('className'),
      name: formData.get('studentName'),
      studentId: formData.get('studentId') || ''
    };
    
    if (!this.studentInfo.className || !this.studentInfo.name) {
      Utils.showMessage('请填写完整的学生信息', 'error');
      return;
    }
    
    // Save student info to localStorage
    this.saveStudentInfo(this.studentInfo);
    
    try {
      // Check if already submitted
      const submissionCheck = await API.get(`/student/api/${this.assignmentId}/check-submission?name=${encodeURIComponent(this.studentInfo.name)}&className=${encodeURIComponent(this.studentInfo.className)}`);
      if (submissionCheck.hasSubmitted) {
        this.showAlreadySubmitted(submissionCheck.submissionInfo);
        return;
      }
    } catch (error) {
      console.error('检查提交状态失败:', error);
      // 继续执行，不阻止答题
    }
    
    this.startTime = new Date();
    this.showAssignmentContent();
  }
  
  showAssignmentContent() {
    // Hide student info form
    document.getElementById('student-info-section').style.display = 'none';
    
    // Show assignment content
    document.getElementById('assignment-content').style.display = 'block';
    
    // Populate assignment info
    document.getElementById('assignment-title').textContent = this.assignment.title;
    document.getElementById('assignment-question-count').textContent = `${this.assignment.questions.length} 题`;
    
    if (this.assignment.dueDate) {
      document.getElementById('assignment-due-date').textContent = `截止: ${Utils.formatDate(this.assignment.dueDate)}`;
    } else {
      document.getElementById('assignment-due-date').textContent = '无截止时间';
    }
    
    if (this.assignment.description) {
      document.getElementById('assignment-description').textContent = this.assignment.description;
    } else {
      document.getElementById('assignment-description').style.display = 'none';
    }
    
    // Show student info
    document.getElementById('display-student-name').textContent = this.studentInfo.name;
    document.getElementById('display-student-class').textContent = this.studentInfo.className;
    
    // Initialize progress
    document.getElementById('progress-total').textContent = this.assignment.questions.length;
    
    // Render questions
    this.renderQuestions();
    
    // Setup auto-save
    this.setupAutoSave();
  }
  
  renderQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    this.assignment.questions.forEach((question, index) => {
      const questionElement = this.createQuestionElement(question, index);
      container.appendChild(questionElement);
    });
  }
  
  createQuestionElement(question, index) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.dataset.questionId = question.id;
    
    const typeText = this.getQuestionTypeText(question.type);
    
    questionDiv.innerHTML = `
      <div class="question-header">
        <div class="question-number">第${index + 1}题</div>
        <div class="question-type">${typeText}</div>
        <div class="question-points">${question.points} 分</div>
      </div>
      
      <div class="question-content">
        <div class="question-text">${Utils.sanitizeHTML(question.question)}</div>
        
        <div class="question-answer">
          ${this.renderQuestionAnswer(question, index)}
        </div>
      </div>
    `;
    
    return questionDiv;
  }
  
  renderQuestionAnswer(question, index) {
    switch (question.type) {
      case 'single-choice':
        return this.renderSingleChoice(question, index);
      case 'multiple-choice':
        return this.renderMultipleChoice(question, index);
      case 'short-answer':
        return this.renderShortAnswer(question, index);
      default:
        return '<p>未知题型</p>';
    }
  }
  
  renderSingleChoice(question, index) {
    const options = question.options.map((option, optionIndex) => `
      <div class="option-item" onclick="studentPanel.selectSingleOption('${question.id}', ${optionIndex})">
        <div class="option-indicator">
          <i class="material-icons">check</i>
        </div>
        <div class="option-label">${Utils.sanitizeHTML(option)}</div>
        <input type="radio" name="question-${question.id}" value="${optionIndex}" style="display: none;">
      </div>
    `).join('');
    
    return `<div class="question-options">${options}</div>`;
  }
  
  renderMultipleChoice(question, index) {
    const options = question.options.map((option, optionIndex) => `
      <div class="option-item" onclick="studentPanel.toggleMultipleOption('${question.id}', ${optionIndex})">
        <div class="option-indicator">
          <i class="material-icons">check</i>
        </div>
        <div class="option-label">${Utils.sanitizeHTML(option)}</div>
        <input type="checkbox" name="question-${question.id}" value="${optionIndex}" style="display: none;">
      </div>
    `).join('');
    
    return `<div class="question-options">${options}</div>`;
  }
  
  renderShortAnswer(question, index) {
    return `
      <textarea 
        class="short-answer-input" 
        name="question-${question.id}" 
        placeholder="请在此输入您的答案..."
        oninput="studentPanel.updateShortAnswer('${question.id}', this.value)"
      ></textarea>
    `;
  }
  
  getQuestionTypeText(type) {
    const typeMap = {
      'single-choice': '单选题',
      'multiple-choice': '多选题',
      'short-answer': '简答题'
    };
    return typeMap[type] || type;
  }
  
  selectSingleOption(questionId, optionIndex) {
    // Update visual state
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    const options = questionElement.querySelectorAll('.option-item');
    
    options.forEach((option, index) => {
      if (index === optionIndex) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
    
    // Update hidden input
    const radio = questionElement.querySelector(`input[value="${optionIndex}"]`);
    if (radio) {
      radio.checked = true;
    }
    
    // Store answer
    this.answers[questionId] = optionIndex;
    
    // Update question state
    questionElement.classList.add('answered');
    
    this.updateProgress();
  }
  
  toggleMultipleOption(questionId, optionIndex) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    const option = questionElement.querySelectorAll('.option-item')[optionIndex];
    const checkbox = questionElement.querySelector(`input[value="${optionIndex}"]`);
    
    // Toggle selection
    const isSelected = option.classList.contains('selected');
    
    if (isSelected) {
      option.classList.remove('selected');
      checkbox.checked = false;
    } else {
      option.classList.add('selected');
      checkbox.checked = true;
    }
    
    // Update answers array
    if (!this.answers[questionId]) {
      this.answers[questionId] = [];
    }
    
    if (isSelected) {
      this.answers[questionId] = this.answers[questionId].filter(val => val !== optionIndex);
    } else {
      this.answers[questionId].push(optionIndex);
    }
    
    // Update question state
    if (this.answers[questionId].length > 0) {
      questionElement.classList.add('answered');
    } else {
      questionElement.classList.remove('answered');
    }
    
    this.updateProgress();
  }
  
  updateShortAnswer(questionId, value) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    
    // Store answer
    this.answers[questionId] = value.trim();
    
    // Update question state
    if (value.trim()) {
      questionElement.classList.add('answered');
    } else {
      questionElement.classList.remove('answered');
    }
    
    this.updateProgress();
  }
  
  updateProgress() {
    const totalQuestions = this.assignment.questions.length;
    const answeredQuestions = Object.keys(this.answers).filter(questionId => {
      const answer = this.answers[questionId];
      if (Array.isArray(answer)) {
        return answer.length > 0;
      }
      return answer !== undefined && answer !== null && answer !== '';
    }).length;
    
    const percentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('progress-current').textContent = answeredQuestions;
  }
  
  setupAutoSave() {
    // Auto-save every 30 seconds
    this.autoSaveTimer = setInterval(() => {
      this.autoSave();
    }, 30000);
  }
  
  autoSave() {
    if (!this.hasAnswers()) return;
    
    // Show auto-save indicator
    const indicator = document.getElementById('autosave-indicator');
    indicator.classList.add('show');
    
    // Hide after 2 seconds
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 2000);
    
    // In a real implementation, you might save to localStorage or send to server
    localStorage.setItem(`assignment-${this.assignmentId}-answers`, JSON.stringify({
      answers: this.answers,
      studentInfo: this.studentInfo,
      lastSaved: new Date().toISOString()
    }));
  }
  
  hasAnswers() {
    return Object.keys(this.answers).length > 0;
  }
  
  hasUnsavedChanges() {
    return this.hasAnswers() && this.assignment && !this.isSubmitted;
  }
  
  reviewAnswers() {
    const unansweredQuestions = [];
    const answeredQuestions = [];
    
    this.assignment.questions.forEach((question, index) => {
      const answer = this.answers[question.id];
      const isAnswered = this.isQuestionAnswered(question.id);
      
      if (isAnswered) {
        answeredQuestions.push({
          number: index + 1,
          question: question.question,
          answer: this.formatAnswerForReview(question, answer)
        });
      } else {
        unansweredQuestions.push({
          number: index + 1,
          question: question.question
        });
      }
    });
    
    this.showReviewModal(answeredQuestions, unansweredQuestions);
  }
  
  isQuestionAnswered(questionId) {
    const answer = this.answers[questionId];
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    return answer !== undefined && answer !== null && answer !== '';
  }
  
  formatAnswerForReview(question, answer) {
    switch (question.type) {
      case 'single-choice':
        return question.options[answer] || '未选择';
      case 'multiple-choice':
        if (Array.isArray(answer) && answer.length > 0) {
          return answer.map(index => question.options[index]).join(', ');
        }
        return '未选择';
      case 'short-answer':
        return answer || '未填写';
      default:
        return '未知答案';
    }
  }
  
  showReviewModal(answeredQuestions, unansweredQuestions) {
    const reviewContent = document.getElementById('review-content');
    
    let content = '';
    
    if (unansweredQuestions.length > 0) {
      content += `
        <div style="margin-bottom: 24px; padding: 16px; background: var(--warning-bg); border-radius: 8px; border-left: 4px solid var(--warning-color);">
          <h4 style="color: var(--warning-color); margin-bottom: 12px;">未完成题目 (${unansweredQuestions.length}题)</h4>
          ${unansweredQuestions.map(q => `
            <div style="margin-bottom: 8px;">第${q.number}题: ${Utils.sanitizeHTML(q.question.substring(0, 50))}${q.question.length > 50 ? '...' : ''}</div>
          `).join('')}
        </div>
      `;
    }
    
    if (answeredQuestions.length > 0) {
      content += `
        <div>
          <h4 style="margin-bottom: 16px;">已完成题目 (${answeredQuestions.length}题)</h4>
          ${answeredQuestions.map(q => `
            <div class="review-question">
              <div class="review-question-header">
                <span class="review-question-number">第${q.number}题</span>
                <span class="review-status answered">已完成</span>
              </div>
              <div class="review-question-text">${Utils.sanitizeHTML(q.question.substring(0, 100))}${q.question.length > 100 ? '...' : ''}</div>
              <div class="review-answer">答案: ${Utils.sanitizeHTML(q.answer)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    if (answeredQuestions.length === 0 && unansweredQuestions.length === 0) {
      content = '<p class="text-center">暂无答题内容</p>';
    }
    
    reviewContent.innerHTML = content;
    Modal.show('review-modal');
  }
  
  async submitAssignment() {
    // Close review modal
    Modal.hide('review-modal');
    
    // Validate all required questions are answered
    const unansweredRequired = this.assignment.questions.filter(question => 
      question.required && !this.isQuestionAnswered(question.id)
    );
    
    if (unansweredRequired.length > 0) {
      Utils.showMessage(`还有 ${unansweredRequired.length} 道必答题未完成`, 'warning');
      return;
    }
    
    // Prepare submission data
    const submissionData = {
      studentInfo: this.studentInfo,
      answers: this.answers,
      startTime: this.startTime.toISOString(),
      submitTime: new Date().toISOString()
    };
    
    try {
      Loading.show('正在提交作业...');
      
      const result = await API.post(`/student/api/${this.assignmentId}/submit`, submissionData);
      
      Loading.hide();
      
      // Clear auto-save timer
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
      }
      
      // Clear local storage
      localStorage.removeItem(`assignment-${this.assignmentId}-answers`);
      
      // Mark as submitted
      this.isSubmitted = true;
      
      // Show success
      this.showSubmissionSuccess(result);
      
    } catch (error) {
      Loading.hide();
      console.error('提交失败:', error);
      Utils.showMessage(error.message || '提交失败，请重试', 'error');
    }
  }
  
  showSubmissionSuccess(result) {
    // 隐藏所有其他内容
    this.hideAllSections();
    
    // 显示提交成功页面
    const successSection = document.getElementById('submission-success');
    successSection.style.display = 'flex';
    
    // 更新成功页面数据
    this.updateSuccessData(result);
    
    // 添加进入动画
    setTimeout(() => {
      successSection.classList.add('fade-in');
    }, 100);
  }
  
  updateSuccessData(result) {
    // 更新得分
    const scoreElement = document.getElementById('final-score');
    const finalScore = Math.round(result.percentage || 0);
    scoreElement.textContent = finalScore;
    
    // 动画显示分数
    this.animateScore(scoreElement, 0, finalScore, 1500);
    
    // 更新提交时间
    const submissionTime = new Date();
    document.getElementById('submission-time').textContent = this.formatDateTime(submissionTime);
    
    // 计算并更新答题用时
    const timeSpent = submissionTime - this.startTime;
    document.getElementById('time-spent').textContent = this.formatDuration(timeSpent);
  }
  
  showAlreadySubmitted(submission) {
    // 隐藏所有其他内容
    this.hideAllSections();
    
    // 显示已提交页面
    const submittedSection = document.getElementById('already-submitted');
    submittedSection.style.display = 'flex';
    
    // 更新已提交页面数据
    this.updateSubmittedData(submission);
    
    // 添加进入动画
    setTimeout(() => {
      submittedSection.classList.add('fade-in');
    }, 100);
  }
  
  updateSubmittedData(submission) {
    // 更新提交时间
    const submissionDate = new Date(submission.submittedAt);
    document.getElementById('previous-submission-time').textContent = this.formatDateTime(submissionDate);
    
    // 更新得分
    document.getElementById('previous-score').textContent = Math.round(submission.percentage || 0);
  }
  
  hideAllSections() {
    // 隐藏所有主要内容区域
    const sections = [
      'loading-state',
      'error-state', 
      'student-info-section',
      'assignment-content',
      'submission-success',
      'already-submitted'
    ];
    
    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = 'none';
        section.classList.remove('fade-in');
      }
    });
  }
  
  animateScore(element, start, end, duration) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(start + (end - start) * easeOutCubic);
      
      element.textContent = currentScore;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  formatDateTime(date) {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分${seconds}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

// Global functions for HTML onclick handlers
function selectSingleOption(questionId, optionIndex) {
  studentPanel.selectSingleOption(questionId, optionIndex);
}

function toggleMultipleOption(questionId, optionIndex) {
  studentPanel.toggleMultipleOption(questionId, optionIndex);
}

function updateShortAnswer(questionId, value) {
  studentPanel.updateShortAnswer(questionId, value);
}

// Initialize student panel
let studentPanel;
document.addEventListener('DOMContentLoaded', () => {
  studentPanel = new StudentPanel();
});