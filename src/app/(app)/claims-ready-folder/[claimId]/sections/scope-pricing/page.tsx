// src/app/(app)/claims-ready-folder/[claimId]/sections/scope-pricing/page.tsx
"use client";

import { Calculator, DollarSign, Download, FileSpreadsheet, Plus } from "lucide-react";
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

interface ScopeLineItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category: string;
}

interface ScopePricingData {
  lineItems: ScopeLineItem[];
  subtotal: number;
  wasteFactor: number;
  laborTotal: number;
  removalTotal: number;
  overheadAndProfit: {
    enabled: boolean;
    percentage: number;
    amount: number;
  };
  grandTotal: number;
}

export default function ScopePricingPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<ScopePricingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/scope-pricing?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch scope data:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold">Xactimate-Ready Scope</h1>
          </div>
          <p className="text-slate-500">Line items, quantities, and pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 9 of 17</Badge>
          <Link href={`/claims/${claimId}/scope`}>
            <Button variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Edit Scope
            </Button>
          </Link>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export ESX
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(data?.subtotal || 0)}
            </div>
            <div className="text-sm text-slate-500">Subtotal</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data?.laborTotal || 0)}
            </div>
            <div className="text-sm text-slate-500">Labor</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {data?.overheadAndProfit?.enabled
                ? formatCurrency(data.overheadAndProfit.amount)
                : "N/A"}
            </div>
            <div className="text-sm text-slate-500">
              O&P ({data?.overheadAndProfit?.percentage || 0}%)
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(data?.grandTotal || 0)}
            </div>
            <div className="text-sm text-emerald-600 dark:text-emerald-400">Grand Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Scope Line Items
          </CardTitle>
          <CardDescription>{data?.lineItems.length || 0} line items in this scope</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.lineItems && data.lineItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <span className="font-medium">{item.description}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {item.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              <Calculator className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p>No line items yet. Create a scope to add pricing.</p>
              <Link href={`/claims/${claimId}/scope`}>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Scope
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals Breakdown */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Materials & Labor Subtotal</span>
                <span className="font-medium">{formatCurrency(data.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">
                  Waste Factor ({((data.wasteFactor - 1) * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">
                  {formatCurrency(data.subtotal * (data.wasteFactor - 1))}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Removal & Disposal</span>
                <span className="font-medium">{formatCurrency(data.removalTotal)}</span>
              </div>
              {data.overheadAndProfit?.enabled && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-slate-600">
                    Overhead & Profit ({data.overheadAndProfit.percentage}%)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(data.overheadAndProfit.amount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 text-lg">
                <span className="font-semibold">Grand Total</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(data.grandTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Xactimate Compatibility */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Xactimate Compatibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This scope is formatted for direct import into Xactimate. All codes follow standard
            Xactimate pricing guidelines and can be exported as an ESX file.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
