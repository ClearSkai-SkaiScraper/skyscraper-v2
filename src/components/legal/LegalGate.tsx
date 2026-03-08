"use client";

import { logger } from "@/lib/logger";
import { CheckCircle2, FileText, Loader2, Scale, Shield, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export interface PendingLegalDoc {
  id: string;
  title: string;
  latestVersion: string;
}

interface LegalGateProps {
  initialPending: PendingLegalDoc[];
  children: React.ReactNode;
}

/**
 * LegalGate — Single-page consolidated agreement acceptance.
 *
 * Instead of showing sequential modals that all look the same,
 * this shows ONE clear screen listing every pending document with
 * a single "I Accept All" action. Each document is displayed in a
 * visually distinct blue card so users can see exactly what they're
 * agreeing to.
 */
export function LegalGate({ initialPending, children }: LegalGateProps) {
  const [pendingQueue, setPendingQueue] = useState<PendingLegalDoc[]>(initialPending);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  const handleAcceptAll = async () => {
    if (accepting) return;
    setAccepting(true);

    try {
      // Bulk-accept all pending docs in a single API call
      const documents = pendingQueue.map((doc) => ({
        documentId: doc.id,
        version: doc.latestVersion,
      }));

      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Session expired. Please refresh the page and sign in again.");
        } else {
          toast.error(data.error || "Failed to save. Please try again.");
        }
        setAccepting(false);
        return;
      }

      // Animate checkmarks appearing one by one
      for (const doc of pendingQueue) {
        setAccepted((prev) => new Set(prev).add(doc.id));
        await new Promise((r) => setTimeout(r, 150));
      }

      // Brief pause for visual satisfaction
      await new Promise((r) => setTimeout(r, 500));

      // Verify server-side
      const verify = await fetch("/api/legal/pending");
      if (verify.ok) {
        const verifyData = await verify.json();
        setPendingQueue(verifyData.pending || []);
      } else {
        setPendingQueue([]);
      }

      toast.success("Welcome! All agreements accepted.");
    } catch (error: any) {
      logger.error("[LegalGate] Accept all failed:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  // All clear or dismissed — render portal
  if (pendingQueue.length === 0 || dismissed) {
    return <>{children}</>;
  }

  // ─── SINGLE-PAGE ACCEPTANCE SCREEN ───────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Welcome to SkaiScraper</h1>
            <p className="mt-3 max-w-md text-base text-blue-200">
              Before you get started, please review and accept our platform agreements. This is a
              one-time step.
            </p>
          </div>

          {/* Document cards */}
          <div className="mb-8 w-full space-y-3">
            {pendingQueue.map((doc, i) => {
              const isAccepted = accepted.has(doc.id);
              const icon = getDocIcon(doc.id);

              return (
                <div
                  key={doc.id}
                  className={`group relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-300 ${
                    isAccepted
                      ? "border-green-500/40 bg-green-500/10"
                      : "border-blue-400/30 bg-blue-500/10 hover:border-blue-400/50 hover:bg-blue-500/15"
                  }`}
                  style={{
                    animationDelay: `${i * 60}ms`,
                    animation: "fadeInUp 0.4s ease-out both",
                  }}
                >
                  {/* Icon */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isAccepted ? "bg-green-500/20" : "bg-blue-500/20 group-hover:bg-blue-500/30"
                    }`}
                  >
                    {isAccepted ? <CheckCircle2 className="h-6 w-6 text-green-400" /> : icon}
                  </div>

                  {/* Title */}
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold ${isAccepted ? "text-green-300" : "text-white"}`}>
                      {doc.title}
                    </h3>
                    <p className="text-xs text-blue-300/70">Version {doc.latestVersion}</p>
                  </div>

                  {/* Read link */}
                  <Link
                    href={`/legal/${doc.id}/${doc.latestVersion}?view=friendly`}
                    target="_blank"
                    className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/20 hover:text-white"
                  >
                    Read →
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Accept All */}
          <div className="w-full space-y-4">
            <button
              type="button"
              disabled={accepting}
              onClick={handleAcceptAll}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white shadow-lg transition-all ${
                accepting
                  ? "cursor-not-allowed bg-blue-700/50"
                  : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/30 hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
              }`}
            >
              {accepting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />I Accept All Agreements ({pendingQueue.length})
                </>
              )}
            </button>

            <p className="text-center text-xs leading-relaxed text-blue-300/60">
              By clicking &quot;I Accept All,&quot; you agree to be legally bound by all listed
              documents. You can review any document anytime from Settings.
            </p>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-full rounded-xl border border-blue-400/20 px-6 py-3 text-sm font-medium text-blue-300/80 transition-all hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200"
            >
              Continue for now — I&apos;ll review later in Settings
            </button>
          </div>
        </div>
      </div>

      {/* Keep children mounted but hidden for snappy reveal */}
      <div className="hidden">{children}</div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

/** Map document IDs to distinct icons */
function getDocIcon(docId: string) {
  switch (docId) {
    case "tos":
      return <Scale className="h-5 w-5 text-blue-400" />;
    case "privacy":
      return <Shield className="h-5 w-5 text-blue-400" />;
    case "client-agreement":
    case "pro-agreement":
    case "contractor":
      return <ShieldCheck className="h-5 w-5 text-blue-400" />;
    default:
      return <FileText className="h-5 w-5 text-blue-400" />;
  }
}
