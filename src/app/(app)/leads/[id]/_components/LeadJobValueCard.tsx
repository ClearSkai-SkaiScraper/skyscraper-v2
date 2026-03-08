// src/app/(app)/leads/[id]/_components/LeadJobValueCard.tsx
"use client";

import { DollarSign } from "lucide-react";
import { useCallback, useState } from "react";

import { JobValueBox } from "@/components/jobs/JobValueBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeadJobValueCardProps {
  leadId: string;
  estimatedJobValue: number | null;
  jobValueStatus: string;
  jobValueApprovedBy: string | null;
  jobValueApprovalNotes: string | null;
}

export function LeadJobValueCard({
  leadId,
  estimatedJobValue: initialValue,
  jobValueStatus: initialStatus,
  jobValueApprovedBy: initialApprovedBy,
  jobValueApprovalNotes: initialNotes,
}: LeadJobValueCardProps) {
  const [data, setData] = useState({
    estimatedJobValue: initialValue,
    jobValueStatus: initialStatus,
    jobValueApprovedBy: initialApprovedBy,
    jobValueApprovalNotes: initialNotes,
  });

  const handleUpdate = useCallback((updates: Record<string, any>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          Job Value Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <JobValueBox
          entityId={leadId}
          entityType="lead"
          estimatedJobValue={data.estimatedJobValue}
          jobValueStatus={data.jobValueStatus}
          jobValueApprovedBy={data.jobValueApprovedBy}
          jobValueApprovalNotes={data.jobValueApprovalNotes}
          onUpdate={handleUpdate}
        />
      </CardContent>
    </Card>
  );
}
