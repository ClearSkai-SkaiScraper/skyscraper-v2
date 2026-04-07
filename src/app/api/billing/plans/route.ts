export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

/**
 * GET /api/billing/plans
 *
 * Returns available subscription plans.
 * Currently returns static plan data. Will be replaced with Stripe Products lookup.
 */
export const GET = withAuth(async (_req: NextRequest, { orgId }) => {
  const plans = [
    {
      id: "starter",
      name: "Starter",
      description: "For solo contractors getting started",
      price: 0,
      interval: "month",
      features: ["1 seat included", "Up to 25 active claims", "Basic reporting", "Email support"],
      seats: 1,
      isCurrent: false,
    },
    {
      id: "professional",
      name: "Professional",
      description: "For growing roofing companies",
      price: 8000, // $80.00 in cents
      interval: "month",
      features: [
        "Up to 10 seats ($80/seat/mo)",
        "Unlimited claims",
        "AI-powered tools",
        "Weather verification",
        "Report builder",
        "Priority support",
      ],
      seats: 10,
      pricePerSeat: 8000,
      isCurrent: true, // Default — most orgs are on this
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For large operations & multi-office teams",
      price: 0, // Custom pricing
      interval: "month",
      features: [
        "Unlimited seats",
        "Unlimited claims",
        "All AI tools",
        "White-label branding",
        "API access",
        "Dedicated account manager",
        "SLA guarantee",
        "SSO / SAML",
      ],
      seats: -1, // Unlimited
      isCustom: true,
      isCurrent: false,
    },
  ];

  return NextResponse.json({ plans });
});
