import React, { useState, useEffect } from 'react';
import { api, getStoredUser, clearAuth } from './services/api';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import LoginView from './views/LoginView';
import DashboardOverview from './views/DashboardOverview';
import StudentsView from './views/StudentsView';
import TeachersView from './views/TeachersView';
import StaffView from './views/StaffView';
import ParentsView from './views/ParentsView';
import AttendanceView from './views/AttendanceView';
import StudentAttendanceView from './views/StudentAttendanceView';
import AcademicsView from './views/AcademicsView';
import MarksView from './views/MarksView';
import LeaveView from './views/LeaveView';
import FeesView from './views/FeesView';
import SalaryView from './views/SalaryView';
import LibraryView from './views/LibraryView';
import TransportView from './views/TransportView';
import NotificationsView from './views/NotificationsView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';

// Role permissions: which views each role is allowed to access
const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'students', 'teachers', 'parents', 'staff',
    'attendance', 'teacher-attendance', 'academics', 'marks', 'fees',
    'library', 'leave', 'timetable', 'salary', 'transport',
    'notifications', 'settings', 'profile'
  ],
  teacher: [
    'dashboard', 'students', 'attendance', 'teacher-attendance', 'my-attendance',
    'academics', 'marks', 'leave', 'timetable', 'my-salary',
    'notifications', 'profile'
  ],
  student: [
    'dashboard', 'my-attendance', 'marks', 'academics', 'timetable',
    'leave', 'fees', 'transport', 'notifications', 'profile'
  ],
  parent: [
    'dashboard', 'child-attendance', 'marks', 'leave', 'fees',
    'notifications', 'profile'
  ],
  cashier: [
    'dashboard', 'fees', 'my-salary', 'my-attendance', 'notifications', 'profile'
  ],
  library_staff: [
    'dashboard', 'library', 'my-salary', 'my-attendance', 'notifications', 'profile'
  ],
  driver: [
    'dashboard', 'transport', 'my-salary', 'my-attendance', 'notifications', 'profile'
  ],
};

// Default allowed for roles not listed (watchman, attender, lab_technician etc.)
const DEFAULT_STAFF_PERMISSIONS = [
  'dashboard', 'my-attendance', 'my-salary', 'notifications', 'profile'
];

function isViewAllowed(role, view) {
  const allowed = ROLE_PERMISSIONS[role] || DEFAULT_STAFF_PERMISSIONS;
  return allowed.includes(view);
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Sync auth state if session expires or unauthorized
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setCurrentView('dashboard');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Poll notifications count when logged in
  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const data = await api.getNotifications();
        setUnreadNotifs(data.unread_count || 0);
      } catch (err) {
        // quiet failure
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (authenticatedUser) => {
    setUser(authenticatedUser);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleProfileUpdated = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  // Safe view setter — enforces role-based access
  const handleSetView = (view) => {
    if (!user) return;
    const role = user.role;
    if (isViewAllowed(role, view)) {
      setCurrentView(view);
    } else {
      // Redirect to dashboard if not permitted
      setCurrentView('dashboard');
    }
    setMobileOpen(false);
  };

  // If not logged in, show Login Screen
  if (!user) {
    return <LoginView onLoginSuccess={handleLogin} />;
  }

  const role = user?.role || 'admin';

  // Determine current page title
  const getHeaderMeta = () => {
    switch (currentView) {
      case 'dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Real-time college analytics & quick actions' };
      case 'students':
        return { title: 'Student Management', subtitle: 'Enrollment registry, profiles, and parent links' };
      case 'teachers':
        return { title: 'Faculty & Teachers', subtitle: 'Academic lecturers, designations, and salaries' };
      case 'staff':
        return { title: 'College Management Staff', subtitle: 'Security, transport drivers, cashier, attenders, and lab techs' };
      case 'parents':
        return { title: 'Parents Directory', subtitle: 'Verified guardian profiles linked with students' };
      case 'attendance':
      case 'teacher-attendance':
        return { title: 'Attendance Register', subtitle: 'Daily class logs with automatic absent parent alerts' };
      case 'my-attendance':
        return role === 'student'
          ? { title: 'My Attendance', subtitle: 'Your personal attendance records and subject-wise breakdown' }
          : { title: 'My Attendance', subtitle: 'Your personal attendance log' };
      case 'child-attendance':
        return { title: 'Child Attendance', subtitle: 'Your child\'s daily attendance records' };
      case 'academics':
        return { title: 'Academic Management', subtitle: 'Curriculum subjects, lecture notes, and timetables' };
      case 'timetable':
        return { title: 'Class Timetable', subtitle: 'Weekly schedules, periods, lecture rooms, and timings' };
      case 'marks':
        return role === 'student'
          ? { title: 'Semester Results & CGPA', subtitle: 'Cumulative Grade Point Average, semester SGPAs, and marks' }
          : { title: 'Marks, Results & CGPA', subtitle: 'Subject marks, credits, automated grades, SGPA and CGPA' };
      case 'leave':
        return { title: 'Leave & Outing Gate Passes', subtitle: 'Digital request submissions, faculty review & permissions' };
      case 'fees':
        return role === 'student'
          ? { title: 'My Fee Details', subtitle: 'Your fee invoices, payments, and balance due' }
          : { title: 'Student Fees & Accounts', subtitle: 'Tuition fees ledger, cashier receipts, and balances' };
      case 'salary':
      case 'my-salary':
        return { title: 'Payroll & Salary Payments', subtitle: 'Staff compensations, disbursements, and monthly slips' };
      case 'library':
        return { title: 'College Library', subtitle: 'Book catalog, issues, returns, and inventory loans' };
      case 'transport':
        return { title: 'Bus Routes & Stops', subtitle: 'Bus stops, driver details, and fleet routes' };
      case 'notifications':
        return { title: 'Notifications & Alerts', subtitle: 'Absent notices, approvals, and campus announcements' };
      case 'settings':
        return { title: 'System Settings', subtitle: 'College accreditation and institutional parameters' };
      case 'profile':
        return { title: 'My User Profile', subtitle: 'Personal credentials and account settings' };
      default:
        return { title: 'EduSphere Portal', subtitle: '' };
    }
  };

  const { title, subtitle } = getHeaderMeta();

  // Component to render for unauthorized view attempt
  const UnauthorizedView = () => (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
      <h2 style={{ marginBottom: '8px', color: 'var(--text-main)' }}>Access Restricted</h2>
      <p>You do not have permission to view this section.</p>
      <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setCurrentView('dashboard')}>
        Return to Dashboard
      </button>
    </div>
  );

  // Check if current view is allowed for the current role
  const viewAllowed = isViewAllowed(role, currentView);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        user={user}
        currentView={currentView}
        setView={handleSetView}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        unreadNotifs={unreadNotifs}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Navbar
          user={user}
          title={title}
          subtitle={subtitle}
          onToggleMenu={() => setMobileOpen((prev) => !prev)}
          unreadNotifs={unreadNotifs}
          onNotificationClick={() => handleSetView('notifications')}
          onLogout={handleLogout}
        />

        <main className="page-container">
          {/* If the view is not allowed for this role, show the unauthorized screen */}
          {!viewAllowed && <UnauthorizedView />}

          {viewAllowed && (
            <>
              {currentView === 'dashboard' && (
                <DashboardOverview user={user} setView={handleSetView} />
              )}

              {/* ===== ADMIN-ONLY VIEWS ===== */}
              {currentView === 'students' && role === 'admin' && (
                <StudentsView currentUser={user} />
              )}
              {currentView === 'students' && role === 'teacher' && (
                <StudentsView currentUser={user} />
              )}
              {currentView === 'teachers' && role === 'admin' && (
                <TeachersView currentUser={user} />
              )}
              {currentView === 'staff' && role === 'admin' && (
                <StaffView currentUser={user} />
              )}
              {currentView === 'parents' && role === 'admin' && (
                <ParentsView currentUser={user} />
              )}
              {currentView === 'settings' && role === 'admin' && (
                <SettingsView currentUser={user} />
              )}
              {currentView === 'salary' && role === 'admin' && (
                <SalaryView currentUser={user} />
              )}

              {/* ===== ATTENDANCE ===== */}
              {/* Admin / Teacher: full class attendance manager */}
              {currentView === 'attendance' && (role === 'admin' || role === 'teacher') && (
                <AttendanceView currentUser={user} />
              )}
              {currentView === 'teacher-attendance' && (role === 'admin' || role === 'teacher') && (
                <AttendanceView currentUser={user} />
              )}
              {/* Student: personal attendance only */}
              {currentView === 'my-attendance' && role === 'student' && (
                <StudentAttendanceView currentUser={user} />
              )}
              {/* Cashier / staff: their own attendance */}
              {currentView === 'my-attendance' && role !== 'student' && role !== 'admin' && (
                <AttendanceView currentUser={user} />
              )}
              {/* Parent: child's attendance */}
              {currentView === 'child-attendance' && role === 'parent' && (
                <AttendanceView currentUser={user} />
              )}

              {/* ===== ACADEMICS / TIMETABLE ===== */}
              {(currentView === 'academics' || currentView === 'timetable') && (
                <AcademicsView currentUser={user} initialTab={currentView === 'timetable' ? 'timetable' : 'subjects'} />
              )}

              {/* ===== MARKS — filtered by role in backend ===== */}
              {currentView === 'marks' && (
                <MarksView currentUser={user} />
              )}

              {/* ===== LEAVE ===== */}
              {currentView === 'leave' && (
                <LeaveView currentUser={user} />
              )}

              {/* ===== FEES — filtered by role in backend ===== */}
              {currentView === 'fees' && (
                <FeesView currentUser={user} />
              )}

              {/* ===== SALARY ===== */}
              {currentView === 'my-salary' && (
                <SalaryView currentUser={user} />
              )}

              {/* ===== LIBRARY ===== */}
              {currentView === 'library' && (
                <LibraryView currentUser={user} />
              )}

              {/* ===== TRANSPORT ===== */}
              {currentView === 'transport' && (
                <TransportView currentUser={user} />
              )}

              {/* ===== NOTIFICATIONS ===== */}
              {currentView === 'notifications' && (
                <NotificationsView currentUser={user} />
              )}

              {/* ===== PROFILE ===== */}
              {currentView === 'profile' && (
                <ProfileView user={user} onProfileUpdated={handleProfileUpdated} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
