# EduSphere – Complete College Management System

EduSphere is a complete, modern, responsive College Management System built with **React.js**, **Node.js + Express.js**, and a persistent **SQLite** database.

## System Overview & Architecture

- **Frontend**: React + Vite (Vanilla CSS design system, Plus Jakarta Sans typography, Glassmorphism, Responsive drawer sidebar)
- **Backend**: Node.js + Express.js REST API with JWT authentication and bcrypt password hashing
- **Database**: SQLite database stored in `backend/data/edusphere.db` (Persistent across restarts & page reloads)
- **Authentication**: Single unified login portal with automatic role detection

---

## Default Administrator Credentials

Upon initial initialization, the system automatically creates the root Administrator account:

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Principal / College Administrator

*Note: All student, teacher, parent, and staff accounts are dynamically created through the system and stored permanently in SQLite.*

---

## Role-Based Access Control

The login screen automatically detects the user's role from the database:

1. **Principal / Admin**:
   - Complete system administration
   - Student, Faculty & Staff management
   - Attendance (Students, Faculty, Staff)
   - Academics (Curriculum, Study Materials, Timetable)
   - Fees & Cashier finance tracking
   - College Library management
   - Leave & Outing Gate Pass reviews ("Permission Granted")
   - Staff payroll & salary disbursal
   - College-wide announcement broadcasting
   - System & Accreditation settings

2. **Faculty / Teachers**:
   - Class & student attendance marking
   - Automatic parent absent alerts (suppressed for approved leaves)
   - Course subject materials & notes publishing
   - Internal, Mid-Term, and Semester exam marks entry with automatic grade calculation (A+, A, B, C, D, F)
   - Leave & outing gate pass review & approvals
   - Faculty timetable & self-attendance tracking
   - Personal salary & payment slips

3. **Students**:
   - Real-time attendance rate and class logs
   - Exam marks, grades, and semester report card
   - Course syllabus & study materials download
   - Weekly lecture timetable
   - Digital Leave & Campus Outing request submissions with "Permission Granted" status
   - Fee invoices, receipts, and pending balances
   - Campus canteen menu & online food ordering
   - College bus routes, vehicle numbers & bus stops
   - Personal profile & password management

4. **Parents**:
   - Linked child profile overview
   - Real-time absent alerts in notifications
   - Academic attendance records & percentages
   - Child examination marks, grades, and report card
   - Leave & outing status monitoring
   - Tuition fee status & payments ledger

5. **College Management Staff**:
   - **Cashier**: Student fee accounts, payment recording (Cash, UPI, Card, Bank Transfer), and official receipt generation
   - **Library Staff**: Book catalog, copies inventory, book issues & returns with fine tracking
   - **Canteen Staff**: Cafeteria menu, prices, availability toggling, and incoming orders
   - **Drivers**: Assigned bus route, vehicle number, and bus stops list
   - **Watchman, Attender & Lab Technicians**: Self attendance, salary slips, and college notices

---

## Starting the Application

### 1. Run Backend Server
```bash
cd backend
npm install
node server.js
```
*Backend API runs at `http://localhost:5000`*

### 2. Run Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
*Frontend web application runs at `http://localhost:3000`*
