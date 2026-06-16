import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROLE_DASHBOARDS } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(ROLE_DASHBOARDS[session.user.role as AppRole]);
  }
  redirect("/login");
}
