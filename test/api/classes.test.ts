import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/classes/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeClass } from "../helpers/factories";

const LIST_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"] as const;
const WRITE_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;

describe("GET /api/v1/classes", () => {
  beforeEach(() => {
    prismaMock.class.findMany.mockResolvedValue([makeClass({ sections: [] })] as never);
  });

  it("enforces RBAC (list roles only)", async () => {
    await expectRbac(GET, [...LIST_ROLES], () => buildRequest("/api/v1/classes", { searchParams: { schoolId: "school-1" } }));
  });

  it("400s when a Super Admin omits schoolId", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(GET, buildRequest("/api/v1/classes"));
    expect(res.status).toBe(400);
  });

  it("scopes a School Admin to their own school, ignoring a ?schoolId override", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/classes", { searchParams: { schoolId: "school-999" } }));
    const where = prismaMock.class.findMany.mock.calls[0][0]!.where as { schoolId?: string };
    expect(where.schoolId).toBe("school-1");
  });

  it("sorts pre-primary classes before numbered classes", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.class.findMany.mockResolvedValue([
      makeClass({ id: "c-2", name: "Class 2", sections: [] }),
      makeClass({ id: "c-nursery", name: "Nursery", sections: [] }),
      makeClass({ id: "c-1", name: "Class 1", sections: [] }),
      makeClass({ id: "c-jrkg", name: "Jr. KG", sections: [] }),
    ] as never);
    const res = await callRoute(GET, buildRequest("/api/v1/classes"));
    const names = (res.body as { data: { name: string }[] }).data.map((c) => c.name);
    expect(names).toEqual(["Nursery", "Jr. KG", "Class 1", "Class 2"]);
  });
});

describe("POST /api/v1/classes", () => {
  beforeEach(() => {
    prismaMock.class.create.mockResolvedValue(makeClass({ id: "class-new" }) as never);
    prismaMock.class.findUnique.mockResolvedValue(makeClass({ id: "class-new", sections: [] }) as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(POST, [...WRITE_ROLES], () => buildRequest("/api/v1/classes", { method: "POST", body: { name: "Nursery" } }));
  });

  it("400s on a validation error (missing name)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/classes", { method: "POST", body: { name: "" } }));
    expect(res.status).toBe(400);
  });

  it("400s when a Super Admin omits schoolId", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, buildRequest("/api/v1/classes", { method: "POST", body: { name: "Nursery" } }));
    expect(res.status).toBe(400);
  });

  it("creates the class under the School Admin's own school, with default sections", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/classes", { method: "POST", body: { name: "Nursery" } }));
    expect(res.status).toBe(201);

    const data = prismaMock.class.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.schoolId).toBe("school-1");
    expect(data.name).toBe("Nursery");

    const sectionData = prismaMock.section.createMany.mock.calls[0][0]!.data as { classId: string; name: string }[];
    expect(sectionData).toHaveLength(7);
    expect(sectionData.map((s) => s.name)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });

  it("lets a Super Admin create a class for a school named in the request body", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/classes", { method: "POST", body: { name: "Jr. KG", schoolId: "school-9" } }),
    );
    expect(res.status).toBe(201);
    const data = prismaMock.class.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.schoolId).toBe("school-9");
  });
});
