/**
 * Trades Network Onboarding - Waiting Room
 * Shows employee count and enables admin to create company page when 3+ joined
 */

"use client";

import { CheckCircle, Copy, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

export default function WaitingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    void checkStatus();
    // Poll every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (!data.pendingCompany) {
        router.push("/trades/onboarding/link-company");
        return;
      }

      setStatus(data);
      setInviteLink(`${window.location.origin}/trades/join/${data.pendingCompany.token}`);
    } catch (error) {
      logger.error("Status check error:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    void navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied!");
  };

  const handleCreateCompany = () => {
    router.push("/trades/onboarding/create-company");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const { employee, pendingCompany } = status;
  const employeeCount = pendingCompany?.employeeCount || 0;
  const canCreate = pendingCompany?.canCreateCompany;
  const isAdmin = employee?.isAdmin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-600 p-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Ready to Create Company!</h1>
          <p className="text-lg text-gray-600">
            You can create your company profile now. Add more employees later!
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400"></div>
            <div className="h-1 w-12 rounded-full bg-blue-400"></div>
            <div className="h-2 w-2 rounded-full bg-blue-400"></div>
            <div className="h-1 w-12 rounded-full bg-blue-400"></div>
            <div
              className={`h-2 w-2 rounded-full ${canCreate ? "bg-blue-600" : "bg-gray-300"}`}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Step 3 of 3: Create Company</p>
        </div>

        {/* Status Card */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{pendingCompany?.name}</h2>
              <p className="text-sm text-gray-500">Pending Company</p>
            </div>
            {isAdmin && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                Admin
              </span>
            )}
          </div>

          {/* Employee Count */}
          <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            </div>
            <div className="flex items-end justify-center gap-2">
              <span className="text-5xl font-bold text-blue-600">{employeeCount}</span>
              <span className="mb-2 text-2xl text-gray-400">
                employee{employeeCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-full bg-gradient-to-r from-blue-500 to-purple-500" />
            </div>
            <p className="mt-3 text-sm text-gray-600">
              ✓ Ready to create company! You can add more employees anytime.
            </p>
          </div>

          {/* Invite Link - always show */}
          {isAdmin && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Share Invite Link (Optional - Add More Employees Later)
              </label>
              <div className="flex gap-2">
                <input
                  aria-label="Invite link"
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-4 py-2 font-mono text-sm text-gray-700"
                />
                <button
                  onClick={copyInviteLink}
                  className="flex items-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Share this link with your employees to have them join
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/trades/profile"
              className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              Continue to My Profile
            </Link>
            <button
              onClick={handleCreateCompany}
              className="w-full rounded-md bg-gradient-to-r from-blue-600 to-purple-600 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
            >
              Create Company Page →
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-3 font-semibold text-gray-900">What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
              <span>✓ Click &quot;Create Company Page&quot; to set up your company profile</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
              <span>✓ Add company details (name, location, services, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
              <span>✓ Invite more employees anytime (optional)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
              <span>✓ All employees linked automatically</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
