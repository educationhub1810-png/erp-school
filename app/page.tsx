import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ROLE_DASHBOARDS } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";
import { CompanyPage } from "./company/company-page";

export const metadata: Metadata = {
  title: "VSkreative",
  description: "VSkreative is a product-based technology company. iSMS, our school management platform, is live at isms.study.",
};

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(ROLE_DASHBOARDS[session.user.role as AppRole]);
  }
  return <CompanyPage />;
}
