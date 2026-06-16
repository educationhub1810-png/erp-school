import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { ImpersonateForm } from "./impersonate-form";

export default async function AdminAccessPage() {
  const cookieStore = await cookies();
  const adminKey = cookieStore.get("admin_access")?.value;
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_CODE) {
    redirect("/login");
  }

  const schools = await prisma.school.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Administrative Access</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in as any user — for testing only</p>
        </div>

        <ImpersonateForm schools={schools} />

        <p className="text-center mt-6">
          <a href="/login" className="text-xs text-orange-600 hover:underline">
            ← Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
