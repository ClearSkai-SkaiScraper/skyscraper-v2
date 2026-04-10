// src/app/(app)/claims/[claimId]/_components/ClaimsSidebar.tsx
"use client";

import {
  Calendar,
  Camera,
  CheckCircle2,
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
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AdjusterCombobox } from "@/components/claims/AdjusterCombobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { retryQueue } from "@/lib/client/retryQueue";
import { logger } from "@/lib/logger";

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

  // Connected client for sidebar display
  const [connectedClient, setConnectedClient] = useState<{
    id: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
  } | null>(null);

  // Fetch connected client info
  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/connected-client`);
      if (res.ok) {
        const data = await res.json();
        if (data.client) {
          setConnectedClient({
            id: data.client.id || null,
            name: data.client.name || "Unknown",
            email: data.client.email,
            phone: data.client.phone,
            source: data.source || null,
          });
        }
      }
    } catch (err) {
      logger.error("[ClaimsSidebar] Failed to fetch connected client:", err);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchClient();
  }, [fetchClient]);

  // Re-fetch client when the page regains focus (e.g. after connecting a client)
  useEffect(() => {
    const onFocus = () => fetchClient();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchClient]);

  const formatCurrency = (val: number | null | undefined) =>
    val
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val / 100)
      : "TBD";

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Not set";
    // If date is YYYY-MM-DD, parse parts directly to avoid timezone shift
    const dateOnly = date.split("T")[0];
    const [y, m, d] = dateOnly.split("-").map(Number);
    if (y && m && d) {
      return new Date(y, m - 1, d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        toast.error("Failed to save — queued for retry");
        retryQueue.enqueue({
          url: `/api/claims/${claimId}/update`,
          method: "PATCH",
          body: JSON.stringify({ [field]: editValue }),
        });
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-blue-600" />
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveField(field);
              if (e.key === "Escape") cancelEdit();
            }}
            onBlur={() => {
              // Auto-save on blur if value changed
              setTimeout(() => {
                if (editValue !== (value || "")) {
                  void saveField(field);
                } else {
                  cancelEdit();
                }
              }, 100);
            }}
            className="h-7 flex-1 text-xs"
            autoFocus
          />
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
      {/* Claim Value Card — only show when at least one value is available */}
      {claim.estimatedValue || claim.approvedValue ? (
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
      ) : (
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <Link
              href={`/claims/${claimId}/financial`}
              className="text-sm text-muted-foreground hover:underline"
            >
              Add claim value in Financials →
            </Link>
          </CardContent>
        </Card>
      )}

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
          <AdjusterCombobox
            currentName={claim.adjusterName || null}
            currentEmail={claim.adjusterEmail || null}
            currentPhone={claim.adjusterPhone || null}
            onSelect={(adj) => {
              // Use the update API to set all three adjuster fields at once
              fetch(`/api/claims/${claimId}/update`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  adjusterName: adj.name,
                  adjusterPhone: adj.phone,
                  adjusterEmail: adj.email,
                }),
              })
                .then((res) => {
                  if (!res.ok) throw new Error("Failed");
                  toast.success("Adjuster recalled");
                  onFieldUpdate?.("adjusterName", adj.name);
                  onFieldUpdate?.("adjusterPhone", adj.phone);
                  onFieldUpdate?.("adjusterEmail", adj.email);
                  router.refresh();
                })
                .catch(() => toast.error("Failed to set adjuster"));
            }}
          />
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

      {/* Client Contact Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-3 dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            Client Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {connectedClient ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 shrink-0 text-emerald-600" />
                {connectedClient.id && connectedClient.source === "contacts" ? (
                  <Link
                    href={`/contacts/${connectedClient.id}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {connectedClient.name}
                  </Link>
                ) : (
                  <span className="font-medium">{connectedClient.name}</span>
                )}
              </div>
              {connectedClient.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                  <a
                    href={`mailto:${connectedClient.email}`}
                    className="truncate text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {connectedClient.email}
                  </a>
                </div>
              )}
              {connectedClient.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 shrink-0 text-emerald-600" />
                  <a
                    href={`tel:${connectedClient.phone}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {connectedClient.phone}
                  </a>
                </div>
              )}
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Connected</span>
              </div>
            </>
          ) : (
            <div className="text-sm">
              <p className="text-muted-foreground">No client connected</p>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <Link href={`/claims/${claimId}/client`}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Connect Client
                </Link>
              </Button>
            </div>
          )}
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
