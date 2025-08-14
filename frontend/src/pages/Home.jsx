import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '../utils/message';

export default function Home() {
  const [assignmentId, setAssignmentId] = useState('');
  const navigate = useNavigate();

  const handleStart = () => {
    const value = assignmentId.trim();
    if (!value) {
      showMessage('请输入作业ID或链接', 'error');
      return;
    }
    let id = value;
    if (value.includes('/student/assignment/')) {
      id = value.split('/student/assignment/')[1].split(/[?#]/)[0];
    } else if (value.includes('/student/')) {
      id = value.split('/student/')[1].split(/[?#]/)[0];
    }
    if (id) {
      navigate(`/student/assignment/${id}`);
    } else {
      showMessage('无效的作业ID或链接', 'error');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleStart();
    }
  };

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <i className="material-icons">school</i>
            <h1>FirePolEd-Hub</h1>
          </div>
          <p className="subtitle">智能作业收交平台</p>
        </div>
      </header>

      <main className="main-content">
        <div className="action-section">
          <div className="action-cards">
            <div className="card action-card" onClick={() => { window.location.href = '/admin'; }}>
              <div className="card-content">
                <i className="material-icons">admin_panel_settings</i>
                <h3>管理后台</h3>
                <p>创建和管理作业，查看学生提交情况和统计数据</p>
                <button className="btn btn-primary">进入管理后台</button>
              </div>
            </div>

            <div className="card action-card">
              <div className="card-content">
                <i className="material-icons">assignment</i>
                <h3>学生答题</h3>
                <p>输入作业链接或ID开始答题</p>
                <div className="input-group">
                  <input
                    type="text"
                    value={assignmentId}
                    onChange={(e) => setAssignmentId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="请输入作业ID或完整链接"
                    className="form-control"
                  />
                  <button className="btn btn-primary" onClick={handleStart}>
                    开始答题
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
