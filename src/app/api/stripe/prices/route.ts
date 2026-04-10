export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";


// Stripe pricing guard: returns configured price IDs or graceful empty set.
export async function GET() {
  try {
    const priceKeys = ["STRIPE_PRICE_SOLO", "STRIPE_PRICE_BUSINESS", "STRIPE_PRICE_ENTERPRISE"];
    const prices: Record<string, string> = {};
    let presentCount = 0;
    for (const k of priceKeys) {
      const v = process.env[k];
      if (v) {
        prices[k] = v;
        presentCount++;
      }
    }
    const ok = presentCount > 0;
    return NextResponse.json({
      ok,
      prices,
      count: presentCount,
      missing: priceKeys.filter((k) => !prices[k]),
    });
  } catch (_e) {
    return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
  }
}
