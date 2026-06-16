Here is the extracted text summary from **SMS_Final.docx**. 

# School Management ERP System Requirements

## Roles

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

## Core Modules

### 1. Dashboard

* Analytics dashboard
* Charts and reports
* Attendance overview
* Fee collection analytics
* Exam performance
* Notifications

### 2. Student Management

* Admissions
* Online registration
* Student profiles
* Document management
* ID card generation
* Class allocation
* Promotions
* Alumni management
* Student history tracking

### 3. Parent Management

* Parent portal
* Student progress tracking
* Attendance monitoring
* Fee tracking
* Teacher communication
* Homework
* Leave applications

### 4. Teacher Management

* Teacher profiles
* Qualifications
* Subject allocation
* Timetable
* Attendance
* Salary management
* Leave management
* Examination management

### 5. Staff & HR

* Employee records
* Payroll
* Leave requests
* Attendance
* Performance tracking
* Recruitment

### 6. Academic Management

* Classes & sections
* Subjects
* Syllabus
* Lesson planning
* Homework
* Study materials
* Academic calendar

### 7. Attendance Management

* Daily attendance
* SMS alerts
* Attendance reports

### 8. Examination & Results

* Exam scheduling
* Online exams
* Marks entry
* Grading
* Report cards
* Performance analytics
* Result publishing

### 9. Fees & Finance

* Fee structure
* Invoices
* Receipts
* Scholarships
* Discounts
* Expense tracking
* Accounting reports
* GST support

### 10. Library

* Book inventory
* Issue/return
* Fine calculation

### 11. Transport

* Bus routes
* Driver management
* Transport fees

### 12. Hostel

* Room allocation
* Hostel attendance
* Visitor records
* Hostel fees

### 13. Communication

* SMS
* Email
* Push notifications
* WhatsApp
* Parent-teacher chat
* Announcements

### 14. LMS

* Online classes
* Video lectures
* Assignments
* Quizzes
* Student submissions
* Zoom/Google Meet integration

### 15. Reports & Analytics

* Student performance
* Finance reports
* Attendance reports
* PDF, Excel, CSV exports

---

# Authentication Module

### Login Fields

* School Code
* Password
* Remember Me
* Role Selection
* OTP Verification

### Signup Fields

* Full Name
* School Name
* Mobile Number
* Password
* Country
* State
* City

### Forgot Password

* Mobile Number
* OTP
* New Password

---

# School Setup

### School Information

* School Name
* Logo
* Registration Number
* Affiliation Number
* Principal Name
* Contact Information
* Address
* Timezone
* Currency
* Language

### Academic Year

* Academic Year Name
* Start Date
* End Date
* Status

---

# Student Management Database Fields

### Admission Form

* Admission Number
* Roll Number
* First/Middle/Last Name
* Gender
* DOB
* Blood Group
* Category
* Religion
* Aadhaar Number
* Photo
* Contact Details
* Address
* Previous School
* Admission Date
* Class
* Section
* House
* Transport Required
* Hostel Required
* Medical Conditions

### Parent Details

* Father/Mother Information
* Guardian Information

### Documents

* Birth Certificate
* Aadhaar Card
* Transfer Certificate
* Mark Sheet
* Passport Photo

### Student Profile

* Student ID
* RFID Number
* Username
* Attendance %
* Academic Performance
* Fee Status

---

# Teacher Management Fields

* Employee ID
* Name
* Gender
* DOB
* Qualification
* Experience
* Subject Specialization
* Joining Date
* Email
* Mobile
* Salary
* Bank Details
* PAN Number
* Aadhaar Number
* Resume
* Profile Photo

---

# Additional Modules With Database Fields

### Classes & Sections

* Class
* Section
* Capacity
* Class Teacher

### Subjects

* Subject Name
* Subject Code
* Pass Marks
* Total Marks
* Assigned Teacher

### Attendance

* Student ID
* Date
* Status
* Check-in/out

### Examination

* Exam Name
* Subject
* Marks
* Grade
* GPA
* Rank

### Fees

* Fee Type
* Amount
* Due Date
* Receipt Number
* Payment Status
* Transaction ID

### Library

* ISBN
* Author
* Publisher
* Rack Number

### Transport

* Vehicle Number
* Driver Details
* Route Details
* GPS Device ID

### Hostel

* Room Allocation
* Bed Number
* Warden

### Timetable

* Class
* Subject
* Teacher
* Day
* Time

### Homework

* Assignment Details
* Submission Tracking

### LMS

* Course Title
* Teacher
* Duration
* Chapters

### Payroll

* Salary Components
* Allowances
* Deductions
* Bonus
* Net Salary

### Recruitment

* Job Title
* Vacancy
* Experience
* Salary Range

---

# Recommended Registration Flow

According to the document:

1. School Registers
2. School Admin Created
3. School Admin Creates Users
4. Users Login
5. Role-Based Dashboard Opens

### Self Registration Allowed

✅ Super Admin
✅ School Admin

### Self Registration NOT Allowed

❌ Principal
❌ Teacher
❌ Student
❌ Parent
❌ Accountant
❌ Librarian
❌ HR

Reason:

* Better security
* Prevent fake accounts
* Admin-controlled access

---

# Login Flow

1. Enter School Code
2. Enter Email/Mobile + Password
3. System verifies:

   * School
   * User Role
   * Credentials
4. Redirect to role-specific dashboard

Examples:

* Teacher → `/teacher/dashboard`
* Parent → `/parent/dashboard`

The document is essentially a complete requirement specification for a **multi-tenant AI-powered School ERP (Web + Mobile App)** including modules, database fields, workflows, role permissions, and authentication design. 
