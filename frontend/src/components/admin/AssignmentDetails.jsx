import React, { useMemo, useState, useEffect } from 'react';
import Modal from './Modal';

export default function AssignmentDetails({ assignment, onClose, onDelete, copyLink }) {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortKey, setSortKey] = useState('time_desc'); // time_desc | time_asc | score_desc | score_asc | name_asc
  const [liveStats, setLiveStats] = useState(assignment.stats || null);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showSecondaryActions, setShowSecondaryActions] = useState(false);
  // removed: const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    setLiveStats(assignment.stats || null);
  }, [assignment.stats]);

  const statsObj = liveStats || assignment.stats || {};

  const submissions = useMemo(
    () => (statsObj && statsObj.submissions) ? statsObj.submissions : [],
    [liveStats, assignment.stats]
  );
 // effect removed
  const classes = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.studentInfo.className).filter(Boolean))),
    [submissions]
  );

  async function refreshData() {
    try {
      setRefreshing(true);
      setErr('');
      const sid = localStorage.getItem('adminSession') || '';
      const base = (typeof window !== 'undefined' && window.location.port === '5173')
        ? 'http://localhost:3000'
        : '';
      const res = await fetch(`${base}/admin/api/assignments/${assignment.id}/statistics`, {
        headers: { 'x-session-id': sid }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem('adminSession'); } catch {}
          window.location.replace('/admin/login');
          return;
        }
        throw new Error(data.error || '刷新失败');
      }
      setLiveStats(data);
    } catch (e) {
      setErr(e.message || '刷新失败');
    } finally {
      setRefreshing(false);
    }
  }

  function exportJSON() {
    const url = `/api/export/${assignment.id}`;
    window.open(url, '_blank');
  }

  function exportCSV() {
    const qs = assignment.questions || [];
    const headers = ['id', 'name', 'class', 'score', 'isLate', 'submittedAt', ...qs.map((_, i) => `Q${i + 1}`)];
    const rows = [headers.join(',')];
    submissions.forEach((s) => {
      const base = [
        s.id,
        (s.studentInfo?.name || '').replace(/,/g, ' '),
        (s.studentInfo?.className || '').replace(/,/g, ' '),
        s.percentage || 0,
        s.isLate ? 'YES' : 'NO',
        new Date(s.submittedAt).toISOString()
      ];
      const qvals = qs.map((q) => {
        const ans = s.answers?.[q.id];
        if (q.type === 'short-answer') {
          return '文本';
        }
        if (q.type === 'single-choice') {
          return Number.isInteger(ans) ? String.fromCharCode(65 + ans) : '';
        }
        if (Array.isArray(ans)) {
          const letters = ans.filter((x) => Number.isInteger(x)).map((x) => String.fromCharCode(65 + x));
          return letters.join('|');
        }
        return '';
      });
      rows.push([...base, ...qvals].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `assignment-${assignment.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 新增：平均分与更丰富的分析数据
  const averageScore = useMemo(() => {
    const apiAvg = statsObj?.statistics?.averageScore;
    if (typeof apiAvg === 'number') return Math.round(apiAvg);
    if (!submissions.length) return 0;
    const sum = submissions.reduce((acc, s) => acc + (s.percentage || 0), 0);
    return Math.round(sum / submissions.length);
  }, [statsObj, submissions]);

  const lateInfo = useMemo(() => {
    const lateCount = submissions.reduce((acc, s) => acc + (s.isLate ? 1 : 0), 0);
    const total = submissions.length || 1;
    const lateRate = Math.round((lateCount / total) * 100);
    return { lateCount, lateRate };
  }, [submissions]);

  const extrema = useMemo(() => {
    if (!submissions.length) return { min: 0, max: 0, median: 0 };
    const arr = submissions.map((s) => s.percentage || 0).sort((a, b) => a - b);
    const min = arr[0];
    const max = arr[arr.length - 1];
    const mid = Math.floor(arr.length / 2);
    const median = arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
    return { min, max, median };
  }, [submissions]);

  const scoreDistribution = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${i === 9 ? 100 : i * 10 + 9}`,
      count: 0
    }));
    submissions.forEach((s) => {
      const p = Math.max(0, Math.min(100, s.percentage || 0));
      const idx = Math.min(9, Math.floor(p / 10));
      bins[idx].count++;
    });
    const total = submissions.length || 1;
    return bins.map((b) => ({ ...b, percentage: Math.round((b.count / total) * 100) }));
  }, [submissions]);

  const questionAnalytics = useMemo(() => {
    const qs = assignment.questions || [];
    return qs.map((q) => {
      const total = submissions.length;
      const correctCount = submissions.reduce((acc, s) => {
        const qr = (s.questionResults || []).find((r) => r.questionId === q.id);
        return acc + (qr?.isCorrect ? 1 : 0);
      }, 0);
      const correctRate = total ? Math.round((correctCount * 100) / total) : 0;

      let optionStats = [];
      if (q.type !== 'short-answer') {
        const optionCounts = (q.options || []).map(() => 0);
        submissions.forEach((s) => {
          const ans = s.answers?.[q.id];
          if (q.type === 'single-choice') {
            if (Number.isInteger(ans) && ans >= 0 && ans < optionCounts.length) {
              optionCounts[ans]++;
            }
          } else if (Array.isArray(ans)) {
            ans.forEach((idx) => {
              if (Number.isInteger(idx) && idx >= 0 && idx < optionCounts.length) {
                optionCounts[idx]++;
              }
            });
          }
        });
        const denom = q.type === 'single-choice' ? (total || 1) : optionCounts.reduce((a, b) => a + b, 0) || 1;
        optionStats = optionCounts.map((c, idx) => ({
          index: idx,
          text: q.options[idx],
          count: c,
          percentage: Math.round((c / denom) * 100),
          isCorrect:
            q.type === 'single-choice'
              ? q.correctAnswer === idx
              : Array.isArray(q.correctAnswers) && q.correctAnswers.includes(idx)
        }));
      }

      return { question: q, total, correctCount, correctRate, optionStats };
    });
  }, [assignment, submissions]);

  const timeDistribution = useMemo(() => {
    const map = new Map();
    submissions.forEach((s) => {
      const d = new Date(s.submittedAt);
      if (!Number.isNaN(d.valueOf())) {
        const day = d.toISOString().slice(0, 10);
        map.set(day, (map.get(day) || 0) + 1);
      }
    });
    const total = submissions.length || 1;
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count, percentage: Math.round((count / total) * 100) }));
  }, [submissions]);

  const classStats = useMemo(() => {
    const map = new Map();
    submissions.forEach((s) => {
      const cls = s.studentInfo?.className || '未知班级';
      const prev = map.get(cls) || { count: 0, sum: 0 };
      map.set(cls, { count: prev.count + 1, sum: prev.sum + (s.percentage || 0) });
    });
    return Array.from(map.entries()).reduce((acc, [cls, v]) => {
      acc[cls] = { count: v.count, avg: v.count ? Math.round(v.sum / v.count) : 0 };
      return acc;
    }, {});
  }, [submissions]);

  const filteredSubmissions = submissions
    .filter((s) =>
      !search ||
      (s.studentInfo.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.studentInfo.className || '').toLowerCase().includes(search.toLowerCase())
    )
    .filter((s) => !classFilter || s.studentInfo.className === classFilter)
    .sort((a, b) => {
      switch (sortKey) {
        case 'time_asc':
          return new Date(a.submittedAt) - new Date(b.submittedAt);
        case 'score_desc':
          return (b.percentage || 0) - (a.percentage || 0);
        case 'score_asc':
          return (a.percentage || 0) - (b.percentage || 0);
        case 'name_asc':
          return (a.studentInfo.name || '').localeCompare(b.studentInfo.name || '');
        case 'time_desc':
        default:
          return new Date(b.submittedAt) - new Date(a.submittedAt);
      }
    });
// derive selected submission from index to keep in sync automatically
const selectedSubmission = selectedIndex != null ? filteredSubmissions[selectedIndex] : null;

  const recentSubmissions = filteredSubmissions.slice(0, 10);

  const statsByClass = statsObj?.detailedStatistics?.submissionsByClass || {};

 // Handlers: open/close student detail, navigate
 const openSubmissionDetail = (index) => {
   setSelectedIndex(index);
 };
 const closeSubmissionDetail = () => {
   setSelectedIndex(null);
 };
 const gotoPrev = () => {
   if (selectedIndex == null) return;
   const idx = Math.max(0, selectedIndex - 1);
   setSelectedIndex(idx);
 };
 const gotoNext = () => {
   if (selectedIndex == null) return;
   const idx = Math.min(filteredSubmissions.length - 1, selectedIndex + 1);
   setSelectedIndex(idx);
 };
 
   return (
     <div className="card assignment-details">
             <div className="card-header modal-header-mobile" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div className="modal-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0 }}>{assignment.title}</h3>
            <span className="badge badge-neutral">ID: {assignment.id}</span>
          </div>
        </div>
        <div className="modal-toolbar">
          {/* 高频操作 - 始终显示 */}
          <div className="modal-toolbar-primary">
            <button className="btn btn-secondary" title="复制链接" onClick={() => copyLink(assignment.id)}>
              <i className="material-icons">link</i>
              <span className="btn-label">复制链接</span>
            </button>
            <button className="btn btn-secondary" title="刷新" onClick={refreshData} disabled={refreshing}>
              <i className="material-icons">refresh</i>
              <span className="btn-label">{refreshing ? '刷新中...' : '刷新'}</span>
            </button>
            <button className="btn btn-secondary" title="关闭" onClick={onClose}>
              <i className="material-icons">close</i>
              <span className="btn-label">关闭</span>
            </button>
          </div>
          
          {/* 低频操作 - 可折叠 */}
          <div className={`modal-toolbar-secondary${showSecondaryActions ? ' expanded' : ''}`}>
            <button className="btn btn-secondary" title="导出CSV" onClick={exportCSV}>
              <i className="material-icons">table_view</i>
              <span className="btn-label">导出CSV</span>
            </button>
            <button className="btn btn-secondary" title="导出JSON" onClick={exportJSON}>
              <i className="material-icons">data_object</i>
              <span className="btn-label">导出JSON</span>
            </button>
            <button className="btn btn-danger" title="删除" onClick={() => onDelete(assignment.id)}>
              <i className="material-icons">delete</i>
              <span className="btn-label">删除</span>
            </button>
          </div>
          
          {/* 更多按钮 */}
          <div className="modal-toolbar-more">
            <button 
              className="btn" 
              onClick={() => setShowSecondaryActions(!showSecondaryActions)}
              title={showSecondaryActions ? '收起更多操作' : '显示更多操作'}
            >
              <i className="material-icons">
                {showSecondaryActions ? 'expand_less' : 'expand_more'}
              </i>
              <span className="btn-label">
                {showSecondaryActions ? '收起' : '更多操作'}
              </span>
            </button>
          </div>
        </div>
       </div>

       {err && <div className="text-error" style={{ padding: '0 16px 8px' }}>{err}</div>}

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
         <div className="card-content" style={{ paddingTop: 0 }}>
           <div className="stats-grid" style={{ marginBottom: 12 }}>
             <div className="stat-card">
               <div className="stat-number">{statsObj?.statistics?.totalSubmissions || submissions.length}</div>
               <div className="stat-label">总提交</div>
             </div>
             <div className="stat-card">
               <div className="stat-number">{averageScore}%</div>
               <div className="stat-label">平均得分</div>
             </div>
             <div className="stat-card">
               <div className="stat-number">{lateInfo.lateRate}%</div>
               <div className="stat-label">迟交率</div>
             </div>
             <div className="stat-card">
               <div className="stat-number">{assignment.questions ? assignment.questions.length : 0}</div>
               <div className="stat-label">题目数</div>
             </div>
           </div>

           <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
             <div className="card">
               <div className="card-header"><h4>基本信息</h4></div>
               <div className="card-content">
                 <ul className="detail-list" style={{ padding: 0 }}>
                   {assignment.description && <li style={{ marginBottom: 6 }}>{assignment.description}</li>}
                   <li style={{ marginBottom: 6 }}><strong>创建时间：</strong>{assignment.createdAt ? new Date(assignment.createdAt).toLocaleString() : '未知'}</li>
                   <li style={{ marginBottom: 6 }}><strong>截止时间：</strong>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : '无'}</li>
                   <li style={{ marginBottom: 0 }}><strong>状态：</strong>{assignment.status || '未知'}</li>
                 </ul>
               </div>
             </div>
             <div className="card">
               <div className="card-header"><h4>分数概况</h4></div>
               <div className="card-content">
                 <ul className="detail-list" style={{ padding: 0 }}>
                   <li style={{ marginBottom: 6 }}><strong>最高分：</strong>{extrema.max}%</li>
                   <li style={{ marginBottom: 6 }}><strong>最低分：</strong>{extrema.min}%</li>
                   <li style={{ marginBottom: 0 }}><strong>中位数：</strong>{extrema.median}%</li>
                 </ul>
               </div>
             </div>
           </div>

           {recentSubmissions.length > 0 && (
             <div className="card">
               <div className="card-header"><h4>最近提交（前5条）</h4></div>
               <div className="card-content">
                 <div className="table-container">
                   <table className="table">
                     <thead>
                       <tr>
                         <th>学生</th>
                         <th>班级</th>
                         <th>得分</th>
                         <th>时间</th>
                       </tr>
                     </thead>
                     <tbody>
                       {recentSubmissions.slice(0, 5).map((sub) => (
                         <tr key={sub.id}>
                           <td>{sub.studentInfo.name}</td>
                           <td>{sub.studentInfo.className}</td>
                           <td>{sub.percentage}%{sub.isLate ? '（迟交）' : ''}</td>
                           <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           )}
         </div>
       )}

       {tab === 'submissions' && (
         <div className="detail-content" style={{ overflowX: 'auto' }}>
           <div className="submission-filters">
             <input
               type="text"
               className="form-control"
               placeholder="搜索学生姓名或班级"
               name={`submissionSearch`}
               id={`submission-search-${assignment.id}`}
               autoComplete="off"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               aria-label="搜索学生姓名或班级"
             />
             <select
               className="form-control"
               name={`classFilter`}
               id={`class-filter-${assignment.id}`}
               value={classFilter}
               onChange={(e) => setClassFilter(e.target.value)}
               aria-label="按班级筛选"
             >
               <option value="">所有班级</option>
               {classes.map((c) => (
                 <option key={c} value={c}>
                   {c}
                 </option>
               ))}
             </select>
             <select
               className="form-control"
               name={`sortKey`}
               id={`sort-key-${assignment.id}`}
               value={sortKey}
               onChange={(e) => setSortKey(e.target.value)}
               aria-label="排序方式"
             >
               <option value="time_desc">按时间(新→旧)</option>
               <option value="time_asc">按时间(旧→新)</option>
               <option value="score_desc">按分数(高→低)</option>
               <option value="score_asc">按分数(低→高)</option>
               <option value="name_asc">按姓名(A→Z)</option>
             </select>
           </div>
           <div className="table-container" style={{ marginTop: '1rem', overflowX: 'auto' }}>
             <table className="table">
                             <thead>
                <tr>
                  <th>操作</th>
                  <th>学生姓名</th>
                  <th>班级</th>
                  <th>得分</th>
                  <th>迟交</th>
                  <th>提交时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub, idx) => (
                  <tr key={sub.id}>
                    <td>
                      <button className="btn btn-secondary" onClick={() => openSubmissionDetail(idx)}>查看</button>
                    </td>
                    <td>{sub.studentInfo.name}</td>
                    <td>{sub.studentInfo.className}</td>
                    <td>{sub.percentage}%</td>
                    <td>{sub.isLate ? '是' : '否'}</td>
                    <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredSubmissions.length === 0 && (
                  <tr>
                  {/* ensure colSpan matches 6 columns including 操作 */}
                  <td colSpan="6" className="text-center">
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
           {/* 概览统计 */}
           <div className="stats-grid" style={{ marginBottom: '16px' }}>
             <div className="stat-card">
               <div className="stat-number">{statsObj?.statistics?.totalSubmissions || submissions.length}</div>
               <div className="stat-label">总提交数</div>
             </div>
             <div className="stat-card">
               <div className="stat-number">{averageScore}%</div>
               <div className="stat-label">平均得分</div>
             </div>
             <div className="stat-card">
               <div className="stat-number">{lateInfo.lateRate}%</div>
               <div className="stat-label">迟交率</div>
             </div>
             <div className="stat-card">
               <div className="stat-number">{extrema.max}%</div>
               <div className="stat-label">最高分</div>
             </div>
             <div className="stat-card">
               <div className="stat-number">{extrema.min}%</div>
               <div className="stat-label">最低分</div>
             </div>
           </div>
 
           {/* 分数分布 */}
           <div className="card" style={{ marginBottom: '16px' }}>
             <div className="card-header">
               <h4>分数分布</h4>
             </div>
             <div className="card-content">
               {submissions.length === 0 ? (
                 <p className="text-center">暂无数据</p>
               ) : (
                 <div className="table-container">
                   <table className="table">
                     <thead>
                       <tr>
                         <th>分数区间</th>
                         <th>人数</th>
                         <th>占比</th>
                       </tr>
                     </thead>
                     <tbody>
                       {scoreDistribution.map((b) => (
                         <tr key={b.range}>
                           <td>{b.range}</td>
                           <td>{b.count}</td>
                           <td>
                             <div style={{ background: '#e8f2ff', height: 8, borderRadius: 4, position: 'relative' }}>
                               <div style={{ width: `${b.percentage}%`, background: '#018eee', height: '100%', borderRadius: 4 }} />
                             </div>
                             <span style={{ marginLeft: 8 }}>{b.percentage}%</span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
           </div>
 
           {/* 题目分析 */}
           <div className="card" style={{ marginBottom: '16px' }}>
             <div className="card-header">
               <h4>题目分析</h4>
             </div>
             <div className="card-content">
               {questionAnalytics.length === 0 && <p className="text-center">暂无题目信息</p>}
               {questionAnalytics.length > 0 && (
                 <div>
                   {questionAnalytics.map(({ question: q, correctRate, optionStats }, idx) => (
                     <div key={q.id} className="card" style={{ marginBottom: '12px' }}>
                       <div className="card-content">
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                           <div style={{ fontWeight: 500 }}>第 {idx + 1} 题：{q.question}</div>
                           <div style={{ minWidth: 120, textAlign: 'right' }}>正确率：
                             <span style={{ marginLeft: 8, fontWeight: 600 }}>{correctRate}%</span>
                           </div>
                         </div>
                         {q.type === 'short-answer' ? (
                           <div style={{ color: '#666' }}>简答题暂不参与自动判分，建议人工评阅</div>
                         ) : (
                           <div className="table-container">
                             <table className="table">
                               <thead>
                                 <tr>
                                   <th>选项</th>
                                   <th>选择人数</th>
                                   <th>占比</th>
                                   <th>是否正确</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {optionStats.map((opt, j) => (
                                   <tr key={j}>
                                     <td>{String.fromCharCode(65 + j)}. {opt.text}</td>
                                     <td>{opt.count}</td>
                                     <td>
                                       <div style={{ background: '#e8f2ff', height: 8, borderRadius: 4, position: 'relative' }}>
                                         <div style={{ width: `${opt.percentage}%`, background: '#018eee', height: '100%', borderRadius: 4 }} />
                                       </div>
                                       <span style={{ marginLeft: 8 }}>{opt.percentage}%</span>
                                     </td>
                                     <td>{opt.isCorrect ? '✔️' : ''}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </div>
 
           {/* 班级提交统计 */}
           <div className="card" style={{ marginBottom: '16px' }}>
             <div className="card-header">
               <h4>班级提交统计</h4>
             </div>
             <div className="card-content">
               <div className="table-container">
                 <table className="table">
                   <thead>
                     <tr>
                       <th>班级</th>
                       <th>提交数</th>
                       <th>平均分</th>
                     </tr>
                   </thead>
                   <tbody>
                     {Object.keys(statsByClass).map((cls) => (
                       <tr key={cls}>
                         <td>{cls}</td>
                         <td>{statsByClass[cls]}</td>
                         <td>{classStats[cls]?.avg ?? 0}%</td>
                       </tr>
                     ))}
                     {Object.keys(statsByClass).length === 0 && (
                       <tr>
                         <td colSpan="3" className="text-center">
                           暂无数据
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
 
           {/* 提交时间分布 */}
           <div className="card">
             <div className="card-header">
               <h4>提交时间分布</h4>
             </div>
             <div className="card-content">
               {timeDistribution.length === 0 ? (
                 <p className="text-center">暂无数据</p>
               ) : (
                 <div className="table-container">
                   <table className="table">
                     <thead>
                       <tr>
                         <th>日期</th>
                         <th>提交数</th>
                         <th>占比</th>
                       </tr>
                     </thead>
                     <tbody>
                       {timeDistribution.map((d) => (
                         <tr key={d.date}>
                           <td>{d.date}</td>
                           <td>{d.count}</td>
                           <td>
                             <div style={{ background: '#e8f2ff', height: 8, borderRadius: 4, position: 'relative' }}>
                               <div style={{ width: `${d.percentage}%`, background: '#018eee', height: '100%', borderRadius: 4 }} />
                             </div>
                             <span style={{ marginLeft: 8 }}>{d.percentage}%</span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}
 
         {/* 学生答题详情 Modal */}
    {selectedSubmission && (
      <Modal onClose={closeSubmissionDetail} className="modal-lg">
        <div className="card">
          <div className="card-header student-detail-header">
            <div className="student-detail-title">
              <h4>学生答题详情</h4>
              <div className="student-detail-nav">
                <div className="student-nav-inline">
                  <button className="btn btn-secondary btn-sm nav-prev" onClick={gotoPrev} disabled={selectedIndex <= 0}>
                    <i className="material-icons">chevron_left</i>
                  </button>
                  <span className="student-nav-counter">
                    {selectedIndex + 1}/{filteredSubmissions.length}
                  </span>
                  <button className="btn btn-secondary btn-sm nav-next" onClick={gotoNext} disabled={selectedIndex >= filteredSubmissions.length - 1}>
                    <i className="material-icons">chevron_right</i>
                  </button>
                  <button className="btn btn-secondary btn-sm nav-close" onClick={closeSubmissionDetail}>
                    <i className="material-icons">close</i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="card-content student-detail-content">
            <div className="student-info-grid">
              <div className="student-info-card">
                <div className="student-info-primary">
                  <div className="student-name">{selectedSubmission.studentInfo?.name || '-'}</div>
                  <div className="student-class">{selectedSubmission.studentInfo?.className || '-'}</div>
                </div>
                <div className="student-score">
                  <span className="score-value">{selectedSubmission.percentage}%</span>
                  {selectedSubmission.isLate && <span className="badge warning">迟交</span>}
                </div>
              </div>
              <div className="student-time-info">
                <div className="time-label">提交时间</div>
                <div className="time-value">{new Date(selectedSubmission.submittedAt).toLocaleString()}</div>
              </div>
            </div>
 
             <div className="table-container">
               <table className="table">
                 <thead>
                   <tr>
                     <th style={{ width: 48 }}>#</th>
                     <th>题目</th>
                     <th>学生作答</th>
                     <th>正确答案</th>
                     <th style={{ width: 96 }}>得分</th>
                   </tr>
                 </thead>
                 <tbody>
                   {(assignment.questions || []).map((q, idx) => {
                     const qr = (selectedSubmission.questionResults || []).find(r => r.questionId === q.id) || {};
                     const ans = selectedSubmission.answers?.[q.id];
                     const isCorrect = !!qr.isCorrect;
                     const score = qr.score ?? 0;
                     const maxP = qr.maxScore ?? (q.points || 1);
 
                     const toLetters = (arr) => (Array.isArray(arr) ? arr.filter(Number.isInteger).map(i => String.fromCharCode(65 + i)) : []);
                     let studentText = '';
                     let correctText = '';
                     if (q.type === 'short-answer') {
                       studentText = typeof ans === 'string' ? ans : (Array.isArray(ans) ? ans.join(', ') : String(ans ?? ''));
                       correctText = '—';
                     } else if (q.type === 'single-choice') {
                       studentText = Number.isInteger(ans) ? `${String.fromCharCode(65 + ans)}. ${(q.options?.[ans] ?? '')}` : '';
                       correctText = Number.isInteger(q.correctAnswer) ? `${String.fromCharCode(65 + q.correctAnswer)}. ${(q.options?.[q.correctAnswer] ?? '')}` : '';
                     } else if (q.type === 'multiple-choice') {
                       const sLetters = toLetters(ans);
                       const cLetters = toLetters(q.correctAnswers);
                       studentText = sLetters.map((L) => `${L}. ${q.options?.[L.charCodeAt(0)-65] ?? ''}`).join('，');
                       correctText = cLetters.map((L) => `${L}. ${q.options?.[L.charCodeAt(0)-65] ?? ''}`).join('，');
                     }
 
                     return (
                       <tr key={q.id}>
                         <td>{idx + 1}</td>
                         <td style={{ maxWidth: 360, wordBreak: 'break-word', whiteSpace: 'normal' }}>{q.question}</td>
                         <td>
                           <span className={`badge ${isCorrect ? 'success' : 'danger'}`} style={{ marginRight: 8 }}>
                             {isCorrect ? '正确' : '错误'}
                           </span>
                           <span style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{studentText || '—'}</span>
                         </td>
                         <td><span style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{correctText || '—'}</span></td>
                         <td>{score}/{maxP}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
               <div className="text-center" style={{ color: '#777', fontSize: 12, padding: '8px 0 0' }}>
                 如需人工复核主观题，请在“学生答题”页导出后进行标注
               </div>
             </div>
           </div>
         </div>
       </Modal>
     )}
     </div>
   );
 }

