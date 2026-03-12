/**
 * Onboarding layout — ensures consistent wrapper for all /onboarding sub-routes.
 * Sprint 5 — Onboarding Consolidation
 */

import type { Metadata } from "next";
import { type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Getting Started | SkaiScrape",
  description: "Complete your setup to unlock all platform features.",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
