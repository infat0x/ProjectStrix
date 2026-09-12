import type { NextConfig } from "next";

// L-5: Content-Security-Policy as defense-in-depth against injected script.
// 'unsafe-inline' is required because Next.js hydration and the Swagger api-docs
// page use inline <script>/<style>; unpkg.com is allowed only for the Swagger CDN
// assets. Tighten to a nonce-based policy (and self-host Swagger) as a follow-up.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://unpkg.com",
  "connect-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: csp },
];

// L-4: don't hardcode a public server IP here. Dev origins can be supplied via
// ALLOWED_DEV_ORIGINS (comma-separated) when needed; empty in normal use.
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
