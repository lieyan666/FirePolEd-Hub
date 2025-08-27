import React, { useState } from 'react';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AssignmentForm({ api, onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        id: uid(),
        type: 'single-choice',
        text: '',
        options: ['', ''],
        correct: [0]
      }
    ]);
  }

  function updateQuestion(i, updates) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...updates } : q)));
  }

  function removeQuestion(i) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  function addOption(i) {
    updateQuestion(i, { options: [...questions[i].options, ''] });
  }

  function updateOption(i, j, value) {
    const opts = [...questions[i].options];
    opts[j] = value;
    updateQuestion(i, { options: opts });
  }

  function removeOption(i, j) {
    const opts = questions[i].options.filter((_, idx) => idx !== j);
    const corr = questions[i].correct.filter((c) => c !== j).map((c) => (c > j ? c - 1 : c));
    updateQuestion(i, { options: opts, correct: corr });
  }

  function toggleCorrect(i, j) {
    const q = questions[i];
    if (q.type === 'single-choice') {
      updateQuestion(i, { correct: [j] });
    } else {
      const exists = q.correct.includes(j);
      updateQuestion(i, {
        correct: exists ? q.correct.filter((c) => c !== j) : [...q.correct, j]
      });
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('请输入作业标题');
      return;
    }
    if (questions.length === 0) {
      setError('请至少添加一个题目');
      return;
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        setError('题目内容不能为空');
        return;
      }
      if (q.type !== 'short-answer') {
        const opts = q.options.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) {
          setError('每个选择题至少需要两个选项');
          return;
        }
        if (q.correct.length === 0) {
          setError('请选择正确答案');
          return;
        }
      } else if (!q.answer || !q.answer.trim()) {
        setError('请填写简答题答案');
        return;
      }
    }

    const payloadQuestions = questions.map((q) => {
      const base = {
        id: q.id,
        type: q.type,
        question: q.text,
        points: 1,
        required: true
      };
      if (q.type === 'short-answer') {
        base.correctAnswer = q.answer;
      } else {
        base.options = q.options.map((o) => o.trim());
        if (q.type === 'single-choice') {
          base.correctAnswer = q.correct[0];
        } else {
          base.correctAnswers = q.correct;
        }
      }
      return base;
    });

    setSaving(true);
    setError('');
    try {
      await api.post('/admin/api/assignments', {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        questions: payloadQuestions
      });
      onCreated();
      setTitle('');
      setDescription('');
      setDueDate('');
      setQuestions([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h3>创建作业</h3>
        <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          取消
        </button>
      </div>
      <div className="card-content">
        {error && <p className="text-error" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">标题</label>
            <input
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">截止时间</label>
            <input
              type="datetime-local"
              className="form-control"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <h4>题目 {i + 1}</h4>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => removeQuestion(i)}
                >
                  删除
                </button>
              </div>
              <div className="card-content">
                <div className="form-group">
                  <label className="form-label">题目内容</label>
                  <textarea
                    className="form-control"
                    value={q.text}
                    onChange={(e) => updateQuestion(i, { text: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">题目类型</label>
                  <select
                    className="form-control"
                    value={q.type}
                    onChange={(e) => updateQuestion(i, { type: e.target.value, correct: [], options: e.target.value === 'short-answer' ? undefined : q.options })}
                  >
                    <option value="single-choice">单选题</option>
                    <option value="multiple-choice">多选题</option>
                    <option value="short-answer">简答题</option>
                  </select>
                </div>
                {q.type !== 'short-answer' ? (
                  <div>
                    {q.options.map((opt, j) => (
                      <div key={j} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {q.type === 'single-choice' ? (
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correct[0] === j}
                            onChange={() => toggleCorrect(i, j)}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={q.correct.includes(j)}
                            onChange={() => toggleCorrect(i, j)}
                          />
                        )}
                        <input
                          type="text"
                          className="form-control"
                          value={opt}
                          onChange={(e) => updateOption(i, j, e.target.value)}
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => removeOption(i, j)}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => addOption(i)}
                    >
                      添加选项
                    </button>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">参考答案</label>
                    <textarea
                      className="form-control"
                      value={q.answer || ''}
                      onChange={(e) => updateQuestion(i, { answer: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          <div style={{ marginBottom: '16px' }}>
            <button type="button" className="btn btn-primary" onClick={addQuestion}>
              添加题目
            </button>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '保存中...' : '保存作业'}
          </button>
        </form>
      </div>
    </div>
  );
}

