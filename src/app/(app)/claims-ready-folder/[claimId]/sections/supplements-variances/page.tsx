// src/app/(app)/claims-ready-folder/[claimId]/sections/supplements-variances/page.tsx
"use client";

import {
  AlertCircle,
  ArrowUpRight,
  DollarSign,
  FileText,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logger } from "@/lib/logger";

interface SupplementItem {
  id: string;
  description: string;
  category: string;
  xactimateCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  reason: string;
  status: "pending" | "approved" | "denied" | "in_review";
}

interface VarianceItem {
  id: string;
  lineItem: string;
  carrierAmount: number;
  contractorAmount: number;
  variance: number;
  variancePercent: number;
  justification: string;
}

interface SupplementsVariancesData {
  supplements: SupplementItem[];
  variances: VarianceItem[];
  supplementTotal: number;
  varianceTotal: number;
  status: "not_started" | "in_progress" | "submitted" | "resolved";
}

export default function SupplementsVariancesPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<SupplementsVariancesData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claims-folder/sections/supplements-variances?claimId=${claimId}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        // If API not found, show empty state
        setData({
          supplements: [],
          variances: [],
          supplementTotal: 0,
          varianceTotal: 0,
          status: "not_started",
        });
      }
    } catch (err) {
      logger.error("Failed to fetch supplements data:", err);
      setData({
        supplements: [],
        variances: [],
        supplementTotal: 0,
        varianceTotal: 0,
        status: "not_started",
      });
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Denied
          </Badge>
        );
      case "in_review":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            In Review
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasSupplements = data && data.supplements.length > 0;
  const hasVariances = data && data.variances.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Supplements & Variances
        </h1>
        <p className="text-slate-500">
          Additional items not in the original carrier scope — track differences and build rebuttals
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/50">
              <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.supplements.length ?? 0}</p>
              <p className="text-sm text-slate-500">Supplement Items</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/50">
              <ArrowUpRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.variances.length ?? 0}</p>
              <p className="text-sm text-slate-500">Variance Items</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/50">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency((data?.supplementTotal ?? 0) + (data?.varianceTotal ?? 0))}
              </p>
              <p className="text-sm text-slate-500">Total Difference</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Supplement Line Items
              </CardTitle>
              <CardDescription>
                Items discovered during inspection not included in original carrier estimate
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href={`/claims/${claimId}/scope`}>
                <Button variant="outline" size="sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Supplement
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasSupplements ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.supplements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
                        {item.xactimateCode || "—"}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-slate-900 dark:text-white">
                No Supplements Yet
              </h3>
              <p className="mb-4 max-w-sm text-sm text-slate-500">
                Supplements are additional line items found during inspection that weren&apos;t in
                the carrier&apos;s original scope. Use AI to generate them from your damage
                findings.
              </p>
              <Link href={`/claims/${claimId}/scope`}>
                <Button>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Go to Scope & Supplements
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Carrier vs. Contractor Variances
          </CardTitle>
          <CardDescription>
            Line-by-line comparison between carrier estimate and your actual scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasVariances ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line Item</TableHead>
                  <TableHead className="text-right">Carrier Amount</TableHead>
                  <TableHead className="text-right">Contractor Amount</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Justification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.variances.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.lineItem}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.carrierAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.contractorAmount)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        item.variance > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {item.variance > 0 ? "+" : ""}
                      {formatCurrency(item.variance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={Math.abs(item.variancePercent) > 20 ? "destructive" : "outline"}
                      >
                        {item.variancePercent > 0 ? "+" : ""}
                        {item.variancePercent.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-slate-500">
                      {item.justification}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                <AlertCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-slate-900 dark:text-white">
                No Variances Tracked
              </h3>
              <p className="mb-4 max-w-sm text-sm text-slate-500">
                Upload the carrier&apos;s estimate to auto-compare against your scope and identify
                pricing differences line by line.
              </p>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Import Carrier Estimate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals Summary */}
      {(hasSupplements || hasVariances) && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Total Additional Amount
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency((data?.supplementTotal ?? 0) + (data?.varianceTotal ?? 0))}
                </p>
              </div>
              <Button size="lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Rebuttal Letter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
