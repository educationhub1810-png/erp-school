import { cookies } from "next/headers";
import { ok, badRequest } from "@/lib/api-response";
import { secureEquals } from "@/lib/secure-compare";

export async function POST(req: Request) {
  const { code } = await req.json();

  if (!secureEquals(code, process.env.ADMIN_SECRET_CODE)) {
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
