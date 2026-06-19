import { vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@/lib/generated/prisma/client";

// A single deep-mocked Prisma client, shared by every test. Route handlers
// import the real `@/lib/prisma`; the vi.mock below swaps in this mock so no
// database is ever touched. Per-test behaviour is set with:
//   prismaMock.student.findMany.mockResolvedValue([...])
export const prismaMock = mockDeep<PrismaClient>();

// `$transaction(async (tx) => ...)` is used throughout the API routes. Make the
// callback form run against the same mock so writes inside a transaction are
// assertable; the array form resolves all passed promises.
// @ts-expect-error -- loosen the overloaded $transaction signature for the mock
prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
  if (typeof arg === "function") return (arg as (tx: unknown) => unknown)(prismaMock);
  if (Array.isArray(arg)) return Promise.all(arg);
  return undefined;
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

export function resetPrismaMock() {
  mockReset(prismaMock);
  // mockReset wipes the $transaction impl too — restore it.
  // @ts-expect-error -- see note above
  prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") return (arg as (tx: unknown) => unknown)(prismaMock);
    if (Array.isArray(arg)) return Promise.all(arg);
    return undefined;
  });
}

export type PrismaMock = DeepMockProxy<PrismaClient>;
