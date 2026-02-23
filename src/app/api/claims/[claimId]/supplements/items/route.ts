import { NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { getDelegate } from "@/lib/db/modelAliases";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { claimId: string } }) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { orgId } = auth;

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

  try {
    // Verify claim belongs to this org
    await getOrgClaimOrThrow(orgId, params.claimId);

    const data = await req.json();
    const item = await getDelegate("supplementItem").create({
      data: { claimId: params.claimId, ...data },
    });

    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof OrgScopeError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
