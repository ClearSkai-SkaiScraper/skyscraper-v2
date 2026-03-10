// src/app/(app)/claims/[claimId]/_components/ClaimHeaderActions.tsx
"use client";

import { Edit, MoreVertical, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ArchiveJobButton } from "@/components/jobs/ArchiveJobButton";
import { TransferJobDropdown } from "@/components/jobs/TransferJobDropdown";
import { Button } from "@/components/ui/button";

interface ClaimHeaderActionsProps {
  claimId: string;
  claimTitle: string;
}

export function ClaimHeaderActions({ claimId, claimTitle }: ClaimHeaderActionsProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleEditClick = useCallback(() => {
    const isOnOverview = pathname?.endsWith("/overview");
    if (isOnOverview) {
      // Already on edit surface — scroll to claim details and notify user
      const section = document.getElementById("claim-details-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        // Brief highlight pulse
        section.classList.add("ring-2", "ring-blue-400", "ring-offset-2");
        setTimeout(
          () => section.classList.remove("ring-2", "ring-blue-400", "ring-offset-2"),
          2000
        );
      }
      toast.info("Click any field to edit it", { duration: 3000 });
    } else {
      router.push(`/claims/${claimId}/overview`);
    }
    setShowMobileMenu(false);
  }, [pathname, claimId, router]);

  return (
    <>
      {/* Desktop actions */}
      <div className="hidden items-center gap-2 md:flex">
        <Link href={`/claims/${claimId}/client`}>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </Link>
        <TransferJobDropdown jobId={claimId} currentCategory="claim" />
        <ArchiveJobButton jobId={claimId} jobTitle={claimTitle} type="claim" />
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          onClick={handleEditClick}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Mobile menu toggle */}
      <div className="relative md:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
        {showMobileMenu && (
          <div className="absolute right-0 top-full z-50 mt-1 flex w-48 flex-col gap-1 rounded-lg border bg-white p-2 shadow-lg dark:bg-slate-800">
            <Link href={`/claims/${claimId}/client`}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </Link>
            <TransferJobDropdown jobId={claimId} currentCategory="claim" />
            <ArchiveJobButton jobId={claimId} jobTitle={claimTitle} type="claim" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleEditClick}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Claim
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
