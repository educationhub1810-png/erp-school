import { describe, it, expect } from "vitest";
import { isCompanyHost, productUrl } from "@/lib/company-domain";

describe("isCompanyHost", () => {
  it("recognizes the apex and www company domains", () => {
    expect(isCompanyHost("kretech.in")).toBe(true);
    expect(isCompanyHost("www.kretech.in")).toBe(true);
  });

  it("is case-insensitive and ignores a port suffix", () => {
    expect(isCompanyHost("KRETECH.IN")).toBe(true);
    expect(isCompanyHost("kretech.in:3000")).toBe(true);
  });

  it("rejects the product domain and other hosts", () => {
    expect(isCompanyHost("isms.study")).toBe(false);
    expect(isCompanyHost("localhost:3000")).toBe(false);
    expect(isCompanyHost(null)).toBe(false);
  });
});

describe("productUrl", () => {
  it("builds an absolute isms.study URL preserving path and query", () => {
    expect(productUrl("/login", "?callbackUrl=%2Fteacher")).toBe(
      "https://isms.study/login?callbackUrl=%2Fteacher"
    );
  });

  it("handles an empty search string", () => {
    expect(productUrl("/student/attendance", "")).toBe("https://isms.study/student/attendance");
  });
});
