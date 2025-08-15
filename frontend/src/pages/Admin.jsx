import React, { useEffect, useState } from 'react';
import ActionCard from '../components/ActionCard';
import '/css/admin.css';

export default function Admin() {
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/admin/assignments')
      .then(res => res.json())
      .then(data => setAssignments(data.assignments || []))
      .catch(() => setError('加载作业失败'));
  }, []);

  const viewDetails = (id) => {
    fetch(`/admin/assignments/${id}`)
      .then(res => res.json())
      .then(setSelected)
      .catch(() => setError('加载详情失败'));
  };

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <h2>作业管理</h2>
        {error && <p className="text-error">{error}</p>}

        <div className="stats-dashboard">
          {assignments.map(a => (
            <ActionCard
              key={a.id}
              title={a.title}
              description={a.description}
              onClick={() => viewDetails(a.id)}
            >
              <div className="info-label">提交数: {a.submissionCount || 0}</div>
            </ActionCard>
          ))}
        </div>

        {selected && (
          <section className="assignment-info" style={{ marginTop: '24px' }}>
            <div className="info-card">
              <div className="info-label">标题</div>
              <div className="info-value">{selected.title}</div>
            </div>
            <div className="info-card">
              <div className="info-label">创建时间</div>
              <div className="info-value">{new Date(selected.createdAt).toLocaleString()}</div>
            </div>
            <div className="info-card">
              <div className="info-label">截止时间</div>
              <div className="info-value">{selected.dueDate ? new Date(selected.dueDate).toLocaleString() : '无限制'}</div>
            </div>
            <div className="info-card">
              <div className="info-label">状态</div>
              <div className="info-value">{selected.status}</div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

