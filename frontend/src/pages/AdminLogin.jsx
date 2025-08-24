import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/admin-dashboard.css';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '登录失败');
      }
      if (data && data.sessionId) {
        localStorage.setItem('adminSession', data.sessionId);
        navigate('/admin', { replace: true });
      } else {
        throw new Error('服务返回异常');
      }
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>管理员登录</h1>
      </header>
      <div className="admin-main" style={{ maxWidth: 400, margin: '0 auto' }}>
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="admin-password">管理密码</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入管理密码"
            required
          />
          {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 12 }}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}