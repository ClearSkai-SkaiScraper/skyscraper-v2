import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logCriticalAction } from "@/lib/audit/criticalActions";

import { createOrUpdateClaimEmbedding } from "@/lib/ai/similarity/embedClaim";
import { apiError } from "@/lib/apiError";
import { getVisibleUserIds } from "@/lib/auth/managerScope";
import { createForbiddenResponse, requirePermission } from "@/lib/auth/rbac";
import { withOrgScope } from "@/lib/auth/tenant";
import { logInfo, timeExecution } from "@/lib/log";
import prisma from "@/lib/prisma";
import { listClaims } from "@/lib/services/claimsService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Validation schema - matches Prisma claims model
const createClaimSchema = z
  .object({
    // Core claim fields
    claimNumber: z.string().min(1),
    insuranceCompany: z.string().min(1), // maps to carrier
    dateOfLoss: z.string(), // Will be converted to Date
    typeOfLoss: z.string().min(1), // maps to damageType
    description: z.string().optional(),
    estimatedValue: z.number().int().positive().optional(),
    status: z.string().default("new"),

    // Property - either existing or new
    propertyId: z.string().uuid().optional(),
    newProperty: z
      .object({
        street: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zipCode: z.string().min(1),
      })
      .optional(),

    // Contact - either existing or new (for insured_name)
    contactId: z.string().uuid().optional(),
    newContact: z
      .object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
      .optional(),
  })
  .refine((data) => data.propertyId || data.newProperty, {
    message: "Either propertyId or newProperty is required",
    path: ["propertyId"],
  });

/**
 * POST /api/claims - Create new claim
 * 🛡️ MASTER PROMPT #66: RBAC Protection - requires "claims:create" permission
 */
export const POST = withOrgScope(async (req, { userId, orgId }) => {
  try {
    // Ensure membership-derived orgId is present (defensive check)
    if (!orgId) {
      const { userId: clerkUserId } = await auth();
      if (clerkUserId) {
        const dbUser = await prisma.users.findUnique({
          where: { clerkUserId },
          select: { id: true },
        });
        if (dbUser) {
          const link = await prisma.user_organizations.findFirst({
            where: { userId: dbUser.id },
            select: { organizationId: true },
          });
          if (link?.organizationId) {
            orgId = link.organizationId as string;
          }
        }
      }
      if (!orgId) {
        return NextResponse.json({ error: "Organization context missing" }, { status: 403 });
      }
    }
    // 🛡️ RBAC: Check permission to create claims
    try {
      await requirePermission("claims:create");
    } catch (error) {
      return createForbiddenResponse("You don't have permission to create claims", {
        requiredPermission: "claims:create",
      });
    }

    const body = await req.json();

    let validated;
    try {
      validated = createClaimSchema.parse(body);
    } catch (validationError) {
      logger.error("[CreateClaim] Validation error:", validationError);
      if (validationError instanceof z.ZodError) {
        const fieldErrors = validationError.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        return NextResponse.json(
          {
            error: `Validation failed: ${fieldErrors}`,
            details: validationError.errors,
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Handle property - either get existing or create new
    let propertyId = validated.propertyId;
    let contactId: string | undefined;

    if (!propertyId && validated.newProperty) {
      // First create a contact if newContact data provided
      if (validated.newContact) {
        const contact = await prisma.contacts.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            firstName: validated.newContact.firstName || "Unknown",
            lastName: validated.newContact.lastName || "Contact",
            email: validated.newContact.email || null,
            phone: validated.newContact.phone || null,
            slug: `contact-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        contactId = contact.id;
      } else {
        // Create a minimal placeholder contact
        const placeholderContact = await prisma.contacts.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            firstName: "Property",
            lastName: "Owner",
            slug: `contact-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        contactId = placeholderContact.id;
      }

      const newProperty = await prisma.properties.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          contactId: contactId,
          name: validated.newProperty.street,
          propertyType: "residential",
          street: validated.newProperty.street,
          city: validated.newProperty.city,
          state: validated.newProperty.state,
          zipCode: validated.newProperty.zipCode,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      propertyId = newProperty.id;
    }

    // Verify property exists and belongs to org
    const property = await prisma.properties.findFirst({
      where: { id: propertyId, orgId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found or access denied" }, { status: 404 });
    }

    // Handle contact/insured name
    let insured_name = "";
    if (validated.newContact) {
      insured_name = `${validated.newContact.firstName} ${validated.newContact.lastName}`.trim();
      // ENHANCEMENT: Optionally create contact record when contacts table supports auto-creation
    }

    // Use provided claim number or generate one
    const claimNumber =
      validated.claimNumber ||
      `CLM-${Date.now()}-${(await prisma.claims.count({ where: { orgId } })) + 1}`;

    // Create the claim
    const claimData = {
      id: crypto.randomUUID(),
      orgId,
      propertyId: propertyId!,
      claimNumber,
      title: `${validated.typeOfLoss} - ${property.street}`,
      description: validated.description || "",
      damageType: validated.typeOfLoss,
      dateOfLoss: new Date(validated.dateOfLoss),
      carrier: validated.insuranceCompany,
      status: validated.status,
      estimatedValue: validated.estimatedValue || null,
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const claim = await timeExecution(
      "claim.create",
      async () => await prisma.claims.create({ data: claimData })
    );

    // Log activity
    // await prisma.claim_activities.create({
    //   data: {
    //     claimId: claim.id,
    //     event: "CLAIM_CREATED",
    //     value: { status: validated.status, damageType: validated.typeOfLoss },
    //   },
    // });

    logInfo("claim.created", { claimId: claim.id, orgId });

    // Audit log claim creation
    await logCriticalAction("CLAIM_CREATED", userId, orgId, {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      carrier: claim.carrier,
      damageType: claim.damageType,
    });

    // H-9: Track usage metering
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/usage/increment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: orgId,
            metricType: "claims_created",
            amount: 1,
          }),
        }
      );
    } catch (usageError) {
      logger.warn("[CreateClaim] Usage tracking failed:", usageError);
      // Don't block claim creation if usage tracking fails
    }

    // H-18: Send webhook notification
    try {
      const { WebhookService } = await import("@/lib/webhook-service");
      await WebhookService.sendClaimCreated(claim.id, orgId);
    } catch (webhookError) {
      logger.warn("[CreateClaim] Webhook delivery failed:", webhookError);
      // Don't block claim creation if webhook fails
    }

    // 🤖 AI HOOK: Trigger initial triage and categorization
    try {
      const { onClaimCreated } = await import("@/lib/claims/aiHooks");
      // Run async without blocking response
      onClaimCreated(claim.id).catch((err) => logger.warn("[CreateClaim] AI triage failed:", err));
    } catch (aiError) {
      logger.warn("[CreateClaim] AI hook initialization failed:", aiError);
    }

    // Generate AI embedding for claim
    try {
      await createOrUpdateClaimEmbedding(claim.id);
    } catch (embeddingError) {
      logger.warn("[CreateClaim] Embedding generation failed:", embeddingError);
      // Don't block claim creation if embedding fails
    }

    return NextResponse.json(
      { ...claim },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", error.errors);
    }

    logger.error("[POST /api/claims] Error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to create claim");
  }
});

/**
 * GET /api/claims - List claims with filters
 */
export const GET = withOrgScope(async (req, { userId, orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

    // Manager-scoped visibility
    const visibleUserIds = userId ? await getVisibleUserIds(userId, orgId) : null;

    const where: any = { orgId };

    if (stage) {
      where.lifecycleStage = stage;
    }

    if (search) {
      if (search.length > 2) {
        where.OR = {
          push: [
            { claimNumber: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            {
              property: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { street: { contains: search, mode: "insensitive" } },
                  { city: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          ],
        };
      }
    }

    const { claims, total } = await listClaims({
      orgId,
      limit,
      offset,
      stage,
      search,
      visibleUserIds,
    });
    return NextResponse.json(
      { claims, total, limit, offset },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logger.error("[GET /api/claims] Error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to fetch claims");
  }
});
