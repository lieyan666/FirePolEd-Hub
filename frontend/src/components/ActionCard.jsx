import React from 'react';

export default function ActionCard({ icon, title, description, children, onClick }) {
  const className = `card action-card${onClick ? ' clickable' : ''}`;
  return (
    <div className={className} onClick={onClick}>
      <div className="card-content">
        {icon && <i className="material-icons">{icon}</i>}
        {title && <h3>{title}</h3>}
        {description && <p>{description}</p>}
        {children}
      </div>
    </div>
  );
}

