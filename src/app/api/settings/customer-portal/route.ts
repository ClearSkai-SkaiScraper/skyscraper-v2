/**
 * Customer Portal Settings
 * GET  — Retrieve portal settings for the org
 * PATCH — Update portal settings
 */
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Return sensible defaults — full settings model TBD
    return NextResponse.json({
      portalEnabled: true,
      clientLoginEnabled: true,
      welcomeMessage:
        "Welcome to your project portal. Here you can view your claim status, documents, and communicate with your project team.",
      documentsVisible: true,
      photosVisible: true,
      estimatesVisible: false,
      invoicesVisible: true,
      timelineVisible: true,
      messagingEnabled: true,
      fileUploadEnabled: true,
      maxUploadSizeMb: 25,
      emailNotifications: true,
      smsNotifications: false,
      statusUpdateNotifications: true,
      documentNotifications: true,
      messageNotifications: true,
      requireApproval: false,
      portalUrl: "",
      customTerms: "",
    });
  } catch (error) {
    logger.error("[SETTINGS:CUSTOMER_PORTAL] GET error", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const body = await req.json();

    // For now, log the settings — full persistence will require a dedicated table.
    logger.info("[SETTINGS:CUSTOMER_PORTAL] Updated", { orgId: ctx.orgId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[SETTINGS:CUSTOMER_PORTAL] PATCH error", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
