import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GET, POST } from "@/app/api/v1/schools/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeSchool, makeClass } from "../helpers/factories";

describe("GET /api/v1/schools", () => {
  beforeEach(() => {
    prismaMock.school.findMany.mockResolvedValue([makeSchool()] as never);
  });

  it("enforces RBAC (Super Admin only)", async () => {
    await expectRbac(GET, ["SUPER_ADMIN"], () => buildRequest("/api/v1/schools"));
  });
});

describe("POST /api/v1/schools", () => {
  const validBody = { name: "Greenwood High" };

  beforeEach(() => {
    prismaMock.school.findMany.mockResolvedValue([]);
    prismaMock.school.create.mockResolvedValue(makeSchool({ id: "school-new", name: "Greenwood High" }) as never);
    prismaMock.class.create.mockResolvedValue(makeClass() as never);
  });

  it("enforces RBAC (Super Admin only)", async () => {
    await expectRbac(POST, ["SUPER_ADMIN"], () => buildRequest("/api/v1/schools", { method: "POST", body: validBody }));
  });

  it("400s on a validation error (name too short)", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, buildRequest("/api/v1/schools", { method: "POST", body: { name: "A" } }));
    expect(res.status).toBe(400);
  });

  it("400s on an invalid phone number", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/schools", { method: "POST", body: { name: "Greenwood High", phone: "123" } }),
    );
    expect(res.status).toBe(400);
  });

  it("creates the school and seeds it with the 15 default classes", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, buildRequest("/api/v1/schools", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);

    expect(prismaMock.class.create).toHaveBeenCalledTimes(15);
    const seededNames = prismaMock.class.create.mock.calls.map((c) => (c[0]!.data as { name: string }).name);
    expect(seededNames.slice(0, 3)).toEqual(["Nursery", "Jr. KG", "Sr. KG"]);
    expect(seededNames).toContain("Class 12");

    const seededSchoolIds = prismaMock.class.create.mock.calls.map((c) => (c[0]!.data as { schoolId: string }).schoolId);
    expect(seededSchoolIds.every((id) => id === "school-new")).toBe(true);

    expect(prismaMock.section.createMany).toHaveBeenCalledTimes(1);
    const sectionRows = prismaMock.section.createMany.mock.calls[0][0]!.data as { name: string }[];
    expect(sectionRows).toHaveLength(15 * 7);
  });

  it("stores the logo when provided, and null when omitted", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    await callRoute(
      POST,
      buildRequest("/api/v1/schools", {
        method: "POST",
        body: { name: "Greenwood High", logo: "data:image/png;base64,abc123" },
      }),
    );
    expect((prismaMock.school.create.mock.calls[0][0]!.data as { logo?: string | null }).logo).toBe(
      "data:image/png;base64,abc123",
    );

    prismaMock.school.create.mockClear();
    await callRoute(POST, buildRequest("/api/v1/schools", { method: "POST", body: validBody }));
    expect((prismaMock.school.create.mock.calls[0][0]!.data as { logo?: string | null }).logo).toBeNull();
  });
});
