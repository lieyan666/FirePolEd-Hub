import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/admin-dashboard.css';

import NavBar from '../components/admin/NavBar';
import Assignments from '../components/admin/Assignments';
import Classes from '../components/admin/Classes';
import Statistics from '../components/admin/Statistics';
import Settings from '../components/admin/Settings';

// simple api helper with session header
function useApi() {
  const base = (typeof window !== 'undefined' && window.location.port === '5173')
    ? 'http://localhost:3000'
    : '';
  function buildHeaders() {
    const sessionId = localStorage.getItem('adminSession') || '';
    return {
      'x-session-id': sessionId,
      'Content-Type': 'application/json'
    };
  }

  async function request(url, options = {}) {
    const res = await fetch(`${base}${url}`, {
      ...options,
      headers: { ...buildHeaders(), ...(options.headers || {}) }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.error || '请求失败');
      err.status = res.status;
      if (res.status === 401) {
        try { localStorage.removeItem('adminSession'); } catch {}
        window.location.replace('/admin/login');
      }
      throw err;
    }
    return res.json();
  }

  return {
    get: (url) => request(url),
    post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
    del: (url) => request(url, { method: 'DELETE' })
  };
}

export default function AdminDashboard() {
  const api = useApi();
  const [tab, setTab] = useState('assignments');
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // Auth guard: verify session on mount
  useEffect(() => {
    const sid = localStorage.getItem('adminSession');
    if (!sid) {
      navigate('/admin/login', { replace: true });
      setAuthChecked(true);
      setAuthorized(false);
      return;
    }
    (async () => {
      try {
        const base = (typeof window !== 'undefined' && window.location.port === '5173')
          ? 'http://localhost:3000'
          : '';
        const res = await fetch(`${base}/admin/api/verify`, { headers: { 'x-session-id': sid } });
        if (!res.ok) {
          throw new Error('unauthorized');
        }
        setAuthorized(true);
      } catch {
        try { localStorage.removeItem('adminSession'); } catch {}
        navigate('/admin/login', { replace: true });
        setAuthorized(false);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [navigate]);

  async function logout() {
    const sid = localStorage.getItem('adminSession');
    if (sid) {
      try {
        await api.post('/admin/api/logout', {});
      } catch {
        // ignore logout errors
      }
    }
    localStorage.removeItem('adminSession');
    navigate('/admin/login', { replace: true });
  }

  if (!authChecked) {
    return (
      <div className="admin-layout">
        <main className="admin-main" style={{ padding: '24px' }}>正在验证权限...</main>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="admin-layout">
      <NavBar tab={tab} onTabChange={setTab} onLogout={logout} />
      <main className="admin-main">
        {tab === 'assignments' && <Assignments api={api} />}
        {tab === 'classes' && <Classes api={api} />}
        {tab === 'statistics' && <Statistics api={api} />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

