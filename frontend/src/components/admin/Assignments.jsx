import React, { useEffect, useState } from 'react';
import AssignmentForm from './AssignmentForm';
import AssignmentDetails from './AssignmentDetails';

export default function Assignments({ api }) {
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [a, s] = await Promise.all([
        api.get('/admin/assignments'),
        api.get('/api/stats')
      ]);
      setAssignments(a.assignments || []);
      setStats(s);
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

  const filtered = assignments.filter((a) =>
    a.title.toLowerCase().includes(filter.toLowerCase())
  );

  async function openAssignment(id) {
    try {
      const [detail, stat] = await Promise.all([
        api.get(`/admin/assignments/${id}`),
        api.get(`/admin/assignments/${id}/statistics`).catch(() => null)
      ]);
      setSelected({ ...detail, stats: stat });
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteAssignment(id) {
    if (!window.confirm('确定要删除该作业吗？')) return;
    try {
      await api.del(`/admin/assignments/${id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function copyLink(id) {
    const url = `${window.location.origin}/student/assignment/${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    alert('链接已复制');
  }

  return (
    <div id="assignments-tab" className="tab-content active">
      <div className="page-header">
        <h2>作业管理</h2>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <i className="material-icons">add</i>
            创建作业
          </button>
        )}
      </div>

      {showForm && (
        <AssignmentForm
          api={api}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalAssignments || 0}</div>
            <div className="stat-label">总作业数</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.activeAssignments || 0}</div>
            <div className="stat-label">活跃作业</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalSubmissions || 0}</div>
            <div className="stat-label">总提交数</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {stats.totalAssignments
                ? Math.round((stats.totalSubmissions / stats.totalAssignments) * 100)
                : 0}%
            </div>
            <div className="stat-label">平均完成率</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>作业列表</h3>
          <div className="search-box">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜索作业..."
              className="form-control"
            />
          </div>
        </div>
        <div className="table-container">
          {loading && <p style={{ padding: '1rem' }}>加载中...</p>}
          {error && <p className="text-error" style={{ padding: '1rem' }}>{error}</p>}
          {!loading && !error && (
            <table className="table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>创建时间</th>
                  <th>截止时间</th>
                  <th>状态</th>
                  <th>提交数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="assignment-row"
                    onClick={() => openAssignment(a.id)}
                  >
                    <td>{a.title}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td>
                      {a.dueDate
                        ? new Date(a.dueDate).toLocaleString()
                        : '无限制'}
                    </td>
                    <td>{a.status || '未知'}</td>
                    <td>{a.submissionCount || 0}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignment(a.id);
                          }}
                        >
                          <i className="material-icons">visibility</i>
                        </button>
                        <button
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyLink(a.id);
                          }}
                        >
                          <i className="material-icons">link</i>
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAssignment(a.id);
                          }}
                        >
                          <i className="material-icons">delete</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center">
                      暂无作业
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <AssignmentDetails
          assignment={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => {
            deleteAssignment(id);
            setSelected(null);
          }}
          copyLink={copyLink}
        />
      )}
    </div>
  );
}

