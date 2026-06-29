import { describe, it, expect, vi } from "vitest";
import { digitsOnlyKeyDown, digitsOnlyValue } from "@/lib/field-behavior";

function keyEvent(key: string, over: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...over,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLInputElement>;
}

describe("digitsOnlyKeyDown", () => {
  it("allows digit keys", () => {
    const e = keyEvent("7");
    digitsOnlyKeyDown(e);
    expect((e as unknown as { preventDefault: () => void }).preventDefault).not.toHaveBeenCalled();
  });

  it("blocks non-digit printable keys", () => {
    const e = keyEvent("a");
    digitsOnlyKeyDown(e);
    expect((e as unknown as { preventDefault: () => void }).preventDefault).toHaveBeenCalled();
  });

  it("allows navigation/editing keys", () => {
    for (const key of ["Backspace", "Delete", "ArrowLeft", "Tab"]) {
      const e = keyEvent(key);
      digitsOnlyKeyDown(e);
      expect((e as unknown as { preventDefault: () => void }).preventDefault).not.toHaveBeenCalled();
    }
  });

  it("allows ctrl/cmd combos (e.g. copy/paste/select-all)", () => {
    const e = keyEvent("a", { ctrlKey: true });
    digitsOnlyKeyDown(e);
    expect((e as unknown as { preventDefault: () => void }).preventDefault).not.toHaveBeenCalled();
  });
});

describe("digitsOnlyValue", () => {
  it("strips every non-digit character", () => {
    expect(digitsOnlyValue("(987) 654-3210")).toBe("9876543210");
    expect(digitsOnlyValue("abc123def456")).toBe("123456");
    expect(digitsOnlyValue("")).toBe("");
  });
});
