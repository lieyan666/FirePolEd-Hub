// Common JavaScript utilities for FirePolEd-Hub

// Global configuration
const CONFIG = {
  API_BASE: '/api',
  ADMIN_BASE: '/admin',
  STUDENT_BASE: '/student'
};

// Utility functions
const Utils = {
  // Show message toast
  showMessage(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = this.getMessageIcon(type);
    toast.innerHTML = `
      <i class="material-icons">${icon}</i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide and remove toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, duration);
  },
  
  getMessageIcon(type) {
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return icons[type] || 'info';
  },
  
  // Format date
  formatDate(dateString, format = 'YYYY-MM-DD HH:mm') {
    if (!dateString) return '-';
    const date = new Date(dateString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  },
  
  // Format relative time
  formatRelativeTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  },
  
  // Generate UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  
  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Validate form data
  validateForm(formData, rules) {
    const errors = {};
    
    for (const field in rules) {
      const value = formData[field];
      const rule = rules[field];
      
      if (rule.required && (!value || value.trim() === '')) {
        errors[field] = rule.message || `${field}不能为空`;
        continue;
      }
      
      if (value && rule.minLength && value.length < rule.minLength) {
        errors[field] = rule.message || `${field}长度不能少于${rule.minLength}个字符`;
        continue;
      }
      
      if (value && rule.maxLength && value.length > rule.maxLength) {
        errors[field] = rule.message || `${field}长度不能超过${rule.maxLength}个字符`;
        continue;
      }
      
      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors[field] = rule.message || `${field}格式不正确`;
        continue;
      }
    }
    
    return errors;
  },
  
  // Copy to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showMessage('已复制到剪贴板', 'success');
      return true;
    } catch (err) {
      console.error('复制失败:', err);
      this.showMessage('复制失败', 'error');
      return false;
    }
  },
  
  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // Sanitize HTML
  sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }
};

// API helper
const API = {
  async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const config = { ...defaultOptions, ...options };
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  },
  
  get(url) {
    return this.request(url, { method: 'GET' });
  },
  
  post(url, data) {
    return this.request(url, { method: 'POST', body: data });
  },
  
  put(url, data) {
    return this.request(url, { method: 'PUT', body: data });
  },
  
  delete(url) {
    return this.request(url, { method: 'DELETE' });
  }
};

// Modal helper
const Modal = {
  show(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  },
  
  hide(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  },
  
  create(title, content, actions = []) {
    const modalId = 'modal-' + Utils.generateUUID();
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    
    const actionsHTML = actions.map(action => 
      `<button class="btn ${action.class || 'btn-primary'}" onclick="${action.onclick}">${action.text}</button>`
    ).join('');
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="Modal.hide('${modalId}')">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="modal-body">${content}</div>
        ${actions.length > 0 ? `<div class="modal-footer">${actionsHTML}</div>` : ''}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hide(modalId);
      }
    });
    
    // Close on escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide(modalId);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    this.show(modalId);
    return modalId;
  },
  
  confirm(title, message, onConfirm, onCancel) {
    return this.create(title, `<p>${message}</p>`, [
      {
        text: '取消',
        class: 'btn-secondary',
        onclick: `Modal.hide('${this.currentModalId}'); ${onCancel || ''}`
      },
      {
        text: '确认',
        class: 'btn-primary',
        onclick: `Modal.hide('${this.currentModalId}'); ${onConfirm || ''}`
      }
    ]);
  }
};

// Loading helper
const Loading = {
  currentLoading: null,
  
  show(message = '加载中...', target = document.body) {
    // If message is a DOM element, treat it as target for backward compatibility
    if (typeof message === 'object' && message.nodeType) {
      target = message;
      message = '加载中...';
    }
    
    // Hide existing loading if any
    this.hide();
    
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .loading-content {
        text-align: center;
      }
      .loading-content p {
        margin-top: 16px;
        color: var(--text-secondary);
      }
    `;
    
    if (!document.querySelector('style[data-loading]')) {
      style.setAttribute('data-loading', 'true');
      document.head.appendChild(style);
    }
    
    target.appendChild(loading);
    this.currentLoading = loading;
    return loading;
  },
  
  hide(loadingElement) {
    // If no specific element provided, hide current loading
    if (!loadingElement) {
      loadingElement = this.currentLoading;
    }
    
    if (loadingElement && loadingElement.parentNode) {
      loadingElement.parentNode.removeChild(loadingElement);
      if (loadingElement === this.currentLoading) {
        this.currentLoading = null;
      }
    }
  }
};

// Auto-save functionality
const AutoSave = {
  timers: new Map(),
  
  setup(formId, saveFunction, interval = 30000) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        this.scheduleAutoSave(formId, saveFunction, interval);
      });
    });
  },
  
  scheduleAutoSave(formId, saveFunction, interval) {
    // Clear existing timer
    if (this.timers.has(formId)) {
      clearTimeout(this.timers.get(formId));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      saveFunction();
      this.timers.delete(formId);
    }, interval);
    
    this.timers.set(formId, timer);
  },
  
  cancel(formId) {
    if (this.timers.has(formId)) {
      clearTimeout(this.timers.get(formId));
      this.timers.delete(formId);
    }
  }
};

// Global error handler
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  Utils.showMessage('发生了一个错误，请刷新页面重试', 'error');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
  Utils.showMessage('操作失败，请重试', 'error');
});

// Export to global scope
window.Utils = Utils;
window.API = API;
window.Modal = Modal;
window.Loading = Loading;
window.AutoSave = AutoSave;
window.showMessage = Utils.showMessage.bind(Utils);

// Initialize common functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add ripple effect to buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn')) {
      const button = e.target;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;
      
      if (!document.querySelector('style[data-ripple]')) {
        const style = document.createElement('style');
        style.setAttribute('data-ripple', 'true');
        style.textContent = `
          @keyframes ripple {
            to {
              transform: scale(4);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);
      
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);
    }
  });
});