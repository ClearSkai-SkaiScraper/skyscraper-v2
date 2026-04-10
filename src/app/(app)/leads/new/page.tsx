// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

import CreateLeadForm from "@/components/CreateLeadForm";
import { PageHero } from "@/components/layout/PageHero";

export default async function NewLeadPage() {
  const user = await currentUser();
  return (
    <div className="container mx-auto py-6">
      <PageHero
        section="jobs"
        title="New Lead"
        subtitle="Create a new lead and route it to the right workspace"
        icon={<PlusCircle className="h-6 w-6" />}
      />
      {!user && (
        <div className="mb-4 rounded-lg border bg-[var(--surface-1)] p-4 text-sm">
          <p className="mb-2">
            You can try the lead form without signing in. Some actions may be disabled.
          </p>
          <Link
            href="/sign-in"
            className="rounded bg-[var(--primary)] px-3 py-1.5 font-medium text-white"
          >
            🔐 Sign In
          </Link>
        </div>
      )}
      <CreateLeadForm />
    </div>
  );
}
