import { prisma } from "@/lib/prisma";

export const DEFAULT_SECTIONS = ["A", "B", "C", "D", "E", "F", "G"];

export async function ensureClassSections<T extends { id: string; sections: unknown[] }>(
  classes: T[]
): Promise<boolean> {
  const withoutSections = classes.filter((c) => c.sections.length === 0);
  if (withoutSections.length === 0) return false;

  await prisma.section.createMany({
    data: withoutSections.flatMap((c) => DEFAULT_SECTIONS.map((name) => ({ classId: c.id, name }))),
  });
  return true;
}
