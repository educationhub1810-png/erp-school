import { describe, it, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import { buildRequest } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import type { AppRole } from "@/lib/roles";

import { GET as teachersGET, POST as teachersPOST } from "@/app/api/v1/teachers/route";
import { GET as staffGET, POST as staffPOST } from "@/app/api/v1/staff/route";
import { GET as parentsGET, POST as parentsPOST } from "@/app/api/v1/parents/route";
import { GET as schoolsGET, POST as schoolsPOST } from "@/app/api/v1/schools/route";
import { GET as classesGET } from "@/app/api/v1/classes/route";
import { GET as usersGET, POST as usersPOST } from "@/app/api/v1/users/route";
import { GET as ayGET, POST as ayPOST } from "@/app/api/v1/academic-years/route";

// Every GET handler queries findMany (+ maybe count); seed them all so an
// allowed role reaches a 2xx instead of a 500. POST RBAC checks only need the
// auth gate, so an empty body (→ 400 for allowed roles) is fine.
beforeEach(() => {
  for (const model of [
    prismaMock.teacher,
    prismaMock.staff,
    prismaMock.parent,
    prismaMock.school,
    prismaMock.class,
    prismaMock.user,
    prismaMock.academicYear,
  ]) {
    // @ts-expect-error -- generic loop over heterogeneous delegates
    model.findMany?.mockResolvedValue([]);
    // @ts-expect-error -- not every delegate has count, optional-chain guards it
    model.count?.mockResolvedValue(0);
  }
});

interface Case {
  name: string;
  handler: (req: Request, ctx?: unknown) => Promise<Response> | Response;
  roles: AppRole[];
  method?: "GET" | "POST";
  path: string;
  // Some school-scoped writes require a schoolId on the session even for
  // SUPER_ADMIN, so give every test session one for those.
  needsSchool?: boolean;
}

const cases: Case[] = [
  { name: "GET /teachers", handler: teachersGET, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "HR_MANAGER"], path: "/api/v1/teachers" },
  { name: "POST /teachers", handler: teachersPOST, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"], method: "POST", path: "/api/v1/teachers" },
  { name: "GET /staff", handler: staffGET, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "HR_MANAGER"], path: "/api/v1/staff" },
  { name: "POST /staff", handler: staffPOST, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"], method: "POST", path: "/api/v1/staff" },
  { name: "GET /parents", handler: parentsGET, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], path: "/api/v1/parents" },
  { name: "POST /parents", handler: parentsPOST, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], method: "POST", path: "/api/v1/parents" },
  { name: "GET /schools", handler: schoolsGET, roles: ["SUPER_ADMIN"], path: "/api/v1/schools" },
  { name: "POST /schools", handler: schoolsPOST, roles: ["SUPER_ADMIN"], method: "POST", path: "/api/v1/schools" },
  { name: "GET /classes", handler: classesGET, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"], path: "/api/v1/classes" },
  { name: "GET /users", handler: usersGET, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"], path: "/api/v1/users" },
  { name: "POST /users", handler: usersPOST, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], method: "POST", path: "/api/v1/users", needsSchool: true },
  { name: "GET /academic-years", handler: ayGET, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"], path: "/api/v1/academic-years" },
  { name: "POST /academic-years", handler: ayPOST, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], method: "POST", path: "/api/v1/academic-years", needsSchool: true },
];

describe("API route RBAC matrix", () => {
  for (const c of cases) {
    it(`${c.name} — only [${c.roles.join(", ")}]`, async () => {
      await expectRbac(
        c.handler,
        c.roles,
        () => buildRequest(c.path, c.method === "POST" ? { method: "POST", body: {} } : {}),
        undefined,
        c.needsSchool ? { schoolId: "school-1" } : {},
      );
    });
  }
});
