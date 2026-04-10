export const dynamic = "force-dynamic";

/**
 * Get current authenticated user info
 * Useful for debugging and getting Clerk user ID
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    const { userId } = await auth();
// eslint-disable-next-line @typescript-eslint/await-thenable

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await currentUser();

    return NextResponse.json({
      userId,
      email: user?.emailAddresses?.[0]?.emailAddress,
      firstName: user?.firstName,
      lastName: user?.lastName,
      createdAt: user?.createdAt,
    });
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
