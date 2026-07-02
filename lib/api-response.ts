import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

const DUPLICATE_FIELD_MESSAGES: Record<string, string> = {
  email: "This email address is already in use. Please use a different email.",
  mobile: "This mobile number is already registered. Please use a different number.",
  aadhaar: "This Aadhaar number is already linked to another account.",
  pan: "This PAN number is already linked to another account.",
  employeeId: "This Employee ID is already taken.",
  parentCode: "This Parent Code is already in use.",
  studentCode: "This Student Code is already in use.",
  code: "This code is already in use.",
};

interface PrismaP2002Meta {
  target?: string[];
  driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
}

export function duplicateValue(error: unknown) {
  const meta = (error as { meta?: PrismaP2002Meta })?.meta;
  const fields = meta?.target ?? meta?.driverAdapterError?.cause?.constraint?.fields;
  const field = fields?.[0] ?? "";
  const message = DUPLICATE_FIELD_MESSAGES[field]
    ?? `This ${field.replace(/([A-Z])/g, " $1").toLowerCase().trim() || "value"} is already in use.`;
  return badRequest(message);
}

export function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function serverError(error: unknown) {
  console.error(error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}
