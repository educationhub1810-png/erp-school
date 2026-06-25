import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfileData } from "@/lib/profile";
import { ProfileView } from "@/components/shared/profile-view";
import type { AppRole } from "@/lib/roles";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await getProfileData(session.user.id, session.user.role as AppRole);
  if (!data) redirect("/login");

  return <ProfileView data={data} />;
}
