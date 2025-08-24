import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  // 新增：答题、提交、草稿与离线状态
  const [answers, setAnswers] = useState({}); // { [questionId]: string | string[] }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const saveTimerRef = useRef(null);
  const syncingRef = useRef(false);

  // 草稿键：在学生信息完整后生成
  const studentKey = useMemo(() => {
    const { className, name, studentId } = studentInfo || {};
    if (!id || !className || !name || !studentId) return null;
    return `assignment:${id}:draft:${encodeURIComponent(className)}|${encodeURIComponent(name)}|${encodeURIComponent(studentId)}`;
  }, [id, studentInfo]);

  const pendingSubmitKey = useMemo(() => {
    const { className, name, studentId } = studentInfo || {};
    if (!id || !className || !name || !studentId) return null;
    return `assignment:${id}:pendingSubmit:${encodeURIComponent(className)}|${encodeURIComponent(name)}|${encodeURIComponent(studentId)}`;
  }, [id, studentInfo]);

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

  // 网络状态监听与自动同步
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      // 恢复在线时尝试同步待提交
      trySyncPendingSubmission();
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 自动保存草稿（防抖）
  const scheduleSaveDraft = useCallback(() => {
    if (!studentKey) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const payload = {
          id,
          studentInfo,
          answers,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(studentKey, JSON.stringify(payload));
        setLastSavedAt(new Date());
      } catch (e) {
        console.warn('保存草稿失败', e);
      }
    }, 400);
  }, [answers, id, studentInfo, studentKey]);

  useEffect(() => {
    if (step !== 'details') return;
    scheduleSaveDraft();
  }, [answers, step, scheduleSaveDraft]);

  const loadDraftIfExists = useCallback(() => {
    if (!studentKey) return null;
    try {
      const raw = localStorage.getItem(studentKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.answers) {
        setAnswers(parsed.answers || {});
        setLastSavedAt(parsed.updatedAt ? new Date(parsed.updatedAt) : null);
        return parsed;
      }
    } catch (e) {
      console.warn('读取草稿失败', e);
    }
    return null;
  }, [studentKey]);

  const clearDraft = useCallback(() => {
    if (!studentKey) return;
    try {
      localStorage.removeItem(studentKey);
    } catch (e) {
      console.warn('清除草稿失败', e);
    }
  }, [studentKey]);

  // 检查并同步待提交
  const trySyncPendingSubmission = useCallback(async () => {
    if (syncingRef.current) return;
    if (!pendingSubmitKey) return;
    const raw = localStorage.getItem(pendingSubmitKey);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw);
      if (!pending || !navigator.onLine) return;
      syncingRef.current = true;
      await api.post(`/student/api/${id}/submit`, pending);
      localStorage.removeItem(pendingSubmitKey);
      setHasSubmitted(true);
      setSubmissionInfo({ submittedAt: new Date().toISOString(), ...pending });
      clearDraft();
    } catch {
      console.warn('保存草稿失败');
    } finally {
      syncingRef.current = false;
    }
  }, [api, clearDraft, id, pendingSubmitKey]);

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
      // 1) 检查是否已提交
      const check = await api.get(`/student/api/${id}/check-submission?name=${encodeURIComponent(studentInfo.name)}&className=${encodeURIComponent(studentInfo.className)}`);
      if (check?.hasSubmitted) {
        setHasSubmitted(true);
        setSubmissionInfo(check.submissionInfo || null);
      } else {
        setHasSubmitted(false);
        setSubmissionInfo(null);
      }
      // 2) 加载可能存在的草稿
      const draft = loadDraftIfExists();
      if (!draft) {
        // 初始化答案结构
        const init = {};
        (assignment?.questions || []).forEach(q => {
          if (q.type === 'multiple-choice') init[q.id] = [];
          else init[q.id] = '';
        });
        setAnswers(init);
      }
      setStep('details');
      // 在线时尝试同步待提交
      if (navigator.onLine) {
        trySyncPendingSubmission();
      }
    } catch {
      alert('信息验证失败，请重试');
    } finally {
      setFormSubmitting(false);
    }
  }

  function toggleQuestion(questionId) {
    setExpandedQuestion(prev => prev === questionId ? null : questionId);
  }

  const updateAnswer = useCallback((q, value) => {
    setAnswers(prev => ({ ...prev, [q.id]: value }));
  }, []);

  const isQuestionAnswered = useCallback((q) => {
    const val = answers[q.id];
    if (q.type === 'multiple-choice') return Array.isArray(val) && val.length > 0;
    return val !== undefined && val !== null && String(val).trim() !== '';
  }, [answers]);

  const requiredUnanswered = useMemo(() => {
    if (!assignment?.questions) return [];
    return assignment.questions.filter(q => q.required && !isQuestionAnswered(q));
  }, [assignment, isQuestionAnswered]);

  const canSubmit = useMemo(() => {
    if (isOverdue || hasSubmitted) return false;
    if (!assignment?.questions) return false;
    return requiredUnanswered.length === 0;
  }, [assignment, hasSubmitted, isOverdue, requiredUnanswered.length]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const submissionData = {
      name: studentInfo.name,
      className: studentInfo.className,
      studentId: studentInfo.studentId,
      answers,
      submitTime: new Date().toISOString(),
    };
    if (isOffline) {
      try {
        if (pendingSubmitKey) {
          localStorage.setItem(pendingSubmitKey, JSON.stringify(submissionData));
        }
        scheduleSaveDraft();
        alert('当前离线。已保存至本地，联网后将自动尝试提交。');
      } catch {
        alert('离线保存失败，请截图保留内容');
      }
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/student/api/${id}/submit`, submissionData);
      setHasSubmitted(true);
      setSubmissionInfo({ submittedAt: new Date().toISOString(), ...submissionData });
      clearDraft();
      if (pendingSubmitKey) localStorage.removeItem(pendingSubmitKey);
      alert('提交成功！');
    } catch {
      // 提交失败，降级到本地排队
      try {
        if (pendingSubmitKey) {
          localStorage.setItem(pendingSubmitKey, JSON.stringify(submissionData));
        }
      } catch (err) {
        console.warn('保存待提交数据失败', err);
      }
      alert('提交失败，已保存至本地，稍后将自动重试。');
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, api, canSubmit, clearDraft, id, isOffline, pendingSubmitKey, scheduleSaveDraft, studentInfo]);

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
        {isOffline && (
          <div className="offline-banner">
            <i className="material-icons">wifi_off</i>
            当前处于离线状态，作答将自动保存为草稿，联网后可继续或自动提交
          </div>
        )}
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
                {hasSubmitted && (
                  <div className="submitted-badge" title="已提交">
                    <i className="material-icons">check_circle</i>
                    <span>已提交</span>
                  </div>
                )}
                {!hasSubmitted && lastSavedAt && (
                  <div className="draft-info" title="已保存草稿">
                    <i className="material-icons">save</i>
                    <span>草稿已保存 {lastSavedAt.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card questions-card">
              <div className="card-content">
                <h3 className="questions-title">
                  <i className="material-icons">list</i>
                  题目作答
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
                            {isQuestionAnswered(q) ? (
                              <span className="answered-badge"><i className="material-icons">check</i>已作答</span>
                            ) : (
                              <span className="unanswered-badge"><i className="material-icons">radio_button_unchecked</i>未作答</span>
                            )}
                          </div>
                        </div>
                        <i className="material-icons expand-icon">
                          {expandedQuestion === q.id ? 'expand_less' : 'expand_more'}
                        </i>
                      </div>
                      {expandedQuestion === q.id && (
                        <div className="question-details">
                          {q.description && (
                            <div className="question-description">
                              <i className="material-icons">info</i>
                              <span>{q.description}</span>
                            </div>
                          )}
                          {/* 答题区 */}
                          <div className="answer-group">
                            {q.type === 'single-choice' && (
                              <div className="choice-group">
                                {(q.options || []).map((opt, optIdx) => {
                                  const val = answers[q.id] ?? '';
                                  const checked = val === opt;
                                  return (
                                    <label key={optIdx} className={`choice-item ${checked ? 'checked' : ''}`}>
                                      <input
                                        type="radio"
                                        name={`q-${q.id}`}
                                        className="choice-input"
                                        checked={checked}
                                        disabled={hasSubmitted}
                                        onChange={() => updateAnswer(q, opt)}
                                      />
                                      <span className="choice-indicator" />
                                      <span className="choice-label">{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            {q.type === 'multiple-choice' && (
                              <div className="choice-group">
                                {(q.options || []).map((opt, optIdx) => {
                                  const val = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                                  const checked = val.includes(opt);
                                  return (
                                    <label key={optIdx} className={`choice-item ${checked ? 'checked' : ''}`}>
                                      <input
                                        type="checkbox"
                                        className="choice-input"
                                        checked={checked}
                                        disabled={hasSubmitted}
                                        onChange={(e) => {
                                          const prev = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                                          if (e.target.checked) updateAnswer(q, [...prev, opt]);
                                          else updateAnswer(q, prev.filter(v => v !== opt));
                                        }}
                                      />
                                      <span className="choice-indicator" />
                                      <span className="choice-label">{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            {q.type === 'short-answer' && (
                              <div className="short-answer-group">
                                <textarea
                                  className="short-answer"
                                  rows={q.rows || 4}
                                  placeholder="请输入你的回答"
                                  value={answers[q.id] ?? ''}
                                  disabled={hasSubmitted}
                                  onChange={(e) => updateAnswer(q, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="submit-section">
              <div className="submit-info">
                {!hasSubmitted ? (
                  <>
                    {requiredUnanswered.length > 0 ? (
                      <p className="warn">
                        <i className="material-icons">warning_amber</i>
                        仍有 {requiredUnanswered.length} 题必答未完成
                      </p>
                    ) : (
                      <p className="ok">
                        <i className="material-icons">check_circle</i>
                        所有必答题均已完成
                      </p>
                    )}
                    {isOffline && (
                      <p className="offline-tip">
                        <i className="material-icons">wifi_off</i>
                        离线状态下将保存草稿，联网后可一键提交
                      </p>
                    )}
                  </>
                ) : (
                  <p className="ok">
                    <i className="material-icons">task_alt</i>
                    已提交{submissionInfo?.submittedAt ? `（${new Date(submissionInfo.submittedAt).toLocaleString()}）` : ''}
                  </p>
                )}
              </div>
              <div className="bottom-actions">
                <div className="actions-content">
                  <button className="btn btn-secondary" onClick={() => setStep('info')} disabled={isSubmitting}>
                    <i className="material-icons">edit</i>
                    修改信息
                  </button>
                  {!hasSubmitted ? (
                    <>
                      <button 
                        className="btn btn-outline" 
                        onClick={() => { scheduleSaveDraft(); alert('草稿已保存'); }}
                        disabled={isSubmitting}
                      >
                        <i className="material-icons">save</i>
                        保存草稿
                      </button>
                      <button 
                        className="btn btn-primary btn-large" 
                        onClick={handleSubmit}
                        disabled={!canSubmit || isSubmitting || isOverdue}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="btn-spinner"></div>
                            提交中...
                          </>
                        ) : (
                          <>
                            <i className="material-icons">{isOffline ? 'cloud_off' : 'send'}</i>
                            {isOffline ? '离线保存' : (isOverdue ? '已截止' : '提交作业')}
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-success btn-large" disabled>
                      <i className="material-icons">check_circle</i>
                      已提交
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}