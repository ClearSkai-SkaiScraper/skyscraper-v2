// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";

import { getInboxActivities } from "./actions";
import InboxClient from "./InboxClient";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const activities = await getInboxActivities();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <PageHero
        title="Inbox"
        subtitle="Stay updated with your team's activities and system notifications"
      />

      <InboxClient activities={activities} />
    </div>
  );
}
