import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  const body = await req.json();
  const partner = await prisma.contractors.create({ data: { ...body, orgId } });
  return NextResponse.json(partner);
});
