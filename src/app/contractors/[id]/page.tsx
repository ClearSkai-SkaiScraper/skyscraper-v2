/**
 * /contractors/[id] - Smart Redirect Route
 *
 * This route catches requests to /contractors/:id and redirects
 * to the appropriate page based on user type:
 * - Clients → /portal/contractors/[id]
 * - Pros → /network/contractors/[id]
 * - Unauthenticated → /portal/find-a-pro/[id] (public view)
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ContractorRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId, sessionClaims } = await auth();

  // Get user type from session claims or cookie
  const clerkUserType = (sessionClaims as { publicMetadata?: { userType?: string } } | null)
    ?.publicMetadata?.userType;
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const cookieStore = await cookies();
  const cookieUserType = cookieStore.get("x-user-type")?.value;
  const userType = clerkUserType || cookieUserType;

  // Route based on user type
  if (userId) {
    if (userType === "client") {
      // Clients see the portal contractor view
      redirect(`/portal/contractors/${id}`);
    } else {
      // Pros and other authenticated users see the network view
      redirect(`/network/contractors/${id}`);
    }
  } else {
    // Unauthenticated users see the public find-a-pro view
    redirect(`/portal/find-a-pro/${id}`);
  }
}
