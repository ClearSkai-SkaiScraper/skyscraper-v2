// src/app/(app)/claims/[claimId]/_components/ClaimsSidebar.tsx
"use client";

import {
  Calendar,
  Camera,
  Cloud,
  DollarSign,
  Edit,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ClaimsSidebarProps {
  claimId: string;
  claim: {
    insured_name?: string | null;
    homeowner_email?: string | null;
    carrier?: string | null;
    policy_number?: string | null;
    adjusterName?: string | null;
    adjusterPhone?: string | null;
    adjusterEmail?: string | null;
    propertyAddress?: string | null;
    estimatedValue?: number | null;
    approvedValue?: number | null;
    dateOfLoss?: string | null;
    dateOfInspection?: string | null;
  };
  /** Called when the sidebar saves a field — lets the parent sync its state */
  onFieldUpdate?: (field: string, value: string) => void;
}

export function ClaimsSidebar({ claimId, claim, onFieldUpdate }: ClaimsSidebarProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const formatCurrency = (val: number | null | undefined) =>
    val
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val / 100)
      : "TBD";

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const startEdit = useCallback((field: string, currentValue: string) => {
    setEditing(field);
    setEditValue(currentValue);
  }, []);

  const saveField = useCallback(
    async (field: string) => {
      try {
        const res = await fetch(`/api/claims/${claimId}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: editValue }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        setEditing(null);
        toast.success("Field saved");
        // Notify parent so overview state stays in sync
        onFieldUpdate?.(field, editValue);
        router.refresh();
      } catch (err) {
        toast.error("Failed to save — please try again");
        setEditing(null);
      }
    },
    [claimId, editValue, router, onFieldUpdate]
  );

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditValue("");
  }, []);

  const EditableField = ({
    field,
    label,
    value,
    icon: Icon,
  }: {
    field: string;
    label: string;
    value: string | null | undefined;
    icon: typeof User;
  }) => {
    if (editing === field) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveField(field);
              if (e.key === "Escape") cancelEdit();
            }}
            className="h-7 text-xs"
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-green-600"
            onClick={() => void saveField(field)}
          >
            ✓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-red-500"
            onClick={cancelEdit}
          >
            ✕
          </Button>
        </div>
      );
    }
    return (
      <div
        className="group -mx-1 flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        onClick={() => startEdit(field, value || "")}
        title="Click to edit"
      >
        <Icon className="h-4 w-4 shrink-0 text-blue-600" />
        <span className="flex-1 truncate font-medium">{value || "Not set"}</span>
        <Edit className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Claim Value Card */}
      <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Claim Value
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimated</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(claim.estimatedValue)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Approved</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(claim.approvedValue)}
            </span>
          </div>
          <Link href={`/claims/${claimId}/financial`}>
            <Button variant="outline" size="sm" className="mt-2 w-full">
              View Financials
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Key Dates Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 pb-3 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-amber-600" />
            Key Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date of Loss</span>
            <span className="text-sm font-medium">{formatDate(claim.dateOfLoss)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Inspection</span>
            <span className="text-sm font-medium">{formatDate(claim.dateOfInspection)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Adjuster Contact Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-blue-600" />
            Adjuster Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          <EditableField field="adjusterName" label="Name" value={claim.adjusterName} icon={User} />
          <EditableField
            field="adjusterPhone"
            label="Phone"
            value={claim.adjusterPhone}
            icon={Phone}
          />
          <EditableField
            field="adjusterEmail"
            label="Email"
            value={claim.adjusterEmail}
            icon={Mail}
          />
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 pb-3 dark:from-purple-950/30 dark:to-violet-950/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href={`/claims/${claimId}/photos`}>
              <Camera className="mr-2 h-4 w-4" /> Manage Photos
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href={`/claims/${claimId}/documents`}>
              <FileText className="mr-2 h-4 w-4" /> Documents
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href={`/claims/${claimId}/weather`}>
              <Cloud className="mr-2 h-4 w-4" /> Weather Report
            </Link>
          </Button>
          <Button className="mt-2 w-full justify-start bg-indigo-600 hover:bg-indigo-700" asChild>
            <Link href={`/claims/${claimId}/report`}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate Report
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Property Card */}
      {claim.propertyAddress && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 pb-3 dark:from-slate-950/30 dark:to-gray-950/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-slate-600" />
              Property
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm">{claim.propertyAddress}</p>
            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href={`/claims/${claimId}/scope`}>View Scope</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
