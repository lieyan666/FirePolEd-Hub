import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '../utils/message';
import ActionCard from '../components/ActionCard';
import AssignmentInput from '../components/AssignmentInput';

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
            <ActionCard
              icon="admin_panel_settings"
              title="管理后台"
              description="创建和管理作业，查看学生提交情况和统计数据"
              onClick={() => { window.location.href = '/admin'; }}
            >
              <button className="btn btn-primary">进入管理后台</button>
            </ActionCard>

            <ActionCard
              icon="assignment"
              title="学生答题"
              description="输入作业链接或ID开始答题"
            >
              <AssignmentInput
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                onSubmit={handleStart}
              />
            </ActionCard>
          </div>
        </div>
      </main>
    </div>
  );
}
