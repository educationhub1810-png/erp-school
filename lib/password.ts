import crypto from "crypto";

// Character classes for generated passwords. Ambiguous glyphs (0/O, 1/l/I) are
// left out so a password read aloud or copied by hand is unlikely to be
// mistyped.
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(set: string): string {
  // crypto.randomInt is unbiased (unlike `% set.length`).
  return set[crypto.randomInt(set.length)];
}

// A cryptographically-random password guaranteed to contain at least one
// character from each class, so it satisfies common strength rules.
export function generatePassword(length = 14): string {
  const len = Math.max(8, length);
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  for (let i = chars.length; i < len; i++) chars.push(pick(ALL));

  // Fisher–Yates shuffle so the guaranteed-class characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
