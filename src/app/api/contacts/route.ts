import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DB-first org resolution (matches platform pattern)
    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("orgId");

    let orgId = orgIdParam || null;

    if (!orgId) {
      const user = await prisma.users.findFirst({
        where: { clerkUserId: userId },
        select: { orgId: true },
      });
      orgId = user?.orgId || null;
    }

    // Fallback: resolve from tradesCompanyMember
    if (!orgId) {
      const membership = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
        select: { companyId: true, orgId: true },
      });
      orgId = membership?.orgId || membership?.companyId || null;
    }

    if (!orgId) {
      return NextResponse.json({ contacts: [] });
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
