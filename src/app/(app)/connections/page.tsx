import { redirect } from "next/navigation";

/**
 * Legacy connections route — redirects to the canonical Company Connections page.
 * The previous client-side connections management has been consolidated into
 * /company/connections (server-side, comprehensive) and
 * /dashboard/trades/connections (trade requests).
 */
export default function ConnectionsRedirect() {
  redirect("/company/connections");
}
