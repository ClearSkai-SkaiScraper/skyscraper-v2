/**
 * 🔐 IDENTITY API ENDPOINT
 *
 * GET /api/auth/identity
 * Returns the current user's identity from user_registry
 *
 * Response:
 * {
 *   identity: { clerkUserId, userType, orgId, ... } | null,
 *   isClient: boolean,
 *   isPro: boolean
 * }
 */

import { currentUser } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { determineUserType, getUserIdentity } from "@/lib/identity/userIdentity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await currentUser();

    if (!user?.id) {
      return NextResponse.json({
        identity: null,
        isClient: false,
        isPro: false,
        userType: "unknown",
      });
    }

    // Try to get from registry first
    let identity = await getUserIdentity(user.id);

    // If not found, determine and register
    if (!identity) {
      const userType = await determineUserType(user.id);
      if (userType !== "unknown") {
        identity = await getUserIdentity(user.id);
      }
    }

    if (!identity) {
      return NextResponse.json({
        identity: null,
        isClient: false,
        isPro: false,
        userType: "unknown",
      });
    }

    // Build response with user type cookie for middleware routing
    const response = NextResponse.json({
      identity: {
        clerkUserId: identity.clerkUserId,
        userType: identity.userType,
        isActive: identity.isActive,
        proProfileId: identity.proProfileId,
        clientProfileId: identity.clientProfileId,
        orgId: identity.orgId,
        displayName: identity.displayName,
        email: identity.email,
        avatarUrl: identity.avatarUrl,
      },
      isClient: identity.userType === "client",
      isPro: identity.userType === "pro",
      userType: identity.userType,
    });

    // SET COOKIE for middleware routing
    // This cookie tells middleware which surface the user belongs to
    response.cookies.set("x-user-type", identity.userType, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    logger.error("[/api/auth/identity] Error:", error);
    return NextResponse.json(
      { error: "Failed to get identity", message: "Internal server error" },
      { status: 500 }
    );
  }
}
