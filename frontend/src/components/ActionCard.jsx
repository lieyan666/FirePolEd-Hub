import React from 'react';

export default function ActionCard({ icon, title, description, children, onClick, gradient = false }) {
  const className = `card action-card${onClick ? ' clickable' : ''}${gradient ? ' gradient-card' : ''}`;
  
  return (
    <div className={className} onClick={onClick}>
      <div className="card-content text-center">
        {icon && (
          <div className="action-card-icon mb-4">
            <i className="material-icons text-5xl text-primary-600">{icon}</i>
          </div>
        )}
        {title && (
          <h3 className="text-xl font-semibold text-neutral-900 mb-3">{title}</h3>
        )}
        {description && (
          <p className="text-neutral-600 mb-6 leading-relaxed">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}

