import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '/css/student.css';

export default function Student() {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/student/api/${assignmentId}`)
      .then(res => res.json())
      .then(setAssignment)
      .catch(() => setError('加载作业失败'));
  }, [assignmentId]);

  if (error) {
    return <div className="error-state"><p>{error}</p></div>;
  }

  if (!assignment) {
    return <div className="loading-state"><p>加载中...</p></div>;
  }

  return (
    <div className="main-content">
      <div className="assignment-header">
        <h2>{assignment.title}</h2>
        {assignment.description && (
          <p className="text-secondary">{assignment.description}</p>
        )}
      </div>

      <ol>
        {assignment.questions?.map((q, idx) => (
          <li key={q.id || idx} className="question-item">
            {q.question}
          </li>
        ))}
      </ol>
    </div>
  );
}

