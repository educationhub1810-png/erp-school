import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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
    update: {},
    create: {
      name: "Delhi Public School",
      code: "SCH001",
      principalName: "Dr. Ramesh Sharma",
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

  // ── School Users (all roles) ──────────────────────────────────
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

  // ── Sections for Class 10 ─────────────────────────────────────
  const class10 = createdClasses.find((c) => c.name === "Class 10")!;
  const sections = ["A", "B", "C"];
  const createdSections: { id: string; name: string }[] = [];

  for (const sec of sections) {
    const section = await prisma.section.upsert({
      where: { id: `sec-sch001-cls10-${sec}` },
      update: {},
      create: {
        id: `sec-sch001-cls10-${sec}`,
        classId: class10.id,
        name: sec,
        capacity: 40,
      },
    });
    createdSections.push({ id: section.id, name: section.name });
  }
  console.log("✅ Sections A, B, C created for Class 10");

  // ── Subjects for Class 10 ─────────────────────────────────────
  const subjectNames = ["Mathematics", "Science", "English", "Hindi", "Social Studies"];
  for (const subName of subjectNames) {
    await prisma.subject.upsert({
      where: { id: `sub-sch001-cls10-${subName.toLowerCase().replace(" ", "-")}` },
      update: {},
      create: {
        id: `sub-sch001-cls10-${subName.toLowerCase().replace(" ", "-")}`,
        schoolId: school.id,
        classId: class10.id,
        name: subName,
        totalMarks: 100,
        passMarks: 33,
      },
    });
  }
  console.log("✅ Subjects created for Class 10");

  // ── Teacher profile ───────────────────────────────────────────
  const teacherUserId = createdUsers["TEACHER"];
  await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    update: {},
    create: {
      schoolId: school.id,
      userId: teacherUserId,
      employeeId: "EMP001",
      gender: "FEMALE",
      qualification: "M.Sc Mathematics",
      experienceYears: 5,
      specialization: "Mathematics",
      joiningDate: new Date("2020-06-01"),
      salary: 45000,
    },
  });
  console.log("✅ Teacher profile created");

  // ── Student profile ───────────────────────────────────────────
  const studentUserId = createdUsers["STUDENT"];
  const studentRecord = await prisma.student.upsert({
    where: { userId: studentUserId },
    update: {},
    create: {
      schoolId: school.id,
      userId: studentUserId,
      studentCode: "STD00001",
      rollNumber: "10A01",
      firstName: "Rahul",
      lastName: "Verma",
      gender: "MALE",
      classId: class10.id,
      sectionId: createdSections[0].id,
      admissionDate: new Date("2025-04-01"),
    },
  });

  // Parent linked to student
  const parentUserId = createdUsers["PARENT"];
  await prisma.parent.upsert({
    where: { studentId: studentRecord.id },
    update: {},
    create: {
      schoolId: school.id,
      studentId: studentRecord.id,
      fatherName: "Sanjay Verma",
      fatherMobile: "9100000006",
      fatherEmail: "parent@sch001.com",
      fatherOccupation: "Business",
    },
  });
  console.log("✅ Student and Parent profiles created");

  // ── Fee structure ─────────────────────────────────────────────
  await prisma.feeStructure.upsert({
    where: { id: "fs-sch001-tuition-cls10" },
    update: {},
    create: {
      id: "fs-sch001-tuition-cls10",
      schoolId: school.id,
      classId: class10.id,
      academicYearId: academicYear.id,
      feeType: "Tuition Fee",
      amount: 5000,
      frequency: "MONTHLY",
      description: "Monthly tuition fee for Class 10",
    },
  });
  console.log("✅ Fee structure created");

  // ── Library books ─────────────────────────────────────────────
  const books = [
    { title: "Mathematics for Class 10", author: "R.D. Sharma", isbn: "978-8122413175" },
    { title: "Science for Class 10", author: "NCERT", isbn: "978-8174504876" },
    { title: "The Alchemist", author: "Paulo Coelho", isbn: "978-0062315007" },
  ];

  for (const book of books) {
    await prisma.libraryBook.create({
      data: {
        schoolId: school.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        totalCopies: 5,
        availableCopies: 5,
        category: "Academic",
      },
    }).catch(() => {/* ignore duplicates */});
  }
  console.log("✅ Library books seeded");

  console.log("\n🎉 Seeding complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔑 Login Credentials (password: Admin@123)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Super Admin    | superadmin             | password: admin123 | (no school code)");
  console.log("School Admin   | admin@sch001.com       | School Code: SCH001");
  console.log("Principal      | principal@sch001.com   | School Code: SCH001");
  console.log("Teacher        | teacher@sch001.com     | School Code: SCH001");
  console.log("Student        | student@sch001.com     | School Code: SCH001");
  console.log("Parent         | parent@sch001.com      | School Code: SCH001");
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
