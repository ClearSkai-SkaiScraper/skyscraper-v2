/**
 * Public Homeowner Claim Report
 *
 * No auth required — accessed via share token URL.
 * Shows a professional, branded damage report the homeowner
 * can share with their insurance company or use as reference.
 */
"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Shield,
} from "lucide-react";
import { use, useEffect, useState } from "react";

interface ClaimReport {
  claim: {
    claimNumber: string | null;
    status: string | null;
    propertyAddress: string | null;
    homeownerName: string | null;
    claimAmount: number | null;
    dateOfLoss: string | null;
    lossType: string | null;
  };
  branding: {
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
  photos: Array<{
    id: string;
    url: string;
    label: string | null;
    description: string | null;
    category: string | null;
  }>;
  findings: Array<{
    id: string;
    description: string | null;
    category: string | null;
    damageType: string | null;
    quantity: number | null;
    unitPrice: number | null;
    total: number | null;
    confidence: number | null;
  }>;
  totalValue: number;
}

export default function ShareClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [report, setReport] = useState<ClaimReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/claim/${resolvedParams.token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "This link is invalid or has expired.");
          return;
        }
        setReport(await res.json());
      } catch {
        setError("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [resolvedParams.token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-slate-600">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Report Unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || "This report could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  const { claim, branding, photos, findings, totalValue } = report;
  const primaryColor = branding.primaryColor || "#2563eb";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Branded Header */}
      <header
        className="border-b px-4 py-6"
        style={{ borderColor: `${primaryColor}20`, backgroundColor: `${primaryColor}08` }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="h-10 w-auto" />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {(branding.companyName || "S")[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {branding.companyName || "SkaiScraper"}
                </p>
                <p className="text-xs text-slate-500">Property Damage Report</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Shield className="h-3.5 w-3.5" />
              Verified Report
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Property Info */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Property Damage Report</h1>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {claim.propertyAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Property</p>
                  <p className="text-sm font-medium text-slate-900">{claim.propertyAddress}</p>
                </div>
              </div>
            )}
            {claim.homeownerName && (
              <div>
                <p className="text-xs text-slate-500">Homeowner</p>
                <p className="text-sm font-medium text-slate-900">{claim.homeownerName}</p>
              </div>
            )}
            {claim.dateOfLoss && (
              <div>
                <p className="text-xs text-slate-500">Date of Loss</p>
                <p className="text-sm font-medium text-slate-900">
                  {new Date(claim.dateOfLoss).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {claim.lossType && (
              <div>
                <p className="text-xs text-slate-500">Loss Type</p>
                <p className="text-sm font-medium capitalize text-slate-900">{claim.lossType}</p>
              </div>
            )}
          </div>
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Camera className="h-5 w-5 text-blue-500" />
              Property Photos ({photos.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-200"
                >
                  <img
                    src={photo.url}
                    alt={photo.label || "Property photo"}
                    className="h-40 w-full object-cover transition-transform group-hover:scale-105"
                  />
                  {photo.label && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6">
                      <p className="text-[10px] font-medium text-white">{photo.label}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Damage Findings */}
        {findings.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
              <FileText className="h-5 w-5 text-amber-500" />
              Damage Findings ({findings.length} items)
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Item</th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium text-slate-500 sm:table-cell">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => (
                    <tr key={f.id} className="border-b border-slate-50">
                      <td className="px-4 py-2.5 text-slate-900">
                        {f.description || f.damageType || "Damage item"}
                      </td>
                      <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">
                        {f.category || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                        {f.total ? `$${(f.total / 100).toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50">
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-900">
                      Estimated Total
                    </td>
                    <td
                      className="px-4 py-3 text-right text-lg font-black"
                      style={{ color: primaryColor }}
                    >
                      ${(totalValue / 100).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Status Banner */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-900">AI-Verified Damage Assessment</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            This report was generated using advanced AI damage detection and verified against 25+
            damage categories.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center">
        <p className="text-xs text-slate-400">
          Powered by{" "}
          <a
            href="https://www.skaiscrape.com"
            className="font-medium text-blue-500 hover:underline"
          >
            SkaiScraper
          </a>{" "}
          — AI-Powered Storm Restoration Platform
        </p>
      </footer>
    </div>
  );
}
