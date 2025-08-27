import React from 'react';

export default function AssignmentInput({ value, onChange, onSubmit }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="assignment-input-container">
      <div className="input-group flex gap-3">
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="请输入作业ID或完整链接"
          className="form-control flex-1"
          aria-label="作业ID或链接"
        />
        <button className="btn btn-primary" onClick={onSubmit}>
          <i className="material-icons">play_arrow</i>
          开始答题
        </button>
      </div>
      <div className="mt-3 text-center">
        <p className="text-xs text-neutral-500">
          支持作业ID或完整链接地址，例如：ABC123 或 https://example.com/student/assignment/ABC123
        </p>
      </div>
    </div>
  );
}

