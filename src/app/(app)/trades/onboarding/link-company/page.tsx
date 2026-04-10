/**
 * Trades Network Onboarding - Step 2: Link to Company
 * User either creates a new pending company or joins existing one via token
 */

"use client";

import { Building2, Loader2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

export default function LinkCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [companyName, setCompanyName] = useState("");
  const [joinToken, setJoinToken] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);

  useEffect(() => {
    void checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/trades/onboarding");
      const data = await res.json();

      if (!data.hasProfile) {
        router.push("/trades/onboarding");
        return;
      }

      if (data.onboardingComplete) {
        router.push("/trades/profile");
        return;
      }

      if (data.pendingCompany) {
        router.push("/trades/onboarding/waiting");
        return;
      }

      setOnboardingStatus(data);
    } catch (error) {
      logger.error("Status check error:", error);
      toast.error("Failed to load onboarding status");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/trades/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "create_pending_company",
          data: { companyName },
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create pending company");
      }

      toast.success("Pending company created!");
      router.push("/trades/onboarding/waiting");
    } catch (error) {
      logger.error("Create company error:", error);
      toast.error(error.message || "Failed to create pending company");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/trades/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "join_pending_company",
          data: { token: joinToken },
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to join company");
      }

      toast.success(result.message);
      router.push("/trades/onboarding/waiting");
    } catch (error) {
      logger.error("Join company error:", error);
      toast.error(error.message || "Failed to join company");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-600 p-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Link to Your Company</h1>
          <p className="text-lg text-gray-600">
            Create a new company or join an existing one with an invite code
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400"></div>
            <div className="h-1 w-12 rounded-full bg-blue-400"></div>
            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
            <div className="h-1 w-12 rounded-full bg-gray-300"></div>
            <div className="h-2 w-2 rounded-full bg-gray-300"></div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Step 2 of 3: Link Company</p>
        </div>

        {/* Mode Selection */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 rounded-lg border-2 p-6 text-center transition-all ${
              mode === "create"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-300 bg-white hover:bg-gray-50"
            }`}
          >
            <Plus
              className={`mx-auto mb-2 h-8 w-8 ${mode === "create" ? "text-blue-600" : "text-gray-400"}`}
            />
            <h3
              className={`font-semibold ${mode === "create" ? "text-blue-900" : "text-gray-700"}`}
            >
              Create New Company
            </h3>
            <p className="mt-1 text-sm text-gray-500">Start a new company and invite employees</p>
          </button>

          <button
            onClick={() => setMode("join")}
            className={`flex-1 rounded-lg border-2 p-6 text-center transition-all ${
              mode === "join"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-300 bg-white hover:bg-gray-50"
            }`}
          >
            <Users
              className={`mx-auto mb-2 h-8 w-8 ${mode === "join" ? "text-blue-600" : "text-gray-400"}`}
            />
            <h3 className={`font-semibold ${mode === "join" ? "text-blue-900" : "text-gray-700"}`}>
              Join Existing Company
            </h3>
            <p className="mt-1 text-sm text-gray-500">Use an invite code from your coworker</p>
          </button>
        </div>

        {/* Forms */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
          {mode === "create" ? (
            <form onSubmit={handleCreateCompany}>
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Create Your Company</h2>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g., Phoenix Roofing Pros"
                />
                <p className="mt-2 text-sm text-gray-500">
                  You&apos;ll receive an invite link to share with at least 2 other employees. Once 3+
                  employees have joined, you can create the full company page.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Create Pending Company"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinCompany}>
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Join a Company</h2>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Invite Code *
                </label>
                <input
                  type="text"
                  required
                  value={joinToken}
                  onChange={(e) => setJoinToken(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="phoenix-roofing-pros-1234567890"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the invite code shared by your company admin or coworker.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Joining...
                  </span>
                ) : (
                  "Join Company"
                )}
              </button>
            </form>
          )}

          <div className="mt-6 space-y-3 border-t border-gray-200 pt-6">
            <button
              onClick={() => {
                toast.success("You can link to a company later from your profile");
                router.push("/trades/profile");
              }}
              className="w-full rounded-md border border-gray-300 bg-white py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Skip for Now
            </button>
            <div className="text-center">
              <Link
                href="/trades/onboarding"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                ← Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
