"use client";

import { ArrowRightCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface ConvertToClaimButtonProps {
  leadId: string;
  leadTitle?: string;
  leadDescription?: string;
  isAlreadyConverted?: boolean;
  existingClaimId?: string | null;
}

const LOSS_TYPES = [
  "Wind/Hail",
  "Fire",
  "Water Damage",
  "Theft",
  "Vandalism",
  "Storm Damage",
  "Lightning",
  "Flood",
  "Tree Damage",
  "Vehicle Impact",
  "Other",
];

const COMMON_CARRIERS = [
  "State Farm",
  "Allstate",
  "USAA",
  "Liberty Mutual",
  "Farmers Insurance",
  "Nationwide",
  "Progressive",
  "Travelers",
  "American Family",
  "Other",
];

export function ConvertToClaimButton({
  leadId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  leadTitle,
  leadDescription,
  isAlreadyConverted,
  existingClaimId,
}: ConvertToClaimButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    insuranceCompany: "",
    policyNumber: "",
    dateOfLoss: "",
    typeOfLoss: "",
    description: leadDescription || "",
  });

  const handleConvert = async () => {
    if (!formData.insuranceCompany || !formData.dateOfLoss || !formData.typeOfLoss) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/leads/${leadId}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to convert lead");
      }

      toast.success("Lead converted to claim successfully!");
      setOpen(false);

      // Redirect to the new claim workspace
      router.push(`/claims/${data.claim.id}`);
      router.refresh();
    } catch (error) {
      logger.error("[ConvertToClaimButton] Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to convert lead");
    } finally {
      setIsLoading(false);
    }
  };

  // If already converted, show link to existing claim
  if (isAlreadyConverted && existingClaimId) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push(`/claims/${existingClaimId}`)}
      >
        <ArrowRightCircle className="mr-2 h-4 w-4" />
        View Linked Claim
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ArrowRightCircle className="mr-2 h-4 w-4" />
          Convert to Claim
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert Lead to Insurance Claim</DialogTitle>
          <DialogDescription>
            Create an insurance claim from this lead. The contact and property information will be
            automatically linked.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="insuranceCompany">
              Insurance Company <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.insuranceCompany}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, insuranceCompany: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select carrier..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_CARRIERS.map((carrier) => (
                  <SelectItem key={carrier} value={carrier}>
                    {carrier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.insuranceCompany === "Other" && (
              <Input
                placeholder="Enter carrier name..."
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    insuranceCompany: e.target.value,
                  }))
                }
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="policyNumber">Policy Number</Label>
            <Input
              id="policyNumber"
              placeholder="e.g., POL-123456"
              value={formData.policyNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, policyNumber: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dateOfLoss">
              Date of Loss <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dateOfLoss"
              type="date"
              value={formData.dateOfLoss}
              onChange={(e) => setFormData((prev) => ({ ...prev, dateOfLoss: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="typeOfLoss">
              Type of Loss <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.typeOfLoss}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, typeOfLoss: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select loss type..." />
              </SelectTrigger>
              <SelectContent>
                {LOSS_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the damage..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              "Convert to Claim"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
