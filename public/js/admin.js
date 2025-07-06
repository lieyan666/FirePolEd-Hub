// Admin Panel JavaScript

class AdminPanel {
  constructor() {
    this.assignments = [];
    this.currentAssignment = null;
    this.questionCounter = 0;
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadAssignments();
    this.loadSystemStats();
  }
  
  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(link.dataset.tab);
      });
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-assignments');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.filterAssignments(e.target.value);
      }, 300));
    }
  }
  
  switchTab(tabName) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load tab-specific data
    switch (tabName) {
      case 'assignments':
        this.loadAssignments();
        break;
      case 'classes':
        this.loadClasses();
        break;
      case 'statistics':
        this.loadStatistics();
        break;
    }
  }
  
  async loadAssignments() {
    try {
      const data = await API.get('/admin/assignments');
      this.assignments = data.assignments || [];
      this.renderAssignmentsList();
    } catch (error) {
      console.error('加载作业列表失败:', error);
      Utils.showMessage('加载作业列表失败', 'error');
    }
  }
  
  async loadSystemStats() {
    try {
      const stats = await API.get('/api/stats');
      this.updateStatsCards(stats);
    } catch (error) {
      console.error('加载系统统计失败:', error);
    }
  }
  
  updateStatsCards(stats) {
    document.getElementById('total-assignments').textContent = stats.totalAssignments || 0;
    document.getElementById('active-assignments').textContent = stats.activeAssignments || 0;
    document.getElementById('total-submissions').textContent = stats.totalSubmissions || 0;
    
    const avgCompletion = stats.totalAssignments > 0 ? 
      Math.round((stats.totalSubmissions / stats.totalAssignments) * 100) : 0;
    document.getElementById('avg-completion').textContent = `${avgCompletion}%`;
  }
  
  renderAssignmentsList() {
    const tbody = document.getElementById('assignments-list');
    
    if (this.assignments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">
            <div class="empty-state">
              <i class="material-icons">assignment</i>
              <h3>暂无作业</h3>
              <p>点击"创建作业"按钮开始创建您的第一个作业</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = this.assignments.map(assignment => `
      <tr class="assignment-row" onclick="adminPanel.viewAssignment('${assignment.id}')">
        <td>
          <div>
            <strong>${Utils.sanitizeHTML(assignment.title)}</strong>
            ${assignment.description ? `<br><small class="text-secondary">${Utils.sanitizeHTML(assignment.description)}</small>` : ''}
          </div>
        </td>
        <td>${Utils.formatDate(assignment.createdAt)}</td>
        <td>${assignment.dueDate ? Utils.formatDate(assignment.dueDate) : '无限制'}</td>
        <td>
          <span class="status-badge status-${assignment.status}">
            ${this.getStatusText(assignment.status)}
          </span>
        </td>
        <td>${assignment.submissionCount || 0}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn view" onclick="event.stopPropagation(); adminPanel.viewAssignment('${assignment.id}')" title="查看详情">
              <i class="material-icons">visibility</i>
            </button>
            <button class="action-btn" onclick="event.stopPropagation(); adminPanel.copyAssignmentLink('${assignment.id}')" title="复制链接">
              <i class="material-icons">link</i>
            </button>
            <button class="action-btn delete" onclick="event.stopPropagation(); adminPanel.deleteAssignment('${assignment.id}')" title="删除">
              <i class="material-icons">delete</i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  getStatusText(status) {
    const statusMap = {
      'active': '活跃',
      'inactive': '已关闭',
      'draft': '草稿'
    };
    return statusMap[status] || status;
  }
  
  async viewAssignment(assignmentId) {
    try {
      const assignment = await API.get(`/admin/assignments/${assignmentId}`);
      const statistics = await API.get(`/admin/assignments/${assignmentId}/statistics`);
      
      this.showAssignmentDetails(assignment, statistics);
    } catch (error) {
      console.error('加载作业详情失败:', error);
      Utils.showMessage('加载作业详情失败', 'error');
    }
  }
  
  showAssignmentDetails(assignment, statistics) {
    const studentUrl = `${window.location.origin}/student/${assignment.id}`;
    
    const content = `
      <div class="assignment-info">
        <div class="info-item">
          <div class="info-label">作业标题</div>
          <div class="info-value">${Utils.sanitizeHTML(assignment.title)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">创建时间</div>
          <div class="info-value">${Utils.formatDate(assignment.createdAt)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">截止时间</div>
          <div class="info-value">${assignment.dueDate ? Utils.formatDate(assignment.dueDate) : '无限制'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">状态</div>
          <div class="info-value">
            <span class="status-badge status-${assignment.status}">
              ${this.getStatusText(assignment.status)}
            </span>
          </div>
        </div>
      </div>
      
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-content">
          <h4>学生链接</h4>
          <div class="input-group">
            <input type="text" class="form-control" value="${studentUrl}" readonly>
            <button class="btn btn-primary" onclick="Utils.copyToClipboard('${studentUrl}')">
              <i class="material-icons">content_copy</i>
              复制
            </button>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-content">
          <h4>提交统计</h4>
          <div class="stats-grid" style="margin-bottom: 16px;">
            <div class="stat-card">
              <div class="stat-number">${statistics.submissions.length}</div>
              <div class="stat-label">总提交数</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${Object.keys(statistics.detailedStatistics.submissionsByClass).length}</div>
              <div class="stat-label">参与班级</div>
            </div>
          </div>
          
          ${statistics.submissions.length > 0 ? `
            <h5>最近提交</h5>
            <div class="submissions-list">
              ${statistics.submissions.slice(-10).reverse().map(sub => `
                <div class="submission-item">
                  <div class="student-info">
                    <div class="student-name">${Utils.sanitizeHTML(sub.studentInfo.name)}</div>
                    <div class="student-class">${Utils.sanitizeHTML(sub.studentInfo.className)}</div>
                  </div>
                  <div class="submission-score">
                    <span class="score-badge">${sub.percentage}%</span>
                    <small>${Utils.formatRelativeTime(sub.submittedAt)}</small>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-center text-secondary">暂无提交</p>'}
        </div>
      </div>
    `;
    
    document.getElementById('assignment-details-content').innerHTML = content;
    Modal.show('assignment-details-modal');
  }
  
  copyAssignmentLink(assignmentId) {
    const url = `${window.location.origin}/student/assignment/${assignmentId}`;
    Utils.copyToClipboard(url);
  }
  
  deleteAssignment(assignmentId) {
    const assignment = this.assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    if (confirm(`确定要删除作业"${assignment.title}"吗？此操作不可撤销。`)) {
      this.performDeleteAssignment(assignmentId);
    }
  }
  
  async performDeleteAssignment(assignmentId) {
    try {
      await API.delete(`/admin/assignments/${assignmentId}`);
      Utils.showMessage('作业删除成功', 'success');
      this.loadAssignments();
    } catch (error) {
      console.error('删除作业失败:', error);
      Utils.showMessage('删除作业失败', 'error');
    }
  }
  
  addQuestion() {
    this.questionCounter++;
    const questionId = `question-${this.questionCounter}`;
    
    const questionHtml = `
      <div class="question-item" data-question-id="${questionId}">
        <div class="question-header">
          <h5>题目 ${this.questionCounter}</h5>
          <button type="button" class="question-remove" onclick="adminPanel.removeQuestion('${questionId}')">
            <i class="material-icons">close</i>
          </button>
        </div>
        
        <div class="question-type-selector">
          <div class="type-option active" data-type="single-choice" onclick="adminPanel.setQuestionType('${questionId}', 'single-choice')">
            单选题
          </div>
          <div class="type-option" data-type="multiple-choice" onclick="adminPanel.setQuestionType('${questionId}', 'multiple-choice')">
            多选题
          </div>
          <div class="type-option" data-type="short-answer" onclick="adminPanel.setQuestionType('${questionId}', 'short-answer')">
            简答题
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">题目内容 *</label>
          <textarea name="question" class="form-control" rows="2" required></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">分值</label>
          <input type="number" name="points" class="form-control" value="1" min="1" max="100">
        </div>
        
        <div class="options-container">
          <label class="form-label">选项设置</label>
          <div class="options-list">
            <div class="option-item">
              <input type="radio" name="correct-${questionId}" value="0" checked>
              <input type="text" placeholder="选项A" required>
              <button type="button" class="option-remove" onclick="adminPanel.removeOption(this)">
                <i class="material-icons">close</i>
              </button>
            </div>
            <div class="option-item">
              <input type="radio" name="correct-${questionId}" value="1">
              <input type="text" placeholder="选项B" required>
              <button type="button" class="option-remove" onclick="adminPanel.removeOption(this)">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
          <button type="button" class="add-option" onclick="adminPanel.addOption('${questionId}')">
            <i class="material-icons">add</i>
            添加选项
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('questions-container').insertAdjacentHTML('beforeend', questionHtml);
  }
  
  removeQuestion(questionId) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    if (questionElement) {
      questionElement.remove();
    }
  }
  
  setQuestionType(questionId, type) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    if (!questionElement) return;
    
    // Update type selector
    questionElement.querySelectorAll('.type-option').forEach(option => {
      option.classList.remove('active');
    });
    questionElement.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    // Update options container
    const optionsContainer = questionElement.querySelector('.options-container');
    
    if (type === 'short-answer') {
      optionsContainer.style.display = 'none';
    } else {
      optionsContainer.style.display = 'block';
      
      // Update input types for multiple choice
      const inputs = optionsContainer.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      inputs.forEach(input => {
        input.type = type === 'multiple-choice' ? 'checkbox' : 'radio';
      });
    }
  }
  
  addOption(questionId) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    const optionsList = questionElement.querySelector('.options-list');
    const optionCount = optionsList.children.length;
    const optionLabel = String.fromCharCode(65 + optionCount); // A, B, C, D...
    
    const inputType = questionElement.querySelector('.type-option.active').dataset.type === 'multiple-choice' ? 'checkbox' : 'radio';
    
    const optionHtml = `
      <div class="option-item">
        <input type="${inputType}" name="correct-${questionId}" value="${optionCount}">
        <input type="text" placeholder="选项${optionLabel}" required>
        <button type="button" class="option-remove" onclick="adminPanel.removeOption(this)">
          <i class="material-icons">close</i>
        </button>
      </div>
    `;
    
    optionsList.insertAdjacentHTML('beforeend', optionHtml);
  }
  
  removeOption(button) {
    const optionItem = button.closest('.option-item');
    const optionsList = optionItem.parentElement;
    
    if (optionsList.children.length > 2) {
      optionItem.remove();
    } else {
      Utils.showMessage('至少需要保留两个选项', 'warning');
    }
  }
  
  async createAssignment() {
    const form = document.getElementById('create-assignment-form');
    const formData = new FormData(form);
    
    // Validate basic info
    const title = formData.get('title');
    if (!title) {
      Utils.showMessage('请输入作业标题', 'error');
      return;
    }
    
    // Collect questions
    const questions = [];
    const questionElements = document.querySelectorAll('.question-item');
    
    if (questionElements.length === 0) {
      Utils.showMessage('请至少添加一个题目', 'error');
      return;
    }
    
    for (let i = 0; i < questionElements.length; i++) {
      const questionElement = questionElements[i];
      const questionId = questionElement.dataset.questionId;
      const type = questionElement.querySelector('.type-option.active').dataset.type;
      const questionText = questionElement.querySelector('textarea[name="question"]').value;
      const points = parseInt(questionElement.querySelector('input[name="points"]').value) || 1;
      
      if (!questionText) {
        Utils.showMessage(`第${i + 1}题的题目内容不能为空`, 'error');
        return;
      }
      
      const question = {
        id: Utils.generateUUID(),
        type,
        question: questionText,
        points,
        required: true
      };
      
      if (type !== 'short-answer') {
        const optionInputs = questionElement.querySelectorAll('.option-item input[type="text"]');
        const correctInputs = questionElement.querySelectorAll(`input[name="correct-${questionId}"]:checked`);
        
        question.options = Array.from(optionInputs).map(input => input.value).filter(value => value.trim());
        
        if (question.options.length < 2) {
          Utils.showMessage(`第${i + 1}题至少需要两个选项`, 'error');
          return;
        }
        
        if (correctInputs.length === 0) {
          Utils.showMessage(`第${i + 1}题请选择正确答案`, 'error');
          return;
        }
        
        if (type === 'single-choice') {
          question.correctAnswer = parseInt(correctInputs[0].value);
        } else {
          question.correctAnswers = Array.from(correctInputs).map(input => parseInt(input.value));
        }
      }
      
      questions.push(question);
    }
    
    // Create assignment
    const assignmentData = {
      title,
      description: formData.get('description') || '',
      dueDate: formData.get('dueDate') || null,
      questions
    };
    
    try {
      const result = await API.post('/admin/assignments', assignmentData);
      Utils.showMessage('作业创建成功', 'success');
      Modal.hide('create-assignment-modal');
      
      // Show success with link
      setTimeout(() => {
        Utils.showMessage(`学生链接: ${result.studentUrl}`, 'info', 5000);
      }, 1000);
      
      this.loadAssignments();
      this.resetCreateForm();
    } catch (error) {
      console.error('创建作业失败:', error);
      Utils.showMessage(error.message || '创建作业失败', 'error');
    }
  }
  
  resetCreateForm() {
    document.getElementById('create-assignment-form').reset();
    document.getElementById('questions-container').innerHTML = '';
    this.questionCounter = 0;
  }
  
  async loadClasses() {
    try {
      const data = await API.get('/api/classes');
      this.classes = data.classes || [];
      this.renderClassesList();
    } catch (error) {
      console.error('加载班级列表失败:', error);
      Utils.showMessage('加载班级列表失败', 'error');
    }
  }
  
  renderClassesList() {
    const tbody = document.getElementById('classes-list');
    
    if (this.classes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center">
            <div class="empty-state">
              <i class="material-icons">class</i>
              <h3>暂无班级</h3>
              <p>点击"添加班级"按钮开始创建您的第一个班级</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = this.classes.map((className, index) => `
      <tr class="class-row">
        <td>
          <strong>${Utils.sanitizeHTML(className)}</strong>
        </td>
        <td>${Utils.formatDate(new Date())}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn edit" onclick="adminPanel.editClass('${className}')" title="编辑">
              <i class="material-icons">edit</i>
            </button>
            <button class="action-btn delete" onclick="adminPanel.deleteClass('${className}')" title="删除">
              <i class="material-icons">delete</i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  async addClass() {
    const form = document.getElementById('add-class-form');
    const formData = new FormData(form);
    const className = formData.get('className');
    
    if (!className || !className.trim()) {
      Utils.showMessage('请输入班级名称', 'error');
      return;
    }
    
    try {
      await API.post('/api/classes', { className: className.trim() });
      Utils.showMessage('班级添加成功', 'success');
      Modal.hide('add-class-modal');
      form.reset();
      this.loadClasses();
    } catch (error) {
      console.error('添加班级失败:', error);
      Utils.showMessage(error.message || '添加班级失败', 'error');
    }
  }
  
  editClass(className) {
    const form = document.getElementById('edit-class-form');
    form.querySelector('input[name="className"]').value = className;
    form.querySelector('input[name="originalClassName"]').value = className;
    Modal.show('edit-class-modal');
  }
  
  async updateClass() {
    const form = document.getElementById('edit-class-form');
    const formData = new FormData(form);
    const newClassName = formData.get('className');
    const originalClassName = formData.get('originalClassName');
    
    if (!newClassName || !newClassName.trim()) {
      Utils.showMessage('请输入班级名称', 'error');
      return;
    }
    
    if (newClassName.trim() === originalClassName) {
      Modal.hide('edit-class-modal');
      return;
    }
    
    try {
      // Delete old class and add new one
      await API.delete(`/api/classes/${encodeURIComponent(originalClassName)}`);
      await API.post('/api/classes', { className: newClassName.trim() });
      
      Utils.showMessage('班级修改成功', 'success');
      Modal.hide('edit-class-modal');
      this.loadClasses();
    } catch (error) {
      console.error('修改班级失败:', error);
      Utils.showMessage(error.message || '修改班级失败', 'error');
    }
  }
  
  async deleteClass(className) {
    if (!confirm(`确定要删除班级"${className}"吗？此操作不可撤销。`)) {
      return;
    }
    
    try {
      await API.delete(`/api/classes/${encodeURIComponent(className)}`);
      Utils.showMessage('班级删除成功', 'success');
      this.loadClasses();
    } catch (error) {
      console.error('删除班级失败:', error);
      Utils.showMessage(error.message || '删除班级失败', 'error');
    }
  }
  
  loadStatistics() {
    // TODO: Implement statistics loading
    document.getElementById('system-stats').innerHTML = '<p>统计功能开发中...</p>';
    document.getElementById('recent-activities').innerHTML = '<p>活动记录功能开发中...</p>';
  }
}

// Global functions
function showCreateAssignmentModal() {
  Modal.show('create-assignment-modal');
}

function addQuestion() {
  adminPanel.addQuestion();
}

function createAssignment() {
  adminPanel.createAssignment();
}

// Class management functions
function showAddClassModal() {
  Modal.show('add-class-modal');
}

function addClass() {
  adminPanel.addClass();
}

function updateClass() {
  adminPanel.updateClass();
}

// Initialize admin panel
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
  adminPanel = new AdminPanel();
});