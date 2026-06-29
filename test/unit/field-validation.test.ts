import { describe, it, expect } from "vitest";
import {
  nameField, optionalTextField, requiredTextField,
  emailField, requiredEmailField,
  mobileField, requiredMobileField,
  aadhaarField, panField, ifscField, accountNumberField, pincodeField,
  addressField, moneyField, positiveIntField,
} from "@/lib/field-validation";

describe("nameField", () => {
  const schema = nameField("Name");
  it("requires a non-empty value", () => {
    expect(schema.safeParse("").success).toBe(false);
    expect(schema.safeParse("   ").success).toBe(false);
  });
  it("rejects values over the max length", () => {
    expect(schema.safeParse("a".repeat(101)).success).toBe(false);
  });
  it("accepts and trims a valid name", () => {
    const r = schema.safeParse("  Anita Verma  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("Anita Verma");
  });
});

describe("optionalTextField / requiredTextField", () => {
  it("optional: allows empty, enforces max length when filled", () => {
    const schema = optionalTextField("Department", 10);
    expect(schema.safeParse("").success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(true);
    expect(schema.safeParse("short").success).toBe(true);
    expect(schema.safeParse("way too long text").success).toBe(false);
  });
  it("required: rejects empty", () => {
    const schema = requiredTextField("Title", 50);
    expect(schema.safeParse("").success).toBe(false);
    expect(schema.safeParse("ok").success).toBe(true);
  });
});

describe("emailField / requiredEmailField", () => {
  it("optional allows blank but rejects malformed", () => {
    const schema = emailField();
    expect(schema.safeParse("").success).toBe(true);
    expect(schema.safeParse("not-an-email").success).toBe(false);
    expect(schema.safeParse("ok@example.com").success).toBe(true);
  });
  it("lowercases and trims", () => {
    const r = emailField().safeParse("  Foo@Example.COM ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("foo@example.com");
  });
  it("required rejects blank", () => {
    expect(requiredEmailField().safeParse("").success).toBe(false);
  });
});

describe("mobileField / requiredMobileField", () => {
  it("accepts a valid 10-digit Indian mobile starting 6-9", () => {
    expect(mobileField().safeParse("9876543210").success).toBe(true);
  });
  it("rejects wrong length or leading 0-5", () => {
    expect(mobileField().safeParse("123456789").success).toBe(false);
    expect(mobileField().safeParse("12345678901").success).toBe(false);
    expect(mobileField().safeParse("5876543210").success).toBe(false);
  });
  it("optional allows blank, required does not", () => {
    expect(mobileField().safeParse("").success).toBe(true);
    expect(requiredMobileField().safeParse("").success).toBe(false);
  });
});

describe("aadhaarField", () => {
  it("requires exactly 12 digits", () => {
    expect(aadhaarField().safeParse("123456789012").success).toBe(true);
    expect(aadhaarField().safeParse("12345678901").success).toBe(false);
    expect(aadhaarField().safeParse("1234567890123").success).toBe(false);
    expect(aadhaarField().safeParse("12345678901a").success).toBe(false);
  });
  it("allows blank", () => {
    expect(aadhaarField().safeParse("").success).toBe(true);
  });
});

describe("panField", () => {
  it("accepts a valid PAN and uppercases it", () => {
    const r = panField().safeParse("abcde1234f");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("ABCDE1234F");
  });
  it("rejects an invalid format", () => {
    expect(panField().safeParse("ABCDE12345").success).toBe(false);
  });
});

describe("ifscField", () => {
  it("accepts a valid IFSC and uppercases it", () => {
    const r = ifscField().safeParse("sbin0001234");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("SBIN0001234");
  });
  it("rejects an invalid format", () => {
    expect(ifscField().safeParse("SBIN1001234").success).toBe(false);
  });
});

describe("accountNumberField", () => {
  it("accepts 9-18 digit account numbers", () => {
    expect(accountNumberField().safeParse("123456789").success).toBe(true);
    expect(accountNumberField().safeParse("1".repeat(18)).success).toBe(true);
    expect(accountNumberField().safeParse("12345678").success).toBe(false);
    expect(accountNumberField().safeParse("1".repeat(19)).success).toBe(false);
  });
});

describe("pincodeField", () => {
  it("requires exactly 6 digits", () => {
    expect(pincodeField().safeParse("411001").success).toBe(true);
    expect(pincodeField().safeParse("41100").success).toBe(false);
  });
});

describe("addressField", () => {
  it("enforces a max length and allows blank", () => {
    expect(addressField(20).safeParse("").success).toBe(true);
    expect(addressField(20).safeParse("a".repeat(21)).success).toBe(false);
  });
});

describe("moneyField", () => {
  it("optional: coerces a numeric string and rejects negatives", () => {
    const schema = moneyField("Salary");
    const r = schema.safeParse("35000");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe(35000);
    expect(schema.safeParse("-5").success).toBe(false);
  });
  it("required: rejects zero and blank", () => {
    const schema = moneyField("Amount", { required: true });
    expect(schema.safeParse("0").success).toBe(false);
    expect(schema.safeParse("100").success).toBe(true);
  });
  it("rejects values over the max", () => {
    expect(moneyField("Salary", { max: 1000 }).safeParse("5000").success).toBe(false);
  });
});

describe("positiveIntField", () => {
  it("optional: accepts 0 and positive integers, rejects decimals", () => {
    const schema = positiveIntField("Experience");
    expect(schema.safeParse("0").success).toBe(true);
    expect(schema.safeParse("5").success).toBe(true);
    expect(schema.safeParse("5.5").success).toBe(false);
    expect(schema.safeParse("-1").success).toBe(false);
  });
  it("required: rejects 0", () => {
    const schema = positiveIntField("Capacity", { required: true });
    expect(schema.safeParse("0").success).toBe(false);
    expect(schema.safeParse("1").success).toBe(true);
  });
});
