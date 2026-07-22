import type { Metadata } from "next";
import { CompanyPage } from "./company-page";

export const metadata: Metadata = {
  title: "VSkreative",
  description: "VSkreative is a product-based technology company. iSMS, our school management platform, is live at isms.study.",
};

export default function Page() {
  return <CompanyPage />;
}
