import { describe, it, expect } from "vitest";
import { sortClassesByGrade } from "@/lib/class-order";

const names = (classes: { name: string }[]) => classes.map((c) => c.name);

describe("sortClassesByGrade", () => {
  it("orders pre-primary grades before numbered grades", () => {
    const input = [{ name: "Class 1" }, { name: "Nursery" }, { name: "LKG" }, { name: "UKG" }];
    expect(names(sortClassesByGrade(input))).toEqual(["Nursery", "LKG", "UKG", "Class 1"]);
  });

  it("orders numbered grades numerically (not lexically)", () => {
    const input = [{ name: "Class 10" }, { name: "Class 2" }, { name: "Class 1" }];
    expect(names(sortClassesByGrade(input))).toEqual(["Class 1", "Class 2", "Class 10"]);
  });

  it("breaks ties on name (e.g. sections of the same grade)", () => {
    const input = [{ name: "Class 5 B" }, { name: "Class 5 A" }];
    expect(names(sortClassesByGrade(input))).toEqual(["Class 5 A", "Class 5 B"]);
  });

  it("does not mutate the input array", () => {
    const input = [{ name: "Class 2" }, { name: "Class 1" }];
    const copy = [...input];
    sortClassesByGrade(input);
    expect(input).toEqual(copy);
  });

  it("sorts unknown names to the end", () => {
    const input = [{ name: "Special" }, { name: "Class 1" }];
    expect(names(sortClassesByGrade(input))).toEqual(["Class 1", "Special"]);
  });
});
