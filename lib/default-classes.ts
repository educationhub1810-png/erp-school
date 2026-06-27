import { prisma } from "@/lib/prisma";
import { DEFAULT_SECTIONS } from "@/lib/ensure-class-sections";

export const DEFAULT_CLASS_NAMES = [
  "Nursery", "Jr. KG", "Sr. KG",
  ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`),
];

/** Seed a new school with the standard pre-primary-through-12 classes, each with sections A–G. */
export async function seedDefaultClasses(schoolId: string): Promise<void> {
  const classes = await prisma.$transaction(
    DEFAULT_CLASS_NAMES.map((name) => prisma.class.create({ data: { schoolId, name } })),
  );
  await prisma.section.createMany({
    data: classes.flatMap((cls) => DEFAULT_SECTIONS.map((name) => ({ classId: cls.id, name }))),
  });
}
