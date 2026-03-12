import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PortalNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <FileQuestion className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Page Not Found</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild className="mt-6">
          <Link href="/portal">
            <Home className="mr-2 h-4 w-4" />
            Back to Portal
          </Link>
        </Button>
      </div>
    </div>
  );
}
