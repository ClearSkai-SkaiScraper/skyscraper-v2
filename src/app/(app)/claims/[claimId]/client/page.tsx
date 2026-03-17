// src/app/(app)/claims/[claimId]/client/page.tsx
"use client";

import { useParams } from "next/navigation";

import ClientDocumentSharing from "@/components/claims/ClientDocumentSharing";

import { ClientConnectSection } from "../_components/ClientConnectSection";

export default function ClaimClientPage() {
  const params = useParams();
  const claimId = (params?.claimId ?? "") as string;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connected Client</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Search, attach, or invite a homeowner to this claim. Connected clients get their own
          portal to track progress and communicate.
        </p>
      </div>

      <ClientConnectSection claimId={claimId} />

      {/* Document Sharing — toggle which docs/photos/reports the client can see */}
      <div className="mt-8">
        <ClientDocumentSharing claimId={claimId} />
      </div>
    </div>
  );
}
