/**
 * INSPECTOR PROFILE API
 *
 * Manage inspector profile data for the current user.
 * Used by the report generator to inject inspector credentials.
 *
 * GET  — Get current user's inspector profile
 * PATCH — Update inspector profile fields
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const UpdateProfileSchema = z.object({
  title: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  license_number: z.string().max(50).optional(),
  license_state: z.string().max(2).optional(),
  certifications: z.array(z.string().max(50)).max(10).optional(),
  signature_url: z.string().url().optional().nullable(),
  years_experience: z.number().int().min(0).max(75).optional(),
  specialties: z.array(z.string().max(50)).max(15).optional(),
  is_default_inspector: z.boolean().optional(),
  headshot_url: z.string().url().optional().nullable(),
});

// ============================================================================
//  GET — Get current user's inspector profile
// ============================================================================
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId, orgId } = auth;

  try {
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId, orgId },
      select: {
        id: true,
        name: true,
        email: true,
        headshot_url: true,
        title: true,
        phone: true,
        bio: true,
        license_number: true,
        license_state: true,
        certifications: true,
        signature_url: true,
        years_experience: true,
        specialties: true,
        is_default_inspector: true,
      },
    });

    if (!user) {
      return apiError(404, "NOT_FOUND", "User profile not found");
    }

    // Calculate profile completeness
    const fields = [
      user.name,
      user.headshot_url,
      user.title,
      user.phone,
      user.license_number,
      user.license_state,
      user.bio,
    ];
    const filledFields = fields.filter(Boolean).length;
    const completeness = Math.round((filledFields / fields.length) * 100);

    return NextResponse.json({
      success: true,
      profile: {
        ...user,
        certifications: user.certifications || [],
        specialties: user.specialties || [],
        completeness,
      },
    });
  } catch (error) {
    logger.error("[INSPECTOR_PROFILE_GET] Error", { error, userId });
    return apiError(500, "INTERNAL_ERROR", "Failed to fetch inspector profile");
  }
}

// ============================================================================
//  PATCH — Update inspector profile fields
// ============================================================================
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId, orgId } = auth;

  try {
    const body = await request.json();
    const updates = UpdateProfileSchema.parse(body);

    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId, orgId },
      select: { id: true },
    });

    if (!user) {
      return apiError(404, "NOT_FOUND", "User not found");
    }

    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError(400, "NO_CHANGES", "No fields provided to update");
    }

    const updated = await prisma.users.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        title: true,
        phone: true,
        bio: true,
        license_number: true,
        license_state: true,
        certifications: true,
        signature_url: true,
        years_experience: true,
        specialties: true,
        is_default_inspector: true,
        headshot_url: true,
      },
    });

    logger.info("[INSPECTOR_PROFILE_UPDATE] Updated profile", {
      userId,
      orgId,
      fields: Object.keys(updateData),
    });

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid profile data", {
        errors: error.errors,
      });
    }
    logger.error("[INSPECTOR_PROFILE_UPDATE] Error", { error, userId });
    return apiError(500, "INTERNAL_ERROR", "Failed to update inspector profile");
  }
}
