const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'edusphere.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to EduSphere SQLite database at:', dbPath);
  }
});

// Helper for db run as Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Helper for db get as Promise
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper for db all as Promise
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function initDb() {
  await run(`PRAGMA foreign_keys = ON;`);

  // 1. Users
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      profile_photo TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Parents
  await run(`
    CREATE TABLE IF NOT EXISTS parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      parent_name TEXT NOT NULL,
      parent_phone TEXT,
      parent_email TEXT,
      parent_photo TEXT,
      occupation TEXT
    );
  `);

  // 3. Students
  await run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      student_id TEXT UNIQUE NOT NULL,
      roll_number TEXT,
      class_year TEXT NOT NULL,
      department TEXT NOT NULL,
      section TEXT NOT NULL,
      dob TEXT,
      address TEXT,
      parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL
    );
  `);

  // 4. Teachers
  await run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      teacher_id TEXT UNIQUE NOT NULL,
      department TEXT,
      subject TEXT,
      designation TEXT,
      salary REAL DEFAULT 0,
      joining_date TEXT,
      can_add_students INTEGER DEFAULT 1
    );
  `);

  // 5. Staff
  await run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      staff_id TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      salary REAL DEFAULT 0,
      joining_date TEXT,
      vehicle_number TEXT,
      route TEXT,
      bus_stops TEXT
    );
  `);

  // 6. Subjects
  await run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      class_year TEXT NOT NULL,
      semester TEXT,
      teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL
    );
  `);

  // 7. Student Attendance
  await run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      class_year TEXT,
      section TEXT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      period TEXT NOT NULL,
      status TEXT NOT NULL,
      marked_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, date, period)
    );
  `);

  // 8. Teacher Attendance
  await run(`
    CREATE TABLE IF NOT EXISTS teacher_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      marked_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(teacher_id, date)
    );
  `);

  // 9. Staff Attendance
  await run(`
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      marked_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id, date)
    );
  `);

  // 10. Marks & Results
  await run(`
    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
      exam_type TEXT NOT NULL,
      marks_obtained REAL NOT NULL,
      max_marks REAL NOT NULL,
      grade TEXT,
      remarks TEXT,
      teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 11. Study Materials
  await run(`
    CREATE TABLE IF NOT EXISTS study_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      file_name TEXT,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 12. Timetable
  await run(`
    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      period TEXT NOT NULL,
      time TEXT NOT NULL,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
      class_year TEXT NOT NULL,
      section TEXT NOT NULL,
      room TEXT
    );
  `);

  // 13. Leave & Outing Requests
  await run(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      from_time TEXT,
      to_time TEXT,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Pending',
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      review_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 14. Notifications
  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 15. Fees
  await run(`
    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      academic_year TEXT NOT NULL,
      total_fee REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      amount_pending REAL NOT NULL,
      due_date TEXT,
      status TEXT DEFAULT 'Pending'
    );
  `);

  // 16. Payments
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fee_id INTEGER REFERENCES fees(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      receipt_no TEXT UNIQUE,
      recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 17. Salaries
  await run(`
    CREATE TABLE IF NOT EXISTS salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      month_year TEXT NOT NULL,
      base_salary REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      amount_pending REAL NOT NULL,
      payment_date TEXT,
      status TEXT DEFAULT 'Pending',
      payment_method TEXT
    );
  `);

  // 18. Library Books
  await run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1
    );
  `);

  // 19. Library Transactions
  await run(`
    CREATE TABLE IF NOT EXISTS library_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      status TEXT DEFAULT 'Issued',
      fine_amount REAL DEFAULT 0
    );
  `);

  // 20. Semester Results & CGPA
  await run(`
    CREATE TABLE IF NOT EXISTS semester_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      semester TEXT NOT NULL,
      total_credits REAL DEFAULT 0,
      earned_credits REAL DEFAULT 0,
      total_grade_points REAL DEFAULT 0,
      sgpa REAL DEFAULT 0,
      cgpa REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, semester)
    );
  `);

  // Remove canteen tables if existing
  await run(`DROP TABLE IF EXISTS canteen_items;`);
  await run(`DROP TABLE IF EXISTS canteen_orders;`);
  await run(`DELETE FROM staff WHERE role = 'canteen_staff';`);
  await run(`DELETE FROM users WHERE role = 'canteen_staff';`);

  // Migrations for existing databases
  try {
    const studentCols = await all(`PRAGMA table_info(students)`);
    if (!studentCols.some(c => c.name === 'cgpa')) {
      await run(`ALTER TABLE students ADD COLUMN cgpa REAL DEFAULT 0.0;`);
    }

    const subjectCols = await all(`PRAGMA table_info(subjects)`);
    if (!subjectCols.some(c => c.name === 'credits')) {
      await run(`ALTER TABLE subjects ADD COLUMN credits REAL DEFAULT 3;`);
    }

    const marksCols = await all(`PRAGMA table_info(marks)`);
    if (!marksCols.some(c => c.name === 'semester')) {
      await run(`ALTER TABLE marks ADD COLUMN semester TEXT DEFAULT 'Semester 1';`);
    }
    if (!marksCols.some(c => c.name === 'credits')) {
      await run(`ALTER TABLE marks ADD COLUMN credits REAL DEFAULT 3;`);
    }
    if (!marksCols.some(c => c.name === 'grade_point')) {
      await run(`ALTER TABLE marks ADD COLUMN grade_point REAL DEFAULT 0.0;`);
    }
  } catch (mErr) {
    console.error('Migration notice:', mErr.message);
  }

  // 21. System Settings
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Check if root Admin user exists. If not, create the single authorized administrator account.
  const admin = await get(`SELECT * FROM users WHERE role = 'admin' LIMIT 1`);
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    await run(`
      INSERT INTO users (username, password, role, name, email, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'admin',
      hashedPassword,
      'admin',
      'College Administrator / Principal',
      'principal@edusphere.college.edu',
      '+1 (555) 019-2834'
    ]);
    console.log('Default administrator account created: username: admin / password: admin123');
  }

  // Set default college settings if not exists
  const collegeName = await get(`SELECT * FROM settings WHERE key = 'college_name'`);
  if (!collegeName) {
    await run(`INSERT INTO settings (key, value) VALUES ('college_name', 'EduSphere Institute of Higher Learning & Technology')`);
    await run(`INSERT INTO settings (key, value) VALUES ('college_code', 'EDUSPHERE-2026')`);
    await run(`INSERT INTO settings (key, value) VALUES ('academic_year', '2026-2027')`);
    await run(`INSERT INTO settings (key, value) VALUES ('contact_email', 'contact@edusphere.college.edu')`);
    await run(`INSERT INTO settings (key, value) VALUES ('contact_phone', '+1 (555) 019-2834')`);
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
