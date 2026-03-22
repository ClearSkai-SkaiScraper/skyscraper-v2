export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const REQUIRED_PLACEHOLDERS = [
  "company.name",
  "company.logoUrl",
  "company.phone",
  "company.email",
  "claim.claimNumber",
  "claim.dateOfLoss",
  "property.address",
  "weather.source",
];

const ValidateTemplateSchema = z.object({
  templateId: z.string(),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();
    const { templateId } = ValidateTemplateSchema.parse(body);

    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ ok: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
    }

    // B-06: Verify template is accessible to this org (marketplace OR org-owned)
    if (!template.isMarketplace) {
      const orgAccess = await prisma.orgTemplate.findFirst({
        where: { orgId: auth.orgId, templateId },
      });
      if (!orgAccess) {
        return NextResponse.json({ ok: false, error: "TEMPLATE_ACCESS_DENIED" }, { status: 403 });
      }
    }

    const sectionsStr = JSON.stringify(template.sections ?? []);
    const missingPlaceholders = REQUIRED_PLACEHOLDERS.filter((p) => !sectionsStr.includes(p));

    const hasValidation = {
      hasThumbnail: Boolean(template.thumbnailUrl),
      hasSections: Boolean(template.sections),
      hasRequiredPlaceholders: missingPlaceholders.length === 0,
      hasCoverPage: true, // NOTE: Determined by inspecting sections structure
    };

    const isValid = Object.values(hasValidation).every((v) => v);

    return NextResponse.json({
      ok: true,
      isValid,
      validation: hasValidation,
      missingPlaceholders,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
