import prisma from "@/lib/prisma";

export interface ClaimDTO {
  id: string;
  orgId: string;
  claimNumber: string;
  title: string | null;
  description?: string | null;
  damageType?: string | null;
  lifecycleStage: string;
  status: string | null;
  carrier?: string | null;
  createdAt: string;
  updatedAt: string;
  propertyId?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClaim(claim: any): ClaimDTO {
  return {
    id: claim.id,
    orgId: claim.orgId,
    claimNumber: claim.claimNumber,
    title: claim.title || null,
    description: claim.description || null,
    damageType: claim.damageType || null,
    lifecycleStage: claim.status || "new", // status serves as lifecycle stage
    status: claim.status || null,
    carrier: claim.carrier || null,
    createdAt: claim.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: claim.updatedAt?.toISOString() || new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    propertyId: (claim as any).propertyId || (claim as any).property_id || null,
  };
}

export async function createClaim(data: {
  orgId: string;
  claimNumber: string;
  propertyId: string;
  title: string;
  description?: string;
  damageType: string;
  dateOfLoss: Date;
  carrier?: string;
  status?: string;
  estimatedValue?: number;
}): Promise<ClaimDTO> {
  // Ensure required identifiers exist to satisfy strict schema fields
  const now = new Date();
  const enriched = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    priority: "medium",
    status: data.status || "new",
    ...data,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claim = await prisma.claims.create({ data: enriched as any });
  return mapClaim(claim);
}

export async function listClaims(params: {
  orgId: string;
  limit?: number;
  offset?: number;
  stage?: string | null;
  search?: string | null;
  visibleUserIds?: string[] | null;
}): Promise<{ claims: ClaimDTO[]; total: number; limit: number; offset: number }> {
  const { orgId, limit = 50, offset = 0, stage, search, visibleUserIds } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { orgId, archivedAt: null };
  if (stage) where.status = stage; // status field in schema
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { claimNumber: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  // Manager-scoped visibility: filter by assignedTo if visibleUserIds provided
  if (visibleUserIds) {
    // Use AND to combine with existing OR (search) without conflicts
    where.AND = [
      ...(where.AND || []),
      { OR: [{ assignedTo: { in: visibleUserIds } }, { assignedTo: null }] },
    ];
  }
  const [claims, total] = await Promise.all([
    prisma.claims.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
    prisma.claims.count({ where }),
  ]);
  return { claims: claims.map(mapClaim), total, limit, offset };
}
