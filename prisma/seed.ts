import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SECTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G"];

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("Admin@123", 12);

  // ── Super Admin ────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash("admin123", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin",
      mobile: "9000000000",
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Super Admin created:", superAdmin.email);

  // ── Demo School ───────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { code: "SCH001" },
    update: {
      logo: "/uploads/schools/sch001-logo.png",
      regNumber: "REG-DL-2005-00123",
      affiliationNumber: "CBSE-AFF-2310456",
      principalName: "Dr. Ramesh Sharma",
      establishedDate: new Date("2005-04-15"),
      email: "admin@dps.edu.in",
      phone: "9100000001",
      address: "Sector 12, Rohini",
      city: "New Delhi",
      state: "Delhi",
    },
    create: {
      name: "Delhi Public School",
      code: "SCH001",
      logo: "/uploads/schools/sch001-logo.png",
      regNumber: "REG-DL-2005-00123",
      affiliationNumber: "CBSE-AFF-2310456",
      principalName: "Dr. Ramesh Sharma",
      establishedDate: new Date("2005-04-15"),
      email: "admin@dps.edu.in",
      phone: "9100000001",
      address: "Sector 12, Rohini",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      timezone: "Asia/Kolkata",
      currency: "INR",
      language: "en",
      isActive: true,
    },
  });
  const schoolLetter = school.name.trim()[0].toUpperCase(); // "D"
  console.log("✅ School created:", school.name, `(Code: ${school.code})`);

  // ── Academic Year ─────────────────────────────────────────────
  const academicYear = await prisma.academicYear.upsert({
    where: { id: "ay-2025-26" },
    update: {},
    create: {
      id: "ay-2025-26",
      schoolId: school.id,
      name: "2025-26",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
    },
  });
  console.log("✅ Academic year:", academicYear.name);

  // ── School Users (one per role) ───────────────────────────────
  const roles: Array<{
    name: string;
    email: string;
    mobile: string;
    role: "SCHOOL_ADMIN" | "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "TRANSPORT_MANAGER" | "HR_MANAGER" | "WARDEN_MANAGER" | "MESS_MANAGER";
  }> = [
    { name: "School Admin", email: "admin@sch001.com", mobile: "9100000002", role: "SCHOOL_ADMIN" },
    { name: "Principal Sharma", email: "principal@sch001.com", mobile: "9100000003", role: "PRINCIPAL" },
    { name: "Priya Singh", email: "teacher@sch001.com", mobile: "9100000004", role: "TEACHER" },
    { name: "Rahul Verma", email: "student@sch001.com", mobile: "9100000005", role: "STUDENT" },
    { name: "Sanjay Verma", email: "parent@sch001.com", mobile: "9100000006", role: "PARENT" },
    { name: "Rekha Gupta", email: "accountant@sch001.com", mobile: "9100000007", role: "ACCOUNTANT" },
    { name: "Mohan Das", email: "librarian@sch001.com", mobile: "9100000008", role: "LIBRARIAN" },
    { name: "Deepak Kumar", email: "transport@sch001.com", mobile: "9100000009", role: "TRANSPORT_MANAGER" },
    { name: "Sunita HR", email: "hr@sch001.com", mobile: "9100000010", role: "HR_MANAGER" },
    { name: "Rajesh Warden", email: "warden@sch001.com", mobile: "9100000011", role: "WARDEN_MANAGER" },
    { name: "Kavita Mess", email: "mess@sch001.com", mobile: "9100000012", role: "MESS_MANAGER" },
  ];

  const createdUsers: Record<string, string> = {};

  for (const roleData of roles) {
    const user = await prisma.user.upsert({
      where: { email: roleData.email },
      update: {},
      create: {
        schoolId: school.id,
        name: roleData.name,
        email: roleData.email,
        mobile: roleData.mobile,
        passwordHash,
        role: roleData.role,
        isActive: true,
        createdBy: superAdmin.id,
      },
    });
    createdUsers[roleData.role] = user.id;
    console.log(`✅ ${roleData.role}: ${roleData.email}`);
  }

  // ── Extra demo accounts (2nd/3rd teacher, 2 more students, a 2nd parent) ──
  const extraAccounts = [
    { key: "TEACHER2", name: "Anita Rao", email: "teacher2@sch001.com", mobile: "9100000013", role: "TEACHER" as const },
    { key: "TEACHER3", name: "Vikram Joshi", email: "teacher3@sch001.com", mobile: "9100000014", role: "TEACHER" as const },
    { key: "STUDENT2", name: "Sneha Iyer", email: "student2@sch001.com", mobile: "9100000015", role: "STUDENT" as const },
    { key: "STUDENT3", name: "Arjun Nair", email: "student3@sch001.com", mobile: "9100000016", role: "STUDENT" as const },
    { key: "MOTHER", name: "Meena Verma", email: "mother@sch001.com", mobile: "9100000017", role: "PARENT" as const },
  ];
  for (const a of extraAccounts) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        schoolId: school.id,
        name: a.name,
        email: a.email,
        mobile: a.mobile,
        passwordHash,
        role: a.role,
        isActive: true,
        createdBy: superAdmin.id,
      },
    });
    createdUsers[a.key] = user.id;
  }
  console.log("✅ Extra demo accounts created (2 teachers, 2 students, 1 parent)");

  // ── Classes ───────────────────────────────────────────────────
  const classNames = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
                       "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
                       "Class 11", "Class 12"];
  const createdClasses: { id: string; name: string }[] = [];

  for (const name of classNames) {
    const cls = await prisma.class.upsert({
      where: { id: `cls-sch001-${name.replace(" ", "-").toLowerCase()}` },
      update: {},
      create: {
        id: `cls-sch001-${name.replace(" ", "-").toLowerCase()}`,
        schoolId: school.id,
        name,
        capacity: 40,
      },
    });
    createdClasses.push({ id: cls.id, name: cls.name });
  }
  console.log(`✅ ${classNames.length} classes created`);

  const class9 = createdClasses.find((c) => c.name === "Class 9")!;
  const class10 = createdClasses.find((c) => c.name === "Class 10")!;
  const class11 = createdClasses.find((c) => c.name === "Class 11")!;

  // ── Sections A-G for every class ────────────────────────────────
  // Class 10 keeps its original section IDs (A/B/C predate this script);
  // D-G are added so every class ends up with the same A-G sequence.
  const sectionsByClass: Record<string, { id: string; name: string }[]> = {};
  for (const cls of createdClasses) {
    sectionsByClass[cls.id] = [];
    for (const letter of SECTION_LETTERS) {
      const id = cls.id === class10.id ? `sec-sch001-cls10-${letter}` : `sec-${cls.id}-${letter}`;
      const section = await prisma.section.upsert({
        where: { id },
        update: {},
        create: { id, classId: cls.id, name: letter, capacity: 40 },
      });
      sectionsByClass[cls.id].push({ id: section.id, name: section.name });
    }
  }
  console.log("✅ Sections A-G created for every class");

  const class10SectionA = sectionsByClass[class10.id][0];
  const class9SectionA = sectionsByClass[class9.id][0];
  const class11SectionA = sectionsByClass[class11.id][0];

  // ── Teacher profiles ──────────────────────────────────────────
  const teacher1 = await prisma.teacher.upsert({
    where: { userId: createdUsers["TEACHER"] },
    update: {
      employeeId: "D-TCH00001",
      gender: "FEMALE",
      dob: new Date("1990-03-12"),
      qualification: "M.Sc Mathematics, B.Ed",
      experienceYears: 5,
      specialization: "Mathematics",
      joiningDate: new Date("2020-06-01"),
      salary: 45000,
      bankName: "State Bank of India",
      accountNumber: "30123456789",
      ifscCode: "SBIN0001234",
      pan: "ABCPV1234E",
      aadhaar: "234567890123",
      photoUrl: "/uploads/staff/teacher-priya.jpg",
      resumeUrl: "/uploads/resumes/priya-singh-resume.pdf",
    },
    create: {
      schoolId: school.id,
      userId: createdUsers["TEACHER"],
      employeeId: "D-TCH00001",
      gender: "FEMALE",
      dob: new Date("1990-03-12"),
      qualification: "M.Sc Mathematics, B.Ed",
      experienceYears: 5,
      specialization: "Mathematics",
      joiningDate: new Date("2020-06-01"),
      salary: 45000,
      bankName: "State Bank of India",
      accountNumber: "30123456789",
      ifscCode: "SBIN0001234",
      pan: "ABCPV1234E",
      aadhaar: "234567890123",
      photoUrl: "/uploads/staff/teacher-priya.jpg",
      resumeUrl: "/uploads/resumes/priya-singh-resume.pdf",
    },
  });

  const teacher2 = await prisma.teacher.upsert({
    where: { userId: createdUsers["TEACHER2"] },
    update: {},
    create: {
      schoolId: school.id,
      userId: createdUsers["TEACHER2"],
      employeeId: "D-TCH00002",
      gender: "FEMALE",
      dob: new Date("1988-07-22"),
      qualification: "M.Sc Physics, B.Ed",
      experienceYears: 8,
      specialization: "Science",
      joiningDate: new Date("2018-06-15"),
      salary: 48000,
      bankName: "HDFC Bank",
      accountNumber: "50123456790",
      ifscCode: "HDFC0001122",
      pan: "BCDPV5678F",
      aadhaar: "345678901234",
      photoUrl: "/uploads/staff/teacher-anita.jpg",
      resumeUrl: "/uploads/resumes/anita-rao-resume.pdf",
    },
  });

  const teacher3 = await prisma.teacher.upsert({
    where: { userId: createdUsers["TEACHER3"] },
    update: {},
    create: {
      schoolId: school.id,
      userId: createdUsers["TEACHER3"],
      employeeId: "D-TCH00003",
      gender: "MALE",
      dob: new Date("1985-11-05"),
      qualification: "M.A English Literature, B.Ed",
      experienceYears: 10,
      specialization: "English",
      joiningDate: new Date("2016-04-01"),
      salary: 50000,
      bankName: "ICICI Bank",
      accountNumber: "60123456791",
      ifscCode: "ICIC0001133",
      pan: "CDEPV9012G",
      aadhaar: "456789012345",
      photoUrl: "/uploads/staff/teacher-vikram.jpg",
      resumeUrl: "/uploads/resumes/vikram-joshi-resume.pdf",
    },
  });
  console.log("✅ 3 teacher profiles created");

  // ── Class 10 gets a class teacher (loose string field, no FK) ──
  await prisma.class.update({ where: { id: class10.id }, data: { classTeacherId: teacher1.id } });

  // ── Subjects for Class 10 ─────────────────────────────────────
  const subjectDefs = [
    { name: "Mathematics", code: "MATH10", teacherId: teacher1.id },
    { name: "Science", code: "SCI10", teacherId: teacher2.id },
    { name: "English", code: "ENG10", teacherId: teacher3.id },
    { name: "Hindi", code: "HIN10", teacherId: teacher1.id },
    { name: "Social Studies", code: "SST10", teacherId: teacher2.id },
  ];
  const createdSubjects: { id: string; name: string; teacherId: string | null }[] = [];
  for (const sub of subjectDefs) {
    const id = `sub-sch001-cls10-${sub.name.toLowerCase().replace(" ", "-")}`;
    const subject = await prisma.subject.upsert({
      where: { id },
      update: { code: sub.code, teacherId: sub.teacherId },
      create: {
        id,
        schoolId: school.id,
        classId: class10.id,
        name: sub.name,
        code: sub.code,
        totalMarks: 100,
        passMarks: 33,
        teacherId: sub.teacherId,
      },
    });
    createdSubjects.push({ id: subject.id, name: subject.name, teacherId: subject.teacherId });
  }
  console.log("✅ Subjects created for Class 10");
  const mathSubject = createdSubjects.find((s) => s.name === "Mathematics")!;

  // ── Staff profiles (Principal + the 6 manager roles) ──────────
  const staffDefs: Array<{
    role: string;
    employeeId: string;
    department: string | null;
    designation: string | null;
    qualification: string | null;
    experienceYears: number | null;
    licenseNumber: string | null;
    vehicleNumber: string | null;
    assignedBlock: string | null;
  }> = [
    { role: "PRINCIPAL", employeeId: "D-PRN00001", department: "Administration", designation: "Principal", qualification: "M.Ed, Ph.D", experienceYears: 18, licenseNumber: null, vehicleNumber: null, assignedBlock: null },
    { role: "ACCOUNTANT", employeeId: "ACC001", department: "Finance & Accounts", designation: "Senior Accountant", qualification: "B.Com, CA", experienceYears: 9, licenseNumber: null, vehicleNumber: null, assignedBlock: null },
    { role: "LIBRARIAN", employeeId: "LIB001", department: "Library", designation: "Head Librarian", qualification: "B.Lib, M.Lib", experienceYears: 6, licenseNumber: null, vehicleNumber: null, assignedBlock: null },
    { role: "TRANSPORT_MANAGER", employeeId: "TRN001", department: "Transport", designation: "Transport Manager", qualification: null, experienceYears: 7, licenseNumber: "DL-0420110012345", vehicleNumber: "DL1PA1234", assignedBlock: null },
    { role: "HR_MANAGER", employeeId: "HR001", department: "Human Resources", designation: "HR Manager", qualification: "MBA HR", experienceYears: 11, licenseNumber: null, vehicleNumber: null, assignedBlock: null },
    { role: "WARDEN_MANAGER", employeeId: "WRD001", department: "Hostel", designation: "Hostel Warden", qualification: "B.A.", experienceYears: 5, licenseNumber: null, vehicleNumber: null, assignedBlock: "Block A" },
    { role: "MESS_MANAGER", employeeId: "MES001", department: "Kitchen & Mess", designation: "Mess Manager", qualification: "Diploma in Catering", experienceYears: 4, licenseNumber: null, vehicleNumber: null, assignedBlock: "Main Mess Hall" },
  ];

  const createdStaff: Record<string, string> = {};
  for (const s of staffDefs) {
    const staff = await prisma.staff.upsert({
      where: { userId: createdUsers[s.role] },
      update: {},
      create: {
        schoolId: school.id,
        userId: createdUsers[s.role],
        employeeId: s.employeeId,
        department: s.department,
        designation: s.designation,
        joiningDate: new Date("2019-06-01"),
        salary: 30000,
        bankName: "Punjab National Bank",
        accountNumber: `7012345${s.employeeId.slice(-4)}`,
        ifscCode: "PUNB0001234",
        pan: "DEFPV3456H",
        aadhaar: "567890123456",
        qualification: s.qualification,
        experienceYears: s.experienceYears,
        licenseNumber: s.licenseNumber,
        vehicleNumber: s.vehicleNumber,
        assignedBlock: s.assignedBlock,
      },
    });
    createdStaff[s.role] = staff.id;
  }
  console.log("✅ Staff profiles created (Principal + 6 manager roles)");

  // ── Student profiles ───────────────────────────────────────────
  const rahul = await prisma.student.upsert({
    where: { userId: createdUsers["STUDENT"] },
    update: {
      middleName: "Kumar",
      dob: new Date("2010-08-15"),
      bloodGroup: "B+",
      category: "General",
      religion: "Hindu",
      aadhaar: "678901234567",
      photoUrl: "/uploads/students/rahul-verma.jpg",
      house: "Red",
      transportRequired: true,
      medicalNotes: "No known allergies",
      rfidNumber: "RFID-D-00001",
      previousSchool: "Sunrise Public School",
    },
    create: {
      schoolId: school.id,
      userId: createdUsers["STUDENT"],
      studentCode: "D-STD00001",
      rollNumber: "10A01",
      firstName: "Rahul",
      middleName: "Kumar",
      lastName: "Verma",
      gender: "MALE",
      dob: new Date("2010-08-15"),
      bloodGroup: "B+",
      category: "General",
      religion: "Hindu",
      aadhaar: "678901234567",
      photoUrl: "/uploads/students/rahul-verma.jpg",
      classId: class10.id,
      sectionId: class10SectionA.id,
      house: "Red",
      transportRequired: true,
      hostelRequired: false,
      medicalNotes: "No known allergies",
      admissionDate: new Date("2025-04-01"),
      rfidNumber: "RFID-D-00001",
      previousSchool: "Sunrise Public School",
    },
  });

  const sneha = await prisma.student.upsert({
    where: { userId: createdUsers["STUDENT2"] },
    update: {},
    create: {
      schoolId: school.id,
      userId: createdUsers["STUDENT2"],
      studentCode: "D-STD00004",
      rollNumber: "09A05",
      firstName: "Sneha",
      middleName: "Rani",
      lastName: "Iyer",
      gender: "FEMALE",
      dob: new Date("2011-02-20"),
      bloodGroup: "A+",
      category: "OBC",
      religion: "Hindu",
      aadhaar: "789012345678",
      photoUrl: "/uploads/students/sneha-iyer.jpg",
      classId: class9.id,
      sectionId: class9SectionA.id,
      house: "Blue",
      transportRequired: false,
      hostelRequired: false,
      medicalNotes: "Mild peanut allergy",
      admissionDate: new Date("2025-04-01"),
      rfidNumber: "RFID-D-00002",
      previousSchool: "Greenwood High",
    },
  });

  const arjun = await prisma.student.upsert({
    where: { userId: createdUsers["STUDENT3"] },
    update: {},
    create: {
      schoolId: school.id,
      userId: createdUsers["STUDENT3"],
      studentCode: "D-STD00005",
      rollNumber: "11A02",
      firstName: "Arjun",
      middleName: "Dev",
      lastName: "Nair",
      gender: "MALE",
      dob: new Date("2009-12-02"),
      bloodGroup: "O+",
      category: "General",
      religion: "Hindu",
      aadhaar: "890123456789",
      photoUrl: "/uploads/students/arjun-nair.jpg",
      classId: class11.id,
      sectionId: class11SectionA.id,
      house: "Green",
      transportRequired: false,
      hostelRequired: true,
      medicalNotes: "Wears spectacles",
      admissionDate: new Date("2024-04-01"),
      rfidNumber: "RFID-D-00003",
      previousSchool: "St. Xavier's School",
    },
  });
  console.log("✅ 3 student profiles created");

  // ── Parent (legacy single-record-per-student model) ────────────
  await prisma.parent.upsert({
    where: { studentId: rahul.id },
    update: {
      motherName: "Meena Verma",
      motherMobile: "9100000017",
      motherEmail: "mother@sch001.com",
      motherOccupation: "Teacher",
      guardianName: "Sanjay Verma",
      guardianMobile: "9100000006",
      guardianRelation: "Father",
      address: "House 45, Sector 12, Rohini, New Delhi - 110085",
    },
    create: {
      schoolId: school.id,
      studentId: rahul.id,
      fatherName: "Sanjay Verma",
      fatherMobile: "9100000006",
      fatherEmail: "parent@sch001.com",
      fatherOccupation: "Business",
      motherName: "Meena Verma",
      motherMobile: "9100000017",
      motherEmail: "mother@sch001.com",
      motherOccupation: "Teacher",
      guardianName: "Sanjay Verma",
      guardianMobile: "9100000006",
      guardianRelation: "Father",
      address: "House 45, Sector 12, Rohini, New Delhi - 110085",
    },
  });
  console.log("✅ Legacy parent record filled for Rahul");

  // ── ParentProfile (multi-account model: one login per parent) ──
  const fatherProfile = await prisma.parentProfile.upsert({
    where: { userId: createdUsers["PARENT"] },
    update: {},
    create: {
      userId: createdUsers["PARENT"],
      schoolId: school.id,
      studentId: rahul.id,
      parentCode: `${schoolLetter}-PAR00001`,
      parentType: "FATHER",
      firstName: "Sanjay",
      lastName: "Verma",
      gender: "MALE",
      dob: new Date("1982-05-10"),
      maritalStatus: "MARRIED",
      nationality: "Indian",
      aadhaar: "901234567890",
      pan: "EFGPV7890I",
      address: "House 45, Sector 12, Rohini, New Delhi - 110085",
    },
  });

  await prisma.parentProfile.upsert({
    where: { userId: createdUsers["MOTHER"] },
    update: {},
    create: {
      userId: createdUsers["MOTHER"],
      schoolId: school.id,
      studentId: rahul.id,
      parentCode: `${schoolLetter}-PAR00002`,
      parentType: "MOTHER",
      firstName: "Meena",
      lastName: "Verma",
      gender: "FEMALE",
      dob: new Date("1984-09-18"),
      maritalStatus: "MARRIED",
      nationality: "Indian",
      aadhaar: "012345678901",
      pan: "FGHPV2345J",
      address: "House 45, Sector 12, Rohini, New Delhi - 110085",
    },
  });
  console.log("✅ Parent accounts (Father + Mother) created for Rahul");

  // ── Document ────────────────────────────────────────────────────
  await prisma.document.upsert({
    where: { id: "doc-rahul-birth-cert" },
    update: {},
    create: {
      id: "doc-rahul-birth-cert",
      schoolId: school.id,
      entityType: "STUDENT",
      entityId: rahul.id,
      docType: "Birth Certificate",
      fileUrl: "/uploads/documents/rahul-verma-birth-certificate.pdf",
    },
  });
  console.log("✅ Sample document created");

  // ── Timetable for Class 10 - Section A ─────────────────────────
  const timetableSlots = [
    { day: 1, start: "09:00", end: "09:45", subject: "Mathematics" },
    { day: 2, start: "09:00", end: "09:45", subject: "Science" },
    { day: 3, start: "09:00", end: "09:45", subject: "English" },
    { day: 4, start: "09:00", end: "09:45", subject: "Hindi" },
    { day: 5, start: "09:00", end: "09:45", subject: "Social Studies" },
  ];
  for (const slot of timetableSlots) {
    const subject = createdSubjects.find((s) => s.name === slot.subject)!;
    await prisma.timetable.upsert({
      where: { id: `tt-cls10a-day${slot.day}` },
      update: {},
      create: {
        id: `tt-cls10a-day${slot.day}`,
        schoolId: school.id,
        classId: class10.id,
        sectionId: class10SectionA.id,
        subjectId: subject.id,
        teacherId: subject.teacherId,
        dayOfWeek: slot.day,
        startTime: slot.start,
        endTime: slot.end,
      },
    });
  }
  console.log("✅ Timetable created for Class 10 - Section A");

  // ── Attendance (last 5 days for Rahul) ──────────────────────────
  const attendancePattern: Array<"PRESENT" | "ABSENT" | "LATE"> = ["PRESENT", "PRESENT", "LATE", "PRESENT", "ABSENT"];
  for (let i = 0; i < attendancePattern.length; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const status = attendancePattern[i];
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: rahul.id, date } },
      update: {},
      create: {
        schoolId: school.id,
        studentId: rahul.id,
        academicYearId: academicYear.id,
        date,
        status,
        checkIn: status === "ABSENT" ? null : new Date(date.getTime() + 9 * 60 * 60 * 1000),
        checkOut: status === "ABSENT" ? null : new Date(date.getTime() + 15 * 60 * 60 * 1000),
        remarks: status === "LATE" ? "Arrived 15 minutes late" : status === "ABSENT" ? "Informed sick leave" : null,
      },
    });
  }
  console.log("✅ Attendance records created for Rahul");

  // ── Staff Attendance (Accountant, last 3 days) ──────────────────
  for (let i = 0; i < 3; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    await prisma.staffAttendance.upsert({
      where: { staffId_date: { staffId: createdStaff["ACCOUNTANT"], date } },
      update: {},
      create: {
        schoolId: school.id,
        staffId: createdStaff["ACCOUNTANT"],
        date,
        status: "PRESENT",
        checkIn: new Date(date.getTime() + 9 * 60 * 60 * 1000),
        checkOut: new Date(date.getTime() + 17 * 60 * 60 * 1000),
      },
    });
  }
  console.log("✅ Staff attendance created for Accountant");

  // ── Exam + schedules + results ───────────────────────────────────
  const exam = await prisma.exam.upsert({
    where: { id: "exam-cls10-ut1" },
    update: {},
    create: {
      id: "exam-cls10-ut1",
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: class10.id,
      name: "Unit Test 1",
      examType: "UNIT_TEST",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-09-05"),
      isPublished: true,
    },
  });

  const examMarks: Record<string, number> = { Mathematics: 92, Science: 85, English: 78, Hindi: 88, "Social Studies": 81 };
  let examDay = 1;
  for (const subject of createdSubjects) {
    const schedule = await prisma.examSchedule.upsert({
      where: { id: `es-${exam.id}-${subject.id}` },
      update: {},
      create: {
        id: `es-${exam.id}-${subject.id}`,
        examId: exam.id,
        subjectId: subject.id,
        date: new Date(`2025-09-0${examDay}`),
        startTime: "10:00",
        endTime: "12:00",
        totalMarks: 100,
        passMarks: 33,
      },
    });
    const marks = examMarks[subject.name] ?? 75;
    await prisma.examResult.upsert({
      where: { examScheduleId_studentId: { examScheduleId: schedule.id, studentId: rahul.id } },
      update: {},
      create: {
        schoolId: school.id,
        examId: exam.id,
        examScheduleId: schedule.id,
        studentId: rahul.id,
        marksObtained: marks,
        grade: marks >= 90 ? "A+" : marks >= 80 ? "A" : marks >= 70 ? "B+" : "B",
        gpa: Math.round((marks / 10)) / 1,
        rank: 1,
        remarks: "Good performance",
        isAbsent: false,
      },
    });
    examDay++;
  }
  console.log("✅ Exam, schedules and results created for Class 10");

  // ── Fee structures, payment, scholarship ─────────────────────────
  const tuitionFee = await prisma.feeStructure.upsert({
    where: { id: "fs-sch001-tuition-cls10" },
    update: { description: "Monthly tuition fee for Class 10" },
    create: {
      id: "fs-sch001-tuition-cls10",
      schoolId: school.id,
      classId: class10.id,
      academicYearId: academicYear.id,
      feeType: "Tuition Fee",
      amount: 5000,
      dueDate: new Date("2025-05-10"),
      frequency: "MONTHLY",
      description: "Monthly tuition fee for Class 10",
    },
  });
  await prisma.feeStructure.upsert({
    where: { id: "fs-sch001-transport" },
    update: {},
    create: {
      id: "fs-sch001-transport",
      schoolId: school.id,
      academicYearId: academicYear.id,
      feeType: "Transport Fee",
      amount: 1500,
      dueDate: new Date("2025-05-10"),
      frequency: "MONTHLY",
      description: "Monthly bus transport fee",
    },
  });
  await prisma.feeStructure.upsert({
    where: { id: "fs-sch001-library" },
    update: {},
    create: {
      id: "fs-sch001-library",
      schoolId: school.id,
      academicYearId: academicYear.id,
      feeType: "Library Fee",
      amount: 500,
      dueDate: new Date("2025-04-30"),
      frequency: "ANNUALLY",
      description: "Annual library membership fee",
    },
  });
  console.log("✅ Fee structures created (Tuition, Transport, Library)");

  await prisma.feePayment.upsert({
    where: { receiptNumber: "RCPT-SCH001-00001" },
    update: {},
    create: {
      schoolId: school.id,
      studentId: rahul.id,
      feeStructureId: tuitionFee.id,
      amountPaid: 5000,
      paymentDate: new Date(),
      receiptNumber: "RCPT-SCH001-00001",
      paymentMode: "UPI",
      transactionId: "TXN20250410001",
      status: "PAID",
      remarks: "April tuition fee payment",
    },
  });
  console.log("✅ Fee payment recorded for Rahul");

  await prisma.scholarship.upsert({
    where: { id: "sch-rahul-merit" },
    update: {},
    create: {
      id: "sch-rahul-merit",
      schoolId: school.id,
      studentId: rahul.id,
      name: "Merit Scholarship",
      discountType: "PERCENTAGE",
      discountValue: 10,
      validFrom: new Date("2025-04-01"),
      validTo: new Date("2026-03-31"),
    },
  });
  console.log("✅ Scholarship created for Rahul");

  // ── Expenses ──────────────────────────────────────────────────────
  await prisma.expense.upsert({
    where: { id: "exp-sch001-stationery" },
    update: {},
    create: {
      id: "exp-sch001-stationery",
      schoolId: school.id,
      title: "Stationery Purchase",
      amount: 12000,
      category: "Supplies",
      date: new Date(),
      description: "Notebooks and stationery for Class 10",
      receiptUrl: "/uploads/receipts/expense-stationery.pdf",
    },
  });
  await prisma.expense.upsert({
    where: { id: "exp-sch001-electricity" },
    update: {},
    create: {
      id: "exp-sch001-electricity",
      schoolId: school.id,
      title: "Electricity Bill",
      amount: 8500,
      category: "Utilities",
      date: new Date(),
      description: "Monthly electricity bill for school campus",
      receiptUrl: "/uploads/receipts/expense-electricity.pdf",
    },
  });
  console.log("✅ Expenses recorded");

  // ── Library books + issue ─────────────────────────────────────────
  const books = [
    { id: "lib-book-1", title: "Mathematics for Class 10", author: "R.D. Sharma", isbn: "978-8122413175", publisher: "Dhanpat Rai Publications", edition: "2024", rackNumber: "M-12" },
    { id: "lib-book-2", title: "Science for Class 10", author: "NCERT", isbn: "978-8174504876", publisher: "NCERT", edition: "2023", rackNumber: "S-04" },
    { id: "lib-book-3", title: "The Alchemist", author: "Paulo Coelho", isbn: "978-0062315007", publisher: "HarperCollins", edition: "25th Anniversary", rackNumber: "F-21" },
  ];
  const createdBooks: { id: string; title: string }[] = [];
  for (const book of books) {
    const created = await prisma.libraryBook.upsert({
      where: { id: book.id },
      update: { publisher: book.publisher, edition: book.edition, rackNumber: book.rackNumber },
      create: {
        id: book.id,
        schoolId: school.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        publisher: book.publisher,
        edition: book.edition,
        rackNumber: book.rackNumber,
        totalCopies: 5,
        availableCopies: 4,
        category: "Academic",
      },
    });
    createdBooks.push({ id: created.id, title: created.title });
  }
  console.log("✅ Library books seeded");

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  await prisma.libraryIssue.upsert({
    where: { id: "issue-rahul-book1" },
    update: {},
    create: {
      id: "issue-rahul-book1",
      schoolId: school.id,
      bookId: createdBooks[0].id,
      studentId: rahul.id,
      issueDate: new Date(),
      dueDate,
      fineAmount: 0,
      status: "ISSUED",
    },
  });
  console.log("✅ Library book issued to Rahul");

  // ── Transport ──────────────────────────────────────────────────────
  const route = await prisma.transportRoute.upsert({
    where: { id: "route-sch001-1" },
    update: {},
    create: {
      id: "route-sch001-1",
      schoolId: school.id,
      routeName: "Route 1 - Rohini Sector",
      vehicleNumber: "DL1PA1234",
      driverName: "Ramesh Yadav",
      driverMobile: "9988776655",
      gpsDeviceId: "GPS-RT01",
      capacity: 40,
    },
  });
  await prisma.transportStudent.upsert({
    where: { studentId: rahul.id },
    update: {},
    create: {
      schoolId: school.id,
      studentId: rahul.id,
      routeId: route.id,
      stopName: "Sector 12 Gate",
      feeAmount: 1500,
    },
  });
  console.log("✅ Transport route created and Rahul assigned");

  // ── Hostel ───────────────────────────────────────────────────────
  const hostelRoom = await prisma.hostelRoom.upsert({
    where: { id: "room-sch001-101" },
    update: {},
    create: {
      id: "room-sch001-101",
      schoolId: school.id,
      roomNumber: "101",
      floor: "1st Floor",
      capacity: 4,
      roomType: "DORMITORY",
      wardenId: createdStaff["WARDEN_MANAGER"],
    },
  });
  await prisma.hostelAllocation.upsert({
    where: { studentId: arjun.id },
    update: {},
    create: {
      schoolId: school.id,
      roomId: hostelRoom.id,
      studentId: arjun.id,
      bedNumber: "B2",
      fromDate: new Date("2024-04-01"),
      feeAmount: 3000,
    },
  });
  console.log("✅ Hostel room created and Arjun allocated");

  // ── LMS course, chapter, assignment, submission ─────────────────────
  const lmsCourse = await prisma.lmsCourse.upsert({
    where: { id: "lms-course-algebra" },
    update: {},
    create: {
      id: "lms-course-algebra",
      schoolId: school.id,
      classId: class10.id,
      title: "Algebra Basics",
      description: "Foundational algebra concepts for Class 10 students",
      teacherId: teacher1.id,
      durationHours: 10,
      status: "PUBLISHED",
    },
  });
  const chapter1 = await prisma.lmsChapter.upsert({
    where: { id: "lms-chapter-1" },
    update: {},
    create: {
      id: "lms-chapter-1",
      courseId: lmsCourse.id,
      title: "Introduction to Algebra",
      videoUrl: "/uploads/lms/algebra-intro.mp4",
      notesUrl: "/uploads/lms/algebra-intro-notes.pdf",
      order: 1,
      duration: 45,
    },
  });
  await prisma.lmsChapter.upsert({
    where: { id: "lms-chapter-2" },
    update: {},
    create: {
      id: "lms-chapter-2",
      courseId: lmsCourse.id,
      title: "Linear Equations",
      videoUrl: "/uploads/lms/linear-equations.mp4",
      notesUrl: "/uploads/lms/linear-equations-notes.pdf",
      order: 2,
      duration: 60,
    },
  });
  const lmsAssignment = await prisma.lmsAssignment.upsert({
    where: { id: "lms-assignment-1" },
    update: {},
    create: {
      id: "lms-assignment-1",
      chapterId: chapter1.id,
      title: "Algebra Worksheet 1",
      description: "Solve the 10 algebra problems attached",
      dueDate: new Date("2025-09-15"),
      maxMarks: 50,
    },
  });
  await prisma.lmsSubmission.upsert({
    where: { id: "lms-submission-rahul-1" },
    update: {},
    create: {
      id: "lms-submission-rahul-1",
      assignmentId: lmsAssignment.id,
      studentId: rahul.id,
      fileUrl: "/uploads/lms/submissions/rahul-worksheet1.pdf",
      submittedAt: new Date("2025-09-14"),
      marks: 42,
      remarks: "Well done, minor calculation errors",
    },
  });
  console.log("✅ LMS course, chapter, assignment and submission created");

  // ── Homework + submission ───────────────────────────────────────────
  const homeworkDue = new Date();
  homeworkDue.setDate(homeworkDue.getDate() + 5);
  const homework = await prisma.homework.upsert({
    where: { id: "hw-cls10a-math-1" },
    update: {},
    create: {
      id: "hw-cls10a-math-1",
      schoolId: school.id,
      subjectId: mathSubject.id,
      classId: class10.id,
      sectionId: class10SectionA.id,
      teacherId: teacher1.id,
      title: "Chapter 3 Exercise",
      description: "Complete questions 1-15 from Chapter 3 (Quadratic Equations)",
      dueDate: homeworkDue,
      attachmentUrl: "/uploads/homework/chapter3-exercise.pdf",
    },
  });
  await prisma.homeworkSubmission.upsert({
    where: { homeworkId_studentId: { homeworkId: homework.id, studentId: rahul.id } },
    update: {},
    create: {
      homeworkId: homework.id,
      studentId: rahul.id,
      submittedAt: new Date(),
      fileUrl: "/uploads/homework/submissions/rahul-chapter3.pdf",
      marks: 9,
      remarks: "Good attempt, review question 12",
    },
  });
  console.log("✅ Homework and submission created");

  // ── Announcement + notification ─────────────────────────────────────
  await prisma.announcement.upsert({
    where: { id: "ann-sch001-sports-day" },
    update: {},
    create: {
      id: "ann-sch001-sports-day",
      schoolId: school.id,
      title: "Annual Sports Day",
      body: "The Annual Sports Day will be held on 20th December. All students must report by 8 AM in sports uniform.",
      createdById: createdUsers["SCHOOL_ADMIN"],
      targetRoles: ["TEACHER", "STUDENT", "PARENT"],
      attachmentUrl: "/uploads/announcements/sports-day-schedule.pdf",
    },
  });
  await prisma.notification.upsert({
    where: { id: "notif-sch001-fee-reminder" },
    update: {},
    create: {
      id: "notif-sch001-fee-reminder",
      schoolId: school.id,
      title: "Fee Due Reminder",
      body: "This is a reminder that the monthly tuition fee is due on the 10th of this month.",
      type: "SMS",
      targetRole: "PARENT",
      status: "SENT",
    },
  });
  console.log("✅ Announcement and notification created");

  // ── Chat messages ────────────────────────────────────────────────────
  const msg1 = await prisma.chatMessage.upsert({
    where: { id: "chat-1" },
    update: {},
    create: {
      id: "chat-1",
      schoolId: school.id,
      senderId: createdUsers["TEACHER"],
      receiverId: createdUsers["PARENT"],
      message: "Rahul is doing well in Mathematics this term.",
      sentAt: new Date(Date.now() - 60 * 60 * 1000),
      readAt: new Date(),
    },
  });
  await prisma.chatMessage.upsert({
    where: { id: "chat-2" },
    update: {},
    create: {
      id: "chat-2",
      schoolId: school.id,
      senderId: createdUsers["PARENT"],
      receiverId: createdUsers["TEACHER"],
      message: "Thank you for the update! We'll keep encouraging him.",
      sentAt: new Date(),
    },
  });
  console.log("✅ Chat messages created", msg1.id);

  // ── Leave request ─────────────────────────────────────────────────────
  await prisma.leaveRequest.upsert({
    where: { id: "leave-teacher-priya-1" },
    update: {},
    create: {
      id: "leave-teacher-priya-1",
      schoolId: school.id,
      userId: createdUsers["TEACHER"],
      fromDate: new Date("2025-09-22"),
      toDate: new Date("2025-09-23"),
      leaveType: "SICK",
      reason: "Fever and viral infection",
      status: "APPROVED",
      approvedById: createdUsers["SCHOOL_ADMIN"],
      approvedAt: new Date("2025-09-21"),
    },
  });
  console.log("✅ Leave request created for Priya (approved)");

  // ── Payroll ───────────────────────────────────────────────────────────
  const now = new Date();
  await prisma.payroll.upsert({
    where: { id: "payroll-teacher-priya" },
    update: {},
    create: {
      id: "payroll-teacher-priya",
      schoolId: school.id,
      teacherId: teacher1.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      basic: 40000,
      allowances: 5000,
      deductions: 2000,
      bonus: 0,
      netSalary: 43000,
      status: "PAID",
      paidAt: now,
    },
  });
  await prisma.payroll.upsert({
    where: { id: "payroll-staff-accountant" },
    update: {},
    create: {
      id: "payroll-staff-accountant",
      schoolId: school.id,
      staffId: createdStaff["ACCOUNTANT"],
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      basic: 30000,
      allowances: 3000,
      deductions: 1500,
      bonus: 0,
      netSalary: 31500,
      status: "PAID",
      paidAt: now,
    },
  });
  console.log("✅ Payroll created for teacher and accountant");

  // ── Recruitment ───────────────────────────────────────────────────────
  await prisma.recruitment.upsert({
    where: { id: "recruit-pgt-physics" },
    update: {},
    create: {
      id: "recruit-pgt-physics",
      schoolId: school.id,
      jobTitle: "PGT Physics Teacher",
      vacancies: 2,
      experienceRequired: "3-5 years",
      salaryRange: "₹35,000 - ₹50,000 per month",
      description: "Looking for an experienced Physics teacher for senior secondary classes.",
      status: "OPEN",
    },
  });
  console.log("✅ Recruitment posting created");

  // ── Bug ticket ────────────────────────────────────────────────────────
  await prisma.bugTicket.upsert({
    where: { id: "bug-sch001-attendance-slow" },
    update: {},
    create: {
      id: "bug-sch001-attendance-slow",
      schoolId: school.id,
      reporterId: createdUsers["SCHOOL_ADMIN"],
      title: "Attendance page slow to load",
      description: "The attendance marking page takes a long time to load when a class has many students.",
      whatNotWorking: "Page spinner shows for 10+ seconds before the student list appears.",
      whatExpected: "Page should load within 2 seconds like other list pages.",
      screenshotUrl: "/uploads/bugs/attendance-slow-screenshot.png",
      status: "OPEN",
      priority: "MEDIUM",
    },
  });
  console.log("✅ Sample bug ticket created");

  console.log("\n🎉 Seeding complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔑 Login Credentials (password: Admin@123 unless noted)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Super Admin    | superadmin             | password: admin123");
  console.log("School Admin   | admin@sch001.com       | password: Admin@123");
  console.log("Principal      | principal@sch001.com   | School Code: SCH001");
  console.log("Teacher 1      | teacher@sch001.com     | School Code: SCH001  (Priya Singh, Maths)");
  console.log("Teacher 2      | teacher2@sch001.com    | School Code: SCH001  (Anita Rao, Science)");
  console.log("Teacher 3      | teacher3@sch001.com    | School Code: SCH001  (Vikram Joshi, English)");
  console.log("Student 1      | student@sch001.com     | School Code: SCH001  (Rahul Verma, Class 10-A)");
  console.log("Student 2      | student2@sch001.com    | School Code: SCH001  (Sneha Iyer, Class 9-A)");
  console.log("Student 3      | student3@sch001.com    | School Code: SCH001  (Arjun Nair, Class 11-A)");
  console.log("Parent (Father)| parent@sch001.com      | School Code: SCH001  (Sanjay Verma)");
  console.log("Parent (Mother)| mother@sch001.com      | School Code: SCH001  (Meena Verma)");
  console.log("Accountant     | accountant@sch001.com  | School Code: SCH001");
  console.log("Librarian      | librarian@sch001.com   | School Code: SCH001");
  console.log("Transport Mgr  | transport@sch001.com   | School Code: SCH001");
  console.log("HR Manager     | hr@sch001.com          | School Code: SCH001");
  console.log("Warden Manager | warden@sch001.com      | School Code: SCH001");
  console.log("Mess Manager   | mess@sch001.com        | School Code: SCH001");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
