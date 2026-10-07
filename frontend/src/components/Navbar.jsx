import React from 'react';
import { Menu, Bell, LogOut, Shield } from 'lucide-react';

export default function Navbar({ user, title, subtitle, onToggleMenu, unreadNotifs = 0, onNotificationClick, onLogout }) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button 
          type="button" 
          className="menu-toggle-btn" 
          onClick={onToggleMenu}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
        <div className="header-title-group">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card-subtle)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--primary)'
          }}
        >
          <Shield size={14} />
          <span>Role: {user?.role ? user.role.replace('_', ' ').toUpperCase() : 'USER'}</span>
        </div>

        <button 
          type="button" 
          className="header-action-btn"
          onClick={onNotificationClick}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadNotifs > 0 && <span className="notif-badge">{unreadNotifs}</span>}
        </button>

        <button 
          type="button" 
          className="btn btn-secondary btn-sm"
          onClick={onLogout}
          title="Log out of EduSphere"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
