import type { NextConfig } from "next";

// Content Security Policy.
// Note: script-src/style-src include 'unsafe-inline' because Next.js injects
// inline bootstrap/hydration scripts and styled-jsx without a nonce. The
// high-value anti-clickjacking / injection directives (frame-ancestors,
// object-src, base-uri) are locked down. TODO: migrate script-src to a
// per-request nonce (middleware) to drop 'unsafe-inline'.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["silk-grazing-twister.ngrok-free.dev"],
  experimental: {
    // Turbopack's on-disk dev cache (default since 16.1) trades cold-start
    // speed for periodic "filesystem cache database compaction" pauses that
    // can run 30-70s+ on a slow/HDD-backed project directory — worse than no
    // cache at all for a long-running local dev session. Disabled here since
    // this repo measurably hits that case; re-enable if the project moves to
    // a fast SSD/network-cache-friendly disk.
    turbopackFileSystemCacheForDev: false,
  },
  // Stamp the build/deploy time so the UI can show "last updated". Evaluated
  // once per build; inlined into the client bundle via the NEXT_PUBLIC_ prefix.
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
