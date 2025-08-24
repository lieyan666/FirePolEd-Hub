import React, { useState } from 'react';

export default function Settings() {
  const [name, setName] = useState('FirePolEd-Hub');
  const [theme, setTheme] = useState('#018eee');
  const [interval, setInterval] = useState(30);

  function submit(e) {
    e.preventDefault();
    // In a real app this would save to server
    // Here we simply log for demonstration
    console.log('保存设置', { name, theme, interval });
  }

  return (
    <div id="settings-tab" className="tab-content active">
      <div className="page-header">
        <h2>系统设置</h2>
      </div>
      <div className="card">
        <div className="card-content">
          <h3>基本设置</h3>
          <form onSubmit={submit} id="settings-form">
            <div className="form-group">
              <label className="form-label">系统名称</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">主题色</label>
              <input
                type="color"
                className="form-control"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">自动保存间隔（秒）</label>
              <input
                type="number"
                className="form-control"
                value={interval}
                min="10"
                max="300"
                onChange={(e) => setInterval(Number(e.target.value))}
              />
            </div>
            <button type="submit" className="btn btn-primary">保存设置</button>
          </form>
        </div>
      </div>
    </div>
  );
}

