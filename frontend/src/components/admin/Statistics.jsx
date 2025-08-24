import React, { useEffect, useState } from 'react';

export default function Statistics({ api }) {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await api.get('/api/stats');
        const a = await api.get('/admin/assignments');
        const recent = [];
        if (a.assignments) {
          for (const asg of a.assignments) {
            try {
              const detail = await api.get(
                `/admin/assignments/${asg.id}/statistics`
              );
              detail.submissions.forEach((sub) =>
                recent.push({ ...sub, assignmentTitle: asg.title })
              );
            } catch {
              // ignore per-assignment errors
            }
          }
        }
        recent.sort(
          (x, y) => new Date(y.submittedAt) - new Date(x.submittedAt)
        );
        if (mounted) {
          setStats(s);
          setActivities(recent.slice(0, 10));
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [api]);

  return (
    <div id="statistics-tab" className="tab-content active">
      <div className="page-header">
        <h2>统计分析</h2>
      </div>
      {loading && <p>加载中...</p>}
      {error && <p className="text-error">{error}</p>}
      {!loading && !error && stats && (
        <div className="stats-dashboard">
          <div className="card">
            <div className="card-content">
              <h3>系统概览</h3>
              <ul className="detail-list">
                <li>总作业数：{stats.totalAssignments || 0}</li>
                <li>活跃作业：{stats.activeAssignments || 0}</li>
                <li>总提交数：{stats.totalSubmissions || 0}</li>
                <li>最后更新：{stats.lastUpdated}</li>
              </ul>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <h3>最近活动</h3>
              {activities.length === 0 && <p>暂无活动</p>}
              {activities.length > 0 && (
                <ul className="activity-list">
                  {activities.map((a) => (
                    <li key={a.id} className="activity-item">
                      <span className="activity-title">{a.assignmentTitle}</span>
                      <span>
                        {a.studentInfo.name}（{a.studentInfo.className}）
                      </span>
                      <span>{a.percentage}%</span>
                      <span>{new Date(a.submittedAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

