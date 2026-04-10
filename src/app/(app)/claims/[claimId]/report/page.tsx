/* eslint-disable @typescript-eslint/await-thenable */
/**
 * UNIVERSAL REPORT EDITOR PAGE
 * Edits ClaimReport data with auto-save, finalize, and submit actions
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import prisma from "@/lib/prisma";

import { UniversalReportEditorClient } from "./UniversalReportEditorClient";

export const dynamic = "force-dynamic";

export default async function UniversalReportPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const { userId: clerkUserId } = await auth();
  const { claimId } = await params;

  if (!clerkUserId) {
    redirect("/sign-in");
  }
  const user = await prisma.users.findUnique({
    where: { clerkUserId },
    select: { id: true, name: true, orgId: true },
  });
  if (!user) {
    redirect("/sign-in");
  }
  if (!user.orgId) {
    return <NoOrgMembershipBanner title="Report Editor" />;
  }
  const { id: userId, name: userName } = user;
  const orgId = user.orgId;

  // Feature flag check
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.ENABLE_UNIVERSAL_REPORTS !== "true") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feature Not Enabled</h1>
            <p className="mt-2 text-neutral-600">Universal Reports are not currently enabled.</p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch claim data (verify org ownership)
  const claim = await prisma.claims.findFirst({
    where: {
      id: claimId,
      orgId: orgId,
    },
  });

  if (!claim) {
    notFound();
  }

  const property = await prisma.properties.findFirst({
    where: {
      id: claim.propertyId,
      orgId: orgId,
    },
    select: {
      street: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });

  const propertyAddress = [
    property?.street,
    [property?.city, property?.state].filter(Boolean).join(", "),
    property?.zipCode,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Define a type for the report data structure for better type safety
  type ReportData = {
    coverPage: Prisma.JsonObject;
    executiveSummary: Prisma.JsonObject;
    damageSummary: Prisma.JsonObject;
    damagePhotos: Prisma.JsonObject;
    weatherVerification: Prisma.JsonObject;
    codeCompliance: Prisma.JsonObject;
    systemFailure: Prisma.JsonObject;
    scopeOfWork: Prisma.JsonObject;
    professionalOpinion: Prisma.JsonObject;
    signatures: Prisma.JsonObject;
  };

  // Fetch or initialize Report
  let report = await prisma.ai_reports.findFirst({
    where: { claimId },
  });

  // If no report exists, create initial draft
  if (!report) {
    const initialReportData: ReportData = {
      coverPage: {
        contractorLogo: "",
        contractorName: "",
        contractorLicenseNumber: "",
        contractorAddress: "",
        contractorPhone: "",
        contractorEmail: "",
        clientName: claim.title || "",
        propertyAddress,
        claimNumber: claim.claimNumber || "",
        dateOfLoss: claim.dateOfLoss.toISOString(), // Keep as Date object
        preparedBy: "",
        preparedByTitle: "",
        preparedByPhone: "",
        datePrepared: new Date().toISOString(),
        heroImageUrl: "",
      },
      executiveSummary: {
        stormEvent: {
          hailSize: "",
          windSpeed: "",
          noaaReports: [],
          hailSwathMapUrl: "",
          proximityToAddress: "",
        },
        roofCondition: {
          systemType: "other",
          systemTypeDetail: "",
          ageEstimate: "",
          manufacturer: "",
          colorBlend: "",
          discontinued: false,
          preExistingRepairs: [],
        },
        conclusion: "",
      },
      damageSummary: {
        functionalDamage: {
          crackedTilesCount: 0,
          brokenTilesCount: 0,
          liftedShinglesCount: 0,
          creasedShinglesCount: 0,
          missingShinglesCount: 0,
          hailImpactsPerSquare: 0,
          collateralDamage: [],
        },
        cosmeticDamage: {
          granuleLossPercentage: 0,
          streakingDiscoloration: false,
          algaeFungusGrowth: false,
          blistering: false,
          flaking: false,
        },
      },
      damagePhotos: {
        elevations: [],
        roof: [],
        collateral: [],
        interior: [],
      },
      weatherVerification: {
        historicalWeatherReportUrl: "",
        summary: "",
      },
      codeCompliance: {
        localBuildingCodes: [],
        ircRequirements: [],
        manufacturerSpecs: [],
      },
      systemFailure: {
        analysis: "",
        supportingPhotos: [],
      },
      scopeOfWork: {
        items: [],
        totalEstimate: 0,
      },
      professionalOpinion: {
        opinion: "",
        recommendations: "",
      },
      signatures: {
        homeownerSignature: "",
        contractorSignature: "",
      },
    };

    report = await prisma.ai_reports.create({
      data: {
        type: "insurance-claim",
        title: claim.title || "Claim Report",
        content: JSON.stringify(initialReportData),
        tokensUsed: 0,
        userName: userName ?? "System",
        status: "draft",
        userId: userId,
        claimId: claimId,
        orgId: orgId,
      } as Prisma.ai_reportsUncheckedCreateInput,
    });
  }

  // Assert report.content is a JSON string and parse it
  const reportData = JSON.parse(report.content || "{}") as ReportData;

  // Construct the initialReport prop for the client component, combining
  // database fields with the content from the JSON 'data' field.
  const initialReportForClient = {
    id: report.id,
    claimId: report.claimId ?? claimId,
    version: 1, // Placeholder
    status: report.status,
    pdfUrl: null, // Placeholder
    pdfGeneratedAt: null, // Placeholder
    finalizedAt: null, // Placeholder
    submittedAt: null, // Placeholder
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    // Spread the content from the JSON data field
    ...reportData,
  };

  return (
    <UniversalReportEditorClient
      claim={{
        id: claim.id,
        title: claim.title,
        claimNumber: claim.claimNumber || "",
        status: claim.status,
        insured_name: claim.title,
        propertyAddress,
      }}
      initialReport={initialReportForClient}
    />
  );
}
