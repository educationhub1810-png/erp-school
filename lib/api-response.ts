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

const DUPLICATE_FIELD_LABELS: Record<string, string> = {
  email: "Email",
  mobile: "Mobile",
  employeeId: "Employee ID",
  parentCode: "Parent Code",
  studentCode: "Student Code",
  aadhaar: "Aadhaar Number",
  pan: "PAN Number",
  code: "Code",
};

function duplicateFieldLabel(field: string): string {
  return DUPLICATE_FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function duplicateValue(error: unknown) {
  const target = (error as { meta?: { target?: string[] } })?.meta?.target;
  const field = target?.[0] ?? "value";
  return badRequest(`Please enter correct value (${duplicateFieldLabel(field)})`);
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
