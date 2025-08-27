import React from 'react';

export default function NavBar({ tab, onTabChange, onLogout }) {
  function link(name, label, icon) {
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
        <i className="material-icons">{icon}</i>
        <span className="nav-link-label">{label}</span>
      </a>
    );
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="nav desktop-nav">
        <div className="nav-content">
          <a href="/" className="nav-brand">
            <i className="material-icons">school</i>
            <span className="nav-brand-text">FirePolEd-Hub</span>
            <span className="nav-brand-sub text-sm text-neutral-500 font-normal">管理后台</span>
          </a>
          <div className="nav-menu">
            {link('assignments', '作业管理', 'assignment')}
            {link('classes', '班级管理', 'groups')}
            {link('statistics', '统计分析', 'analytics')}
            {link('settings', '系统设置', 'settings')}
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>
              <i className="material-icons">logout</i>
              登出
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-nav-container">
          {link('assignments', '作业', 'assignment')}
          {link('classes', '班级', 'groups')}
          {link('statistics', '统计', 'analytics')}
          {link('settings', '设置', 'settings')}
          <button className="mobile-nav-logout" onClick={onLogout} title="登出">
            <i className="material-icons">logout</i>
            <span className="nav-link-label">登出</span>
          </button>
        </div>
      </nav>
    </>
  );
}

