import { logger } from "@/lib/logger";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.publicMetadata?.orgId as string | undefined;
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 403 });
    }

    const contacts = await prisma.contacts.findMany({
      where: { orgId: orgId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 500,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    // Map to expected format
    const formattedContacts = contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || "",
      phone: c.phone || "",
    }));

    return NextResponse.json({ contacts: formattedContacts });
  } catch (error) {
    logger.error("Error fetching contacts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
