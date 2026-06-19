import { describe, it, expect } from "vitest";
import { imageDataUrl } from "@/lib/validation";

describe("imageDataUrl", () => {
  const schema = imageDataUrl(100);

  it("accepts an empty string (no image)", () => {
    expect(schema.safeParse("").success).toBe(true);
  });

  it("accepts undefined (optional)", () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it.each(["png", "jpeg", "jpg", "gif", "webp"])("accepts a valid %s data URL", (kind) => {
    const ok = schema.safeParse(`data:image/${kind};base64,iVBORw0KGgo=`);
    expect(ok.success).toBe(true);
  });

  it("rejects SVG (XSS vector)", () => {
    const res = schema.safeParse("data:image/svg+xml;base64,PHN2Zz4=");
    expect(res.success).toBe(false);
  });

  it("rejects an arbitrary data: payload", () => {
    expect(schema.safeParse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false);
  });

  it("rejects a non-data URL string", () => {
    expect(schema.safeParse("https://evil.example/x.png").success).toBe(false);
  });

  it("enforces the max size cap", () => {
    const big = imageDataUrl(10);
    const res = big.safeParse("data:image/png;base64," + "A".repeat(50) + "=");
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].message).toMatch(/too large/i);
  });
});
