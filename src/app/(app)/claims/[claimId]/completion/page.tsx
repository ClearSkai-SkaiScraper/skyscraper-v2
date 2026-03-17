"use client";

import { useState } from "react";

import { CompletionChecklist } from "@/components/completion/CompletionChecklist";
import { CompletionStatusPanel } from "@/components/completion/CompletionStatusPanel";
import { CompletionUploadZone } from "@/components/completion/CompletionUploadZone";
import { DepreciationPackagePanel } from "@/components/depreciation/DepreciationPackagePanel";

interface ClaimCompletionPageProps {
  params: { claim_id: string };
}

export default function ClaimCompletionPage({ params }: ClaimCompletionPageProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          🏁 Completion Center
          <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-normal text-purple-800">
            PHASE 13.1 — DEPRECIATION BUILDER
          </span>
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Mark the build complete and prepare for AI-powered depreciation processing.
        </p>
      </div>

      {/* Status Panel */}
      <div className="mb-6">
        <CompletionStatusPanel key={refreshKey} claimId={params.claim_id} />
      </div>

      {/* Checklist */}
      <div className="mb-6">
        <CompletionChecklist claimId={params.claim_id} onStatusChange={handleRefresh} />
      </div>

      {/* Upload Zones */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Documents */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">📄 Completion Documents</h3>
          <p className="mb-4 text-sm text-gray-600">
            Upload signed completion forms, final invoices, or walkthrough documentation.
          </p>
          <CompletionUploadZone
            claimId={params.claim_id}
            type="document"
            onUploadComplete={handleRefresh}
          />
        </div>

        {/* Photos */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">📸 Completion Photos</h3>
          <p className="mb-4 text-sm text-gray-600">
            Upload final build photos. AI will analyze these for timeline and supplement detection.
          </p>
          <CompletionUploadZone
            claimId={params.claim_id}
            type="photo"
            onUploadComplete={handleRefresh}
          />
        </div>
      </div>

      {/* Depreciation Package Section */}
      <div className="mt-8">
        <DepreciationPackagePanel claimId={params.claim_id} onPackageGenerated={handleRefresh} />
      </div>

      {/* Info Section */}
      <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h4 className="mb-3 font-semibold text-blue-900">
          🚀 What Happens After Completion?
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>AI Timeline Builder:</strong> Sorts photos by phase (tear-off, mid-build,
              completion) and creates a chronological build narrative
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>Supplement Detection:</strong> Compares photos to carrier estimate and
              auto-generates supplement for unpaid items
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>Contractor Statement:</strong> Auto-generates professional completion
              statement for adjuster review
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>Final Invoice:</strong> Calculates depreciation owed, supplements, tax, and
              generates carrier-ready invoice
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>Depreciation Packet:</strong> Combines everything into one comprehensive PDF
              with one-click email to adjuster
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
