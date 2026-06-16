import { cookies } from "next/headers";
import { ok, badRequest } from "@/lib/api-response";

export async function POST(req: Request) {
  const { code } = await req.json();

  if (!code || code !== process.env.ADMIN_SECRET_CODE) {
    return badRequest("Invalid code");
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_access", code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 4 * 60 * 60, // 4 hours
    path: "/",
  });

  return ok({ verified: true });
}
