import { describe, it, expect } from "vitest";
import { getPrincipalName } from "@/lib/principal";
import { prismaMock } from "../mocks/prisma";

describe("getPrincipalName", () => {
  it("returns the active principal's name for the school", async () => {
    prismaMock.staff.findFirst.mockResolvedValue({ user: { name: "Vinit Nagal" } } as never);
    const name = await getPrincipalName("school-1");
    expect(name).toBe("Vinit Nagal");
    expect(prismaMock.staff.findFirst).toHaveBeenCalledWith({
      where: { schoolId: "school-1", user: { role: "PRINCIPAL", isActive: true } },
      include: { user: { select: { name: true } } },
    });
  });

  it("returns null when the school has no active principal", async () => {
    prismaMock.staff.findFirst.mockResolvedValue(null);
    const name = await getPrincipalName("school-2");
    expect(name).toBeNull();
  });
});
