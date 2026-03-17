import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

type Handler = (req: Request, context?: any) => Promise<NextResponse>;

export function withAiHandler(handler: Handler): Handler {
  return async (req, context) => {
    try {
      const res = await handler(req, context);
      return res;
    } catch (error: any) {
      logger.error("[AI ENDPOINT ERROR]", error);
      return NextResponse.json(
        {
          ok: false,
          error: error?.message ?? "AI endpoint error",
        },
        { status: 500 }
      );
    }
  };
}
