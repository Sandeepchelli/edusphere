import React from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  ShieldAlert,
  CalendarCheck,
  BookOpen,
  DollarSign,
  Library,
  FileCheck,
  Clock,
  CreditCard,
  Bell,
  Settings,
  User,
  Bus,
  Award,
  ChevronRight,
  LogOut
} from 'lucide-react';

export default function Sidebar({ user, currentView, setView, mobileOpen, setMobileOpen, unreadNotifs = 0, onLogout }) {
  const role = user?.role || 'admin';

  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'students', label: 'Students', icon: GraduationCap },
          { id: 'teachers', label: 'Teachers', icon: UserCheck },
          { id: 'parents', label: 'Parents', icon: Users },
          { id: 'staff', label: 'College Staff', icon: ShieldAlert },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'academics', label: 'Academics', icon: BookOpen },
          { id: 'marks', label: 'Marks & CGPA', icon: Award },
          { id: 'fees', label: 'Fees & Finance', icon: DollarSign },
          { id: 'library', label: 'Library', icon: Library },
          { id: 'leave', label: 'Leave / Outing', icon: FileCheck },
          { id: 'timetable', label: 'Timetable', icon: Clock },
          { id: 'salary', label: 'Salary / Payments', icon: CreditCard },
          { id: 'transport', label: 'Bus Routes & Stops', icon: Bus },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'profile', label: 'My Profile', icon: User },
        ];

      case 'teacher':
        return [
          { id: 'dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
          { id: 'students', label: 'Students Directory', icon: GraduationCap },
          { id: 'attendance', label: 'Student Attendance', icon: CalendarCheck },
          { id: 'academics', label: 'Subjects & Materials', icon: BookOpen },
          { id: 'marks', label: 'Marks & CGPA Entry', icon: Award },
          { id: 'leave', label: 'Review Leave Requests', icon: FileCheck },
          { id: 'timetable', label: 'My Timetable', icon: Clock },
          { id: 'teacher-attendance', label: 'My Attendance', icon: CalendarCheck },
          { id: 'my-salary', label: 'My Salary & Slips', icon: CreditCard },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
          { id: 'profile', label: 'My Profile', icon: User },
        ];

      case 'student':
        return [
          { id: 'dashboard', label: 'Student Portal', icon: LayoutDashboard },
          { id: 'my-attendance', label: 'My Attendance', icon: CalendarCheck },
          { id: 'marks', label: 'Semester Results & CGPA', icon: Award },
          { id: 'academics', label: 'Study Materials', icon: BookOpen },
          { id: 'timetable', label: 'Class Timetable', icon: Clock },
          { id: 'leave', label: 'Submit Leave / Outing', icon: FileCheck },
          { id: 'fees', label: 'Fee Invoices & Receipts', icon: DollarSign },
          { id: 'transport', label: 'Bus Routes & Stops', icon: Bus },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
          { id: 'profile', label: 'Student Profile', icon: User },
        ];

      case 'parent':
        return [
          { id: 'dashboard', label: 'Parent Portal', icon: LayoutDashboard },
          { id: 'child-attendance', label: 'Child Attendance', icon: CalendarCheck },
          { id: 'marks', label: 'Child Results & CGPA', icon: Award },
          { id: 'leave', label: 'Leave & Outing Status', icon: FileCheck },
          { id: 'fees', label: 'College Fees', icon: DollarSign },
          { id: 'notifications', label: 'Absent Alerts & Notices', icon: Bell, badge: unreadNotifs },
          { id: 'profile', label: 'Profile', icon: User },
        ];

      case 'cashier':
        return [
          { id: 'dashboard', label: 'Cashier Dashboard', icon: LayoutDashboard },
          { id: 'fees', label: 'Student Fees & Payments', icon: DollarSign },
          { id: 'my-salary', label: 'My Salary', icon: CreditCard },
          { id: 'my-attendance', label: 'My Attendance', icon: CalendarCheck },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
          { id: 'profile', label: 'My Profile', icon: User },
        ];

      case 'library_staff':
        return [
          { id: 'dashboard', label: 'Library Dashboard', icon: LayoutDashboard },
          { id: 'library', label: 'Manage Books & Issue', icon: Library },
          { id: 'my-salary', label: 'My Salary', icon: CreditCard },
          { id: 'my-attendance', label: 'My Attendance', icon: CalendarCheck },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
          { id: 'profile', label: 'My Profile', icon: User },
        ];

      case 'driver':
        return [
          { id: 'dashboard', label: 'Driver Dashboard', icon: LayoutDashboard },
          { id: 'transport', label: 'My Bus Route & Stops', icon: Bus },
          { id: 'my-salary', label: 'My Salary', icon: CreditCard },
          { id: 'my-attendance', label: 'My Attendance', icon: CalendarCheck },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
          { id: 'profile', label: 'My Profile', icon: User },
        ];

      default: // watchman, attender, lab_technician
        return [
          { id: 'dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
          { id: 'my-attendance', label: 'My Attendance', icon: CalendarCheck },
          { id: 'my-salary', label: 'My Salary & Pay', icon: CreditCard },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
          { id: 'profile', label: 'My Profile', icon: User },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-badge">
          <GraduationCap size={24} />
        </div>
        <div>
          <h1 className="logo-title">EduSphere</h1>
          <span className="logo-sub">College Portal</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Main Menu</span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setView(item.id);
                setMobileOpen(false);
              }}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {Boolean(item.badge && item.badge > 0) && (
                <span className="badge-count">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">
            {user?.profile_photo ? (
              <img src={user.profile_photo} alt={user.name} />
            ) : (
              user?.name ? user.name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <div className="user-meta" style={{ flex: 1 }}>
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role-badge">
              {role.replace('_', ' ')}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Sign Out"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
