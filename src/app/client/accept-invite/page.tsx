"use client";

import { useUser } from "@clerk/nextjs";
import { CheckCircle, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

interface InviteInfo {
  token: string;
  clientName: string | null;
  clientEmail: string;
  status: string;
  invitedAt: string;
  claimNumber: string | null;
  claimTitle: string | null;
  companyName: string;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  const token = searchParams?.get("token");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);

  // Fetch invite details
  useEffect(() => {
    if (!token) {
      setError("No invite token found. Please use the link from your email.");
      setLoading(false);
      return;
    }

    fetch(`/api/client/accept-invite?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Invite not found");
        }
        return res.json();
      })
      .then((data) => {
        setInvite(data);
        if (data.status === "connected") {
          setSuccess(true);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Accept the invite
  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch("/api/client/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invite");
      }

      setSuccess(true);
      setClaimId(data.claimId);

      // Redirect after a short pause
      setTimeout(() => {
        router.push(
          `/client/claim/${data.claimId}?email=${encodeURIComponent(invite?.clientEmail || "")}`
        );
      }, 2000);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setAccepting(false);
    }
  }, [token, invite, router]);

  // Waiting for Clerk to load
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Not signed in — redirect to sign-in with callback
  if (isLoaded && !isSignedIn) {
    const callbackUrl = `/client/accept-invite?token=${token}`;
    router.push(`/client/sign-in?redirect_url=${encodeURIComponent(callbackUrl)}`);
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-slate-600">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-sm text-slate-500">Loading invite details…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center space-y-4 py-8 text-center">
            <XCircle className="h-12 w-12 text-red-500" />
            <h1 className="text-xl font-semibold text-slate-900">Unable to Process Invite</h1>
            <p className="text-sm text-slate-600">{error}</p>
            <button
              onClick={() => router.push("/client")}
              className="mt-4 rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Go to Client Portal
            </button>
          </div>
        )}

        {/* Success */}
        {success && !loading && (
          <div className="flex flex-col items-center space-y-4 py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h1 className="text-xl font-semibold text-slate-900">Invite Accepted!</h1>
            <p className="text-sm text-slate-600">
              You&apos;re now connected to{" "}
              {invite?.claimNumber ? `claim #${invite.claimNumber}` : "your claim"}.
            </p>
            <p className="text-xs text-slate-400">Redirecting to your claim portal…</p>
            {claimId && (
              <button
                onClick={() =>
                  router.push(
                    `/client/claim/${claimId}?email=${encodeURIComponent(invite?.clientEmail || "")}`
                  )
                }
                className="mt-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                View My Claim
              </button>
            )}
          </div>
        )}

        {/* Invite card — ready to accept */}
        {invite && !success && !error && !loading && (
          <div className="flex flex-col items-center space-y-6 text-center">
            <ShieldAlert className="h-10 w-10 text-blue-500" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {invite.companyName} has invited you
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                to view and collaborate on{" "}
                {invite.claimNumber ? (
                  <span className="font-medium">claim #{invite.claimNumber}</span>
                ) : invite.claimTitle ? (
                  <span className="font-medium">{invite.claimTitle}</span>
                ) : (
                  "your claim"
                )}
                .
              </p>
            </div>

            <div className="w-full rounded-lg bg-slate-50 p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">From</span>
                <span className="font-medium text-slate-700">{invite.companyName}</span>
              </div>
              {invite.claimNumber && (
                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500">Claim #</span>
                  <span className="font-medium text-slate-700">{invite.claimNumber}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <span className="text-slate-500">Sent to</span>
                <span className="font-medium text-slate-700">{invite.clientEmail}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-slate-500">Invited</span>
                <span className="font-medium text-slate-700">
                  {new Date(invite.invitedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {accepting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Accepting…
                </span>
              ) : (
                "Accept Invite"
              )}
            </button>

            <p className="text-xs text-slate-400">
              By accepting, you&apos;ll be able to view claim documents, timelines, and communicate
              with your contractor through the SkaiScraper client portal.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
