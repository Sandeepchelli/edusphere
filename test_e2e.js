const BASE = 'http://localhost:5000/api';

async function req(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${endpoint}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${endpoint} failed: ${data.error || res.statusText}`);
  return data;
}

async function runTests() {
  console.log('=== STARTING EDUSPHERE COMPREHENSIVE E2E VERIFICATION ===\n');

  // 1. Health check
  console.log('1. Checking Backend Health...');
  const health = await req('/health');
  console.log('   Health OK:', health.status);

  // 2. Admin Login
  console.log('\n2. Admin Authentication...');
  const adminLogin = await req('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  const adminToken = adminLogin.token;
  console.log('   Admin logged in successfully! Role:', adminLogin.user.role);

  // 3. Add Teacher
  console.log('\n3. Creating New Teacher (Prof. Alan Turing)...');
  const teacherRes = await req('/teachers', 'POST', {
    name: 'Prof. Alan Turing',
    teacher_id: 'TCH-CS-01',
    username: 'alanturing',
    password: 'password123',
    department: 'Computer Science',
    subject: 'Algorithms & Architecture',
    designation: 'Professor',
    salary: 7500,
    can_add_students: 1
  }, adminToken);
  console.log('   Teacher created successfully! Teacher ID:', teacherRes.id);

  // 4. Add Student & Parent
  console.log('\n4. Registering New Student (Alex Morgan) & Linked Parent (Robert Morgan)...');
  const studentRes = await req('/students', 'POST', {
    name: 'Alex Morgan',
    student_id: 'STU-101',
    username: 'alex101',
    password: 'password123',
    roll_number: '26CS01',
    class_year: '1st Year',
    department: 'Computer Science',
    section: 'A',
    phone: '+1 555-0101',
    parent_name: 'Robert Morgan',
    parent_phone: '+1 555-0199',
    parent_email: 'robert.morgan@example.com',
    parent_username: 'p_alex101',
    parent_password: 'password123',
    total_fee: 4500
  }, adminToken);
  console.log('   Student and Parent created! Student PK:', studentRes.id);

  // 5. Add Subject
  console.log('\n5. Creating Academic Subject (CS101 - Data Structures)...');
  const subjectRes = await req('/academics/subjects', 'POST', {
    code: 'CS101',
    name: 'Data Structures & Algorithms',
    department: 'Computer Science',
    class_year: '1st Year',
    teacher_id: teacherRes.id
  }, adminToken);
  console.log('   Subject created! Subject ID:', subjectRes.id);

  // 6. Student Attendance & Parent Absent Alert test
  console.log('\n6. Testing Student Attendance & Automatic Parent Absent Alert...');
  const attRes = await req('/attendance/students', 'POST', {
    class_year: '1st Year',
    section: 'A',
    subject_id: subjectRes.id,
    date: '2026-10-06',
    period: '1',
    attendance_list: [
      { student_id: studentRes.id, status: 'absent' }
    ]
  }, adminToken);
  console.log('   Attendance recorded:', attRes.records_saved, 'records. Absent alerts sent:', attRes.absent_alerts_sent);

  // 7. Verify Parent Login and Absent Notification
  console.log('\n7. Parent Login & Checking Absent Alert Notification...');
  const parentLogin = await req('/auth/login', 'POST', { username: 'p_alex101', password: 'password123' });
  const parentToken = parentLogin.token;
  console.log('   Parent logged in! Role detected from DB:', parentLogin.user.role);

  const parentNotifs = await req('/notifications', 'GET', null, parentToken);
  console.log('   Parent Notifications Count:', parentNotifs.notifications.length);
  const absentAlert = parentNotifs.notifications.find(n => n.type === 'absent_alert');
  if (absentAlert) {
    console.log('   [SUCCESS] Parent Received Absent Alert:', absentAlert.title);
    console.log('             Message:', absentAlert.message);
  } else {
    throw new Error('Absent alert notification was not found for parent!');
  }

  // 8. Student Login & Submit Outing / Leave Request
  console.log('\n8. Student Login & Submitting Leave/Outing Request...');
  const studentLogin = await req('/auth/login', 'POST', { username: 'alex101', password: 'password123' });
  const studentToken = studentLogin.token;
  console.log('   Student logged in! Role detected from DB:', studentLogin.user.role);

  const leaveRes = await req('/leave-requests', 'POST', {
    type: 'Outing',
    date: '2026-10-07',
    from_time: '10:00 AM',
    to_time: '04:00 PM',
    reason: 'Inter-College Hackathon Representation',
    description: 'Selected to present project at Regional Tech Meet.'
  }, studentToken);
  console.log('   Student submitted request:', leaveRes.message);

  // 9. Teacher Login & Approve Leave Request ("Permission Granted")
  console.log('\n9. Teacher Login & Reviewing Leave Request...');
  const teacherLogin = await req('/auth/login', 'POST', { username: 'alanturing', password: 'password123' });
  const teacherToken = teacherLogin.token;
  console.log('   Teacher logged in! Role detected from DB:', teacherLogin.user.role);

  await req(`/leave-requests/${leaveRes.id}/review`, 'PUT', {
    status: 'Approved',
    review_notes: 'Permission Granted. Represent the college well.'
  }, teacherToken);
  console.log('   Leave request approved with Permission Granted!');

  // 10. Teacher enters exam marks
  console.log('\n10. Teacher Entering Exam Marks for Student...');
  const marksRes = await req('/marks', 'POST', {
    student_id: studentRes.id,
    subject_id: subjectRes.id,
    exam_type: 'Mid-Term',
    marks_obtained: 94,
    max_marks: 100,
    remarks: 'Exceptional performance in algorithmic complexity.'
  }, teacherToken);
  console.log('   Marks recorded! Computed Grade:', marksRes.grade);

  // 11. Student views report card
  console.log('\n11. Student Viewing Report Card...');
  const studentReport = await req(`/marks/student-report/${studentRes.id}`, 'GET', null, studentToken);
  console.log('   Report card percentage:', studentReport.summary.overallPercentage + '%', 'Grade:', studentReport.summary.overallGrade);

  // 12. Add Staff (Driver and Cashier)
  console.log('\n12. Registering Support Staff (Driver & Cashier)...');
  const driverRes = await req('/staff', 'POST', {
    name: 'James Wilson',
    staff_id: 'STF-DRV-01',
    username: 'jwilson',
    password: 'password123',
    role: 'driver',
    department: 'Transport Fleet',
    salary: 3200,
    vehicle_number: 'BUS-05',
    route: 'Route 3 - Metro Line to Campus',
    bus_stops: 'Metro Station, North Gate, Library Circle, Main Gate'
  }, adminToken);
  console.log('   Driver created! ID:', driverRes.id);

  const cashierRes = await req('/staff', 'POST', {
    name: 'Catherine Bell',
    staff_id: 'STF-CSH-01',
    username: 'cbell',
    password: 'password123',
    role: 'cashier',
    department: 'Accounts Office',
    salary: 4200
  }, adminToken);
  console.log('   Cashier created! ID:', cashierRes.id);

  // 13. Cashier Login & Record Fee Payment
  console.log('\n13. Cashier Login & Recording Student Fee Payment...');
  const cashierLogin = await req('/auth/login', 'POST', { username: 'cbell', password: 'password123' });
  const cashierToken = cashierLogin.token;
  console.log('   Cashier logged in! Role detected from DB:', cashierLogin.user.role);

  const fees = await req(`/fees?student_id=${studentRes.id}`, 'GET', null, cashierToken);
  const studentFeeRecord = fees[0];
  console.log('   Student fee before payment: Total: $' + studentFeeRecord.total_fee, 'Pending: $' + studentFeeRecord.amount_pending);

  const payRes = await req('/fees/payments', 'POST', {
    fee_id: studentFeeRecord.id,
    student_id: studentRes.id,
    amount: 1500,
    payment_method: 'Cash',
    receipt_no: 'REC-2026-001'
  }, cashierToken);
  console.log('   Payment recorded! Receipt:', payRes.receipt_no, 'New Pending: $' + payRes.amount_pending, 'Status:', payRes.status);

  // 14. Library & Canteen quick validation
  console.log('\n14. Library and Canteen Management validation...');
  const bookRes = await req('/library/books', 'POST', {
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    isbn: '978-0134494164',
    category: 'Computer Science',
    total_copies: 3
  }, adminToken);
  console.log('   Library Book added! ID:', bookRes.id);

  const canteenRes = await req('/canteen/items', 'POST', {
    name: 'Crispy Grilled Sandwich',
    category: 'Breakfast',
    price: 3.50,
    is_available: 1
  }, adminToken);
  console.log('   Canteen Food Item added! ID:', canteenRes.id);

  console.log('\n=== ALL EDUSPHERE E2E TESTS PASSED WITH 100% SUCCESS ===\n');
}

runTests().catch(err => {
  console.error('\n[TEST FAILED]:', err);
  process.exit(1);
});
