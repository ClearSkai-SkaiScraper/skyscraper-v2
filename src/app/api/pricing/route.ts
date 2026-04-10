export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getAIPricing } from "@/lib/ai/pricing";
import { pool } from "@/lib/db/raw";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: Request) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) {
    // Anomaly logging of repeated unauthorized access attempts
    logger.warn(
      `[pricing] Unauthorized access attempt productId=${new URL(req.url).searchParams.get("productId")}`
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const market = searchParams.get("market") ?? "US";

  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  // Rate limit pricing lookups per user+product
  const rlKey = `${userId}:${productId}`;
  const rl = await checkRateLimit(rlKey, "PUBLIC");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded", reset: rl.reset }, { status: 429 });
  }

  try {
    // 1) Check for manual price in database
    const { rows } = await pool.query(
      `SELECT price, unit, source FROM app.vendor_prices
       WHERE product_id = $1 AND market = $2
       ORDER BY updated_at DESC LIMIT 1`,
      [productId, market]
    );

    if (rows[0]) {
      return NextResponse.json({
        price: Number(rows[0].price),
        unit: rows[0].unit,
        source: rows[0].source,
        rateLimit: { remaining: rl.remaining, limit: rl.limit, reset: rl.reset },
      });
    }

    // 2) AI fallback - get estimate and cache it
    const aiPrice = await getAIPricing(productId);
    if (aiPrice) {
      // Cache the AI result for future lookups
      await pool.query(
        `INSERT INTO app.vendor_prices (product_id, market, unit, price, source)
         VALUES ($1, $2, 'ea', $3, 'ai')`,
        [productId, market, aiPrice]
      );

      return NextResponse.json({
        price: aiPrice,
        unit: "ea",
        source: "ai",
        rateLimit: { remaining: rl.remaining, limit: rl.limit, reset: rl.reset },
      });
    }

    // 3) No price available
    return NextResponse.json({
      price: null,
      unit: "ea",
      source: "none",
      rateLimit: { remaining: rl.remaining, limit: rl.limit, reset: rl.reset },
    });
  } catch (error) {
    logger.error("Pricing API error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
