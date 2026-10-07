import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  BookOpen,
  FileText,
  Clock,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Search,
  Calendar
} from 'lucide-react';

export default function AcademicsView({ currentUser, initialTab = 'subjects' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Common Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // 1. SUBJECTS STATE
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    credits: '3',
    department: 'Computer Science',
    class_year: '1st Year',
    semester: 'Semester 1',
    teacher_id: '',
  });

  // 2. STUDY MATERIALS STATE
  const [materials, setMaterials] = useState([]);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    subject_id: '',
    title: '',
    description: '',
    external_link: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // 3. TIMETABLE STATE
  const [timetable, setTimetable] = useState([]);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [timetableForm, setTimetableForm] = useState({
    day: 'Monday',
    period: '1',
    time: '09:00 AM - 10:00 AM',
    subject_id: '',
    teacher_id: '',
    class_year: '1st Year',
    section: 'A',
    room: 'Room 301',
  });
  const [filterDay, setFilterDay] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load all initial data
  const loadAll = async () => {
    setLoading(true);
    try {
      const [subs, mats, tts, tchs] = await Promise.all([
        api.getSubjects(),
        api.getStudyMaterials(),
        api.getTimetable(),
        api.getTeachers(),
      ]);
      setSubjects(subs);
      setMaterials(mats);
      setTimetable(tts);
      setTeachers(tchs);
      if (subs.length > 0) {
        setMaterialForm((prev) => ({ ...prev, subject_id: subs[0].id }));
        setTimetableForm((prev) => ({ ...prev, subject_id: subs[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load academics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Handlers for Subjects
  const handleSaveSubject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.createSubject(subjectForm);
      setSuccessMsg('Subject added successfully.');
      setIsSubjectModalOpen(false);
      setSubjectForm({
        code: '',
        name: '',
        department: 'Computer Science',
        class_year: '1st Year',
        semester: 'Semester 1',
        teacher_id: '',
      });
      loadAll();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to create subject.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (window.confirm('Delete this subject?')) {
      try {
        await api.deleteSubject(id);
        setSuccessMsg('Subject deleted.');
        loadAll();
      } catch (err) {
        setError(err.message || 'Failed to delete.');
      }
    }
  };

  // Handlers for Study Materials
  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('subject_id', materialForm.subject_id);
      formData.append('title', materialForm.title);
      formData.append('description', materialForm.description);
      if (materialForm.external_link) {
        formData.append('external_link', materialForm.external_link);
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await api.uploadStudyMaterial(formData);
      setSuccessMsg('Study material published successfully.');
      setIsMaterialModalOpen(false);
      setSelectedFile(null);
      setMaterialForm({
        subject_id: subjects[0]?.id || '',
        title: '',
        description: '',
        external_link: '',
      });
      loadAll();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to upload material.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (window.confirm('Remove this study material?')) {
      try {
        await api.deleteStudyMaterial(id);
        setSuccessMsg('Material removed.');
        loadAll();
      } catch (err) {
        setError(err.message || 'Failed to delete material.');
      }
    }
  };

  // Handlers for Timetable
  const handleSaveTimetable = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.createTimetable(timetableForm);
      setSuccessMsg('Timetable entry created successfully.');
      setIsTimetableModalOpen(false);
      loadAll();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to create timetable entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTimetable = async (id) => {
    if (window.confirm('Remove this timetable entry?')) {
      try {
        await api.deleteTimetable(id);
        setSuccessMsg('Entry removed.');
        loadAll();
      } catch (err) {
        setError(err.message || 'Failed to delete entry.');
      }
    }
  };

  const isTeacherOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'subjects' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('subjects')}
        >
          <BookOpen size={16} />
          <span>Subjects & Curriculum</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'materials' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('materials')}
        >
          <FileText size={16} />
          <span>Study Materials & Documents</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'timetable' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('timetable')}
        >
          <Clock size={16} />
          <span>Class Timetable</span>
        </button>
      </div>

      {/* Messages */}
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

      {/* TAB 1: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>College Academic Subjects</h3>
              <p>Course codes, curriculum syllabus, and allocated faculty</p>
            </div>

            {isTeacherOrAdmin && (
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsSubjectModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Add New Subject</span>
                </button>
              </div>
            )}
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Subject Title</th>
                  <th>Credits</th>
                  <th>Department</th>
                  <th>Class / Year</th>
                  <th>Semester</th>
                  <th>Assigned Faculty</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No subjects configured yet. Click "Add New Subject" to create subjects.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub) => (
                    <tr key={sub.id}>
                      <td><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{sub.code}</span></td>
                      <td><strong>{sub.name}</strong></td>
                      <td><span className="badge badge-info">{sub.credits || 3} Credits</span></td>
                      <td>{sub.department}</td>
                      <td>{sub.class_year}</td>
                      <td>{sub.semester || 'Semester 1'}</td>
                      <td>
                        {sub.teacher_name ? (
                          <span style={{ fontWeight: 500 }}>{sub.teacher_name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteSubject(sub.id)}
                            title="Delete Subject"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STUDY MATERIALS */}
      {activeTab === 'materials' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Course Study Materials & Notes</h3>
              <p>Lecture slides, notes, assignments, and reading references</p>
            </div>

            {isTeacherOrAdmin && (
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsMaterialModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Publish Study Material</span>
                </button>
              </div>
            )}
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Material Title</th>
                  <th>Description</th>
                  <th>Instructor</th>
                  <th>Published Date</th>
                  <th>Download / Link</th>
                  {isTeacherOrAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No study materials uploaded yet.
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className="badge badge-purple">{m.subject_code}</span>
                        <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>{m.subject_name}</div>
                      </td>
                      <td><strong>{m.title}</strong></td>
                      <td style={{ maxWidth: '280px', color: 'var(--text-muted)' }}>{m.description || '—'}</td>
                      <td>{m.teacher_name}</td>
                      <td>{m.date}</td>
                      <td>
                        {m.file_url ? (
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Download size={14} />
                            <span>{m.file_name || 'Download / View'}</span>
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-light)' }}>No link</span>
                        )}
                      </td>
                      {isTeacherOrAdmin && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteMaterial(m.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Class Timetable Schedule</h3>
              <p>Weekly lecture distribution across classes and lecture halls</p>
            </div>

            <div className="card-actions">
              <select
                className="select-filter"
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
              >
                <option value="">All Days</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>

              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsTimetableModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Add Timetable Slot</span>
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Period</th>
                  <th>Time Slot</th>
                  <th>Subject</th>
                  <th>Faculty Instructor</th>
                  <th>Class & Section</th>
                  <th>Hall / Room</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {timetable.filter((tt) => !filterDay || tt.day === filterDay).length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No timetable slots configured.
                    </td>
                  </tr>
                ) : (
                  timetable
                    .filter((tt) => !filterDay || tt.day === filterDay)
                    .map((tt) => (
                      <tr key={tt.id}>
                        <td><strong>{tt.day}</strong></td>
                        <td>Period {tt.period}</td>
                        <td>{tt.time}</td>
                        <td>
                          <strong>{tt.subject_name || 'General'}</strong>
                          {tt.subject_code && <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}> ({tt.subject_code})</span>}
                        </td>
                        <td>{tt.teacher_name || 'Assigned Lecturer'}</td>
                        <td>{tt.class_year} - Sec {tt.section}</td>
                        <td>
                          <span className="badge badge-neutral">{tt.room || 'Room 101'}</span>
                        </td>
                        {isAdmin && (
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteTimetable(tt.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUBJECT */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Add New Subject"
        maxWidth="600px"
      >
        <form onSubmit={handleSaveSubject}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Subject Code <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CS401"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subject Title <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Database Systems"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-control"
                value={subjectForm.department}
                onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics & Comm">Electronics & Comm</option>
                <option value="Mechanical Eng">Mechanical Eng</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Class Year</label>
              <select
                className="form-control"
                value={subjectForm.class_year}
                onChange={(e) => setSubjectForm({ ...subjectForm, class_year: e.target.value })}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Semester</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Semester 4"
                value={subjectForm.semester}
                onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Credits (1 - 10)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                className="form-control"
                placeholder="e.g. 3 or 4"
                value={subjectForm.credits}
                onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assign Faculty Member</label>
              <select
                className="form-control"
                value={subjectForm.teacher_id}
                onChange={(e) => setSubjectForm({ ...subjectForm, teacher_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.teacher_name} ({t.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsSubjectModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: PUBLISH STUDY MATERIAL */}
      <Modal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        title="Publish Study Material"
        maxWidth="600px"
      >
        <form onSubmit={handleSaveMaterial}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Target Subject <span className="required">*</span></label>
              <select
                className="form-control"
                value={materialForm.subject_id}
                onChange={(e) => setMaterialForm({ ...materialForm, subject_id: e.target.value })}
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} ({s.class_year})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Material Title <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Unit 3 - SQL Queries & Normalization"
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Description / Summary</label>
              <textarea
                className="form-control"
                placeholder="Overview of topics and reading instructions"
                value={materialForm.description}
                onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Upload File (PDF / Doc / Slides)</label>
              <input
                type="file"
                className="form-control"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Or External URL / Link</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://drive.google.com/..."
                value={materialForm.external_link}
                onChange={(e) => setMaterialForm({ ...materialForm, external_link: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsMaterialModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Uploading...' : 'Publish Material'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD TIMETABLE ENTRY */}
      <Modal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        title="Add Class Timetable Slot"
        maxWidth="600px"
      >
        <form onSubmit={handleSaveTimetable}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Day of Week <span className="required">*</span></label>
              <select
                className="form-control"
                value={timetableForm.day}
                onChange={(e) => setTimetableForm({ ...timetableForm, day: e.target.value })}
                required
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Period <span className="required">*</span></label>
              <select
                className="form-control"
                value={timetableForm.period}
                onChange={(e) => setTimetableForm({ ...timetableForm, period: e.target.value })}
                required
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

            <div className="form-group">
              <label className="form-label">Time Interval <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 09:00 AM - 10:00 AM"
                value={timetableForm.time}
                onChange={(e) => setTimetableForm({ ...timetableForm, time: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Class Year <span className="required">*</span></label>
              <select
                className="form-control"
                value={timetableForm.class_year}
                onChange={(e) => setTimetableForm({ ...timetableForm, class_year: e.target.value })}
                required
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Section <span className="required">*</span></label>
              <select
                className="form-control"
                value={timetableForm.section}
                onChange={(e) => setTimetableForm({ ...timetableForm, section: e.target.value })}
                required
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Room / Hall</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Lab 2 / Hall 401"
                value={timetableForm.room}
                onChange={(e) => setTimetableForm({ ...timetableForm, room: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <select
                className="form-control"
                value={timetableForm.subject_id}
                onChange={(e) => setTimetableForm({ ...timetableForm, subject_id: e.target.value })}
              >
                <option value="">General Class</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Faculty Lecturer</label>
              <select
                className="form-control"
                value={timetableForm.teacher_id}
                onChange={(e) => setTimetableForm({ ...timetableForm, teacher_id: e.target.value })}
              >
                <option value="">TBD</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.teacher_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTimetableModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Add Slot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
