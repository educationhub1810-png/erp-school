-- Two-factor (TOTP) fields for hardening SUPER_ADMIN login.
ALTER TABLE "users" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "totpRecoveryCodes" TEXT;
