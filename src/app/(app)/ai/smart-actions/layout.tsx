import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Actions Hub | SkaiScraper",
  description:
    "AI-powered prioritized action recommendations for claims, leads, and crew scheduling.",
};

export default function SmartActionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
