import { describe, it, expect } from "vitest";
import { getStudentAvatarSrc } from "@/lib/student-avatar";

describe("getStudentAvatarSrc", () => {
  it("returns the photo URL when present", () => {
    expect(getStudentAvatarSrc("data:image/png;base64,xxx", "MALE")).toBe("data:image/png;base64,xxx");
  });

  it.each([
    ["MALE", "/avatars/male.svg"],
    ["FEMALE", "/avatars/female.svg"],
    ["OTHER", "/avatars/other.svg"],
  ] as const)("falls back to the %s default avatar", (gender, expected) => {
    expect(getStudentAvatarSrc(null, gender)).toBe(expected);
    expect(getStudentAvatarSrc("", gender)).toBe(expected);
    expect(getStudentAvatarSrc(undefined, gender)).toBe(expected);
  });
});
