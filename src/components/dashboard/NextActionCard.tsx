import { AlertCircle, ArrowRight, Clock, FileText, User } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getResolvedOrgIdSafe } from "@/lib/auth/getResolvedOrgId";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface NextAction {
  type: "incomplete_claim" | "pending_report" | "new_contact" | "claim_follow_up" | "none";
  title: string;
  description: string;
  href: string;
  urgency: "high" | "medium" | "low";
  icon: React.ReactNode;
}

async function getNextAction(): Promise<NextAction> {
  const orgId = await getResolvedOrgIdSafe();

  if (!orgId) {
    return {
      type: "none",
      title: "Get Started",
      description: "Complete onboarding to unlock your next actions",
      href: "/onboarding/start",
      urgency: "high",
      icon: <AlertCircle className="h-5 w-5" />,
    };
  }

  try {
    // 1. Check for draft claims (highest priority)
    const draftClaim = await prisma.claims.findFirst({
      where: {
        orgId: orgId,
        status: "draft",
      },
      orderBy: { updatedAt: "asc" },
    });

    if (draftClaim) {
      return {
        type: "incomplete_claim",
        title: "Complete Draft Claim",
        description: `Claim #${draftClaim.claimNumber} is incomplete. Finish setup to activate client portal.`,
        href: `/claims/${draftClaim.id}`,
        urgency: "high",
        icon: <FileText className="h-5 w-5" />,
      };
    }

    // 2. Check for claims without reports (medium priority)
    const claimNeedingReport = await prisma.claims.findFirst({
      where: {
        orgId: orgId,
        status: { not: "draft" },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (claimNeedingReport) {
      // Check if claim has any reports (guard for missing ClaimReport model)
      let reportCount = 0;
      const claimReportModel =
        (prisma as any).ClaimReport ?? (prisma as any).claimReport ?? (prisma as any).claim_report;
      if (claimReportModel?.count) {
        try {
          reportCount = await claimReportModel.count({
            where: { claimId: claimNeedingReport.id },
          });
        } catch {
          // Model may not exist in DB - treat as 0 reports
          reportCount = 0;
        }
      }

      if (reportCount === 0) {
        return {
          type: "pending_report",
          title: "Generate AI Report",
          description: `Claim #${claimNeedingReport.claimNumber} is ready for AI report generation.`,
          href: `/reports/claims/new?claimId=${claimNeedingReport.id}`,
          urgency: "medium",
          icon: <FileText className="h-5 w-5" />,
        };
      }
    }

    // 3. Check for claims without contacts (low priority)
    const claimWithoutContact = await prisma.claims.findFirst({
      where: {
        orgId: orgId,
        description: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (claimWithoutContact) {
      return {
        type: "new_contact",
        title: "Link Claim to Contact",
        description: `Claim #${claimWithoutContact.claimNumber} has no associated contact.`,
        href: `/claims/${claimWithoutContact.id}`,
        urgency: "low",
        icon: <User className="h-5 w-5" />,
      };
    }

    // 4. Check for claims older than 7 days without updates
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const staleClaim = await prisma.claims.findFirst({
      where: {
        orgId: orgId,
        updatedAt: { lt: oneWeekAgo },
        status: { notIn: ["closed", "denied"] },
      },
      orderBy: { updatedAt: "asc" },
    });

    if (staleClaim) {
      return {
        type: "claim_follow_up",
        title: "Follow Up Required",
        description: `Claim #${staleClaim.claimNumber} hasn't been updated in over a week.`,
        href: `/claims/${staleClaim.id}`,
        urgency: "medium",
        icon: <Clock className="h-5 w-5" />,
      };
    }

    // Default: All caught up!
    return {
      type: "none",
      title: "All Caught Up! 🎉",
      description: "No urgent actions needed. Great work keeping your claims organized!",
      href: "/claims",
      urgency: "low",
      icon: <FileText className="h-5 w-5" />,
    };
  } catch (error) {
    logger.error("[NextActionCard] Error fetching next action:", error);
    return {
      type: "none",
      title: "Dashboard Loading",
      description: "Next actions will appear once your data is loaded.",
      href: "/claims",
      urgency: "low",
      icon: <AlertCircle className="h-5 w-5" />,
    };
  }
}

export default async function NextActionCard() {
  const action = await getNextAction();

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "border-red-500/50 bg-red-50/50 dark:bg-red-900/10";
      case "medium":
        return "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10";
      default:
        return "border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10";
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <Badge variant="destructive">High Priority</Badge>;
      case "medium":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            Medium
          </Badge>
        );
      default:
        return <Badge variant="secondary">Low Priority</Badge>;
    }
  };

  return (
    <Card className={`overflow-hidden ${getUrgencyColor(action.urgency)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {action.icon}
            Next Action
          </CardTitle>
          {action.type !== "none" && getUrgencyBadge(action.urgency)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="mb-1 font-semibold text-foreground">{action.title}</h3>
          <p className="text-sm text-muted-foreground">{action.description}</p>
        </div>
        <Button asChild className="w-full" size="lg">
          <Link href={action.href}>
            {action.type === "none" && action.urgency === "low" ? "View All Claims" : "Take Action"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
