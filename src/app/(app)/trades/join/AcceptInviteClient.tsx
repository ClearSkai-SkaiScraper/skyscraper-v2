"use client";

import { Building2, CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface AcceptInviteClientProps {
  token: string;
}

export default function AcceptInviteClient({ token }: AcceptInviteClientProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [companyName, setCompanyName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    void acceptInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptInvite = async () => {
    try {
      const res = await fetch("/api/trades/company/seats/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to accept invite");
        setStatus("error");
        return;
      }

      setCompanyName(data.companyName || "your company");
      setStatus("success");

      // Clean the token from URL so refreshes don't show errors
      router.replace("/trades/join?accepted=true", { scroll: false });
    } catch (error) {
      logger.error("Accept invite error:", error);
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Accepting Invite...</h1>
            <p className="text-gray-600">Setting up your team membership</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Unable to Accept Invite</h1>
            <p className="mb-6 text-gray-600">{errorMessage}</p>
            <div className="flex justify-center gap-3">
              <Link href="/trades">
                <Button variant="outline">Back to Hub</Button>
              </Link>
              <Link href="/trades/company/join">
                <Button>Search Companies</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <Card className="max-w-md text-center">
        <CardContent className="p-8">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Welcome to the Team! 🎉</h1>
          <p className="mb-2 text-gray-600">
            You&apos;ve been added to <strong>{companyName}</strong>.
          </p>
          <p className="mb-6 text-sm text-gray-500">
            You can now collaborate with your team, manage projects, and access shared resources.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/trades/company">
              <Button className="gap-2">
                <Building2 className="h-4 w-4" />
                View Company
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
