import { z } from "zod";

// Allowed inline image data URLs. We don't have object storage configured yet,
// so images are stored as base64 data URLs — but we validate the MIME prefix so
// only real raster images are accepted (no SVG, no arbitrary data: payloads).
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * A zod schema for an optional base64 image data URL, size-capped at `maxChars`.
 * Empty string is allowed (treated as "no image").
 */
export function imageDataUrl(maxChars: number) {
  return z
    .string()
    .max(maxChars, "Image is too large")
    .refine((v) => v === "" || IMAGE_DATA_URL_RE.test(v), "Invalid image format (PNG, JPG, GIF or WEBP only)")
    .optional()
    .or(z.literal(""));
}
