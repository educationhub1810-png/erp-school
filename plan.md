# School Management ERP — Full Implementation Plan

---

## Requirements Summary

Extracted from **SMS_Final.docx**

### Roles

* Super Admin
* School Admin
* Principal
* Teacher
* Student
* Parent
* Accountant
* Librarian
* Transport Manager
* HR Manager
* Warden Manager
* Mess Manager

---

### Core Modules

1. Dashboard
2. Student Management
3. Parent Management
4. Teacher Management
5. Staff & HR
6. Academic Management
7. Attendance Management
8. Examination & Results
9. Fees & Finance
10. Library
11. Transport
12. Hostel
13. Communication
14. LMS
15. Reports & Analytics

---

### Authentication

* Login: School Code + Email/Mobile + Password + Role Selection + OTP
* Signup: Super Admin & School Admin only (self-registration)
* Others (Teacher, Student, Parent, etc.): created by Admin
* Forgot Password: Mobile + OTP + New Password
* Flow: School Code → Credentials → Role-Based Dashboard

---

## Implementation Plan

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand (global) + TanStack Query (server state) |
| Charts | Recharts |
| Backend | Next.js API Routes (fullstack monolith) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js v5 + JWT + OTP |
| File Storage | Cloudinary (images/docs) |
| Email | Nodemailer + SMTP / Resend |
| SMS | MSG91 / Twilio |
| PDF | Puppeteer (server-side) / jsPDF (client) |
| Real-time | Pusher / Socket.io (notifications, chat) |
| Deployment | Vercel (frontend) + Railway/Render (DB) |

**Why Next.js fullstack:** Single repo, shared types, faster iteration for a team building from scratch. Can extract to separate backend later if scaling demands it.

---

## 2. Project Structure

```
erp-school/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup, forgot-password)
│   ├── (dashboard)/              # Protected routes
│   │   ├── super-admin/
│   │   ├── school-admin/
│   │   ├── principal/
│   │   ├── teacher/
│   │   ├── student/
│   │   ├── parent/
│   │   ├── accountant/
│   │   ├── librarian/
│   │   ├── transport/
│   │   ├── hr/
│   │   ├── warden/
│   │   └── mess/
│   └── api/                      # API Routes
│       ├── auth/
│       ├── schools/
│       ├── students/
│       ├── teachers/
│       ├── staff/
│       ├── academics/
│       ├── attendance/
│       ├── exams/
│       ├── fees/
│       ├── library/
│       ├── transport/
│       ├── hostel/
│       ├── communication/
│       ├── lms/
│       └── reports/
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── shared/                   # Reusable app-level components
│   └── modules/                  # Module-specific components
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # NextAuth config
│   ├── validations/              # Zod schemas
│   ├── utils/                    # Helpers
│   └── constants/                # Enums, config
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand stores
├── types/                        # Shared TypeScript types
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── public/
```

---

## 3. Database Schema Overview

### Multi-Tenancy Strategy
Every table includes `school_id` foreign key. Queries are always scoped to `school_id`. A single database, schema-per-tenant approach (not separate DBs — simplifies ops).

### Core Tables

**schools** — `id, name, code (unique), logo, reg_number, affiliation_number, principal_name, email, phone, address, city, state, country, timezone, currency, language, created_at`

**academic_years** — `id, school_id, name, start_date, end_date, is_active`

**users** — `id, school_id, name, email, mobile, password_hash, role (enum), is_active, created_by, created_at`

**students** — `id, school_id, user_id, admission_number, roll_number, first_name, middle_name, last_name, gender, dob, blood_group, category, religion, aadhaar, photo_url, class_id, section_id, house, transport_required, hostel_required, medical_notes, admission_date, rfid_number, previous_school`

**parents** — `id, school_id, student_id, father_name, father_mobile, father_email, father_occupation, mother_name, mother_mobile, mother_email, mother_occupation, guardian_name, guardian_mobile, guardian_relation, address`

**teachers** — `id, school_id, user_id, employee_id, gender, dob, qualification, experience_years, specialization, joining_date, salary, bank_name, account_number, ifsc, pan, aadhaar, photo_url, resume_url`

**staff** — `id, school_id, user_id, employee_id, department, designation, joining_date, salary, bank_details`

**classes** — `id, school_id, name, capacity, class_teacher_id`

**sections** — `id, school_id, class_id, name, capacity`

**subjects** — `id, school_id, name, code, pass_marks, total_marks, teacher_id, class_id`

**timetable** — `id, school_id, class_id, section_id, subject_id, teacher_id, day_of_week, start_time, end_time`

**attendance** — `id, school_id, student_id, date, status (PRESENT/ABSENT/LATE), check_in, check_out, academic_year_id`

**staff_attendance** — `id, school_id, staff_id, date, status, check_in, check_out`

**exams** — `id, school_id, name, academic_year_id, class_id, start_date, end_date`

**exam_schedules** — `id, exam_id, subject_id, date, start_time, end_time, total_marks, pass_marks`

**exam_results** — `id, school_id, exam_id, student_id, subject_id, marks_obtained, grade, gpa, rank, remarks`

**fee_structures** — `id, school_id, class_id, academic_year_id, fee_type, amount, due_date, frequency`

**fee_payments** — `id, school_id, student_id, fee_structure_id, amount_paid, payment_date, receipt_number, payment_mode, transaction_id, status`

**scholarships** — `id, school_id, student_id, name, discount_type, discount_value, valid_from, valid_to`

**library_books** — `id, school_id, title, isbn, author, publisher, edition, category, rack_number, total_copies, available_copies`

**library_issues** — `id, school_id, book_id, student_id, issue_date, due_date, return_date, fine_amount`

**transport_routes** — `id, school_id, route_name, vehicle_number, driver_name, driver_mobile, gps_device_id, capacity`

**transport_students** — `id, school_id, student_id, route_id, stop_name, fee_amount`

**hostel_rooms** — `id, school_id, room_number, floor, capacity, type, warden_id`

**hostel_allocations** — `id, school_id, room_id, student_id, bed_number, from_date, to_date, fee_amount`

**homework** — `id, school_id, subject_id, class_id, section_id, teacher_id, title, description, due_date, attachment_url`

**homework_submissions** — `id, homework_id, student_id, submitted_at, file_url, marks, remarks`

**lms_courses** — `id, school_id, title, teacher_id, class_id, description, duration_hours`

**lms_chapters** — `id, course_id, title, video_url, notes_url, order`

**notifications** — `id, school_id, title, body, type (SMS/EMAIL/PUSH/WHATSAPP), target_role, sent_at, status`

**announcements** — `id, school_id, title, body, created_by, target_roles, attachment_url, created_at`

**chat_messages** — `id, school_id, sender_id, receiver_id, message, sent_at, read_at`

**leave_requests** — `id, school_id, user_id, from_date, to_date, type, reason, status (PENDING/APPROVED/REJECTED), approved_by`

**payroll** — `id, school_id, staff_id, month, year, basic, allowances, deductions, bonus, net_salary, status`

**recruitment** — `id, school_id, job_title, vacancies, experience_required, salary_range, posted_at, status`

**documents** — `id, school_id, entity_type, entity_id, doc_type, file_url, uploaded_at`

---

## 4. Phase-wise Implementation

---

### Phase 1 — Foundation (Week 1–2)

**Goal:** Runnable app skeleton with auth, multi-tenancy, and RBAC working end-to-end.

#### Tasks

- [ ] Initialize Next.js 14 project with TypeScript, Tailwind CSS, shadcn/ui
- [ ] Set up Prisma with PostgreSQL (local + cloud DB)
- [ ] Define full `schema.prisma` (all tables listed above)
- [ ] Run initial migration
- [ ] Configure NextAuth.js v5
  - Credentials provider (school code + email/mobile + password)
  - JWT strategy with role + school_id in token
  - OTP verification flow (MSG91 or email OTP)
- [ ] Build middleware for route protection (`middleware.ts`)
  - Redirect unauthenticated users to `/login`
  - Redirect to role-based dashboard after login
- [ ] Role-based layout shells (sidebar navigation per role)
- [ ] Seed script with sample data (1 school, all roles)

#### Deliverables
- Working login/logout for all 12 roles
- Each role sees its own dashboard shell
- Multi-tenant: school_id scoping in all queries

---

### Phase 2 — School Setup & Admin (Week 3–4)

**Goal:** Super Admin and School Admin can fully configure a school.

#### Tasks

- [ ] Super Admin panel
  - [ ] Create / manage schools
  - [ ] Global stats dashboard
  - [ ] Manage School Admins
- [ ] School Admin panel
  - [ ] School information form (logo, contact, address, timezone, currency)
  - [ ] Academic Year management (CRUD)
  - [ ] User creation for all roles (Teacher, Student, Parent, etc.)
  - [ ] Bulk user import via CSV
- [ ] School registration / signup flow (public-facing)

---

### Phase 3 — Student & Parent Management (Week 5–6)

**Goal:** Complete student lifecycle from admission to alumni.

#### Tasks

- [ ] Admission form (all fields from spec)
  - Multi-step wizard: Personal → Parent → Documents → Class Assignment
- [ ] Student list with filters (class, section, status)
- [ ] Student profile page (photo, academic history, attendance %, fee status)
- [ ] Document upload (Cloudinary)
- [ ] ID card generation (PDF via Puppeteer)
- [ ] Class allocation and promotion
- [ ] Alumni tracking
- [ ] Parent portal
  - [ ] View child's attendance, fees, exam results
  - [ ] Homework tracker
  - [ ] Leave application
  - [ ] Teacher communication (chat)

---

### Phase 4 — Teacher & HR Management (Week 7–8)

**Goal:** Teacher profiles, subject allocation, timetable, and HR workflows.

#### Tasks

- [ ] Teacher registration form (all fields from spec)
- [ ] Subject & class allocation
- [ ] Timetable builder (drag-and-drop grid per class/section)
- [ ] Teacher attendance
- [ ] Leave management (request → approval flow)
- [ ] Salary management (linked to Payroll in Phase 7)
- [ ] HR module
  - [ ] Employee records (all staff)
  - [ ] Recruitment postings
  - [ ] Performance tracking

---

### Phase 5 — Academic Management (Week 9–10)

**Goal:** Classes, subjects, syllabus, homework, and academic calendar.

#### Tasks

- [ ] Class & Section CRUD
- [ ] Subject management
- [ ] Syllabus & lesson plan upload
- [ ] Homework creation and submission tracker
- [ ] Academic calendar (visual month view)
- [ ] Study material upload per subject
- [ ] Timetable viewer (student/teacher views)

---

### Phase 6 — Attendance Management (Week 10–11)

**Goal:** Daily attendance for students and staff with alerts.

#### Tasks

- [ ] Student attendance marking (class-wise, per period)
- [ ] Staff attendance marking
- [ ] Bulk attendance (present all, then mark absents)
- [ ] Attendance report (student-wise, class-wise, date-range)
- [ ] SMS/email alert to parents on absence (MSG91)
- [ ] Attendance dashboard (% per class, per student)

---

### Phase 7 — Examination & Results (Week 12–13)

**Goal:** Exam scheduling, marks entry, grading, report cards.

#### Tasks

- [ ] Exam creation (name, type: Unit/Mid/Final, schedule per subject)
- [ ] Marks entry form (teacher enters marks per student per subject)
- [ ] Grading system configuration (A/B/C or custom)
- [ ] GPA & rank calculation (auto)
- [ ] Report card generation (PDF)
- [ ] Result publishing (toggle per exam)
- [ ] Student/Parent result view
- [ ] Performance analytics (class average, top performers)

---

### Phase 8 — Fees & Finance (Week 14–15)

**Goal:** Complete fee management with receipts, reports, and GST support.

#### Tasks

- [ ] Fee structure setup (per class, per academic year, per fee type)
- [ ] Fee collection form (student search → select fees → collect)
- [ ] Receipt generation (PDF)
- [ ] Scholarship & discount management
- [ ] Expense tracking
- [ ] Fee defaulters report
- [ ] GST-compliant invoicing
- [ ] Accounting reports (income, expense, P&L)
- [ ] Accountant dashboard

---

### Phase 9 — Library, Transport & Hostel (Week 16–17)

**Goal:** Operational modules for Librarian, Transport Manager, Warden.

#### Tasks

**Library**
- [ ] Book inventory (add, edit, ISBN lookup)
- [ ] Issue book to student
- [ ] Return tracking
- [ ] Fine calculation (per-day overdue)
- [ ] Librarian dashboard

**Transport**
- [ ] Route management
- [ ] Vehicle & driver records
- [ ] Student route assignment
- [ ] Transport fee collection
- [ ] Transport Manager dashboard

**Hostel**
- [ ] Room creation & allocation
- [ ] Bed assignment per student
- [ ] Hostel attendance
- [ ] Visitor log
- [ ] Hostel fee collection
- [ ] Warden dashboard

---

### Phase 10 — LMS (Week 18)

**Goal:** Online learning — courses, video lectures, quizzes.

#### Tasks

- [ ] Course creation (teacher)
- [ ] Chapter upload (video URL / file, notes)
- [ ] Assignment creation & submission
- [ ] Quiz builder (MCQ)
- [ ] Student course view & progress tracking
- [ ] Zoom / Google Meet link embed per class
- [ ] LMS dashboard per teacher and student

---

### Phase 11 — Communication (Week 19)

**Goal:** SMS, email, push notifications, announcements, parent-teacher chat.

#### Tasks

- [ ] Announcement board (create, target by role/class)
- [ ] SMS broadcast (MSG91) — bulk to parents, students, staff
- [ ] Email broadcast (Resend/Nodemailer)
- [ ] Push notification setup (Firebase FCM)
- [ ] WhatsApp messaging (360Dialog or Twilio)
- [ ] Parent-Teacher 1-1 chat (real-time via Pusher)
- [ ] Notification inbox per user

---

### Phase 12 — Reports & Analytics (Week 20)

**Goal:** Exportable reports and analytics dashboard.

#### Tasks

- [ ] Student performance report (per student, per class, per exam)
- [ ] Attendance report (date range, class, individual)
- [ ] Fee collection report (collected, pending, defaulters)
- [ ] Payroll summary report
- [ ] Library reports (issued, overdue, fines)
- [ ] Export: PDF, Excel (xlsx), CSV
- [ ] Super Admin analytics (multi-school stats)
- [ ] Principal dashboard (school-wide KPIs with charts)

---

### Phase 13 — Polish & Deployment (Week 21–22)

#### Tasks

- [ ] Responsive design audit (mobile + tablet)
- [ ] Accessibility (WCAG AA)
- [ ] Performance optimization (image optimization, lazy loading, query caching)
- [ ] Rate limiting on API routes
- [ ] Input sanitization & security hardening (CSRF, XSS, SQL injection prevention via Prisma)
- [ ] Error monitoring (Sentry)
- [ ] Logging (structured logs)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Deploy: Vercel (Next.js) + Railway/Neon (PostgreSQL)
- [ ] Environment configuration (per environment: dev, staging, prod)
- [ ] Load testing
- [ ] User acceptance testing with sample school

---

## 5. Module → Route Mapping

| Module | URL Pattern |
|--------|------------|
| Super Admin Dashboard | `/super-admin/dashboard` |
| School Admin Dashboard | `/school-admin/dashboard` |
| Principal Dashboard | `/principal/dashboard` |
| Teacher Dashboard | `/teacher/dashboard` |
| Student Dashboard | `/student/dashboard` |
| Parent Dashboard | `/parent/dashboard` |
| Accountant Dashboard | `/accountant/dashboard` |
| Librarian Dashboard | `/librarian/dashboard` |
| Transport Dashboard | `/transport/dashboard` |
| HR Dashboard | `/hr/dashboard` |
| Warden Dashboard | `/warden/dashboard` |
| Mess Dashboard | `/mess/dashboard` |
| Students List | `/school-admin/students` |
| Add Student | `/school-admin/students/new` |
| Student Profile | `/school-admin/students/[id]` |
| Teachers List | `/school-admin/teachers` |
| Timetable | `/teacher/timetable` |
| Attendance | `/teacher/attendance` |
| Exam Results | `/teacher/exams/[id]/marks` |
| Fee Collection | `/accountant/fees/collect` |
| Library | `/librarian/books` |
| Reports | `/school-admin/reports` |

---

## 6. API Route Structure

All API routes are prefixed with `/api/v1/`

```
/api/v1/auth/login
/api/v1/auth/signup
/api/v1/auth/otp/send
/api/v1/auth/otp/verify
/api/v1/auth/forgot-password

/api/v1/schools          GET, POST
/api/v1/schools/[id]     GET, PUT, DELETE

/api/v1/students         GET, POST
/api/v1/students/[id]    GET, PUT, DELETE
/api/v1/students/[id]/promote

/api/v1/teachers         GET, POST
/api/v1/teachers/[id]    GET, PUT, DELETE

/api/v1/classes          GET, POST
/api/v1/sections         GET, POST
/api/v1/subjects         GET, POST
/api/v1/timetable        GET, POST, PUT

/api/v1/attendance/students     POST (mark), GET (report)
/api/v1/attendance/staff        POST (mark), GET (report)

/api/v1/exams            GET, POST
/api/v1/exams/[id]/results      GET, POST (bulk marks entry)
/api/v1/exams/[id]/report-card  GET (PDF)

/api/v1/fees/structures  GET, POST
/api/v1/fees/payments    GET, POST
/api/v1/fees/receipts/[id]      GET (PDF)

/api/v1/library/books    GET, POST
/api/v1/library/issues   GET, POST
/api/v1/library/returns  POST

/api/v1/transport/routes GET, POST
/api/v1/hostel/rooms     GET, POST
/api/v1/hostel/allocations      GET, POST

/api/v1/lms/courses      GET, POST
/api/v1/lms/courses/[id]/chapters GET, POST

/api/v1/communications/announcements  GET, POST
/api/v1/communications/sms            POST
/api/v1/communications/email          POST
/api/v1/communications/chat           GET, POST

/api/v1/reports/students GET
/api/v1/reports/fees     GET
/api/v1/reports/attendance GET
/api/v1/reports/payroll  GET
```

---

## 7. RBAC Permission Matrix (Summary)

| Feature | Super Admin | School Admin | Principal | Teacher | Student | Parent | Accountant | Librarian | Transport | HR | Warden |
|---------|:-----------:|:------------:|:---------:|:-------:|:-------:|:------:|:----------:|:---------:|:---------:|:--:|:------:|
| Manage Schools | ✓ | — | — | — | — | — | — | — | — | — | — |
| Create Users | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — |
| Student Records | ✓ | ✓ | view | view | self | child | — | — | — | — | — |
| Timetable | ✓ | ✓ | ✓ | view | view | view | — | — | — | — | — |
| Attendance | ✓ | ✓ | view | ✓ | self | child | — | — | — | — | — |
| Exams & Marks | ✓ | ✓ | view | ✓ | self | child | — | — | — | — | — |
| Fees | ✓ | ✓ | — | — | self | child | ✓ | — | — | — | — |
| Library | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — |
| Transport | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — |
| Hostel | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ |
| HR / Payroll | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — |
| LMS | ✓ | ✓ | view | ✓ | view | — | — | — | — | — | — |
| Reports | ✓ | ✓ | ✓ | limited | — | — | ✓ | limited | limited | limited | limited |

---

## 8. Key Third-Party Services

| Service | Purpose | Provider |
|---------|---------|---------|
| SMS | Attendance alerts, OTP | MSG91 |
| Email | Notifications, reports | Resend |
| Push Notifications | Mobile/web alerts | Firebase FCM |
| WhatsApp | Parent communication | 360Dialog / Twilio |
| File Storage | Photos, docs, videos | Cloudinary |
| Video Conferencing | Online classes | Zoom SDK / Google Meet |
| Payment Gateway | Fee collection (optional) | Razorpay |
| Maps | Transport route display | Google Maps API |
| Error Monitoring | Bug tracking | Sentry |

---

## 9. Build Order (Priority)

Start with what creates the most value earliest:

1. **Auth + Multi-tenancy + RBAC** — nothing works without this
2. **School Setup + User Management** — Admin must be able to create users
3. **Student Management** — largest user group, most features depend on it
4. **Academic (Classes, Subjects, Timetable)** — other modules reference these
5. **Attendance** — daily operational need, quick win for schools
6. **Examination & Results** — high-value for schools
7. **Fees & Finance** — revenue-critical for schools
8. **Communication** — engagement layer on top
9. **Library / Transport / Hostel** — operational modules
10. **LMS** — enhancement
11. **Reports** — across-the-board
12. **Polish & Deploy**

---

## 10. Estimated Timeline

| Phase | Weeks | Deliverable |
|-------|-------|------------|
| Foundation | 1–2 | Auth, DB, Role shells |
| School & Admin Setup | 3–4 | School config, user management |
| Student & Parent | 5–6 | Admissions, parent portal |
| Teacher & HR | 7–8 | Teacher profiles, timetable |
| Academic | 9–10 | Classes, subjects, homework |
| Attendance | 10–11 | Daily attendance, alerts |
| Exams & Results | 12–13 | Marks, report cards |
| Fees & Finance | 14–15 | Fee collection, receipts |
| Library / Transport / Hostel | 16–17 | Operational modules |
| LMS | 18 | Courses, video, assignments |
| Communication | 19 | SMS, chat, notifications |
| Reports & Analytics | 20 | Exports, dashboards |
| Polish & Deploy | 21–22 | QA, CI/CD, production |

**Total: ~22 weeks (5–6 months) for a team of 2–3 developers**

---

## 11. First Steps (Start Here)

```bash
# 1. Initialize project
npx create-next-app@latest erp-school --typescript --tailwind --app --src-dir

# 2. Install core dependencies
npm install prisma @prisma/client next-auth@beta
npm install zustand @tanstack/react-query
npm install zod react-hook-form @hookform/resolvers
npm install recharts
npm install @radix-ui/react-* lucide-react class-variance-authority clsx tailwind-merge

# 3. Install shadcn/ui
npx shadcn@latest init

# 4. Initialize Prisma
npx prisma init

# 5. Set DATABASE_URL in .env
# 6. Write schema.prisma
# 7. npx prisma migrate dev --name init
# 8. Create NextAuth config
# 9. Build login page
# 10. Seed DB
```

### Environment Variables Needed

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

MSG91_API_KEY=
MSG91_SENDER_ID=

RESEND_API_KEY=

FIREBASE_SERVER_KEY=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

SENTRY_DSN=
```

---

*Last updated: 2026-06-16*
