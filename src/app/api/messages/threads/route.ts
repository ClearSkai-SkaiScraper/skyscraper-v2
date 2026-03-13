import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Resilient client record lookup:
 * 1. Try by userId (fast path)
 * 2. Fallback to email lookup
 * 3. Auto-create if nothing found
 * 4. Backfill userId on orphaned records found by email
 */
async function resolveClientRecord(userId: string) {
  // 1. Fast path — direct userId match
  let client = await prisma.client.findFirst({
    where: { userId },
    select: { id: true, orgId: true, email: true },
  });
  if (client) return client;

  // 2. Fallback — look up by email from Clerk
  let clerkUser;
  try {
    clerkUser = await currentUser();
  } catch {
    // If currentUser() fails, we can't do email fallback
  }
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;

  if (email) {
    client = await prisma.client.findFirst({
      where: { email, userId: null },
      select: { id: true, orgId: true, email: true },
    });

    if (client) {
      // Backfill userId so future lookups are instant
      try {
        await prisma.client.update({
          where: { id: client.id },
          data: { userId },
        });
        log.info("[messages/threads] Backfilled userId on client record", {
          clientId: client.id,
          userId,
        });
      } catch (backfillErr) {
        // userId unique constraint — another client record already has this userId
        log.warn("[messages/threads] Could not backfill userId", {
          clientId: client.id,
          error: backfillErr.message,
        });
      }
      return client;
    }
  }

  // 3. Auto-create — so messages are never orphaned
  // BUT: never auto-create for users who are already pros (prevents ghost clients)
  if (email || clerkUser) {
    // Check if this user is already a pro — if so, skip auto-create
    const [existingPro, existingMember] = await Promise.all([
      prisma.users.findFirst({ where: { clerkUserId: userId }, select: { id: true } }),
      prisma.tradesCompanyMember.findFirst({ where: { userId }, select: { id: true } }),
    ]);
    if (existingPro || existingMember) {
      log.info("[messages/threads] Skipping client auto-create — user is a pro", { userId });
      return null;
    }

    const slug = `client-${userId.slice(-8)}-${Date.now()}`;
    const name = clerkUser
      ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Client"
      : "Client";
    try {
      client = await prisma.client.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          slug,
          email: email || null,
          firstName: clerkUser?.firstName || null,
          lastName: clerkUser?.lastName || null,
          name,
          status: "active",
        },
        select: { id: true, orgId: true, email: true },
      });
      log.info("[messages/threads] Auto-created client record", { clientId: client.id, userId });
      return client;
    } catch (createErr) {
      log.warn("[messages/threads] Auto-create client failed", { error: createErr.message });
    }
  }

  return null;
}

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ threads: [], error: "Unauthorized" }, { status: 200 });
    }

    log.info("[messages/threads] Request started", { userId });

    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");
    const orgIdParam = searchParams.get("orgId");
    const role = searchParams.get("role"); // "client" forces client path for dual-role users
    const typeFilter = searchParams.get("type"); // "team", "clients", "trades" for MessageHub tabs
    const archivedFilter = searchParams.get("archived"); // "true" for archived threads

    // Determine user role and org — check both users table AND tradesCompanyMember
    // because some pros only exist in tradesCompanyMember (new trades-network-only users)
    const [user, membership, clientRecord] = await Promise.all([
      prisma.users.findFirst({
        where: { clerkUserId: userId },
        select: { id: true, orgId: true, role: true },
      }),
      prisma.tradesCompanyMember.findFirst({
        where: { userId },
        select: { companyId: true, orgId: true },
      }),
      prisma.client.findFirst({
        where: { userId },
        select: { id: true, orgId: true, email: true },
      }),
    ]);

    let threads;

    // Dual-role detection: if the request comes from the portal (role=client param
    // or Referer contains /portal), use client path even for pro users
    const referer = req.headers.get("referer") || "";
    const isPortalContext = role === "client" || referer.includes("/portal");

    // If user is a client accessing from portal context, skip pro path
    const isPro = (user || membership) && !isPortalContext;

    // Pro user path — if user exists in users table OR has a tradesCompanyMember record
    if (isPro) {
      // Pro user - find threads by orgId AND by tradesCompanyMember.companyId
      const effectiveOrgId = orgIdParam || user?.orgId || membership?.orgId;

      // Build OR conditions for thread lookup
      const orConditions: any[] = [{ orgId: effectiveOrgId }];
      if (membership?.companyId) {
        orConditions.push({ orgId: membership.companyId });
        orConditions.push({ tradePartnerId: membership.companyId });
      }
      // Also find threads where user is a participant
      orConditions.push({ participants: { has: userId } });

      const where: any = { OR: orConditions };
      if (claimId) where.claimId = claimId;

      const rawThreads = await prisma.messageThread.findMany({
        where,
        include: {
          Message: {
            orderBy: { createdAt: "desc" },
            take: 1, // Get last message for preview
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      // Deduplicate threads (OR conditions may return duplicates)
      const seen = new Set<string>();
      const dedupedThreads = rawThreads.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      // Fetch claim details for threads that have a claimId
      const claimIds = dedupedThreads.filter((t) => t.claimId).map((t) => t.claimId as string);
      const claims =
        claimIds.length > 0
          ? await prisma.claims.findMany({
              where: { id: { in: claimIds } },
              select: { id: true, claimNumber: true, title: true },
            })
          : [];
      const claimsMap = new Map(claims.map((c) => [c.id, c]));

      // Fetch client details for threads with clientId (pro-to-client threads)
      const clientIds = dedupedThreads.filter((t) => t.clientId).map((t) => t.clientId as string);
      const clients =
        clientIds.length > 0
          ? await prisma.client.findMany({
              where: { id: { in: clientIds } },
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                city: true,
                state: true,
              },
            })
          : [];
      const clientsMap = new Map(clients.map((c) => [c.id, c]));

      // Attach claims and client info to threads
      threads = dedupedThreads.map((thread) => {
        const clientInfo = thread.clientId ? clientsMap.get(thread.clientId) : null;
        const lastMsg = thread.Message[0];
        return {
          ...thread,
          title: thread.subject,
          claims: thread.claimId ? claimsMap.get(thread.claimId) || null : null,
          // Add client info for pro-to-client threads
          participantName: clientInfo?.name || thread.subject || "Client",
          participantAvatar: clientInfo?.avatarUrl || null,
          lastMessage: lastMsg?.body || "",
          lastMessageAt: lastMsg?.createdAt || thread.updatedAt,
          isClientThread: !!thread.clientId,
        };
      });
    } else {
      // Client user path — use already-fetched clientRecord or resolve without auto-create for pros
      let client = clientRecord;
      if (!client) {
        // Only auto-create if user is NOT a pro (prevent ghost client records)
        const isPro = !!(user || membership);
        if (!isPro) {
          client = await resolveClientRecord(userId);
        }
      }

      if (client) {
        const rawClientThreads = await prisma.messageThread.findMany({
          where: {
            OR: [{ clientId: client.id }, { participants: { has: client.id } }],
          },
          include: {
            Message: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { updatedAt: "desc" },
        });

        // Fetch contractor details for each thread
        const contractorIds = rawClientThreads
          .filter((t) => t.tradePartnerId)
          .map((t) => t.tradePartnerId as string);

        const contractors =
          contractorIds.length > 0
            ? await prisma.tradesCompany.findMany({
                where: { id: { in: contractorIds } },
                select: {
                  id: true,
                  name: true,
                  logo: true,
                  isVerified: true,
                  rating: true,
                  specialties: true,
                },
              })
            : [];

        const contractorsMap = new Map(contractors.map((c) => [c.id, c]));

        // Fetch claim details for client threads too
        const clientClaimIds = rawClientThreads
          .filter((t) => t.claimId)
          .map((t) => t.claimId as string);
        const clientClaims =
          clientClaimIds.length > 0
            ? await prisma.claims.findMany({
                where: { id: { in: clientClaimIds } },
                select: { id: true, claimNumber: true, title: true },
              })
            : [];
        const clientClaimsMap = new Map(clientClaims.map((c) => [c.id, c]));

        threads = rawClientThreads.map((thread) => {
          const contractor = thread.tradePartnerId
            ? contractorsMap.get(thread.tradePartnerId)
            : null;
          const lastMsg = thread.Message[0];

          return {
            ...thread,
            title: thread.subject,
            claims: thread.claimId ? clientClaimsMap.get(thread.claimId) || null : null,
            // Portal-specific fields for client UI
            participantName: contractor?.name || "Contractor",
            participantAvatar: contractor?.logo || null,
            lastMessage: lastMsg?.body || "",
            lastMessageAt: lastMsg?.createdAt || thread.updatedAt,
            unreadCount: thread.Message.filter((m: any) => !m.read && m.senderType !== "client")
              .length,
            verified: contractor?.isVerified || false,
            rating: contractor?.rating || null,
            trade:
              contractor?.specialties && contractor.specialties.length > 0
                ? contractor.specialties[0]
                : null,
          };
        });
      } else {
        threads = [];
      }
    }

    // ── Apply type/archived filters for MessageHub tabs ──────────────
    if (threads && threads.length > 0) {
      if (archivedFilter === "true") {
        threads = threads.filter((t: any) => !!t.archivedAt);
      } else {
        // Exclude archived threads by default
        threads = threads.filter((t: any) => !t.archivedAt);
      }

      if (typeFilter === "clients") {
        threads = threads.filter((t: any) => !!t.clientId || t.isClientThread);
      } else if (typeFilter === "trades") {
        threads = threads.filter((t: any) => !!t.tradePartnerId && !t.clientId);
      } else if (typeFilter === "team") {
        threads = threads.filter((t: any) => !t.clientId && !t.tradePartnerId && !t.isPortalThread);
      }
    }

    const duration = Date.now() - startTime;
    log.info("[messages/threads] Request completed", {
      userId,
      threadCount: threads?.length || 0,
      duration,
    });

    return NextResponse.json({ threads });
  } catch (error) {
    log.error("[messages/threads] Request failed", {
      error: error?.message,
      duration: Date.now() - startTime,
    });
    log.error("Threads fetch error:", error);
    // Return safe 200 response with empty threads to prevent demo crashes
    return NextResponse.json(
      {
        threads: [],
        error: "Failed to load messages",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 200 }
    );
  }
}
