/**
 * Centralized env reader with sane defaults so build won't crash
 * when NEXT_PUBLIC_SITE_URL is absent (e.g., preview/local).
 */
function computePublicSiteUrl() {
  // Prefer explicit var
  // eslint-disable-next-line no-restricted-syntax
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim()) return explicit.replace(/\/$/, "");

  // Vercel preview/production provide VERCEL_URL (no protocol)
  // eslint-disable-next-line no-restricted-syntax
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim()) return `https://${vercel.replace(/\/$/, "")}`;

  // Local dev fallback
  return "http://localhost:3000";
}

export const env = {
  // eslint-disable-next-line no-restricted-syntax
  NODE_ENV: process.env.NODE_ENV ?? "development",
  // Public (ok to expose in client)
  NEXT_PUBLIC_SITE_URL: computePublicSiteUrl(),

  // You can mirror others here if you like, but DON'T force-throw at import time.
  // Read secrets (CLERK/STRIPE) only in server code paths that need them.
};
