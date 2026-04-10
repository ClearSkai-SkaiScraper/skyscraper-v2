import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";

/**
 * Build Information API
 * Returns deployment fingerprint for production verification
 * Locked: exposes git SHA, branch, deployment URL
 */
export async function GET() {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const commitSha =
    // eslint-disable-next-line no-restricted-syntax
    process.env.NEXT_PUBLIC_COMMIT_SHA ||
    // eslint-disable-next-line no-restricted-syntax
    process.env.VERCEL_GIT_COMMIT_SHA ||
    // eslint-disable-next-line no-restricted-syntax
    process.env.NEXT_PUBLIC_BUILD_SHA ||
    "local-dev";

  return NextResponse.json({
    ok: true,
    git: commitSha,
    // eslint-disable-next-line no-restricted-syntax
    branch: process.env.VERCEL_GIT_COMMIT_REF || "unknown",
    // eslint-disable-next-line no-restricted-syntax
    deployment: process.env.VERCEL_URL || "localhost:3000",
    // eslint-disable-next-line no-restricted-syntax
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    // eslint-disable-next-line no-restricted-syntax
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
