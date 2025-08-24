import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/admin-dashboard.css';

// simple api helper with session header
function useApi() {
  const base = '';
  async function get(url) {
    const sessionId = localStorage.getItem('adminSession') || '';
    const res = await fetch(`${base}${url}`, {
      headers: { 'x-session-id': sessionId }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.error || '请求失败');
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
  return { get };
}

export default function AdminDashboard() {
  const api = useApi();
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const sid = localStorage.getItem('adminSession');
    if (!sid) {
      setLoading(false);
      navigate('/admin/login', { replace: true });
      return () => { mounted = false; };
    }
    (async () => {
      try {
        const data = await api.get('/admin/assignments');
        if (!mounted) return;
        setAssignments(data.assignments || []);
      } catch (e) {
        if (e && e.status === 401) {
          localStorage.removeItem('adminSession');
          navigate('/admin/login', { replace: true });
          return;
        }
        setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openAssignment(a) {
    setSelected(null);
    try {
      const detail = await api.get(`/admin/assignments/${a.id}`);
      setSelected(detail);
    } catch (e) {
      if (e && e.status === 401) {
        localStorage.removeItem('adminSession');
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(e.message);
    }
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>作业管理</h1>
      </header>
      <div className="admin-main">
        <div className="assignment-list">
          {loading && <p>加载中...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && assignments.map(a => (
            <div key={a.id} className="assignment-item" onClick={() => openAssignment(a)}>
              <h3>{a.title}</h3>
              <p className="assignment-meta">
                {a.dueDate ? new Date(a.dueDate).toLocaleString() : '无截止时间'}
              </p>
            </div>
          ))}
        </div>
        {selected && (
          <div className="assignment-detail">
            <div className="detail-header">
              <button className="btn-close" onClick={() => setSelected(null)}>&times;</button>
              <h2>{selected.title}</h2>
            </div>
            {selected.description && (
              <p className="detail-description">{selected.description}</p>
            )}
            <ul className="detail-list">
              <li><strong>截止时间：</strong>{selected.dueDate ? new Date(selected.dueDate).toLocaleString() : '无'}</li>
              <li><strong>题目数：</strong>{selected.questions ? selected.questions.length : 0}</li>
              <li><strong>状态：</strong>{selected.status || '未知'}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
