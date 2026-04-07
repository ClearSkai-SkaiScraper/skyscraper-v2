"use client";

import { CheckCircle2, Clock, DollarSign, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PendingClaim {
  id: string;
  title: string;
  claimNumber: string;
  insured_name: string;
  estimatedJobValue: number;
  jobValueStatus: string;
  signingStatus: string;
  submittedBy: string;
  jobValueSubmittedAt: string;
}

export function ApprovalsClient({ orgId }: { orgId: string }) {
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    void fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claims/pending-approvals");
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch {
      toast.error("Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (claimId: string, action: "approved" | "rejected", notes?: string) => {
    setProcessing(claimId);
    try {
      const res = await fetch(`/api/claims/${claimId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobValueStatus: action,
          jobValueApprovalNotes:
            notes ||
            (action === "approved" ? "Approved via bulk review" : "Rejected via bulk review"),
        }),
      });
      if (res.ok) {
        toast.success(action === "approved" ? "Job value approved!" : "Job value rejected");
        setClaims((prev) => prev.filter((c) => c.id !== claimId));
      } else {
        toast.error("Failed to update");
      }
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!claims.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-500" />
          <h3 className="text-lg font-semibold">All caught up!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No pending job value approvals right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        {claims.length} pending approval{claims.length !== 1 ? "s" : ""}
      </div>

      <div className="grid gap-4">
        {claims.map((claim) => (
          <Card
            key={claim.id}
            className={cn("transition-all", processing === claim.id && "opacity-50")}
          >
            <CardContent className="flex items-center gap-6 p-5">
              {/* Claim Info */}
              <div className="flex-1">
                <Link
                  href={`/claims/${claim.id}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {claim.title || claim.claimNumber}
                </Link>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{claim.insured_name || "Unknown"}</span>
                  <span>•</span>
                  <span>{claim.claimNumber}</span>
                  {claim.signingStatus && (
                    <>
                      <span>•</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          claim.signingStatus === "signed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {claim.signingStatus}
                      </span>
                    </>
                  )}
                </div>
                {claim.jobValueSubmittedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted {new Date(claim.jobValueSubmittedAt).toLocaleDateString()}
                    {claim.submittedBy ? ` by ${claim.submittedBy}` : ""}
                  </p>
                )}
              </div>

              {/* Job Value */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-xl font-bold">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  {(claim.estimatedJobValue || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(claim.id, "rejected")}
                  disabled={processing === claim.id}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction(claim.id, "approved")}
                  disabled={processing === claim.id}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {processing === claim.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                  )}
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
