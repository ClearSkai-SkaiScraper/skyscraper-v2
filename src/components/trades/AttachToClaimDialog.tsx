/**
 * AttachToClaimDialog Component
 * Prompts Pro to attach client connection to a claim (new or existing)
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface AttachToClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  clientName: string;
  onSuccess?: (claimId: string) => void;
}

export function AttachToClaimDialog({
  open,
  onOpenChange,
  connectionId,
  clientName,
  onSuccess,
}: AttachToClaimDialogProps) {
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState("");

  // New claim form
  const [propertyAddress, setPropertyAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [damageType, setDamageType] = useState("Storm");
  const [dateOfLoss, setDateOfLoss] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Load existing claims when dialog opens
  useState(() => {
    if (open && mode === "existing" && claims.length === 0) {
      loadClaims();
    }
  });

  async function loadClaims() {
    try {
      const res = await fetch("/api/claims");
      const data = await res.json();

      if (res.ok) {
        setClaims(data.claims || []);
      }
    } catch (error) {
      logger.error("Failed to load claims:", error);
    }
  }

  async function handleSubmit() {
    setLoading(true);

    try {
      const payload: any = {
        connectionId,
      };

      if (mode === "existing") {
        if (!selectedClaimId) {
          toast.error("Please select a claim");
          setLoading(false);
          return;
        }
        payload.claimId = selectedClaimId;
      } else {
        // new claim
        if (!propertyAddress || !dateOfLoss) {
          toast.error("Property address and date of loss are required");
          setLoading(false);
          return;
        }

        payload.createNewClaim = {
          propertyAddress,
          city,
          state,
          zip,
          damageType,
          dateOfLoss,
          notes,
        };
      }

      const res = await fetch("/api/trades/attach-to-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to attach claim");
      }

      toast.success("Client added to claim with portal access!");

      if (onSuccess) {
        onSuccess(data.claimId);
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Claim with {clientName}</DialogTitle>
          <DialogDescription>
            Attach this client to a claim so they can see updates, documents, and messages in their
            portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode selector */}
          <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="cursor-pointer font-normal">
                Create new claim
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing" className="cursor-pointer font-normal">
                Attach to existing claim
              </Label>
            </div>
          </RadioGroup>

          {mode === "existing" && (
            <div className="space-y-3">
              <Label>Select Claim</Label>
              {claims.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Loading claims... or no claims found
                </div>
              ) : (
                <select
                  id="attach-claim"
                  aria-label="Select claim to attach"
                  className="w-full rounded-md border border-border bg-card px-3 py-2"
                  value={selectedClaimId}
                  onChange={(e) => setSelectedClaimId(e.target.value)}
                >
                  <option value="">-- Select a claim --</option>
                  {claims.map((claim: any) => (
                    <option key={claim.id} value={claim.id}>
                      {claim.claimNumber} - {claim.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Property Address *</Label>
                <Input
                  id="address"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Denver"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="CO"
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="80202"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="damageType">Damage Type</Label>
                  <select
                    id="damageType"
                    className="w-full rounded-md border border-border bg-card px-3 py-2"
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                    aria-label="Select damage type"
                  >
                    <option>Storm</option>
                    <option>Hail</option>
                    <option>Wind</option>
                    <option>Fire</option>
                    <option>Water</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="dateOfLoss">Date of Loss *</Label>
                  <Input
                    id="dateOfLoss"
                    type="date"
                    value={dateOfLoss}
                    onChange={(e) => setDateOfLoss(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details about the damage or claim..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Skip for now
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Attaching..." : "Attach to Claim"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
