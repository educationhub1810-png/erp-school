import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ROLE_DASHBOARDS } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";
import { isCompanyHost } from "@/lib/company-domain";
import { CompanyPage } from "./company/company-page";
import { LandingPage } from "./landing/landing-page";

const COMPANY_METADATA: Metadata = {
  title: "KreTech",
  description: "KreTech is a product-based technology company. iSMS, our school management platform, is live at isms.study.",
};

const ISMS_METADATA: Metadata = {
  title: "iSMS — School Management System",
  description: "Complete school management platform",
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  return isCompanyHost(host) ? COMPANY_METADATA : ISMS_METADATA;
}

// kretech.in is the company front door; every other host (isms.study,
// localhost, previews) serves the iSMS product marketing page at "/".
export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(ROLE_DASHBOARDS[session.user.role as AppRole]);
  }
  const host = (await headers()).get("host");
  if (isCompanyHost(host)) {
    return <CompanyPage />;
  }
  return <LandingPage />;
}
