import { redirect } from "next/navigation";

/**
 * /leads/financed → Redirect to Retail Jobs workspace (financed tab)
 *
 * Financed jobs were migrated to the Retail Jobs workspace.
 * This redirect prevents 404 / error boundary for any stale bookmarks or links.
 */
export default function FinancedLeadsRedirect() {
  redirect("/jobs/retail?tab=financed");
}
