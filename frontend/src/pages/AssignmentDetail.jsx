import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/assignment-detail.css'

function useApi() {
  const base = '';
  async function get(url) {
    const res = await fetch(`${base}${url}`);
    if (!res.ok) throw new Error((await res.json())?.error || '请求失败');
    return res.json();
  }
  async function post(url, body) {
    const res = await fetch(`${base}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json())?.error || '请求失败');
    return res.json();
  }
  return { get, post };
}

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignment, setAssignment] = useState(null);

  const [classes, setClasses] = useState([]);
  const [studentInfo, setStudentInfo] = useState({ className: '', name: '', studentId: '' });
  const [step, setStep] = useState('info'); // 'info' | 'details'
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [a, cls] = await Promise.all([
          api.get(`/student/api/${id}`),
          api.get('/api/classes').then(d => d.classes || [])
        ]);
        if (!mounted) return;
        setAssignment(a);
        setClasses(cls);
        setError('');
      } catch (e) {
        console.error(e);
        setError(e.message || '加载失败');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const questionCount = assignment?.questions?.length || 0;
  const dueLabel = useMemo(() => {
    if (!assignment) return '';
    if (!assignment.dueDate) return '无截止时间';
    try {
      const d = new Date(assignment.dueDate);
      const now = new Date();
      const timeDiff = d.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      let timeStr = d.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      if (daysDiff < 0) {
        return `已截止 (${timeStr})`;
      } else if (daysDiff === 0) {
        return `今日截止 (${timeStr})`;
      } else if (daysDiff === 1) {
        return `明日截止 (${timeStr})`;
      } else {
        return `${daysDiff}天后截止 (${timeStr})`;
      }
    } catch {
      return `截止: ${assignment.dueDate}`;
    }
  }, [assignment]);

  const isOverdue = useMemo(() => {
    if (!assignment?.dueDate) return false;
    try {
      return new Date(assignment.dueDate) < new Date();
    } catch {
      return false;
    }
  }, [assignment]);

  async function handleInfoSubmit(e) {
    e.preventDefault();
    if (!studentInfo.className || !studentInfo.name || !studentInfo.studentId) return;
    
    setFormSubmitting(true);
    try {
      // 模拟验证学生信息的过程
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep('details');
    } catch {
      alert('信息验证失败，请重试');
    } finally {
      setFormSubmitting(false);
    }
  }

  function toggleQuestion(questionId) {
    setExpandedQuestion(prev => prev === questionId ? null : questionId);
  }

  if (loading) {
    return (
      <div className="container">
        <header className="header">
          <div className="header-content">
            <h1 className="header-title">
              <i className="material-icons">assignment</i>
              学生答题
            </h1>
          </div>
        </header>
        <main className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>正在加载作业...</p>
            <div className="loading-skeleton">
              <div className="skeleton-card">
                <div className="skeleton-line skeleton-title"></div>
                <div className="skeleton-line skeleton-meta"></div>
                <div className="skeleton-line skeleton-content"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <header className="header">
          <div className="header-content">
            <h1 className="header-title">
              <i className="material-icons">error_outline</i>
              加载失败
            </h1>
          </div>
        </header>
        <main className="main-content">
          <div className="error-state">
            <div className="error-content">
              <i className="material-icons">error_outline</i>
              <h2>加载失败</h2>
              <p>{error}</p>
              <div className="error-actions">
                <button className="btn btn-primary" onClick={() => location.reload()}>
                  <i className="material-icons">refresh</i>
                  重新加载
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/')}>
                  <i className="material-icons">home</i>
                  返回首页
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <button className="btn btn-icon" onClick={() => navigate('/')}>
            <i className="material-icons">arrow_back</i>
          </button>
          <h1 className="header-title">
            <i className="material-icons">assignment</i>
            {assignment?.title || '作业详情'}
          </h1>
        </div>
      </header>

      <main className="main-content" style={{ paddingBottom: step === 'details' ? '88px' : '20px' }}>
        {step === 'info' && (
          <div className="card info-card">
            <div className="card-content">
              <div className="info-header">
                <i className="material-icons">person_add</i>
                <div>
                  <h2>学生信息</h2>
                  <p className="text-secondary">请填写您的基本信息后开始答题</p>
                </div>
              </div>
              <form onSubmit={handleInfoSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    <i className="material-icons">class</i>
                    班级 *
                  </label>
                  <select
                    className="form-control"
                    required
                    value={studentInfo.className}
                    onChange={(e) => setStudentInfo(s => ({ ...s, className: e.target.value }))}
                  >
                    <option value="">请选择班级</option>
                    {classes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <i className="material-icons">person</i>
                    姓名 *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="请输入您的姓名"
                    required
                    value={studentInfo.name}
                    onChange={(e) => setStudentInfo(s => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <i className="material-icons">badge</i>
                    学号 *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="请输入学号（如: 2024001）"
                    required
                    value={studentInfo.studentId}
                    onChange={(e) => setStudentInfo(s => ({ ...s, studentId: e.target.value }))}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-large" 
                  style={{ width: '100%' }}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <div className="btn-spinner"></div>
                      验证中...
                    </>
                  ) : (
                    <>
                      <i className="material-icons">arrow_forward</i>
                      开始答题
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="assignment-content">
            <div className="assignment-header">
              <div className="assignment-info">
                <h1 className="assignment-title">{assignment.title}</h1>
                <div className="assignment-meta">
                  <div className={`meta-item ${isOverdue ? 'meta-overdue' : ''}`}>
                    <i className="material-icons">{isOverdue ? 'warning' : 'schedule'}</i>
                    <span>{dueLabel}</span>
                  </div>
                  <div className="meta-item">
                    <i className="material-icons">quiz</i>
                    <span>{questionCount} 题</span>
                  </div>
                  {assignment.totalPoints && (
                    <div className="meta-item">
                      <i className="material-icons">star</i>
                      <span>{assignment.totalPoints} 分</span>
                    </div>
                  )}
                </div>
                {assignment.description && (
                  <div className="assignment-description">
                    <i className="material-icons">description</i>
                    <div>{assignment.description}</div>
                  </div>
                )}
              </div>

              <div className="student-display">
                <div className="student-info-display">
                  <div className="student-avatar">
                    <i className="material-icons">person</i>
                  </div>
                  <div className="student-details">
                    <div className="student-name">{studentInfo.name}</div>
                    <div className="student-class">{studentInfo.className}</div>
                    <div className="student-id">学号: {studentInfo.studentId}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card questions-card">
              <div className="card-content">
                <h3 className="questions-title">
                  <i className="material-icons">list</i>
                  题目预览
                </h3>
                <div className="questions-list">
                  {assignment.questions.map((q, idx) => (
                    <div key={q.id} className={`question-item ${expandedQuestion === q.id ? 'expanded' : ''}`}>
                      <div className="question-header" onClick={() => toggleQuestion(q.id)}>
                        <div className="question-number">{idx + 1}</div>
                        <div className="question-summary">
                          <div className="question-text">{q.question}</div>
                          <div className="question-badges">
                            <span className={`question-type ${q.type}`}>
                              {q.type === 'single-choice' ? '单选' : 
                               q.type === 'multiple-choice' ? '多选' : '简答'}
                            </span>
                            {q.required && <span className="required-badge">必答</span>}
                            <span className="points-badge">{q.points || 1} 分</span>
                          </div>
                        </div>
                        <i className="material-icons expand-icon">
                          {expandedQuestion === q.id ? 'expand_less' : 'expand_more'}
                        </i>
                      </div>
                      
                      {expandedQuestion === q.id && (
                        <div className="question-details">
                          {q.options && q.options.length > 0 && (
                            <div className="question-options">
                              {q.options.map((option, optIdx) => (
                                <div key={optIdx} className="option-item">
                                  <span className="option-label">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span className="option-text">{option}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {q.description && (
                            <div className="question-description">
                              <i className="material-icons">info</i>
                              <span>{q.description}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bottom-actions">
              <div className="actions-content">
                <button className="btn btn-secondary" onClick={() => setStep('info')}>
                  <i className="material-icons">edit</i>
                  修改信息
                </button>
                <button 
                  className="btn btn-primary btn-large" 
                  onClick={() => alert('此React版本为预览详情面板示例，完整作答与提交请继续在原学生页面开发或扩展。')}
                  disabled={isOverdue}
                >
                  <i className="material-icons">{isOverdue ? 'block' : 'play_arrow'}</i>
                  {isOverdue ? '已截止' : '开始作答'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}