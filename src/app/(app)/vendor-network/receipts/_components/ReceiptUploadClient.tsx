/**
 * VIN — Receipt Upload Client
 * Lists existing receipts, upload new with file + metadata
 */

"use client";

import { DollarSign, FileText, Loader2, Receipt, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ReceiptData {
  id: string;
  vendorName: string | null;
  receiptUrl: string;
  totalAmount: number | null;
  parsedData: unknown;
  createdAt: string;
  claimId: string | null;
}

export function ReceiptUploadClient() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [receiptUrl, setReceiptUrl] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [claimId, setClaimId] = useState("");

  const fetchReceipts = useCallback(async () => {
    try {
      const res = await fetch("/api/vin/receipts");
      const data = await res.json();
      if (data.success) setReceipts(data.receipts);
    } catch {
      toast.error("Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReceipts();
  }, [fetchReceipts]);

  const submitReceipt = async () => {
    if (!receiptUrl) {
      toast.error("Receipt URL is required");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/vin/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptUrl,
          vendorName: vendorName || undefined,
          totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
          claimId: claimId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Receipt uploaded & processing");
        setReceiptUrl("");
        setVendorName("");
        setTotalAmount("");
        setClaimId("");
        setShowUpload(false);
        void fetchReceipts();
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Toggle */}
      <div className="flex justify-end">
        <Button onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? <X className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
          {showUpload ? "Cancel" : "Upload Receipt"}
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <Card className="space-y-4 p-5">
          <h3 className="text-sm font-semibold">New Receipt</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Receipt URL *</label>
              <Input
                placeholder="https://storage.example.com/receipt.pdf"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Vendor Name</label>
              <Input
                placeholder="Home Depot"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Total Amount ($)</label>
              <Input
                type="number"
                placeholder="1234.56"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Claim ID (optional)</label>
              <Input
                placeholder="claim_..."
                value={claimId}
                onChange={(e) => setClaimId(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submitReceipt} disabled={uploading}>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Submit Receipt
            </Button>
          </div>
        </Card>
      )}

      {/* Receipts List */}
      {receipts.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No receipts yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload material receipts and invoices for auto-parsing.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {receipts.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-semibold">
                    {r.vendorName || "Unknown Vendor"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {r.totalAmount && (
                  <Badge variant="secondary" className="text-sm">
                    <DollarSign className="mr-0.5 h-3 w-3" />
                    {r.totalAmount.toFixed(2)}
                  </Badge>
                )}
              </div>

              {r.claimId && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Claim: {r.claimId.slice(0, 12)}…
                </p>
              )}

              <a
                href={r.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View Receipt →
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
