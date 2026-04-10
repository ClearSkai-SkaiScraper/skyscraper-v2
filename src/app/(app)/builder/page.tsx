// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import BuilderShell from "./BuilderShell";

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  // Example usage: pass a templateId or section list
  return <BuilderShell templateId="default" />;
}
