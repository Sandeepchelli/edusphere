import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'var(--primary)', bgLight = 'var(--primary-light)' }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {Icon && (
          <div className="stat-icon" style={{ backgroundColor: bgLight, color: color }}>
            <Icon size={22} />
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {subtext && <div className="stat-sub">{subtext}</div>}
    </div>
  );
}
