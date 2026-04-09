"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function EditClaimPage({ params }: { params: { claimId: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    damageType: "",
    dateOfLoss: "",
    carrier: "",
    policyNumber: "",
    lifecycleStage: "",
    status: "",
  });

  // Fetch existing claim data
  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const response = await fetch(`/api/claims/${params.claimId}`);
        if (!response.ok) {
          toast.error("Failed to fetch claim");
          setIsFetching(false);
          return;
        }

        const data = await response.json();
        const claim = data.claim;

        setFormData({
          title: claim.title || "",
          description: claim.description || "",
          damageType: claim.damageType || "",
          dateOfLoss: claim.dateOfLoss ? claim.dateOfLoss.split("T")[0] : "",
          carrier: claim.carrier || "",
          policyNumber: claim.policyNumber || "",
          lifecycleStage: claim.lifecycleStage || "",
          status: claim.status || "",
        });
      } catch (error) {
        logger.error("Error fetching claim:", error);
        toast.error("Failed to load claim data");
      } finally {
        setIsFetching(false);
      }
    };

    void fetchClaim();
  }, [params.claimId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        damageType: formData.damageType || null,
        dateOfLoss: formData.dateOfLoss || null,
        carrier: formData.carrier || null,
        policyNumber: formData.policyNumber || null,
        lifecycleStage: formData.lifecycleStage || null,
        status: formData.status || null,
      };

      const response = await fetch(`/api/claims/${params.claimId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to update claim");
        setIsLoading(false);
        return;
      }

      toast.success("Claim updated successfully! 🎉");
      router.refresh();
      router.push(`/claims/${params.claimId}`);
    } catch (error) {
      logger.error("Error updating claim:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update claim");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isFetching) {
    return (
      <div className="container mx-auto py-6">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="py-10 text-center">
            <p>Loading claim data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Claim</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Claim Title *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="E.g., AZ-HAIL-694297 - Hail Damage"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Detailed damage description..."
                rows={4}
              />
            </div>

            {/* Damage Type and Date of Loss */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="damageType">Damage Type</Label>
                <Select
                  value={formData.damageType}
                  onValueChange={(value) => handleInputChange("damageType", value)}
                >
                  <SelectTrigger id="damageType">
                    <SelectValue placeholder="Select damage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HAIL">Hail</SelectItem>
                    <SelectItem value="WIND">Wind</SelectItem>
                    <SelectItem value="WATER">Water</SelectItem>
                    <SelectItem value="FIRE">Fire</SelectItem>
                    <SelectItem value="STORM">Storm</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateOfLoss">Date of Loss</Label>
                <Input
                  id="dateOfLoss"
                  type="date"
                  value={formData.dateOfLoss}
                  onChange={(e) => handleInputChange("dateOfLoss", e.target.value)}
                />
              </div>
            </div>

            {/* Carrier and Policy Number */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="carrier">Insurance Carrier</Label>
                <Input
                  id="carrier"
                  value={formData.carrier}
                  onChange={(e) => handleInputChange("carrier", e.target.value)}
                  placeholder="E.g., State Farm"
                />
              </div>

              <div>
                <Label htmlFor="policyNumber">Policy Number</Label>
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => handleInputChange("policyNumber", e.target.value)}
                  placeholder="E.g., AZ-POL-123456"
                />
              </div>
            </div>

            {/* Lifecycle Stage and Status */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="lifecycleStage">Lifecycle Stage</Label>
                <Select
                  value={formData.lifecycleStage}
                  onValueChange={(value) => handleInputChange("lifecycleStage", value)}
                >
                  <SelectTrigger id="lifecycleStage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTAKE">Intake</SelectItem>
                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                    <SelectItem value="ESTIMATING">Estimating</SelectItem>
                    <SelectItem value="ADJUSTER_REVIEW">Adjuster Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="SUPPLEMENT">Supplement</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                    <SelectItem value="COMPLETION">Completion</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="DENIED">Denied</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
