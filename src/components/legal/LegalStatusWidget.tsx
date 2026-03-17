"use client";

import { AlertCircle,Calendar, CheckCircle, FileCheck } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

import { logger } from "@/lib/logger";

interface LegalAcceptance {
  documentId: string;
  title: string;
  version: string;
  acceptedAt: string;
  isLatest: boolean;
}

export function LegalStatusWidget() {
  const [acceptances, setAcceptances] = useState<LegalAcceptance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/legal/status")
      .then((res) => res.json())
      .then((data) => {
        setAcceptances(data.acceptances || []);
        setLoading(false);
      })
      .catch((error) => {
        logger.error("Failed to load legal status:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Legal Compliance</h3>
        </div>
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  const needsUpdate = acceptances.some((a) => !a.isLatest);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Legal Compliance</h3>
        </div>
        {needsUpdate ? (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="h-4 w-4" />
            Update Available
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle className="h-4 w-4" />
            Up to Date
          </span>
        )}
      </div>

      {acceptances.length === 0 ? (
        <p className="text-sm text-slate-400">No legal documents accepted yet.</p>
      ) : (
        <div className="space-y-3">
          {acceptances.map((acceptance) => (
            <div
              key={acceptance.documentId}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">{acceptance.title}</p>
                  {!acceptance.isLatest && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                      Update Required
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span>v{acceptance.version}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(acceptance.acceptedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Link
                href={`/legal/${acceptance.documentId}/${acceptance.version}`}
                target="_blank"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-slate-700 pt-4">
        <Link href="/legal" className="text-sm text-blue-400 hover:text-blue-300">
          View all legal documents →
        </Link>
      </div>
    </div>
  );
}
