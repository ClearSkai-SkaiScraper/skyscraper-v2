"use client";

/**
 * Scope Editor Hub
 * Select a claim to edit its scope of work (Xactimate-style line items)
 */

import {
  Calculator,
  ChevronRight,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface ClaimOption {
  id: string;
  title: string;
  claimNumber?: string;
  address?: string;
  status: string;
  dateOfLoss?: string;
  totalAmount?: number;
  lineItemCount?: number;
}

export default function ScopeEditorHub() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimOption[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<ClaimOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch("/api/claims?limit=200");
        if (res.ok) {
          const data = await res.json();
          const opts: ClaimOption[] = (data.claims || []).map((c: any) => ({
            id: c.id,
            title: c.title || c.claimNumber || "Untitled Claim",
            claimNumber: c.claimNumber,
            address: c.property?.street || c.propertyAddress,
            status: c.status || "OPEN",
            dateOfLoss: c.dateOfLoss,
            totalAmount: c.totalAmount,
            lineItemCount: c.lineItemCount || 0,
          }));
          setClaims(opts);
          setFilteredClaims(opts);
        }
      } catch (err) {
        logger.error("[SCOPE_EDITOR_HUB] Failed to fetch claims", err);
      } finally {
        setLoading(false);
      }
    }
    void fetchClaims();
  }, []);

  useEffect(() => {
    let filtered = claims;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.claimNumber?.toLowerCase().includes(query) ||
          c.address?.toLowerCase().includes(query)
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    setFilteredClaims(filtered);
  }, [searchQuery, statusFilter, claims]);

  const handleClaimSelect = (claimId: string) => {
    router.push(`/claims/${claimId}/scope`);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "\u2014";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      OPEN: "default",
      IN_PROGRESS: "secondary",
      PENDING: "outline",
      CLOSED: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace(/_/g, " ")}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHero
        title="Scope Editor"
        subtitle="Xactimate-style line item editor for claim scope of work"
        icon={<FileSpreadsheet className="h-8 w-8" />}
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Select a Claim</CardTitle>
          <CardDescription>Choose a claim to view or edit its scope of work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, claim number, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              {claims.length === 0
                ? "No claims found. Create a claim first to edit its scope."
                : "No claims match your search criteria."}
            </p>
            {claims.length === 0 && (
              <Link href="/claims/new">
                <Button className="mt-4">Create New Claim</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClaims.map((claim) => (
            <Card
              key={claim.id}
              className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => handleClaimSelect(claim.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{claim.title}</CardTitle>
                    {claim.claimNumber && (
                      <p className="mt-1 text-sm text-muted-foreground">#{claim.claimNumber}</p>
                    )}
                  </div>
                  {getStatusBadge(claim.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {claim.address && (
                  <p className="mb-3 truncate text-sm text-muted-foreground">{claim.address}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calculator className="h-4 w-4" />
                    <span>{claim.lineItemCount || 0} line items</span>
                  </div>
                  {claim.totalAmount && (
                    <span className="font-medium">{formatCurrency(claim.totalAmount)}</span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-end text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="mr-1 text-sm">Edit Scope</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && claims.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{claims.length} total claims</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="h-5">
                  {claims.filter((c) => c.status === "OPEN").length}
                </Badge>
                <span>open</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="h-5">
                  {claims.filter((c) => c.status === "IN_PROGRESS").length}
                </Badge>
                <span>in progress</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
