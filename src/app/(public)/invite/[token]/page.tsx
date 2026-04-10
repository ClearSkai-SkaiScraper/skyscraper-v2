"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { CheckCircle2, Loader2, Shield, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useUser();
  const token = (params?.token as string) || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [invitation, setInvitation] = useState<any>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // If not signed in, redirect to sign-in with return URL
    if (!isSignedIn) {
      const returnUrl = encodeURIComponent(`/invite/${token}`);
      router.push(`/sign-in?redirect_url=${returnUrl}`);
      return;
    }

    // User is signed in, accept the invitation
    void acceptInvitation();
  }, [isLoaded, isSignedIn, token]);

  async function acceptInvitation() {
    try {
      const response = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      setStatus("success");
      setMessage("Welcome to the team! Redirecting to dashboard...");
      setInvitation(data);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error.message || "Failed to accept invitation. The link may be expired or invalid."
      );
    }
  }

  if (!isLoaded || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--primary)]" />
          <h1 className="mb-2 text-2xl font-bold text-[color:var(--text)]">
            Processing Invitation
          </h1>
          <p className="text-slate-700 dark:text-slate-300">
            Please wait while we set up your account...
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
        <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-8 text-center backdrop-blur-xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-3xl font-bold text-transparent">
            Welcome to the Team!
          </h1>
          <p className="mb-2 text-slate-700 dark:text-slate-300">{message}</p>
          {invitation && (
            <div className="mt-6 rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4 text-left">
              <div className="mb-1 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Shield className="h-4 w-4" />
                Role
              </div>
              <p className="font-medium capitalize text-[color:var(--text)]">{invitation.role}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-50 p-8 text-center backdrop-blur-xl dark:bg-red-950/30">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-red-900 dark:text-red-100">
            Invitation Error
          </h1>
          <p className="mb-6 text-red-700 dark:text-red-300">{message}</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-medium text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/teams"
              className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] px-6 py-3 font-medium text-[color:var(--text)] transition hover:bg-[var(--surface-2)]"
            >
              Request New Invitation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
