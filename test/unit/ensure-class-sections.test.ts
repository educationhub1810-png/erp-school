import { describe, it, expect } from "vitest";
import { ensureClassSections } from "@/lib/ensure-class-sections";
import { prismaMock } from "../mocks/prisma";

describe("ensureClassSections", () => {
  it("does nothing and returns false when every class already has sections", async () => {
    const classes = [{ id: "c1", sections: [{ id: "s1" }] }];
    const created = await ensureClassSections(classes);
    expect(created).toBe(false);
    expect(prismaMock.section.createMany).not.toHaveBeenCalled();
  });

  it("creates the default A–G sections for classes that have none, returns true", async () => {
    prismaMock.section.createMany.mockResolvedValue({ count: 7 } as never);
    const classes = [
      { id: "c1", sections: [] },
      { id: "c2", sections: [{ id: "s1" }] }, // already has one — skipped
    ];
    const created = await ensureClassSections(classes);
    expect(created).toBe(true);

    const data = prismaMock.section.createMany.mock.calls[0][0]!.data as { classId: string; name: string }[];
    // 7 default sections only for c1
    expect(data).toHaveLength(7);
    expect(data.every((d) => d.classId === "c1")).toBe(true);
    expect(data.map((d) => d.name)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });
});
