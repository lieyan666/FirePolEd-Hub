import React from 'react';

export default function NavBar({ tab, onTabChange, onLogout }) {
  function link(name, label) {
    const cls = `nav-link${tab === name ? ' active' : ''}`;
    return (
      <a
        href="#"
        className={cls}
        onClick={(e) => {
          e.preventDefault();
          onTabChange(name);
        }}
        data-tab={name}
      >
        {label}
      </a>
    );
  }

  return (
    <nav className="nav">
      <div className="nav-content">
        <a href="/" className="nav-brand">
          <i className="material-icons">school</i>
          <span className="nav-brand-text">FirePolEd-Hub 管理后台</span>
        </a>
        <div className="nav-menu">
          {link('assignments', '作业管理')}
          {link('classes', '班级管理')}
          {link('statistics', '统计分析')}
          {link('settings', '系统设置')}
          <button className="btn btn-secondary" onClick={onLogout} style={{ marginLeft: '1rem' }}>
            <i className="material-icons">logout</i>
            登出
          </button>
        </div>
      </div>
    </nav>
  );
}

