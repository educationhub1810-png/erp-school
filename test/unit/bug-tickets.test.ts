import { describe, it, expect } from "vitest";
import { bugScopeWhere, getBugTicketsForUser } from "@/lib/bug-tickets";
import { prismaMock } from "../mocks/prisma";
import type { SessionUser } from "@/lib/session";

const superAdmin: SessionUser = { id: "u1", name: "S", role: "SUPER_ADMIN" };
const teacher: SessionUser = { id: "u2", name: "T", role: "TEACHER", schoolId: "school-1" };
const noSchool: SessionUser = { id: "u3", name: "X", role: "TEACHER" };

describe("bugScopeWhere", () => {
  it("returns an unrestricted scope for super admin", () => {
    expect(bugScopeWhere(superAdmin)).toEqual({});
  });

  it("scopes to the user's school for other roles", () => {
    expect(bugScopeWhere(teacher)).toEqual({ schoolId: "school-1" });
  });

  it("uses a sentinel that matches nothing when school is missing", () => {
    expect(bugScopeWhere(noSchool)).toEqual({ schoolId: "__none__" });
  });
});

describe("getBugTicketsForUser", () => {
  const baseTicket = {
    id: "b1",
    schoolId: "school-1",
    reporterId: "u2",
    title: "T",
    description: "D",
    whatNotWorking: null,
    whatExpected: null,
    status: "OPEN",
    priority: "MEDIUM",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    school: { name: "DPS", code: "SCH001" },
    reporter: { name: "T", role: "TEACHER" },
  };

  it("flags hasScreenshot and never leaks the blob, returning ISO dates", async () => {
    prismaMock.bugTicket.findMany
      .mockResolvedValueOnce([baseTicket, { ...baseTicket, id: "b2" }] as never)
      .mockResolvedValueOnce([{ id: "b1" }] as never); // only b1 has a screenshot

    const result = await getBugTicketsForUser(teacher);

    expect(result).toHaveLength(2);
    expect(result.find((t) => t.id === "b1")!.hasScreenshot).toBe(true);
    expect(result.find((t) => t.id === "b2")!.hasScreenshot).toBe(false);
    expect(result[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result[0]).not.toHaveProperty("screenshotUrl");
  });

  it("queries with the school scope for a non-super-admin", async () => {
    prismaMock.bugTicket.findMany.mockResolvedValue([] as never);
    await getBugTicketsForUser(teacher);
    const firstCallWhere = prismaMock.bugTicket.findMany.mock.calls[0][0]!.where;
    expect(firstCallWhere).toEqual({ schoolId: "school-1" });
  });
});
