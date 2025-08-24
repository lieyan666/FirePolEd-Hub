import React, { useEffect } from 'react';

export default function Modal({ children, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
