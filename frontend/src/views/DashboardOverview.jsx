import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatCard from '../components/StatCard';
import {
  GraduationCap,
  UserCheck,
  ShieldAlert,
  Users,
  DollarSign,
  CalendarCheck,
  FileCheck,
  Library,
  BookOpen,
  Clock,
  Bus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Award
} from 'lucide-react';

export default function DashboardOverview({ user, setView }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
        Loading your dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <span>⚠ {error}</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
          If this problem persists, your profile may not be fully set up. Contact your administrator.
        </p>
        <button className="btn btn-secondary" onClick={loadStats}>Try Again</button>
      </div>
    );
  }

  const role = user?.role || 'admin';

  return (
    <div>
      {/* Welcome banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div>
          <span 
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              padding: '4px 12px', 
              borderRadius: '99px', 
              fontSize: '0.75rem', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            EduSphere College Management
          </span>
          <h2 style={{ color: 'white', fontSize: '1.65rem', fontWeight: 800, marginTop: '8px' }}>
            Welcome back, {user?.name || 'Administrator'}!
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: '4px' }}>
            Role: <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#93c5fd' }}>{role.replace('_', ' ')}</span> &bull; Current Session: 2026-2027
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {role === 'admin' && (
            <>
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'white', color: '#1e1b4b' }}
                onClick={() => setView('students')}
              >
                <span>Add Student</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setView('teachers')}
              >
                <span>Add Teacher</span>
              </button>
            </>
          )}

          {role === 'teacher' && (
            <>
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'white', color: '#1e1b4b' }}
                onClick={() => setView('attendance')}
              >
                <span>Mark Attendance</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setView('marks')}
              >
                <span>Enter Marks</span>
              </button>
            </>
          )}

          {role === 'student' && (
            <>
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'white', color: '#1e1b4b' }}
                onClick={() => setView('leave')}
              >
                <span>Request Leave / Outing</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setView('marks')}
              >
                <span>View My Report Card</span>
              </button>
            </>
          )}

          {role === 'parent' && (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => setView('child-attendance')}
            >
              <span>View Attendance Log</span>
            </button>
          )}
        </div>
      </div>

      {/* ADMIN STATS */}
      {role === 'admin' && stats && (
        <>
          <div className="stats-grid">
            <StatCard 
              title="Total Students" 
              value={stats.studentCount || 0} 
              subtext="Enrolled across all classes"
              icon={GraduationCap}
              color="var(--primary)"
              bgLight="var(--primary-light)"
            />
            <StatCard 
              title="Total Faculty" 
              value={stats.teacherCount || 0} 
              subtext="Registered teaching staff"
              icon={UserCheck}
              color="#0ea5e9"
              bgLight="#e0f2fe"
            />
            <StatCard 
              title="Management Staff" 
              value={stats.staffCount || 0} 
              subtext="Support & operational staff"
              icon={ShieldAlert}
              color="#8b5cf6"
              bgLight="#f3e8ff"
            />
            <StatCard 
              title="Linked Parents" 
              value={stats.parentCount || 0} 
              subtext="Verified parent accounts"
              icon={Users}
              color="#10b981"
              bgLight="#ecfdf5"
            />
          </div>

          <div className="stats-grid">
            <StatCard 
              title="Today's Attendance Rate" 
              value={`${stats.todayAttendance?.rate || 0}%`} 
              subtext={`${stats.todayAttendance?.present || 0} present of ${stats.todayAttendance?.total || 0} marked`}
              icon={CalendarCheck}
              color="#10b981"
              bgLight="#ecfdf5"
            />
            <StatCard 
              title="Fees Collected" 
              value={`₹${(stats.fees?.paid || 0).toLocaleString('en-IN')}`} 
              subtext={`Pending: ₹${(stats.fees?.pending || 0).toLocaleString('en-IN')}`}
              icon={DollarSign}
              color="#f59e0b"
              bgLight="#fffbeb"
            />
            <StatCard 
              title="Pending Leaves / Outings" 
              value={stats.pendingLeaves || 0} 
              subtext="Requests awaiting review"
              icon={FileCheck}
              color="#ef4444"
              bgLight="#fef2f2"
            />
            <StatCard 
              title="Library Books" 
              value={stats.library?.totalBooks || 0} 
              subtext={`${stats.library?.borrowedBooks || 0} currently borrowed`}
              icon={Library}
              color="#6366f1"
              bgLight="#eef2ff"
            />
          </div>
        </>
      )}

      {/* TEACHER STATS */}
      {role === 'teacher' && stats && (
        <>
          <div className="stats-grid">
            <StatCard 
              title="Assigned Subjects" 
              value={stats.subjectsCount || 0} 
              subtext="Active academic modules"
              icon={BookOpen}
              color="var(--primary)"
              bgLight="var(--primary-light)"
            />
            <StatCard 
              title="Uploaded Materials" 
              value={stats.materialsCount || 0} 
              subtext="Study resources & notes"
              icon={Library}
              color="#0ea5e9"
              bgLight="#e0f2fe"
            />
            <StatCard 
              title="Pending Student Leaves" 
              value={stats.pendingLeaves || 0} 
              subtext="Requests awaiting approval"
              icon={FileCheck}
              color="#f59e0b"
              bgLight="#fffbeb"
            />
            <StatCard 
              title="Classes Scheduled" 
              value={stats.todayClasses?.length || 0} 
              subtext="Periods in weekly timetable"
              icon={Clock}
              color="#10b981"
              bgLight="#ecfdf5"
            />
          </div>

          {stats.todayClasses && stats.todayClasses.length > 0 && (
            <div className="content-card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3>My Timetable Schedule</h3>
                  <p>Weekly allocated lecture hours and locations</p>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Period</th>
                      <th>Time</th>
                      <th>Subject</th>
                      <th>Class & Section</th>
                      <th>Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.todayClasses.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.day}</strong></td>
                        <td>Period {item.period}</td>
                        <td>{item.time}</td>
                        <td>{item.subject_name || 'General'}</td>
                        <td>{item.class_year} - Sec {item.section}</td>
                        <td>{item.room || 'TBD'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* STUDENT STATS */}
      {role === 'student' && stats && (
        <div className="stats-grid">
          <StatCard 
            title="CGPA" 
            value={stats.cgpa ? Number(stats.cgpa).toFixed(2) : '0.00'} 
            subtext={stats.latestSgpa ? `Latest SGPA: ${Number(stats.latestSgpa).toFixed(2)} (${stats.latestSemester || 'Sem'})` : 'Cumulative Grade Point Average'}
            icon={Award}
            color="#4f46e5"
            bgLight="#eef2ff"
          />
          <StatCard 
            title="Overall Attendance" 
            value={`${stats.attendanceRate || 0}%`} 
            subtext={`${stats.totalAttendanceClasses || 0} class sessions logged`}
            icon={CalendarCheck}
            color="#10b981"
            bgLight="#ecfdf5"
          />
          <StatCard 
            title="Academic Subjects" 
            value={stats.subjectsCount || 0} 
            subtext="Enrolled courses"
            icon={BookOpen}
            color="#0ea5e9"
            bgLight="#e0f2fe"
          />
          <StatCard 
            title="College Fee Status" 
            value={stats.fee?.status || 'N/A'} 
            subtext={`Balance due: ₹${(stats.fee?.amount_pending || 0).toLocaleString('en-IN')}`}
            icon={DollarSign}
            color={stats.fee?.amount_pending > 0 ? '#ef4444' : '#10b981'}
            bgLight={stats.fee?.amount_pending > 0 ? '#fef2f2' : '#ecfdf5'}
          />
          <StatCard 
            title="Borrowed Books" 
            value={stats.borrowedBooks || 0} 
            subtext="Books from college library"
            icon={Library}
            color="#8b5cf6"
            bgLight="#f3e8ff"
          />
        </div>
      )}

      {/* PARENT STATS */}
      {role === 'parent' && stats && (
        <>
          <div className="stats-grid">
            <StatCard 
              title="Child CGPA" 
              value={stats.firstChildCgpa ? Number(stats.firstChildCgpa).toFixed(2) : '0.00'} 
              subtext="Academic Grade Point Average"
              icon={Award}
              color="#4f46e5"
              bgLight="#eef2ff"
            />
            <StatCard 
              title="Child Attendance Rate" 
              value={`${stats.firstChildAttRate || 0}%`} 
              subtext="Live academic attendance"
              icon={CalendarCheck}
              color="#10b981"
              bgLight="#ecfdf5"
            />
            <StatCard 
              title="Enrolled Children" 
              value={stats.children?.length || 0} 
              subtext="Linked student profiles"
              icon={GraduationCap}
              color="var(--primary)"
              bgLight="var(--primary-light)"
            />
          </div>

          {stats.children && stats.children.length > 0 && (
            <div className="content-card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3>My Linked Children</h3>
                  <p>Academic performance, CGPA, and enrollment status</p>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Student ID</th>
                      <th>Overall CGPA</th>
                      <th>Class / Year</th>
                      <th>Department & Section</th>
                      <th>Fee Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.children.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.student_name}</strong></td>
                        <td>{c.student_id}</td>
                        <td>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#4f46e5' }}>
                            {c.cgpa ? Number(c.cgpa).toFixed(2) : '0.00'}
                          </span>
                        </td>
                        <td>{c.class_year}</td>
                        <td>{c.department} - Section {c.section}</td>
                        <td>
                          <span className={`badge ${c.fee_status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                            {c.fee_status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setView('marks')}
                          >
                            <span>View Results & CGPA</span>
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Access Matrix */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Quick Actions</h3>
            <p>Direct shortcuts for frequent operations</p>
          </div>
        </div>
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {role === 'admin' && (
            <>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('students')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <GraduationCap size={20} color="var(--primary)" />
                <span>Manage Students</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('teachers')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <UserCheck size={20} color="#0ea5e9" />
                <span>Manage Teachers</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('attendance')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <CalendarCheck size={20} color="#10b981" />
                <span>Class Attendance</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('fees')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <DollarSign size={20} color="#f59e0b" />
                <span>Fees & Cashier</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('salary')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <ShieldAlert size={20} color="#8b5cf6" />
                <span>Staff Salary</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('notifications')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <CheckCircle2 size={20} color="#ec4899" />
                <span>Broadcast Notice</span>
              </button>
            </>
          )}

          {role === 'teacher' && (
            <>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('attendance')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <CalendarCheck size={20} color="#10b981" />
                <span>Mark Attendance</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('marks')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <Award size={20} color="var(--primary)" />
                <span>Enter Exam Marks</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('academics')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <BookOpen size={20} color="#0ea5e9" />
                <span>Upload Materials</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('leave')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <FileCheck size={20} color="#f59e0b" />
                <span>Approve Leaves</span>
              </button>
            </>
          )}

          {role === 'student' && (
            <>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('my-attendance')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <CalendarCheck size={20} color="#10b981" />
                <span>My Attendance</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('marks')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <Award size={20} color="var(--primary)" />
                <span>Semester Results</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('leave')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <FileCheck size={20} color="#f59e0b" />
                <span>Request Outing / Leave</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setView('transport')}
                style={{ justifyContent: 'flex-start', padding: '16px' }}
              >
                <Bus size={20} color="#0ea5e9" />
                <span>Bus Routes & Stops</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
