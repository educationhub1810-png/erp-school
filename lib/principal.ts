import { prisma } from "@/lib/prisma";

export async function getPrincipalName(schoolId: string): Promise<string | null> {
  const principal = await prisma.staff.findFirst({
    where: { schoolId, user: { role: "PRINCIPAL", isActive: true } },
    include: { user: { select: { name: true } } },
  });
  return principal?.user.name ?? null;
}
