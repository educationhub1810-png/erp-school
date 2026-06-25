import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";
import { getProfileData } from "@/lib/profile";

const baseUser = {
  id: "u1",
  name: "Jane Doe",
  email: "jane@sch001.com",
  mobile: "9999999999",
  role: "SUPER_ADMIN",
  isActive: true,
  createdAt: new Date("2024-01-15"),
  totpEnabled: true,
  school: null,
};

beforeEach(() => {
  resetPrismaMock();
});

describe("getProfileData", () => {
  it("returns null when the user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    const result = await getProfileData("missing", "SUPER_ADMIN");
    expect(result).toBeNull();
  });

  it("returns base fields with no details for SUPER_ADMIN / SCHOOL_ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser as never);
    const result = await getProfileData("u1", "SUPER_ADMIN");
    expect(result).toMatchObject({
      id: "u1",
      name: "Jane Doe",
      email: "jane@sch001.com",
      mobile: "9999999999",
      role: "SUPER_ADMIN",
      isActive: true,
      totpEnabled: true,
      schoolName: null,
      schoolCode: null,
      details: [],
    });
    expect(prismaMock.student.findUnique).not.toHaveBeenCalled();
  });

  it("includes the school name/code when the user belongs to a school", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      role: "SCHOOL_ADMIN",
      school: { name: "Delhi Public School", code: "SCH001" },
    } as never);
    const result = await getProfileData("u1", "SCHOOL_ADMIN");
    expect(result?.schoolName).toBe("Delhi Public School");
    expect(result?.schoolCode).toBe("SCH001");
  });

  it("includes Student details (class, section, gender, dob) for STUDENT", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, role: "STUDENT" } as never);
    prismaMock.student.findUnique.mockResolvedValue({
      studentCode: "STU001",
      rollNumber: "12",
      photoUrl: "https://example.com/p.jpg",
      gender: "FEMALE",
      dob: new Date("2012-05-20"),
      bloodGroup: "O+",
      house: "Red",
      admissionDate: new Date("2020-06-01"),
      class: { name: "Grade 5" },
      section: { name: "A" },
    } as never);

    const result = await getProfileData("u1", "STUDENT");
    expect(result?.photoUrl).toBe("https://example.com/p.jpg");
    expect(result?.details).toEqual(
      expect.arrayContaining([
        { label: "Student Code", value: "STU001" },
        { label: "Class", value: "Grade 5" },
        { label: "Section", value: "A" },
        { label: "Gender", value: "Female" },
        { label: "Blood Group", value: "O+" },
      ]),
    );
  });

  it("includes Teacher details for TEACHER", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, role: "TEACHER" } as never);
    prismaMock.teacher.findUnique.mockResolvedValue({
      employeeId: "EMP100",
      gender: "MALE",
      dob: new Date("1985-03-10"),
      qualification: "M.Ed",
      specialization: "Mathematics",
      experienceYears: 8,
      joiningDate: new Date("2018-07-01"),
      photoUrl: null,
    } as never);

    const result = await getProfileData("u1", "TEACHER");
    expect(result?.details).toEqual(
      expect.arrayContaining([
        { label: "Employee ID", value: "EMP100" },
        { label: "Experience", value: "8 years" },
        { label: "Qualification", value: "M.Ed" },
      ]),
    );
  });

  it("includes ParentProfile details for PARENT", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, role: "PARENT" } as never);
    prismaMock.parentProfile.findUnique.mockResolvedValue({
      parentCode: "PAR001",
      parentType: "FATHER",
      gender: "MALE",
      dob: new Date("1980-01-01"),
      maritalStatus: "MARRIED",
      address: "123 Main St",
    } as never);

    const result = await getProfileData("u1", "PARENT");
    expect(result?.details).toEqual(
      expect.arrayContaining([
        { label: "Parent Code", value: "PAR001" },
        { label: "Relation", value: "FATHER" },
        { label: "Address", value: "123 Main St" },
      ]),
    );
  });

  it("includes Staff details for staff-backed roles (e.g. ACCOUNTANT)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, role: "ACCOUNTANT" } as never);
    prismaMock.staff.findUnique.mockResolvedValue({
      employeeId: "ACC001",
      department: "Finance",
      designation: "Senior Accountant",
      dob: new Date("1990-09-09"),
      qualification: "CA",
      experienceYears: 5,
      joiningDate: new Date("2021-01-01"),
    } as never);

    const result = await getProfileData("u1", "ACCOUNTANT");
    expect(result?.details).toEqual(
      expect.arrayContaining([
        { label: "Employee ID", value: "ACC001" },
        { label: "Designation", value: "Senior Accountant" },
        { label: "Department", value: "Finance" },
      ]),
    );
  });

  it("leaves details empty when the role-specific record is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, role: "TEACHER" } as never);
    prismaMock.teacher.findUnique.mockResolvedValue(null as never);
    const result = await getProfileData("u1", "TEACHER");
    expect(result?.details).toEqual([]);
  });
});
