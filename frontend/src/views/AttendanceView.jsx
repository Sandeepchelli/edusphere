import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Filter,
  Users,
  Check,
  X,
  FileCheck,
  Bell
} from 'lucide-react';

export default function AttendanceView({ currentUser }) {
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'teachers' | 'staff'

  // Student Attendance Form & Filter States
  const [classYear, setClassYear] = useState('1st Year');
  const [section, setSection] = useState('A');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('1');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Class Students & Attendance Map
  const [classStudents, setClassStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { student_id: 'present' | 'absent' }
  const [existingSummary, setExistingSummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Teacher Attendance (Admin)
  const [teachersList, setTeachersList] = useState([]);
  const [teacherAttMap, setTeacherAttMap] = useState({});
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);

  // Staff Attendance (Admin)
  const [staffList, setStaffList] = useState([]);
  const [staffAttMap, setStaffAttMap] = useState({});
  const [staffDate, setStaffDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch subjects for dropdown
  useEffect(() => {
    api.getSubjects().then((subs) => {
      setSubjects(subs);
      if (subs.length > 0) setSelectedSubject(subs[0].id);
    }).catch(console.error);
  }, []);

  // Fetch class students and existing attendance
  const loadClassAttendance = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // 1. Get all students in this class and section
      const students = await api.getStudents({ class_year: classYear, section });
      setClassStudents(students);

      // 2. Check if attendance already recorded for this date & period
      const existing = await api.getStudentAttendance({
        class_year: classYear,
        section,
        date,
        period,
      });

      const map = {};
      // Default all to 'present' initially
      students.forEach((s) => {
        map[s.id] = 'present';
      });

      // Override with recorded statuses
      if (existing.records && existing.records.length > 0) {
        existing.records.forEach((r) => {
          map[r.student_id] = r.status.toLowerCase() === 'absent' ? 'absent' : 'present';
        });
        setExistingSummary(existing.summary);
      } else {
        setExistingSummary(null);
      }

      setAttendanceMap(map);
    } catch (err) {
      setError(err.message || 'Failed to load class attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students') {
      loadClassAttendance();
    } else if (activeTab === 'teachers') {
      loadTeachersAttendance();
    } else if (activeTab === 'staff') {
      loadStaffAttendance();
    }
  }, [classYear, section, date, period, activeTab, teacherDate, staffDate]);

  const handleToggleStudent = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status) => {
    const updated = {};
    classStudents.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleSaveStudentAttendance = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const attendanceList = classStudents.map((s) => ({
        student_id: s.id,
        status: attendanceMap[s.id] || 'present',
      }));

      const res = await api.markStudentAttendance({
        class_year: classYear,
        section,
        subject_id: selectedSubject || null,
        date,
        period,
        attendance_list: attendanceList,
      });

      setMessage(
        `Attendance recorded successfully for ${res.records_saved} student(s). ` +
        (res.absent_alerts_sent > 0
          ? `(${res.absent_alerts_sent} parent absent alert(s) dispatched).`
          : '')
      );
      loadClassAttendance();
    } catch (err) {
      setError(err.message || 'Failed to record attendance.');
    } finally {
      setSaving(false);
    }
  };

  // TEACHER ATTENDANCE LOGIC
  const loadTeachersAttendance = async () => {
    try {
      const tList = await api.getTeachers();
      setTeachersList(tList);
      const existing = await api.getTeacherAttendance({ date: teacherDate });
      const map = {};
      tList.forEach((t) => { map[t.id] = 'present'; });
      existing.forEach((e) => { map[e.teacher_id] = e.status; });
      setTeacherAttMap(map);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTeacherAttendance = async () => {
    try {
      setSaving(true);
      const records = teachersList.map((t) => ({
        teacher_id: t.id,
        status: teacherAttMap[t.id] || 'present',
      }));
      await api.markTeacherAttendance({ date: teacherDate, records });
      setMessage('Teacher attendance updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save teacher attendance.');
    } finally {
      setSaving(false);
    }
  };

  // STAFF ATTENDANCE LOGIC
  const loadStaffAttendance = async () => {
    try {
      const sList = await api.getStaff();
      setStaffList(sList);
      const existing = await api.getStaffAttendance({ date: staffDate });
      const map = {};
      sList.forEach((s) => { map[s.id] = 'present'; });
      existing.forEach((e) => { map[e.staff_id] = e.status; });
      setStaffAttMap(map);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveStaffAttendance = async () => {
    try {
      setSaving(true);
      const records = staffList.map((s) => ({
        staff_id: s.id,
        status: staffAttMap[s.id] || 'present',
      }));
      await api.markStaffAttendance({ date: staffDate, records });
      setMessage('Staff attendance updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save staff attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Calculated stats for student view
  const totalCount = classStudents.length;
  const presentCount = Object.values(attendanceMap).filter((s) => s === 'present').length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === 'absent').length;
  const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

  return (
    <div>
      {/* Tab Switcher */}
      {currentUser?.role === 'admin' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('students')}
          >
            <span>Student Attendance</span>
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'teachers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('teachers')}
          >
            <span>Faculty Attendance</span>
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('staff')}
          >
            <span>Support Staff Attendance</span>
          </button>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* STUDENT ATTENDANCE TAB */}
      {activeTab === 'students' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Class Attendance Register</h3>
              <p>Select class, section, subject and period to mark attendance with automatic parent absent alerts</p>
            </div>

            <div className="card-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleMarkAll('present')}
              >
                <Check size={14} />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleMarkAll('absent')}
              >
                <X size={14} />
                <span>Mark All Absent</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveStudentAttendance}
                disabled={saving || classStudents.length === 0}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Submit Attendance'}</span>
              </button>
            </div>
          </div>

          {/* Filter / Selector Bar */}
          <div 
            style={{ 
              padding: '18px 24px', 
              background: 'var(--bg-card-subtle)', 
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            <div className="form-group" style={{ minWidth: '130px' }}>
              <label className="form-label">Class / Year</label>
              <select
                className="select-filter"
                value={classYear}
                onChange={(e) => setClassYear(e.target.value)}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="form-group" style={{ minWidth: '100px' }}>
              <label className="form-label">Section</label>
              <select
                className="select-filter"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                <option value="A">Sec A</option>
                <option value="B">Sec B</option>
                <option value="C">Sec C</option>
                <option value="D">Sec D</option>
              </select>
            </div>

            <div className="form-group" style={{ minWidth: '180px' }}>
              <label className="form-label">Subject</label>
              <select
                className="select-filter"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">General Class</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: '150px' }}>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ minWidth: '110px' }}>
              <label className="form-label">Period</label>
              <select
                className="select-filter"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="1">Period 1</option>
                <option value="2">Period 2</option>
                <option value="3">Period 3</option>
                <option value="4">Period 4</option>
                <option value="5">Period 5</option>
                <option value="6">Period 6</option>
                <option value="7">Period 7</option>
              </select>
            </div>

            {/* Attendance Summary Pill */}
            <div 
              style={{ 
                marginLeft: 'auto', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                background: 'white',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem'
              }}
            >
              <div>Total: <strong>{totalCount}</strong></div>
              <div style={{ color: '#059669' }}>Present: <strong>{presentCount}</strong></div>
              <div style={{ color: '#dc2626' }}>Absent: <strong>{absentCount}</strong></div>
              <div style={{ color: 'var(--primary)' }}>Rate: <strong>{percentage}%</strong></div>
            </div>
          </div>

          {/* Student List Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Linked Parent</th>
                  <th>Attendance Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Loading class students...
                    </td>
                  </tr>
                ) : classStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No students enrolled in {classYear} - Section {section}.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((s) => {
                    const status = attendanceMap[s.id] || 'present';
                    const isPresent = status === 'present';

                    return (
                      <tr 
                        key={s.id}
                        style={{ backgroundColor: !isPresent ? '#fef2f2' : 'transparent' }}
                      >
                        <td><span style={{ fontWeight: 600 }}>{s.roll_number || '—'}</span></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.student_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>@{s.username}</div>
                        </td>
                        <td>{s.student_id}</td>
                        <td>
                          {s.parent_name ? (
                            <div>
                              <div>{s.parent_name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.parent_phone}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-light)' }}>No linked parent</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}>
                            {status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${isPresent ? 'btn-success' : 'btn-secondary'}`}
                              onClick={() => handleToggleStudent(s.id, 'present')}
                            >
                              <Check size={14} />
                              <span>Present</span>
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${!isPresent ? 'btn-danger' : 'btn-secondary'}`}
                              onClick={() => handleToggleStudent(s.id, 'absent')}
                            >
                              <X size={14} />
                              <span>Absent</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div 
            style={{ 
              padding: '16px 24px', 
              background: 'var(--bg-card-subtle)', 
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: 'var(--text-muted)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={16} color="var(--primary)" />
              <span>
                <strong>Smart Notification Rule:</strong> Marking a student absent automatically sends an instant Absent Alert to their linked parent (unless an approved leave exists for this date).
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveStudentAttendance}
              disabled={saving || classStudents.length === 0}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save & Submit Attendance'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TEACHER ATTENDANCE TAB */}
      {activeTab === 'teachers' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Faculty Attendance Register</h3>
              <p>Track daily presence for all teaching faculty members</p>
            </div>

            <div className="card-actions">
              <input
                type="date"
                className="form-control"
                value={teacherDate}
                onChange={(e) => setTeacherDate(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveTeacherAttendance}
                disabled={saving}
              >
                <Save size={16} />
                <span>Save Teacher Attendance</span>
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Teacher ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachersList.map((t) => {
                  const isPresent = (teacherAttMap[t.id] || 'present') === 'present';
                  return (
                    <tr key={t.id}>
                      <td><strong>{t.teacher_name}</strong></td>
                      <td>{t.teacher_id}</td>
                      <td>{t.department}</td>
                      <td>{t.designation}</td>
                      <td>
                        <span className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}>
                          {teacherAttMap[t.id] || 'present'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${isPresent ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => setTeacherAttMap({ ...teacherAttMap, [t.id]: 'present' })}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${!isPresent ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => setTeacherAttMap({ ...teacherAttMap, [t.id]: 'absent' })}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STAFF ATTENDANCE TAB */}
      {activeTab === 'staff' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>College Staff Attendance Register</h3>
              <p>Record daily attendance for watchmen, drivers, attenders, canteen, and lab technicians</p>
            </div>

            <div className="card-actions">
              <input
                type="date"
                className="form-control"
                value={staffDate}
                onChange={(e) => setStaffDate(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveStaffAttendance}
                disabled={saving}
              >
                <Save size={16} />
                <span>Save Staff Attendance</span>
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Staff ID</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => {
                  const isPresent = (staffAttMap[s.id] || 'present') === 'present';
                  return (
                    <tr key={s.id}>
                      <td><strong>{s.staff_name}</strong></td>
                      <td>{s.staff_id}</td>
                      <td style={{ textTransform: 'capitalize' }}>{s.role.replace('_', ' ')}</td>
                      <td>{s.department || 'Operations'}</td>
                      <td>
                        <span className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}>
                          {staffAttMap[s.id] || 'present'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${isPresent ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => setStaffAttMap({ ...staffAttMap, [s.id]: 'present' })}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${!isPresent ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => setStaffAttMap({ ...staffAttMap, [s.id]: 'absent' })}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
