// In production (Vercel), VITE_API_URL must be set to your Render backend URL
// e.g.  https://edusphere-backend.onrender.com/api
// In local dev, Vite proxy handles /api → http://localhost:5000
const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('edusphere_token');
}

export function setAuth(token, user) {
  localStorage.setItem('edusphere_token', token);
  localStorage.setItem('edusphere_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('edusphere_token');
  localStorage.removeItem('edusphere_user');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('edusphere_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData, don't set Content-Type header so browser sets multipart boundary
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(data.error || 'Request failed. Please try again.');
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (data) =>
    request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),

  // Students
  getStudents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/students${q ? '?' + q : ''}`);
  },
  getStudent: (id) => request(`/students/${id}`),
  createStudent: (data) =>
    request('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStudent: (id, data) =>
    request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStudent: (id) =>
    request(`/students/${id}`, {
      method: 'DELETE',
    }),
  disableStudent: (id) =>
    request(`/students/${id}/disable`, {
      method: 'PATCH',
    }),

  // Teachers
  getTeachers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/teachers${q ? '?' + q : ''}`);
  },
  getTeacher: (id) => request(`/teachers/${id}`),
  createTeacher: (data) =>
    request('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTeacher: (id, data) =>
    request(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTeacher: (id) =>
    request(`/teachers/${id}`, {
      method: 'DELETE',
    }),
  disableTeacher: (id) =>
    request(`/teachers/${id}/disable`, {
      method: 'PATCH',
    }),

  // Staff
  getStaff: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/staff${q ? '?' + q : ''}`);
  },
  getStaffMember: (id) => request(`/staff/${id}`),
  createStaff: (data) =>
    request('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStaff: (id, data) =>
    request(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStaff: (id) =>
    request(`/staff/${id}`, {
      method: 'DELETE',
    }),
  disableStaff: (id) =>
    request(`/staff/${id}/disable`, {
      method: 'PATCH',
    }),

  // Parents
  getParents: () => request('/parents'),
  getChildDetails: () => request('/parents/child-details'),

  // Attendance
  getStudentAttendance: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/attendance/students${q ? '?' + q : ''}`);
  },
  getStudentAttendanceStats: (id) =>
    request(`/attendance/student-stats/${id}`),
  // Student's own attendance (auto-resolved from JWT — no ID needed)
  getMyAttendance: () => request('/attendance/my-attendance'),
  // Staff/Teacher's own attendance
  getMyStaffAttendance: () => request('/attendance/my-staff-attendance'),
  markStudentAttendance: (data) =>
    request('/attendance/students', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTeacherAttendance: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/attendance/teachers${q ? '?' + q : ''}`);
  },
  markTeacherAttendance: (data) =>
    request('/attendance/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getStaffAttendance: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/attendance/staff${q ? '?' + q : ''}`);
  },
  markStaffAttendance: (data) =>
    request('/attendance/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Academics: Subjects, Study Materials, Timetable
  getSubjects: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/academics/subjects${q ? '?' + q : ''}`);
  },
  createSubject: (data) =>
    request('/academics/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSubject: (id, data) =>
    request(`/academics/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSubject: (id) =>
    request(`/academics/subjects/${id}`, {
      method: 'DELETE',
    }),

  getStudyMaterials: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/academics/study-materials${q ? '?' + q : ''}`);
  },
  uploadStudyMaterial: (formData) =>
    request('/academics/study-materials', {
      method: 'POST',
      body: formData,
    }),
  deleteStudyMaterial: (id) =>
    request(`/academics/study-materials/${id}`, {
      method: 'DELETE',
    }),

  getTimetable: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/academics/timetable${q ? '?' + q : ''}`);
  },
  createTimetable: (data) =>
    request('/academics/timetable', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTimetable: (id) =>
    request(`/academics/timetable/${id}`, {
      method: 'DELETE',
    }),

  // Marks & Results
  getMarks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/marks${q ? '?' + q : ''}`);
  },
  recordMarks: (data) =>
    request('/marks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMarks: (id, data) =>
    request(`/marks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMarks: (id) =>
    request(`/marks/${id}`, {
      method: 'DELETE',
    }),
  getStudentReport: (id) => request(`/marks/student-report/${id}`),
  getMyResults: () => request('/marks/my-results'),

  // Leave & Outing
  getLeaveRequests: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/leave-requests${q ? '?' + q : ''}`);
  },
  submitLeaveRequest: (data) =>
    request('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reviewLeaveRequest: (id, data) =>
    request(`/leave-requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Fees & Payments
  getFees: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/fees${q ? '?' + q : ''}`);
  },
  assignFee: (data) =>
    request('/fees/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPayments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/fees/payments${q ? '?' + q : ''}`);
  },
  recordPayment: (data) =>
    request('/fees/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Salary
  getSalaries: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/salaries${q ? '?' + q : ''}`);
  },
  recordSalary: (data) =>
    request('/salaries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSalary: (id, data) =>
    request(`/salaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Library
  getLibraryStats: () => request('/library/stats'),
  getBooks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/library/books${q ? '?' + q : ''}`);
  },
  createBook: (data) =>
    request('/library/books', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBook: (id, data) =>
    request(`/library/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteBook: (id) =>
    request(`/library/books/${id}`, {
      method: 'DELETE',
    }),
  getLibraryTransactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/library/transactions${q ? '?' + q : ''}`);
  },
  issueBook: (data) =>
    request('/library/issue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  returnBook: (id, data) =>
    request(`/library/return/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Transport
  getTransport: () => request('/transport'),
  updateTransport: (staffId, data) =>
    request(`/transport/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request('/notifications/read-all', { method: 'PUT' }),
  broadcastNotification: (data) =>
    request('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
