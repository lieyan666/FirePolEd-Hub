import React, { useMemo, useState } from 'react';

export default function AssignmentDetails({ assignment, onClose, onDelete, copyLink }) {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const submissions = useMemo(
    () => assignment.stats?.submissions || [],
    [assignment.stats]
  );
  const classes = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.studentInfo.className))),
    [submissions]
  );

  const filteredSubmissions = submissions
    .filter((s) =>
      !search ||
      s.studentInfo.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentInfo.className.toLowerCase().includes(search.toLowerCase())
    )
    .filter((s) => !classFilter || s.studentInfo.className === classFilter)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const recentSubmissions = filteredSubmissions.slice(0, 10);

  const statsByClass = assignment.stats?.detailedStatistics?.submissionsByClass || {};

  return (
    <div className="card assignment-details">
      <div className="card-header">
        <h3>{assignment.title}</h3>
        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={() => copyLink(assignment.id)}>
            复制链接
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onDelete(assignment.id)}
          >
            删除
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>

      <div className="detail-tabs">
        <button
          className={tab === 'overview' ? 'active' : ''}
          onClick={() => setTab('overview')}
        >
          概览
        </button>
        <button
          className={tab === 'submissions' ? 'active' : ''}
          onClick={() => setTab('submissions')}
        >
          学生答题
        </button>
        <button
          className={tab === 'analytics' ? 'active' : ''}
          onClick={() => setTab('analytics')}
        >
          题目分析
        </button>
      </div>

      {tab === 'overview' && (
        <ul className="detail-list">
          {assignment.description && <li>{assignment.description}</li>}
          <li>
            <strong>截止时间：</strong>
            {assignment.dueDate
              ? new Date(assignment.dueDate).toLocaleString()
              : '无'}
          </li>
          <li>
            <strong>题目数：</strong>
            {assignment.questions ? assignment.questions.length : 0}
          </li>
          <li>
            <strong>状态：</strong>
            {assignment.status || '未知'}
          </li>
          <li>
            <strong>总提交数：</strong>
            {assignment.stats?.statistics?.totalSubmissions || 0}
          </li>
          {recentSubmissions.length > 0 && (
            <li>
              <strong>最近提交：</strong>
              <ul className="submission-list">
                {recentSubmissions.slice(0, 5).map((sub) => (
                  <li key={sub.id} className="submission-item">
                    <span>{sub.studentInfo.name}</span>
                    <span>{sub.studentInfo.className}</span>
                    <span>{sub.percentage}%</span>
                    <span>
                      {new Date(sub.submittedAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      )}

      {tab === 'submissions' && (
        <div className="detail-content">
          <div className="submission-filters">
            <input
              type="text"
              className="form-control"
              placeholder="搜索学生姓名或班级"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-control"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">所有班级</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>学生姓名</th>
                  <th>班级</th>
                  <th>得分</th>
                  <th>提交时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.studentInfo.name}</td>
                    <td>{sub.studentInfo.className}</td>
                    <td>{sub.percentage}%</td>
                    <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredSubmissions.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center">
                      暂无提交
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="detail-content">
          <h4>班级提交统计</h4>
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>班级</th>
                  <th>提交数</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(statsByClass).map(([cls, count]) => (
                  <tr key={cls}>
                    <td>{cls}</td>
                    <td>{count}</td>
                  </tr>
                ))}
                {Object.keys(statsByClass).length === 0 && (
                  <tr>
                    <td colSpan="2" className="text-center">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

