// Shared zod field schemas + length limits, reused across every create/edit
// form in the app so validation rules (and their error messages) stay
// consistent instead of being redefined ad-hoc per dialog.
import { z } from "zod";

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const AADHAAR_REGEX = /^\d{12}$/;
export const PINCODE_REGEX = /^\d{6}$/;
export const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

export const FIELD_MAX = {
  name: 100,
  email: 254,
  mobile: 10,
  aadhaar: 12,
  pan: 10,
  ifsc: 11,
  accountNumber: 18,
  pincode: 6,
  address: 250,
  shortText: 100,
  longText: 1000,
  title: 200,
} as const;

const blank = () => z.literal("");

export function nameField(label = "Name", max: number = FIELD_MAX.name) {
  return z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
}

export function optionalTextField(label = "This field", max: number = FIELD_MAX.shortText) {
  return z.string().trim().max(max, `${label} is too long`).optional().or(blank());
}

export function optionalLongTextField(label = "This field", max: number = FIELD_MAX.longText) {
  return z.string().trim().max(max, `${label} is too long`).optional().or(blank());
}

export function requiredTextField(label = "This field", max: number = FIELD_MAX.shortText) {
  return z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
}

export function emailField() {
  return z.string().trim().toLowerCase().max(FIELD_MAX.email, "Email is too long").email("Invalid email").optional().or(blank());
}

export function requiredEmailField() {
  return z.string().trim().toLowerCase().max(FIELD_MAX.email, "Email is too long").email("Invalid email");
}

export function mobileField() {
  return z.string().trim().regex(INDIAN_MOBILE_REGEX, "Enter a valid 10-digit mobile number").optional().or(blank());
}

export function requiredMobileField() {
  return z.string().trim().regex(INDIAN_MOBILE_REGEX, "Enter a valid 10-digit mobile number");
}

export function aadhaarField() {
  return z.string().trim().regex(AADHAAR_REGEX, "Aadhaar must be exactly 12 digits").optional().or(blank());
}

export function panField() {
  return z.string().trim().toUpperCase().regex(PAN_REGEX, "Enter a valid PAN (e.g. ABCDE1234F)").optional().or(blank());
}

export function ifscField() {
  return z.string().trim().toUpperCase().regex(IFSC_REGEX, "Enter a valid IFSC code (e.g. SBIN0001234)").optional().or(blank());
}

export function accountNumberField() {
  return z.string().trim().regex(ACCOUNT_NUMBER_REGEX, "Enter a valid account number (9-18 digits)").optional().or(blank());
}

export function pincodeField() {
  return z.string().trim().regex(PINCODE_REGEX, "Enter a valid 6-digit PIN code").optional().or(blank());
}

export function addressField(max = FIELD_MAX.address) {
  return z.string().trim().max(max, "Address is too long").optional().or(blank());
}

/** A non-negative money amount typed as a string input, coerced to number. */
export function moneyField(label = "Amount", opts: { required?: boolean; max?: number } = {}) {
  const { required = false, max = 99_999_999 } = opts;
  const base = z.coerce.number({ message: `${label} must be a number` }).max(max, `${label} is too large`);
  return required ? base.positive(`${label} must be greater than 0`) : base.min(0, `${label} must be 0 or more`).optional();
}

/** A non-negative integer typed as a string input (e.g. years of experience, capacity). */
export function positiveIntField(label = "This field", opts: { required?: boolean; max?: number } = {}) {
  const { required = false, max = 100_000 } = opts;
  const base = z.coerce.number({ message: `${label} must be a number` }).int(`${label} must be a whole number`).max(max, `${label} is too large`);
  return required ? base.min(1, `${label} must be at least 1`) : base.min(0, `${label} must be 0 or more`).optional();
}
