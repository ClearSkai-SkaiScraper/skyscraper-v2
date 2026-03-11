import { redirect } from "next/navigation";

/**
 * Demo Claim Page — Redirects to actual claims list.
 * The demo page previously showed hardcoded fake data.
 * Now that real claim creation and persistence is wired up,
 * users should interact with real claims instead.
 */
export default function DemoClaimPage() {
  redirect("/portal/claims");
}
