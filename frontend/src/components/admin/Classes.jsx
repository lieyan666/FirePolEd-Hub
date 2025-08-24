import React, { useEffect, useState } from 'react';

export default function Classes({ api }) {
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.get('/api/classes');
      setClasses(data.classes || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!newClass.trim()) return;
    try {
      await api.post('/api/classes', { className: newClass.trim() });
      setNewClass('');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(name) {
    try {
      await api.del(`/api/classes/${encodeURIComponent(name)}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div id="classes-tab" className="tab-content active">
      <div className="page-header">
        <h2>班级管理</h2>
        <form onSubmit={add} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newClass}
            onChange={(e) => setNewClass(e.target.value)}
            placeholder="班级名称"
            className="form-control"
          />
          <button className="btn btn-primary" type="submit">
            <i className="material-icons">add</i>
            添加
          </button>
        </form>
      </div>
      <div className="card">
        <div className="card-header">
          <h3>班级列表</h3>
        </div>
        <div className="table-container">
          {loading && <p style={{ padding: '1rem' }}>加载中...</p>}
          {error && <p className="text-error" style={{ padding: '1rem' }}>{error}</p>}
          {!loading && !error && (
            <table className="table">
              <thead>
                <tr>
                  <th>班级名称</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c}>
                    <td>{c}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => remove(c)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {classes.length === 0 && (
                  <tr>
                    <td colSpan="2" className="text-center">
                      暂无班级
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

