import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
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
});
