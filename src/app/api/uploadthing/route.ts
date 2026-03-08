export const dynamic = "force-dynamic";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "./core";

/**
 * UploadThing Route Handler
 * Handles file upload requests from the client
 *
 * Defensive: Returns clear error if UPLOADTHING env vars missing
 */

// Check env vars at runtime and fail gracefully if missing
function checkEnvVars() {
  const UPLOADTHING_SECRET = process.env.UPLOADTHING_SECRET;
  const UPLOADTHING_APP_ID = process.env.UPLOADTHING_APP_ID;

  if (!UPLOADTHING_SECRET || !UPLOADTHING_APP_ID) {
    logger.error("[UploadThing] ⚠️ Missing env vars - uploads will fail gracefully");
    logger.error("  Required: UPLOADTHING_SECRET, UPLOADTHING_APP_ID");
    logger.error("  Set these in Vercel Environment Variables for production");
    return false;
  }
  return true;
}

// Create handlers (will only work if env vars present)
let handlers: ReturnType<typeof createRouteHandler> | null = null;

try {
  if (checkEnvVars()) {
    handlers = createRouteHandler({
      router: ourFileRouter,
    });
  }
} catch (error) {
  logger.error("[UploadThing] Failed to create route handler:", error);
}

// Export GET handler
export const GET = async (req: Request) => {
  if (!handlers) {
    return NextResponse.json(
      {
        error: "Upload service not configured",
        message: "UPLOADTHING_SECRET or UPLOADTHING_APP_ID missing. Contact support.",
      },
      { status: 503 }
    );
  }
  return handlers.GET(req as NextRequest);
};

// Export POST handler
export const POST = async (req: Request) => {
  if (!handlers) {
    return NextResponse.json(
      {
        error: "Upload service not configured",
        message: "UPLOADTHING_SECRET or UPLOADTHING_APP_ID missing. Contact support.",
      },
      { status: 503 }
    );
  }
  return handlers.POST(req as NextRequest);
};
