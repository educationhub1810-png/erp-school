// Lightweight factories for the shapes Prisma would return. These are plain
// objects fed to `prismaMock.*.mockResolvedValue(...)` — they don't need every
// column, only the fields the handler under test reads.

let seq = 0;
const id = (p: string) => `${p}-${++seq}`;

export function makeSchool(over: Partial<Record<string, unknown>> = {}) {
  return { id: id("school"), name: "Delhi Public School", code: "SCH001", isActive: true, ...over };
}

export function makeStudent(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: id("student"),
    schoolId: "school-1",
    studentCode: "D-STD00001",
    rollNumber: "1",
    firstName: "Rahul",
    middleName: null,
    lastName: "Verma",
    gender: "MALE",
    classId: "class-1",
    sectionId: "section-1",
    house: null,
    admissionDate: new Date("2025-04-01"),
    isAlumni: false,
    ...over,
  };
}

export function makeTeacher(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: id("teacher"),
    schoolId: "school-1",
    employeeId: "EMP001",
    firstName: "Priya",
    lastName: "Singh",
    ...over,
  };
}

export function makeClass(over: Partial<Record<string, unknown>> = {}) {
  return { id: "class-1", schoolId: "school-1", name: "Class 10", ...over };
}

export function makeBug(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: id("bug"),
    title: "Login button misaligned",
    description: "On mobile the button overflows",
    status: "OPEN",
    priority: "MEDIUM",
    createdById: "user-super_admin",
    ...over,
  };
}

export function makeUser(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: id("user"),
    schoolId: "school-1",
    name: "Test User",
    email: "user@test.local",
    role: "STUDENT",
    isActive: true,
    ...over,
  };
}
