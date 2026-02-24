import { Button } from "@/components/ui/button";

import ReportAssemblyClient from "./ReportAssemblyClient";

export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <main className="container-padding section-spacing space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="heading-2">
            <span className="bg-gradient-to-r from-[#117CFF] to-[#FFC838] bg-clip-text text-transparent">
              Report Assembly
            </span>
          </h1>
          <p className="body-small text-slate-500 dark:text-slate-400 dark:text-slate-600">
            Generate structured claim reports by selecting and organizing AI-generated sections
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/ai/reports">All Reports</a>
        </Button>
      </div>
      <div className="space-y-4">
        <ReportAssemblyClient />
      </div>
    </main>
  );
}
