"use client";

import { CheckCircle2,Info, Loader2, MapPin, Send } from "lucide-react";
import { useEffect,useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription,DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MAILER_UNIT_PRICE } from "@/lib/pricing/mailerPricing";

interface Address {
  id: string;
  property_street: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  confidence_score?: number;
}

interface OrderMailersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchJobId: string;
  addresses: Address[];
  onSuccess?: () => void;
}

type SelectionMode = "all" | "high_confidence" | "custom";
type TemplateType = "postcard" | "letter";

export function OrderMailersModal({
  open,
  onOpenChange,
  batchJobId,
  addresses,
  onSuccess,
}: OrderMailersModalProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("high_confidence");
  const [template, setTemplate] = useState<TemplateType>("postcard");
  const [selectedAddressIds, setSelectedAddressIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter addresses for high confidence mode
  const highConfidenceAddresses = addresses.filter(
    (addr) => (addr.confidence_score ?? 0) >= 0.7
  );

  // Calculate quantity based on mode
  const quantity =
    selectionMode === "all"
      ? addresses.length
      : selectionMode === "high_confidence"
      ? highConfidenceAddresses.length
      : selectedAddressIds.size;

  const totalPrice = quantity * MAILER_UNIT_PRICE;

  // Reset custom selection when switching modes
  useEffect(() => {
    if (selectionMode !== "custom") {
      setSelectedAddressIds(new Set());
    }
  }, [selectionMode]);

  const handleToggleAddress = (addressId: string) => {
    const newSet = new Set(selectedAddressIds);
    if (newSet.has(addressId)) {
      newSet.delete(addressId);
    } else {
      newSet.add(addressId);
    }
    setSelectedAddressIds(newSet);
  };

  const handleSelectAll = () => {
    setSelectedAddressIds(new Set(addresses.map((a) => a.id)));
  };

  const handleDeselectAll = () => {
    setSelectedAddressIds(new Set());
  };

  const handleSend = async () => {
    if (quantity === 0) {
      setError("Please select at least one address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/mailers/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchJobId,
          selection: selectionMode,
          addressIds: selectionMode === "custom" ? Array.from(selectedAddressIds) : undefined,
          template,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send mailers");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to send mailers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Print + Mail Campaign</DialogTitle>
          <DialogDescription>
            Send postcards or letters via Lob to selected addresses. Each mailer includes a unique QR code for tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Template Type</Label>
            <RadioGroup value={template} onValueChange={(v) => setTemplate(v as TemplateType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="postcard" id="postcard" />
                <Label htmlFor="postcard" className="cursor-pointer">
                  Postcard <span className="text-sm text-muted-foreground">(6x9&quot;, faster delivery)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="letter" id="letter" />
                <Label htmlFor="letter" className="cursor-pointer">
                  Letter <span className="text-sm text-muted-foreground">(8.5x11&quot;, formal)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Selection Mode */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Address Selection</Label>
            <RadioGroup value={selectionMode} onValueChange={(v) => setSelectionMode(v as SelectionMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer">
                  All Addresses <Badge variant="secondary">{addresses.length}</Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high_confidence" id="high_confidence" />
                <Label htmlFor="high_confidence" className="flex cursor-pointer items-center gap-2">
                  High Confidence (≥70%) <Badge variant="secondary">{highConfidenceAddresses.length}</Badge>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer">
                  Custom Selection <Badge variant="secondary">{selectedAddressIds.size}</Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Custom Selection Address List */}
          {selectionMode === "custom" && (
            <div className="max-h-60 space-y-3 overflow-y-auto rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Select Addresses</span>
                <div className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                    Clear
                  </Button>
                </div>
              </div>

              {addresses.map((addr) => (
                <div key={addr.id} className="flex items-start space-x-3 border-b py-2 last:border-b-0">
                  <Checkbox
                    checked={selectedAddressIds.has(addr.id)}
                    onCheckedChange={() => handleToggleAddress(addr.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {addr.property_street}
                      </span>
                      {(addr.confidence_score ?? 0) >= 0.7 && (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {addr.property_city}, {addr.property_state} {addr.property_zip}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing Preview */}
          <div className="space-y-2 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quantity</span>
              <span className="font-semibold">{quantity} mailers</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unit Price</span>
              <span className="font-semibold">${MAILER_UNIT_PRICE.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Each mailer includes a unique QR code for tracking. Delivery typically takes 3-5 business days. You&apos;ll receive webhook updates on delivery status.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || quantity === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send {quantity} Mailers
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
