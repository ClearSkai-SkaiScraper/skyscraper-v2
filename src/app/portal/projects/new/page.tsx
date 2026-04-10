// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import WorkRequestForm from "@/components/portal/WorkRequestForm";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewProjectPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    redirect("/client/sign-in");
  }

  // Get client profile if exists
  const email = user?.emailAddresses?.[0]?.emailAddress;
  let clientProfile: Awaited<ReturnType<typeof prisma.client.findFirst>> = null;
  let connectedContractors: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let savedPros: any[] = [];
  let hasError = false;

  if (email) {
    try {
      clientProfile = await prisma.client.findFirst({
        where: {
          OR: [{ userId }, { email }],
        },
      });

      if (clientProfile) {
        // Get saved pros for the dropdown
        try {
          const savedProRecords = await prisma.clientSavedPro.findMany({
            where: { clientId: clientProfile.id },
            include: {
              tradesCompany: {
                select: {
                  id: true,
                  name: true,
                  specialties: true,
                },
              },
            },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          savedPros = savedProRecords.map((sp: any) => ({
            id: sp.tradesCompany.id,
            companyName: sp.tradesCompany.name,
            tradeType: sp.tradesCompany.specialties?.[0] || "General",
          }));
        } catch (savedProsError) {
          logger.info("[NewProjectPage] Saved pros fetch (non-critical):", savedProsError?.message);
        }

        // Get connected contractors via ClientProConnection
        try {
          const connections = await prisma.clientProConnection.findMany({
            where: { clientId: clientProfile.id },
            include: {
              tradesCompany: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          connectedContractors = connections.map((c: any) => ({
            id: c.tradesCompany?.id || c.contractorId,
            name: c.tradesCompany?.name || "Contractor",
            email: c.tradesCompany?.email || "",
          }));
        } catch (connError) {
          logger.info("[NewProjectPage] Connections fetch (non-critical):", connError?.message);
        }
      }
    } catch (error) {
      logger.error("[NewProjectPage] Error loading client profile:", error);
      if (error?.code !== "P2025" && error?.code !== "P2021") {
        hasError = true;
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Submit Work Request</h1>
        <p className="mt-2 text-muted-foreground">
          Need help with your property? Submit a work request and we&apos;ll connect you with the
          right professional.
        </p>
      </div>

      {hasError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ There was an issue loading your profile data. Some features may be limited. Please
            try again or contact support if this continues.
          </p>
        </div>
      )}

      {connectedContractors.length === 0 && savedPros.length === 0 && !hasError && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                Find and Save Pros to Your Network
              </h3>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                Browse our{" "}
                <Link
                  href="/portal/find-a-pro"
                  className="font-medium underline hover:text-blue-900 dark:hover:text-blue-100"
                >
                  Find a Pro
                </Link>{" "}
                directory to save qualified professionals. Then you can send requests directly to
                them!
              </p>
            </div>
          </div>
        </div>
      )}

      <WorkRequestForm
        clientId={clientProfile?.id}
        connectedContractors={connectedContractors}
        clientEmail={email}
        savedPros={savedPros}
      />
    </div>
  );
}
