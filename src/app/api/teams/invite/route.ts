export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { compose, withRateLimit, withSentryApi } from "@/lib/api/wrappers";
import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";

const TeamInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
  name: z.string().optional(),
});

const basePOST = async (req: Request) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { email, role, name } = TeamInviteSchema.parse(body);
  // Placeholder: would persist invitation & send email
  const mockInvitation = {
    id: `inv_${Date.now()}`,
    email,
    role,
    name,
    invitedBy: userId,
    orgId,
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=mock_token_${Date.now()}`,
  };
  return NextResponse.json(mockInvitation, { status: 201 });
};

// GET endpoint to list pending invitations
const baseGET = async (req: Request) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mockInvitations = [
    {
      id: "inv_1",
      email: "newuser@example.com",
      role: "MEMBER",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ];
  return NextResponse.json({ invitations: mockInvitations });
};

const wrap = compose(withSentryApi, withRateLimit);
export const POST = withOrgScope(wrap(basePOST));
export const GET = withOrgScope(wrap(baseGET));
