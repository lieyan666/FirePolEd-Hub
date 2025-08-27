import React, { useEffect, useState } from 'react';
import AssignmentForm from './AssignmentForm';
import AssignmentDetails from './AssignmentDetails';
import Modal from './Modal';

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
        api.get('/admin/api/assignments'),
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
        api.get(`/admin/api/assignments/${id}`),
        api.get(`/admin/api/assignments/${id}/statistics`).catch(() => null)
      ]);
      setSelected({ ...detail, stats: stat });
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteAssignment(id) {
    if (!window.confirm('确定要删除该作业吗？')) return;
    try {
      await api.del(`/admin/api/assignments/${id}`);
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

  function getStatusBadgeClass(status) {
    switch (status) {
      case '活跃':
      case 'active':
        return 'badge-success';
      case '已结束':
      case 'ended':
        return 'badge-neutral';
      case '草稿':
      case 'draft':
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  }

  return (
    <div id="assignments-tab" className="tab-content active">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">作业管理</h2>
          <p className="text-neutral-600">创建、管理和监控您的作业</p>
        </div>
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
        <div className="stat-bar">
          <div className="stat-chip">
            <span className="chip-value">{stats.totalAssignments || 0}</span>
            <span className="chip-label">总作业数</span>
          </div>
          <div className="stat-chip">
            <span className="chip-value">{stats.activeAssignments || 0}</span>
            <span className="chip-label">活跃作业</span>
          </div>
          <div className="stat-chip">
            <span className="chip-value">{stats.totalSubmissions || 0}</span>
            <span className="chip-label">总提交数</span>
          </div>
          <div className="stat-chip">
            <span className="chip-value">{stats.totalAssignments
              ? Math.round((stats.totalSubmissions / stats.totalAssignments) * 100)
              : 0}%</span>
            <span className="chip-label">平均完成率</span>
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
        <div className="table-container" style={{ overflowX: 'auto' }}>
          {loading && (
            <div className="loading-state">
              <i className="material-icons animate-spin mr-2">refresh</i>
              加载中...
            </div>
          )}
          {error && (
            <div className="error-state">
              <i className="material-icons mr-2">error</i>
              {error}
            </div>
          )}
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
                    <td className="text-neutral-600">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td>
                      {a.dueDate ? (
                        new Date(a.dueDate).toLocaleString()
                      ) : (
                        <span className="badge badge-neutral">无限制</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(a.status)}`}>
                        {a.status || '未知'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center">
                        <span className="font-medium text-primary-600">
                          {a.submissionCount || 0}
                        </span>
                        <span className="text-neutral-500 ml-1">份</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignment(a.id);
                          }}
                          title="查看详情"
                        >
                          <i className="material-icons">visibility</i>
                        </button>
                        <button
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyLink(a.id);
                          }}
                          title="复制链接"
                        >
                          <i className="material-icons">link</i>
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAssignment(a.id);
                          }}
                          title="删除作业"
                        >
                          <i className="material-icons">delete</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        <i className="material-icons">assignment</i>
                        <p className="font-medium mb-2">暂无作业</p>
                        <p className="text-sm">点击上方"创建作业"按钮开始创建您的第一个作业</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {!loading && !error && (
          <div className="assignments-cards">
            {filtered.map((a) => (
              <div key={a.id} className="assignment-card" onClick={() => openAssignment(a.id)}>
                <div className="ac-header">
                  <div className="ac-title">{a.title}</div>
                  <span className={`badge ${getStatusBadgeClass(a.status)}`}>{a.status || '未知'}</span>
                </div>
                <div className="ac-meta">
                  <div>
                    <div className="text-neutral-600 text-xs">创建时间</div>
                    <div>{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-neutral-600 text-xs">截止时间</div>
                    <div>{a.dueDate ? new Date(a.dueDate).toLocaleString() : '无限制'}</div>
                  </div>
                  <div>
                    <div className="text-neutral-600 text-xs">提交数</div>
                    <div className="font-medium text-primary-600">{a.submissionCount || 0} 份</div>
                  </div>
                </div>
                <div className="ac-actions">
                  <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); openAssignment(a.id); }}>查看</button>
                  <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); copyLink(a.id); }}>复制链接</button>
                  <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); deleteAssignment(a.id); }}>删除</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="empty-state">
                <i className="material-icons">assignment</i>
                <p className="font-medium mb-2">暂无作业</p>
                <p className="text-sm">点击上方"创建作业"按钮开始创建您的第一个作业</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <AssignmentDetails
            assignment={selected}
            onClose={() => setSelected(null)}
            onDelete={(id) => {
              deleteAssignment(id);
              setSelected(null);
            }}
            copyLink={copyLink}
          />
        </Modal>
      )}
    </div>
  );
}

