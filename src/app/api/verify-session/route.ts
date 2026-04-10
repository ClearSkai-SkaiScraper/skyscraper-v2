// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const stripe = getStripeClient()!;

export async function GET(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Return safe session data
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        mode: session.mode,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
        created: session.created,
      },
    });
  } catch (error) {
    logger.error("Session verification error:", error);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}
