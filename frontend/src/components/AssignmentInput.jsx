import React from 'react';

export default function AssignmentInput({ value, onChange, onSubmit }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="input-group">
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder="请输入作业ID或完整链接"
        className="form-control"
        aria-label="作业ID或链接"
      />
      <button className="btn btn-primary" onClick={onSubmit}>
        开始答题
      </button>
    </div>
  );
}

