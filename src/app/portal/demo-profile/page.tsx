import { redirect } from "next/navigation";

/**
 * Demo Profile Page — Redirects to actual profile.
 * The demo page previously showed hardcoded fake contractor data.
 * Now that real profile building is wired up,
 * users should interact with their real profile instead.
 */
export default function DemoProfilePage() {
  redirect("/portal/profile");
}
