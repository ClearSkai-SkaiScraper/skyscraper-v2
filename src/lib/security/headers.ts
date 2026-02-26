/**
 * Security Headers middleware config (Sprint 10.1)
 *
 * Centralized security header definitions for Next.js.
 * Import into next.config.mjs → headers().
 */

export const SECURITY_HEADERS = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer policy — send origin only on cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // XSS protection (legacy browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // DNS prefetch control
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Strict Transport Security — 2 year max age, include subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Permissions Policy — restrict dangerous APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com https://*.stripe.com https://*.googleusercontent.com https://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.stripe.com https://*.supabase.co https://*.sentry.io wss://*.supabase.co",
      "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

/**
 * Format for next.config.mjs headers() — applies to all routes.
 */
export function getSecurityHeadersConfig() {
  return [
    {
      source: "/(.*)",
      headers: SECURITY_HEADERS,
    },
    // Cache static assets aggressively
    {
      source: "/static/(.*)",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    // No cache for API routes
    {
      source: "/api/(.*)",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        { key: "X-Request-Id", value: "" }, // populated at runtime
      ],
    },
  ];
}
