/**
 * VIN — Job Vendor Attach Panel
 * Embeddable component for job/claim detail pages
 * Lets users search & attach vendors to a claim/job
 */

"use client";

import { Building2, Check, Loader2, Plus, Search, ShieldCheck, Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AttachedVendor {
  id: string;
  vendorId: string;
  vendorName: string;
  role: string;
  status: string;
  assignedAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  category: string;
  tradeTypes: string[];
  isFeatured: boolean;
  isVerified: boolean;
}

interface Props {
  claimId: string;
  jobId?: string;
}

const ROLES = [
  "primary_contractor",
  "sub_contractor",
  "material_supplier",
  "inspector",
  "consultant",
] as const;

const ROLE_LABELS: Record<string, string> = {
  primary_contractor: "Primary Contractor",
  sub_contractor: "Sub-Contractor",
  material_supplier: "Material Supplier",
  inspector: "Inspector",
  consultant: "Consultant",
};

export function JobVendorAttachPanel({ claimId, jobId }: Props) {
  const [attached, setAttached] = useState<AttachedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("primary_contractor");
  const [attaching, setAttaching] = useState<string | null>(null);

  const fetchAttached = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (claimId) params.set("claimId", claimId);
      if (jobId) params.set("jobId", jobId);
      const res = await fetch(`/api/vin/job-attach?${params}`);
      const data = await res.json();
      if (data.success) setAttached(data.jobVendors);
    } catch {
      toast.error("Failed to load attached vendors");
    } finally {
      setLoading(false);
    }
  }, [claimId, jobId]);

  useEffect(() => {
    void fetchAttached();
  }, [fetchAttached]);

  const searchVendors = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery, limit: "10" });
      const res = await fetch(`/api/vin?${params}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.vendors);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const d = setTimeout(searchVendors, 400);
    return () => clearTimeout(d);
  }, [searchQuery, searchVendors]);

  const attachVendor = async (vendorId: string) => {
    setAttaching(vendorId);
    try {
      const res = await fetch("/api/vin/job-attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, claimId, jobId, role: selectedRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vendor attached to job");
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults([]);
        void fetchAttached();
      } else {
        toast.error(data.error || "Attach failed");
      }
    } catch {
      toast.error("Attach failed");
    } finally {
      setAttaching(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-primary" />
          Assigned Vendors
          <Badge variant="secondary">{attached.length}</Badge>
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowSearch(!showSearch)}>
          {showSearch ? <X className="mr-1 h-3 w-3" /> : <Plus className="mr-1 h-3 w-3" />}
          {showSearch ? "Close" : "Attach Vendor"}
        </Button>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="space-y-3 border-b bg-muted/30 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vendors…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              aria-label="Select vendor role"
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {searching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((v) => {
                const alreadyAttached = attached.some((a) => a.vendorId === v.id);
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border bg-background p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{v.name}</span>
                        {v.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
                        {v.isFeatured && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{v.category}</p>
                    </div>
                    {alreadyAttached ? (
                      <Badge variant="secondary">
                        <Check className="mr-1 h-3 w-3" /> Attached
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => attachVendor(v.id)}
                        disabled={attaching === v.id}
                      >
                        {attaching === v.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-1 h-3 w-3" />
                        )}
                        Attach
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Attached List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attached.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No vendors attached to this job yet.
        </div>
      ) : (
        <div className="divide-y">
          {attached.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{a.vendorName}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {ROLE_LABELS[a.role] || a.role}
                  </Badge>
                  <Badge
                    variant={a.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {a.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.assignedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
