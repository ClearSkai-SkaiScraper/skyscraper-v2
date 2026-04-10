"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  Send,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { usePermissions } from "@/hooks/usePermissions";

export default function InviteTeamMemberPage() {
  const { permissions, role: currentUserRole, loading } = usePermissions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setSuccess(true);
      setInviteUrl(data.invitation.inviteUrl);
      setEmail("");
      setMessage("");

      // Redirect back to teams page after 3 seconds
      setTimeout(() => {
        router.push("/teams");
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Permission check
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!permissions.includes("team:invite")) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-8 backdrop-blur-xl dark:bg-amber-950/30">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-8 w-8 text-amber-600" />
              <div>
                <h3 className="mb-2 text-xl font-semibold text-amber-900 dark:text-amber-100">
                  Permission Denied
                </h3>
                <p className="mb-4 text-amber-700 dark:text-amber-300">
                  You don&apos;t have permission to invite team members. Only admins and managers can
                  send invitations.
                </p>
                <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
                  Your current role:{" "}
                  <span className="font-semibold capitalize">{currentUserRole || "Unknown"}</span>
                </p>
                <Link
                  href="/teams"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white transition hover:bg-amber-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Teams
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/teams"
            className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-2 text-[color:var(--text)] transition hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <PageHero
          title="Invite Team Member"
          subtitle="Send an invitation to join your organization"
          icon={<Send className="h-5 w-5" />}
        />

        {/* Success Message */}
        {success && (
          <div className="rounded-2xl border border-green-500/30 bg-green-50 p-6 backdrop-blur-xl dark:bg-green-950/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 text-green-600" />
              <div className="flex-1">
                <h3 className="mb-2 font-semibold text-green-900 dark:text-green-100">
                  Invitation Sent Successfully!
                </h3>
                <p className="mb-3 text-sm text-green-700 dark:text-green-300">
                  An invitation email has been sent. Redirecting to teams page...
                </p>
                {inviteUrl && (
                  <div className="rounded-lg border border-green-200 bg-white p-3 dark:border-green-800 dark:bg-gray-900">
                    <p className="mb-1 text-xs text-green-700 dark:text-green-300">
                      Invitation Link:
                    </p>
                    <code className="break-all text-xs text-green-900 dark:text-green-100">
                      {inviteUrl}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-50 p-4 dark:bg-red-950/30">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Invitation Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-8 backdrop-blur-xl"
        >
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-[color:var(--text)]"
            >
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-700 dark:text-slate-300" />
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] py-3 pl-11 pr-4 text-[color:var(--text)] placeholder:text-slate-700 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-slate-300"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300">
              They&apos;ll receive an email invitation to join your organization
            </p>
          </div>

          {/* Role Selector */}
          <div>
            <label className="mb-3 block text-sm font-medium text-[color:var(--text)]">
              Team Role *
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setRole("viewer")}
                className={`rounded-xl border p-4 text-left transition ${
                  role === "viewer"
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                    : "hover:border-[var(--primary)]/50 border-[color:var(--border)] bg-[var(--surface-1)]"
                }`}
              >
                <Eye
                  className={`mb-2 h-6 w-6 ${role === "viewer" ? "text-[var(--primary)]" : "text-slate-700 dark:text-slate-300"}`}
                />
                <h3 className="mb-1 font-semibold text-[color:var(--text)]">Viewer</h3>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Read-only access to claims and data
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole("member")}
                className={`rounded-xl border p-4 text-left transition ${
                  role === "member"
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                    : "hover:border-[var(--primary)]/50 border-[color:var(--border)] bg-[var(--surface-1)]"
                }`}
              >
                <User
                  className={`mb-2 h-6 w-6 ${role === "member" ? "text-[var(--primary)]" : "text-slate-700 dark:text-slate-300"}`}
                />
                <h3 className="mb-1 font-semibold text-[color:var(--text)]">Member</h3>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Can create and edit claims
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`rounded-xl border p-4 text-left transition ${
                  role === "admin"
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                    : "hover:border-[var(--primary)]/50 border-[color:var(--border)] bg-[var(--surface-1)]"
                }`}
              >
                <Shield
                  className={`mb-2 h-6 w-6 ${role === "admin" ? "text-[var(--primary)]" : "text-slate-700 dark:text-slate-300"}`}
                />
                <h3 className="mb-1 font-semibold text-[color:var(--text)]">Admin</h3>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Full access including team management
                </p>
              </button>
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label
              htmlFor="message"
              className="mb-2 block text-sm font-medium text-[color:var(--text)]"
            >
              Personal Message (Optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Welcome to the team! We're excited to have you join us."
              className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] placeholder:text-slate-700 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-slate-300"
            />
            <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300">
              Add a personal touch to your invitation email
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="flex-1 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-medium text-white shadow-[var(--glow)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Send className="mr-2 inline h-5 w-5" />
                  Send Invitation
                </>
              )}
            </button>
            <Link
              href="/teams"
              className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] px-6 py-3 font-medium text-[color:var(--text)] transition hover:bg-[var(--surface-2)]"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Info Panel */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-50 p-6 dark:bg-blue-950/30">
          <h3 className="mb-3 font-semibold text-blue-900 dark:text-blue-100">
            📧 How Invitations Work
          </h3>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">1.</span>
              <span>Your teammate receives an email with a secure invitation link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">2.</span>
              <span>They click the link and sign in (or create an account)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">3.</span>
              <span>They&apos;re automatically added to your organization with the assigned role</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">4.</span>
              <span>Invitations expire after 7 days for security</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
