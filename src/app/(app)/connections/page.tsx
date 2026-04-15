import { redirect } from "next/navigation";

/**
 * Legacy connections route — redirects to the unified Clients & Connections page.
 * The previous connections management has been consolidated into /clients.
 */
export default function ConnectionsRedirect() {
  redirect("/clients");
}
