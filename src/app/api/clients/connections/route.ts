import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendEmail, TEMPLATES } from "@/lib/email/resend";
import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

/**
 * GET /api/clients/connections - List all client connections for org
 * Also includes ClientProConnection data (accepted invites from client portal)
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DB-first org resolution: users table → tradesCompanyMember → fallback
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true, orgId: true },
    });

    let orgId = user?.orgId || null;

    // Fallback: resolve from tradesCompanyMember if users table has no orgId
    if (!orgId) {
      const membershipFallback = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
        select: { companyId: true, orgId: true },
      });
      orgId = membershipFallback?.orgId || membershipFallback?.companyId || null;
    }

    if (!orgId) {
      // No org → return empty list instead of 403
      return NextResponse.json({ clients: [] });
    }

    // Get all clients connected to this org (legacy ClientConnection system)
    const clients = await prisma.client.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        slug: true,
        createdAt: true,
        userId: true, // If they've signed up
        avatarUrl: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get connection statuses from legacy system
    const connections = await prisma.clientConnection.findMany({
      where: { orgId },
      select: {
        clientId: true,
        status: true,
        invitedAt: true,
        connectedAt: true,
      },
    });

    const connectionMap = new Map(connections.map((c) => [c.clientId, c]));

    const clientsWithStatus = clients.map((client) => ({
      ...client,
      isRegistered: !!client.userId,
      connection: connectionMap.get(client.id) || {
        status: "connected",
        invitedAt: client.createdAt,
      },
    }));

    // Deduplicate legacy clients by email — keep the record that has a userId (registered)
    const seenEmails = new Map<string, number>();
    for (let i = 0; i < clientsWithStatus.length; i++) {
      const email = clientsWithStatus[i].email?.toLowerCase();
      if (!email) continue;
      const prevIdx = seenEmails.get(email);
      if (prevIdx !== undefined) {
        // Duplicate — keep the one with userId
        const prev = clientsWithStatus[prevIdx];
        if (!prev.userId && clientsWithStatus[i].userId) {
          // Replace previous stub with the registered record
          clientsWithStatus.splice(prevIdx, 1);
          // Adjust index since we removed an element before current
          seenEmails.set(email, i - 1);
        } else {
          // Remove the current duplicate
          clientsWithStatus.splice(i, 1);
          i--;
        }
      } else {
        seenEmails.set(email, i);
      }
    }

    // ── Also fetch ClientProConnection data (client portal invites) ──
    // Find user's tradesCompany via their membership
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { companyId: true },
    });

    if (membership?.companyId) {
      // Get all ClientProConnections for this company
      const proConnections = await prisma.clientProConnection.findMany({
        where: { contractorId: membership.companyId },
        include: {
          Client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              slug: true,
              createdAt: true,
              userId: true,
              avatarUrl: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { invitedAt: "desc" },
      });

      // Merge ClientProConnection clients that aren't already in the list
      // Deduplicate by BOTH id AND email to prevent ghost connections
      // (same person can have two Client records — one from pro invite, one from self-signup)
      const existingClientIds = new Set(clientsWithStatus.map((c) => c.id));
      const existingEmails = new Set(
        clientsWithStatus.map((c) => c.email?.toLowerCase()).filter(Boolean)
      );

      for (const pc of proConnections) {
        if (
          pc.Client &&
          !existingClientIds.has(pc.Client.id) &&
          !(pc.Client.email && existingEmails.has(pc.Client.email.toLowerCase()))
        ) {
          clientsWithStatus.push({
            ...pc.Client,
            isRegistered: !!pc.Client.userId,
            connection: {
              clientId: pc.Client.id,
              status:
                pc.status === "ACCEPTED" || pc.status === "accepted"
                  ? "connected"
                  : pc.status.toLowerCase(),
              invitedAt: pc.invitedAt,
              connectedAt: pc.connectedAt,
            },
          });
          existingClientIds.add(pc.Client.id);
          if (pc.Client.email) existingEmails.add(pc.Client.email.toLowerCase());
        }
      }
    }

    return NextResponse.json({ clients: clientsWithStatus });
  } catch (error) {
    log.error("[clients/connections] Failed to fetch", { error: "Internal server error" });
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

/**
 * POST /api/clients/connections - Invite a new client
 * Pro can invite by email, name, or phone
 * Creates a client record and sends invitation
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true, orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, name, phone } = parsed.data;

    if (!email && !name && !phone) {
      return NextResponse.json({ error: "Provide email, name, or phone" }, { status: 400 });
    }

    // Check if client already exists
    let existingClient: Awaited<ReturnType<typeof prisma.client.findFirst>> = null;
    if (email) {
      existingClient = await prisma.client.findFirst({
        where: { email, orgId: user.orgId },
      });
    }

    if (existingClient) {
      // Already connected
      return NextResponse.json({
        client: existingClient,
        message: "Client already connected to your organization",
        status: "existing",
      });
    }

    // Create new client
    const slug = `c-${Date.now().toString(36)}`;
    const newClient = await prisma.client.create({
      data: {
        id: crypto.randomUUID(),
        slug,
        email: email || `${slug}@pending.skaiscraper.com`,
        name: name || email?.split("@")[0] || "Invited Client",
        phone: phone || null,
        orgId: user.orgId,
        category: "Homeowner",
      },
    });

    // Create connection record
    await prisma.clientConnection.create({
      data: {
        id: crypto.randomUUID(),
        orgId: user.orgId,
        clientId: newClient.id,
        status: "pending",
        invitedBy: user.id,
      },
    });

    // Send invitation email if email provided
    let emailSent = false;
    if (email && !email.includes("@pending.")) {
      try {
        // Get org branding
        const branding = await prisma.org_branding.findFirst({
          where: { orgId: user.orgId },
          select: { companyName: true },
        });
        const companyName = branding?.companyName || "SkaiScraper";

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com";
        const portalLink = `${appUrl}/portal/${newClient.slug}`;

        await sendEmail({
          to: email,
          subject: TEMPLATES.CLIENT_INVITE.subject,
          html: TEMPLATES.CLIENT_INVITE.getHtml({
            clientName: name || "Valued Client",
            magicLink: portalLink,
            companyName,
          }),
        });
        emailSent = true;
        log.info("[clients/connections] Invitation email sent", { email });
      } catch (emailError) {
        log.error("[clients/connections] Failed to send email", { error: emailError.message });
        // Don't fail - client was created, email can be resent
      }
    }

    log.info("[clients/connections] Client invited", {
      clientId: newClient.id,
      invitedBy: user.id,
      hasEmail: !!email,
      emailSent,
    });

    return NextResponse.json({
      client: newClient,
      message: emailSent
        ? "Invitation sent"
        : email
          ? "Client created (email pending)"
          : "Client created - share their portal link",
      portalLink: `/portal/${newClient.slug}`,
      status: "created",
      emailSent,
    });
  } catch (error) {
    log.error("[clients/connections] Failed to invite", { error: "Internal server error" });
    return NextResponse.json({ error: "Failed to invite client" }, { status: 500 });
  }
}
