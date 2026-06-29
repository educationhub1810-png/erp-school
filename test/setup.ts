import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetPrismaMock } from "./mocks/prisma";
import { resetAuthMock } from "./mocks/auth";

// Env values some modules read at import-time.
process.env.ADMIN_SECRET_CODE ??= "test-admin-secret";
process.env.AUTH_SECRET ??= "test-auth-secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

beforeEach(() => {
  resetPrismaMock();
  resetAuthMock();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
