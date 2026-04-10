/**
 * Trades Onboarding Wizard Component
 * Reusable wrapper for the onboarding flow
 * Can be embedded in My Network page or standalone
 */

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TradesOnboardingWizard({ existingMember }: { existingMember: any }) {
  const router = useRouter();

  useEffect(() => {
    // Determine which step to redirect to based on existing member state
    if (!existingMember) {
      // No member at all → start at main onboarding
      router.push("/trades/onboarding");
    } else if (existingMember.onboardingStep === "profile") {
      router.push("/trades/onboarding");
    } else if (existingMember.onboardingStep === "link_company") {
      router.push("/trades/onboarding/link-company");
    } else if (existingMember.onboardingStep === "pending_admin") {
      router.push("/trades/onboarding/waiting");
    } else if (existingMember.onboardingStep === "job_photos") {
      router.push("/trades/onboarding/job-photos");
    } else {
      // Onboarding is complete — go to their profile
      router.push("/trades/profile");
    }
  }, [existingMember, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-gray-600">Loading onboarding...</p>
      </div>
    </div>
  );
}
