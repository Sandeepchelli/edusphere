import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  BookOpen,
  User,
  GraduationCap,
  Calendar,
  Layers,
  CheckCircle2,
  FileText
} from 'lucide-react';

// 10-point standard grading scale helper
function getGradeAndPoint(percentage) {
  if (percentage >= 90) return { grade: 'O', gradePoint: 10 };
  if (percentage >= 80) return { grade: 'A+', gradePoint: 9 };
  if (percentage >= 70) return { grade: 'A', gradePoint: 8 };
  if (percentage >= 60) return { grade: 'B+', gradePoint: 7 };
  if (percentage >= 50) return { grade: 'B', gradePoint: 6 };
  if (percentage >= 40) return { grade: 'C', gradePoint: 5 };
  return { grade: 'F', gradePoint: 0 };
}

export default function MarksView({ currentUser }) {
  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [semesterResults, setSemesterResults] = useState([]);
  const [overallCgpa, setOverallCgpa] = useState(0.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [filterExam, setFilterExam] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState(null);

  const initialForm = {
    student_id: '',
    subject_id: '',
    semester: 'Semester 1',
    exam_type: 'Semester Exam',
    marks_obtained: '',
    max_marks: '100',
    credits: '3',
    grade: 'A+',
    grade_point: '9',
    remarks: '',
  };
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const isTeacherOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
  const isStudent = currentUser?.role === 'student';
  const isParent = currentUser?.role === 'parent';

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (filterExam) params.exam_type = filterExam;
      if (filterSubject) params.subject_id = filterSubject;
      if (filterSemester) params.semester = filterSemester;

      if (isTeacherOrAdmin && selectedStudentId) {
        params.student_id = selectedStudentId;
      }

      const [marksList, subs] = await Promise.all([
        api.getMarks(params),
        api.getSubjects(),
      ]);

      setMarks(marksList);
      setSubjects(subs);

      // If student or parent, load their comprehensive academic report
      if (isStudent || isParent) {
        try {
          const report = await api.getMyResults();
          if (report) {
            setOverallCgpa(report.overallCgpa || 0.0);
            setSemesterResults(report.semesterResults || []);
          }
        } catch (repErr) {
          console.warn('Could not load student report:', repErr.message);
        }
      }

      if (isTeacherOrAdmin) {
        const studs = await api.getStudents();
        // If teacher has department, show department students first or filter
        let teacherStuds = studs;
        if (currentUser?.role === 'teacher' && currentUser?.department) {
          teacherStuds = studs.filter(s => !s.department || s.department.toLowerCase() === currentUser.department.toLowerCase());
        }
        setStudents(teacherStuds);

        if (teacherStuds.length > 0 && !form.student_id) {
          setForm(prev => ({ ...prev, student_id: teacherStuds[0].id }));
        }

        // If a specific student is selected by teacher/admin, load their semester results
        if (selectedStudentId) {
          try {
            const report = await api.getStudentReport(selectedStudentId);
            if (report) {
              setOverallCgpa(report.overallCgpa || 0.0);
              setSemesterResults(report.semesterResults || []);
            }
          } catch (rErr) {
            console.warn('Error loading student report:', rErr.message);
          }
        } else {
          // Compute average CGPA among listed marks
          setSemesterResults([]);
        }
      }

      if (subs.length > 0 && !form.subject_id) {
        setForm(prev => ({ ...prev, subject_id: subs[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load marks and results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterExam, filterSubject, filterSemester, selectedStudentId]);

  // Helper when changing marks in form to auto-compute grade and grade_point
  const handleMarksChange = (obtainedVal, maxVal) => {
    const obt = parseFloat(obtainedVal);
    const mx = parseFloat(maxVal);
    let grade = form.grade;
    let gradePoint = form.grade_point;

    if (!isNaN(obt) && !isNaN(mx) && mx > 0) {
      const pct = (obt / mx) * 100;
      const res = getGradeAndPoint(pct);
      grade = res.grade;
      gradePoint = String(res.gradePoint);
    }

    setForm(prev => ({
      ...prev,
      marks_obtained: obtainedVal,
      max_marks: maxVal,
      grade,
      grade_point: gradePoint
    }));
  };

  // Helper when changing subject to pre-fill subject's default credits and semester
  const handleSubjectChange = (subjectId) => {
    const sub = subjects.find(s => String(s.id) === String(subjectId));
    setForm(prev => ({
      ...prev,
      subject_id: subjectId,
      semester: sub?.semester || prev.semester || 'Semester 1',
      credits: sub?.credits ? String(sub.credits) : prev.credits || '3'
    }));
  };

  const handleOpenAdd = () => {
    const defaultSub = subjects[0];
    const defaultStudent = students[0];
    setForm({
      ...initialForm,
      student_id: defaultStudent?.id || '',
      subject_id: defaultSub?.id || '',
      semester: defaultSub?.semester || 'Semester 1',
      credits: defaultSub?.credits ? String(defaultSub.credits) : '3',
    });
    setError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (mark) => {
    setSelectedMark(mark);
    setForm({
      student_id: mark.student_id,
      subject_id: mark.subject_id,
      semester: mark.semester || 'Semester 1',
      exam_type: mark.exam_type,
      marks_obtained: mark.marks_obtained,
      max_marks: mark.max_marks,
      credits: mark.credits ? String(mark.credits) : '3',
      grade: mark.grade || 'A',
      grade_point: mark.grade_point !== undefined && mark.grade_point !== null ? String(mark.grade_point) : '8',
      remarks: mark.remarks || '',
    });
    setError('');
    setIsEditModalOpen(true);
  };

  const handleSaveMark = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await api.recordMarks(form);
      setSuccessMsg(`Marks recorded. Updated CGPA: ${res.cgpa !== undefined ? Number(res.cgpa).toFixed(2) : 'recalculated'}`);
      setIsAddModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to record marks.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMark = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await api.updateMarks(selectedMark.id, {
        marks_obtained: form.marks_obtained,
        max_marks: form.max_marks,
        semester: form.semester,
        credits: form.credits,
        grade: form.grade,
        grade_point: form.grade_point,
        remarks: form.remarks,
      });
      setSuccessMsg(`Marks updated. Recalculated CGPA: ${res.cgpa !== undefined ? Number(res.cgpa).toFixed(2) : 'saved'}`);
      setIsEditModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update marks.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMark = async (id) => {
    if (window.confirm('Delete this marks entry? CGPA will be automatically recalculated.')) {
      try {
        await api.deleteMarks(id);
        setSuccessMsg('Marks entry removed and CGPA updated.');
        loadData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err) {
        setError(err.message || 'Failed to delete marks entry.');
      }
    }
  };

  // Grade badge helper
  const getGradeBadge = (grade) => {
    if (grade === 'O' || grade === 'A+') return <span className="badge badge-success">{grade}</span>;
    if (grade === 'A' || grade === 'B+') return <span className="badge badge-info">{grade}</span>;
    if (grade === 'B' || grade === 'C') return <span className="badge badge-warning">{grade}</span>;
    return <span className="badge badge-danger">{grade || 'F'}</span>;
  };

  // Compute Overall Performance for student or current view
  let totalObtained = 0;
  let totalMax = 0;
  let totalCreditsEvaluated = 0;
  marks.forEach((m) => {
    totalObtained += m.marks_obtained;
    totalMax += m.max_marks;
    if (m.credits) totalCreditsEvaluated += parseFloat(m.credits);
  });
  const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : '0.00';

  return (
    <div>
      {/* Alert Messages */}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* PROMINENT CGPA & ACADEMIC BANNER */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: 'white',
          borderRadius: 'var(--radius-md)',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Award size={18} color="#a5b4fc" />
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c7d2fe', fontWeight: 600 }}>
              Academic Results & Grading Matrix
            </span>
          </div>
          <h2 style={{ color: 'white', fontSize: '1.65rem', fontWeight: 800, margin: '4px 0 6px 0' }}>
            {isStudent ? 'My Semester Results & CGPA' : (isParent ? 'Child Academic Results & CGPA' : 'Student Academic Evaluation')}
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', margin: 0, maxWidth: '520px' }}>
            Official semester performance based on Choice Based Credit System (CBCS). Grade points and credits are computed automatically.
          </p>
        </div>

        {/* CGPA Display Cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.12)', 
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--radius-md)', 
              padding: '14px 22px', 
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.18)'
            }}
          >
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#c7d2fe', letterSpacing: '0.05em' }}>
              Overall CGPA
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#38bdf8', lineHeight: 1.1, marginTop: '4px' }}>
              {Number(overallCgpa || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#e0e7ff', marginTop: '2px' }}>
              Scale of 10.0
            </div>
          </div>

          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.08)', 
              borderRadius: 'var(--radius-md)', 
              padding: '14px 20px', 
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#c7d2fe' }}>
              Evaluated Marks
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginTop: '4px' }}>
              {totalObtained} / {totalMax}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
              {overallPercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* SEMESTER-WISE BREAKDOWN (Requirement 5) */}
      {semesterResults && semesterResults.length > 0 && (
        <div className="content-card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div className="card-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--primary)" />
                <h3>Semester Results & SGPA History</h3>
              </div>
              <p>Semester-by-semester Grade Point Average (SGPA) and cumulative progress</p>
            </div>
          </div>

          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            {semesterResults.map((s) => (
              <div 
                key={s.semester}
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{s.semester}</strong>
                  <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                    {s.total_credits || 0} Credits
                  </span>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>SGPA:</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4f46e5' }}>
                    {Number(s.sgpa || 0).toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Cumulative CGPA:</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0ea5e9' }}>
                    {Number(s.cgpa || s.sgpa || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT CARD: SUBJECT MARKS TABLE */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Subject Marks & Assessment Register</h3>
            <p>Subject evaluation, semester assignments, credit weighting, and calculated grade points</p>
          </div>

          <div className="card-actions">
            {/* If Teacher or Admin, allow filtering by student */}
            {isTeacherOrAdmin && (
              <select
                className="select-filter"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{ maxWidth: '220px' }}
              >
                <option value="">All Students (Department)</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_name} ({s.student_id})
                  </option>
                ))}
              </select>
            )}

            <select
              className="select-filter"
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
            >
              <option value="">All Semesters</option>
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
              <option value="Semester 3">Semester 3</option>
              <option value="Semester 4">Semester 4</option>
              <option value="Semester 5">Semester 5</option>
              <option value="Semester 6">Semester 6</option>
              <option value="Semester 7">Semester 7</option>
              <option value="Semester 8">Semester 8</option>
            </select>

            <select
              className="select-filter"
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
            >
              <option value="">All Examinations</option>
              <option value="Semester Exam">Semester Exam</option>
              <option value="Mid-Term">Mid-Term</option>
              <option value="Internal 1">Internal 1</option>
              <option value="Internal 2">Internal 2</option>
              <option value="Lab Practical">Lab Practical</option>
            </select>

            <select
              className="select-filter"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>

            {isTeacherOrAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAdd}
              >
                <Plus size={16} />
                <span>Enter Student Marks</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {isTeacherOrAdmin && <th>Student</th>}
                <th>Subject & Code</th>
                <th>Semester</th>
                <th>Credits</th>
                <th>Exam Type</th>
                <th>Marks Obtained</th>
                <th>Maximum</th>
                <th>Grade</th>
                <th>Grade Point</th>
                <th>Evaluator</th>
                {isTeacherOrAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isTeacherOrAdmin ? 11 : 9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading academic records and recalculating grades...
                  </td>
                </tr>
              ) : marks.length === 0 ? (
                <tr>
                  <td colSpan={isTeacherOrAdmin ? 11 : 9} style={{ textAlign: 'center', padding: '44px', color: 'var(--text-muted)' }}>
                    No marks records found. {isTeacherOrAdmin && 'Click "Enter Student Marks" to evaluate students.'}
                  </td>
                </tr>
              ) : (
                marks.map((m) => (
                  <tr key={m.id}>
                    {isTeacherOrAdmin && (
                      <td>
                        <strong>{m.student_name}</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          ID: {m.student_reg_id} &bull; CGPA: <strong style={{ color: 'var(--primary)' }}>{m.student_cgpa ? Number(m.student_cgpa).toFixed(2) : '0.00'}</strong>
                        </div>
                      </td>
                    )}
                    <td>
                      <div><strong>{m.subject_name}</strong></div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{m.subject_code}</div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{m.semester || 'Semester 1'}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{m.credits || m.subject_credits || 3}</span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{m.exam_type}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                        {m.marks_obtained}
                      </span>
                    </td>
                    <td>{m.max_marks}</td>
                    <td>{getGradeBadge(m.grade)}</td>
                    <td>
                      <strong style={{ fontSize: '0.95rem' }}>{m.grade_point !== null && m.grade_point !== undefined ? m.grade_point : '—'}</strong>
                    </td>
                    <td>{m.teacher_name || 'Faculty'}</td>
                    {isTeacherOrAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(m)}
                            title="Edit Marks"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteMark(m.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ENTER MARKS */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enter Student Examination Marks & Credits"
        maxWidth="650px"
      >
        <form onSubmit={handleSaveMark}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Select Student <span className="required">*</span></label>
              <select
                className="form-control"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_name} ({s.student_id} - {s.department} {s.class_year} {s.section})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject <span className="required">*</span></label>
              <select
                className="form-control"
                value={form.subject_id}
                onChange={(e) => handleSubjectChange(e.target.value)}
                required
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} - {sub.name} ({sub.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Semester <span className="required">*</span></label>
              <select
                className="form-control"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                required
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 8">Semester 8</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Exam Assessment Type <span className="required">*</span></label>
              <select
                className="form-control"
                value={form.exam_type}
                onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
                required
              >
                <option value="Semester Exam">Semester Exam (Final)</option>
                <option value="Mid-Term">Mid-Term</option>
                <option value="Internal 1">Internal 1</option>
                <option value="Internal 2">Internal 2</option>
                <option value="Lab Practical">Lab Practical</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject Credits (1 - 6) <span className="required">*</span></label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                className="form-control"
                placeholder="e.g. 3 or 4"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Marks Obtained <span className="required">*</span></label>
              <input
                type="number"
                step="0.5"
                className="form-control"
                placeholder="e.g. 85"
                value={form.marks_obtained}
                onChange={(e) => handleMarksChange(e.target.value, form.max_marks)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Maximum Marks <span className="required">*</span></label>
              <input
                type="number"
                className="form-control"
                placeholder="100"
                value={form.max_marks}
                onChange={(e) => handleMarksChange(form.marks_obtained, e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Calculated Grade</label>
              <select
                className="form-control"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
              >
                <option value="O">O (Outstanding - 10)</option>
                <option value="A+">A+ (Excellent - 9)</option>
                <option value="A">A (Very Good - 8)</option>
                <option value="B+">B+ (Good - 7)</option>
                <option value="B">B (Above Average - 6)</option>
                <option value="C">C (Pass - 5)</option>
                <option value="F">F (Fail - 0)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Grade Point (0 - 10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                className="form-control"
                value={form.grade_point}
                onChange={(e) => setForm({ ...form, grade_point: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Remarks / Faculty Feedback</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Excellent problem solving in algorithms"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginTop: '16px', fontSize: '0.84rem', color: '#475569' }}>
            ℹ️ Submitting this evaluation will automatically calculate the student's <strong>SGPA</strong> for <strong>{form.semester}</strong> and recalculate overall <strong>CGPA</strong>.
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Calculating...' : 'Submit & Calculate SGPA / CGPA'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT MARKS */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Examination Marks & Credits"
        maxWidth="600px"
      >
        <form onSubmit={handleUpdateMark}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Semester</label>
              <select
                className="form-control"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 8">Semester 8</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Credits</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                className="form-control"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Marks Obtained <span className="required">*</span></label>
              <input
                type="number"
                step="0.5"
                className="form-control"
                value={form.marks_obtained}
                onChange={(e) => handleMarksChange(e.target.value, form.max_marks)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Maximum Marks <span className="required">*</span></label>
              <input
                type="number"
                className="form-control"
                value={form.max_marks}
                onChange={(e) => handleMarksChange(form.marks_obtained, e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Grade</label>
              <select
                className="form-control"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
              >
                <option value="O">O (10)</option>
                <option value="A+">A+ (9)</option>
                <option value="A">A (8)</option>
                <option value="B+">B+ (7)</option>
                <option value="B">B (6)</option>
                <option value="C">C (5)</option>
                <option value="F">F (0)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Grade Point</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={form.grade_point}
                onChange={(e) => setForm({ ...form, grade_point: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Remarks</label>
              <input
                type="text"
                className="form-control"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Recalculating...' : 'Update & Recalculate CGPA'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
