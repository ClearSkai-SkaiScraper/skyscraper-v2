// src/app/(app)/jobs/retail/[id]/not-found.tsx
import { ArrowLeft, FileQuestion, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RetailJobNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <FileQuestion className="h-5 w-5" />
              Retail Job Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The retail job you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view
              it. This could happen if:
            </p>

            <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li>The job was deleted or archived</li>
              <li>The job ID in the URL is incorrect</li>
              <li>The job belongs to a different organization</li>
              <li>The job is not marked as a retail job</li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="default" asChild>
                <Link href="/leads">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  View All Jobs
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/leads/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Job
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
