import type { Metadata } from "next";
import { LandingPage } from "@/app/landing/landing-page";

export const metadata: Metadata = {
  title: "iSMS — School Management System",
  description: "Complete school management platform",
};

export default function IsmsHome() {
  return <LandingPage />;
}
