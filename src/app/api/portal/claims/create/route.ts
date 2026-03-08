export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { insuredName } = body;

    if (!insuredName) {
      return NextResponse.json({ error: "Insured name is required" }, { status: 400 });
    }

    logger.info("Portal claim submission by " + userId);

    return NextResponse.json(
      {
        id: "claim_" + Date.now(),
        status: "new",
        message: "Claim submitted successfully. A contractor will review it shortly.",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Portal claims create error:", error);
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  }
}
