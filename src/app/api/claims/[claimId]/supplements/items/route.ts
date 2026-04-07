import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";

const supplementItemSchema = z.object({
  description: z.string().min(1, "Description required").max(500),
  category: z.string().max(100).optional(),
  quantity: z.number().min(0).max(999_999).optional().default(1),
  unit: z.string().max(20).optional().default("EA"),
  unitPrice: z.number().min(0).max(999_999_99).optional().default(0),
  totalPrice: z.number().min(0).max(999_999_99).optional(),
  status: z.enum(["pending", "approved", "denied", "submitted"]).optional().default("pending"),
  notes: z.string().max(2000).optional(),
  code: z.string().max(50).optional(),
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { claimId: string } }) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { orgId } = auth;
  logger.info("[SUPPLEMENTS_LIST]", { orgId, claimId: params.claimId });

  try {
    // Verify claim belongs to this org
    await getOrgClaimOrThrow(orgId, params.claimId);

    const items = await getDelegate("supplementItem").findMany({
      where: { claimId: params.claimId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (e) {
    if (e instanceof OrgScopeError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { claimId: string } }) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { orgId } = auth;
  logger.info("[SUPPLEMENTS_CREATE]", { orgId, claimId: params.claimId });

  try {
    // Verify claim belongs to this org
    await getOrgClaimOrThrow(orgId, params.claimId);

    const raw = await req.json();
    const parsed = supplementItemSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const item = await getDelegate("supplementItem").create({
      data: { claimId: params.claimId, ...parsed.data },
    });

    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof OrgScopeError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
