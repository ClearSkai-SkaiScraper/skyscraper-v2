import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PortalJobNotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Job Not Found</CardTitle>
          <CardDescription>
            The job you&apos;re looking for doesn&apos;t exist or may have been
            completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/portal/jobs">
            <Button className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Jobs
            </Button>
          </Link>
          <Link href="/portal">
            <Button variant="outline" className="w-full">
              Go to Portal Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
