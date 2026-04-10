// src/app/(app)/claims/[claimId]/_components/ClaimSidebar.tsx
"use client";

import { Building2, Calendar, Camera, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EditableField } from "@/components/claims/EditableField";

import { CoverPhotoPicker } from "./CoverPhotoPicker";

interface ClaimSidebarProps {
  claim: {
    id: string;
    claimNumber: string | null;
    status: string | null;
    propertyAddress?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    insuranceCarrier?: string;
    policyNumber?: string;
    adjusterName?: string;
    claimType?: string;
    coverPhotoUrl?: string | null;
    updatedAt: Date;
  };
}

export default function ClaimSidebar({ claim }: ClaimSidebarProps) {
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(claim.coverPhotoUrl);

  const handleSetCoverPhoto = (url: string) => {
    setCoverPhotoUrl(url);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveUpdates = async (updates: Record<string, any>) => {
    const res = await fetch(`/api/claims/${claim.id}/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Failed to save");
    }
  };

  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      {/* Claim Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <EditableField
              label="Claim Number"
              value={claim.claimNumber || null}
              onSave={async (value) => {
                await saveUpdates({ claimNumber: value });
                toast.success("Claim number saved", { duration: 1500 });
              }}
              placeholder="Enter claim number"
              mono
            />
          </div>
          <div className="ml-2 w-32 shrink-0">
            <EditableField
              label="Status"
              value={claim.status || null}
              onSave={async (value) => {
                await saveUpdates({ status: value });
                toast.success("Status saved", { duration: 1500 });
              }}
              placeholder="new"
            />
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Updated {new Date(claim.updatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Property Photo */}
      <div className="space-y-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          {coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPhotoUrl}
              alt="Property cover photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <Camera className="mb-2 h-8 w-8" />
              <p className="text-sm">No cover photo</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowPhotoPicker(true)}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          <Camera className="mr-2 inline-block h-4 w-4" />
          {coverPhotoUrl ? "Change Cover Photo" : "Set Cover Photo"}
        </button>
      </div>

      {/* Cover Photo Picker Modal */}
      {showPhotoPicker && (
        <CoverPhotoPicker
          claimId={claim.id}
          currentCoverUrl={coverPhotoUrl}
          onClose={() => setShowPhotoPicker(false)}
          onSet={handleSetCoverPhoto}
        />
      )}

      {/* Client Details */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Client
        </h3>

        <div className="space-y-2">
          <EditableField
            label="Client Name"
            value={claim.clientName || null}
            onSave={async (value) => {
              await saveUpdates({ insured_name: value });
              toast.success("Client saved", { duration: 1500 });
            }}
            placeholder="Enter client name"
          />

          <EditableField
            label="Email"
            value={claim.clientEmail || null}
            onSave={async (value) => {
              await saveUpdates({ homeowner_email: value });
              toast.success("Email saved", { duration: 1500 });
            }}
            type="email"
            placeholder="client@example.com"
          />

          {claim.clientPhone && (
            <Link
              href={`tel:${claim.clientPhone}`}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <Phone className="h-4 w-4" />
              {claim.clientPhone}
            </Link>
          )}

          <div className="flex items-start gap-2">
            <MapPin className="mt-7 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <div className="flex-1">
              <EditableField
                label="Property Address"
                value={claim.propertyAddress || null}
                onSave={async (value) => {
                  await saveUpdates({ propertyAddress: value });
                  toast.success("Address saved", { duration: 1500 });
                }}
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Insurance Details */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Insurance
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Building2 className="mt-7 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <div className="flex-1">
              <EditableField
                label="Insurance Carrier"
                value={claim.insuranceCarrier || null}
                onSave={async (value) => {
                  await saveUpdates({ carrier: value });
                  toast.success("Carrier saved", { duration: 1500 });
                }}
                placeholder="Enter carrier"
              />
            </div>
          </div>

          <EditableField
            label="Policy #"
            value={claim.policyNumber || null}
            onSave={async (value) => {
              await saveUpdates({ policy_number: value });
              toast.success("Policy saved", { duration: 1500 });
            }}
            placeholder="Enter policy number"
            mono
          />

          <EditableField
            label="Adjuster"
            value={claim.adjusterName || null}
            onSave={async (value) => {
              await saveUpdates({ adjusterName: value });
              toast.success("Adjuster saved", { duration: 1500 });
            }}
            placeholder="Adjuster name"
          />

          <EditableField
            label="Claim Type"
            value={claim.claimType || null}
            onSave={async (value) => {
              await saveUpdates({ damageType: value });
              toast.success("Type saved", { duration: 1500 });
            }}
            placeholder="Hail / Wind / Water"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Quick Actions
        </h3>

        <Link
          href={`/appointments/schedule?claimId=${claim.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
        >
          <Calendar className="h-4 w-4" />
          Schedule Job
        </Link>

        <button className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100">
          Upload Photo
        </button>

        <button className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          Add Document
        </button>

        <button className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          Send Message
        </button>

        <button className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          Generate Report
        </button>
      </div>
    </div>
  );
}
