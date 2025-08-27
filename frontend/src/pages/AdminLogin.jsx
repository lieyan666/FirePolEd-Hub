/*
 * @Author: Lieyan
 * @Date: 2025-08-25 00:41:39
 * @LastEditors: Lieyan
 * @LastEditTime: 2025-08-25 02:31:00
 * @FilePath: /FirePolEd-Hub/frontend/src/pages/AdminLogin.jsx
 * @Description: 
 * @Contact: QQ: 2102177341  Website: lieyan.space  Github: @lieyan666
 * @Copyright: Copyright (c) 2025 by lieyanDevTeam, All Rights Reserved. 
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/admin-dashboard.css';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const base = (typeof window !== 'undefined' && window.location.port === '5173')
    ? 'http://localhost:3000'
    : '';

  // If already logged in, verify and redirect
  useEffect(() => {
    const sid = localStorage.getItem('adminSession');
    if (!sid) return;
    (async () => {
      try {
        const res = await fetch(`${base}/admin/api/verify`, { headers: { 'x-session-id': sid } });
        if (res.ok) {
          navigate('/admin', { replace: true });
        }
      } catch {}
    })();
  }, [navigate, base]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${base}/admin/api/login`, {
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <i className="material-icons text-4xl text-primary-600">admin_panel_settings</i>
            <h1 className="text-3xl font-bold text-neutral-900">管理后台</h1>
          </div>
          <p className="text-neutral-600">请输入管理密码以继续</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="admin-password" className="form-label">
              <i className="material-icons text-sm mr-2">lock</i>
              管理密码
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理密码"
              className="form-control"
              required
              autoFocus
            />
          </div>
          
          {error && (
            <div className="error mb-4">
              <i className="material-icons text-sm mr-2">error</i>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="btn btn-primary w-full btn-lg" 
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="material-icons animate-spin">refresh</i>
                登录中...
              </>
            ) : (
              <>
                <i className="material-icons">login</i>
                登录
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-neutral-500 hover:text-primary-600 transition-colors">
            <i className="material-icons text-sm mr-1">arrow_back</i>
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}