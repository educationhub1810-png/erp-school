const DEFAULT_AVATARS: Record<"MALE" | "FEMALE" | "OTHER", string> = {
  MALE: "/avatars/male.svg",
  FEMALE: "/avatars/female.svg",
  OTHER: "/avatars/other.svg",
};

export function getStudentAvatarSrc(photoUrl: string | null | undefined, gender: "MALE" | "FEMALE" | "OTHER"): string {
  return photoUrl || DEFAULT_AVATARS[gender];
}
