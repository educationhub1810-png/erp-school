import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import type { AppRole } from "@/lib/roles";

import { DELETE as teachersDelete } from "@/app/api/v1/teachers/[id]/route";
import { DELETE as staffDelete } from "@/app/api/v1/staff/[id]/route";
import { DELETE as parentsDelete } from "@/app/api/v1/parents/[id]/route";
import { DELETE as schoolsDelete } from "@/app/api/v1/schools/[id]/route";

// All four DELETE handlers look up the record first; returning null means an
// allowed role lands on 404 (not 401/403), which is exactly what the RBAC
// helper needs to tell "allowed" from "forbidden".
beforeEach(() => {
  prismaMock.teacher.findUnique.mockResolvedValue(null as never);
  prismaMock.staff.findUnique.mockResolvedValue(null as never);
  prismaMock.user.findUnique.mockResolvedValue(null as never);
  prismaMock.school.findUnique.mockResolvedValue(null as never);
});

interface Case {
  name: string;
  handler: (req: Request, ctx?: unknown) => Promise<Response> | Response;
  roles: AppRole[];
  path: string;
}

const cases: Case[] = [
  { name: "DELETE /teachers/[id]", handler: teachersDelete, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"], path: "/api/v1/teachers/t1" },
  { name: "DELETE /staff/[id]", handler: staffDelete, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"], path: "/api/v1/staff/s1" },
  { name: "DELETE /parents/[id]", handler: parentsDelete, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], path: "/api/v1/parents/p1" },
  { name: "DELETE /schools/[id]", handler: schoolsDelete, roles: ["SUPER_ADMIN"], path: "/api/v1/schools/sch1" },
];

describe("[id] DELETE route RBAC", () => {
  for (const c of cases) {
    it(`${c.name} — only [${c.roles.join(", ")}]`, async () => {
      await expectRbac(c.handler, c.roles, () => buildRequest(c.path, { method: "DELETE" }), paramsCtx({ id: "x" }));
    });
  }
});

describe("[id] DELETE 404s on a missing record", () => {
  it("teachers/[id] returns 404 for an allowed role when the teacher does not exist", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(teachersDelete, buildRequest("/api/v1/teachers/missing", { method: "DELETE" }), paramsCtx({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("schools/[id] returns 404 for a super admin when the school does not exist", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(schoolsDelete, buildRequest("/api/v1/schools/missing", { method: "DELETE" }), paramsCtx({ id: "missing" }));
    expect(res.status).toBe(404);
  });
});
