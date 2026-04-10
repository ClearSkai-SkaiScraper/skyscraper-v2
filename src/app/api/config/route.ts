export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";

export async function GET() {
  // Auth required — env config is internal-only
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const ok = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_PRICE_SOLO: !!process.env.NEXT_PUBLIC_PRICE_SOLO,
    NEXT_PUBLIC_PRICE_PRO: !!process.env.NEXT_PUBLIC_PRICE_PRO,
    NEXT_PUBLIC_PRICE_BUSINESS: !!process.env.NEXT_PUBLIC_PRICE_BUSINESS,
    NEXT_PUBLIC_PRICE_ENTERPRISE: !!process.env.NEXT_PUBLIC_PRICE_ENTERPRISE,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  return new Response(JSON.stringify(ok, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
