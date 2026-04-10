"use client";

import { FileText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
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
import { ClaimGenerateSchema, formatZodError } from "@/lib/validation/schemas";

export default function ClaimsGeneratePage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    claimNumber: "",
    policyNumber: "",
    carrier: "",
    propertyAddress: "",
    city: "",
    state: "",
    zipCode: "",
    damageType: "HAIL",
    dateOfLoss: "",
    description: "",
    estimatedValue: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      // Validate form data with Zod
      const validatedData = ClaimGenerateSchema.parse(formData);

      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          claimNumber: validatedData.claimNumber,
          policyNumber: validatedData.policyNumber,
          carrier: validatedData.carrier,
          damageType: validatedData.damageType,
          dateOfLoss: validatedData.dateOfLoss ? new Date(validatedData.dateOfLoss) : undefined,
          description: validatedData.description,
          estimatedValueCents: validatedData.estimatedValue
            ? Math.round((parseFloat(validatedData.estimatedValue) || 0) * 100) || undefined
            : undefined,
          propertyData: {
            street: validatedData.propertyAddress,
            city: validatedData.city,
            state: validatedData.state,
            zipCode: validatedData.zipCode,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create claim");
      }

      const { claim } = await response.json();
      toast.success("Claim created successfully! 🎉");
      router.push(`/claims/${claim.id}`);
    } catch (error) {
      logger.error("Error creating claim:", error);
      // Handle Zod validation errors
      if (error && typeof error === "object" && "errors" in error) {
        toast.error(formatZodError(error as any));
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to create claim");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <PageHero
        title="Generate Insurance Claim"
        subtitle="Create a new AI-powered insurance claim proposal"
        icon={<FileText className="h-5 w-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Claim Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Claim Details */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="claimNumber">Claim Number</Label>
                <Input
                  id="claimNumber"
                  placeholder="CLM-2024-001"
                  value={formData.claimNumber}
                  onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="policyNumber">Policy Number</Label>
                <Input
                  id="policyNumber"
                  placeholder="POL-123456"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carrier">Insurance Carrier</Label>
                <Input
                  id="carrier"
                  placeholder="State Farm, Allstate, etc."
                  value={formData.carrier}
                  onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="damageType">Damage Type *</Label>
                <Select
                  value={formData.damageType}
                  onValueChange={(value) => setFormData({ ...formData, damageType: value })}
                >
                  <SelectTrigger id="damageType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HAIL">Hail</SelectItem>
                    <SelectItem value="WIND">Wind</SelectItem>
                    <SelectItem value="FIRE">Fire</SelectItem>
                    <SelectItem value="WATER">Water</SelectItem>
                    <SelectItem value="STORM">Storm</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfLoss">Date of Loss</Label>
                <Input
                  id="dateOfLoss"
                  type="date"
                  value={formData.dateOfLoss}
                  onChange={(e) => setFormData({ ...formData, dateOfLoss: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  step="0.01"
                  placeholder="15000.00"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                />
              </div>
            </div>

            {/* Property Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">Property Address *</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="propertyAddress">Street Address</Label>
                  <Input
                    id="propertyAddress"
                    placeholder="123 Main St"
                    value={formData.propertyAddress}
                    onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Austin"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="TX"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value.toUpperCase() })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="78701"
                    maxLength={10}
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the damage and any relevant details..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Claim
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-blue-600" />
            <div className="text-sm text-blue-900">
              <p className="mb-1 font-semibold">AI-Powered Features Coming Next:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Automated damage assessment from photos</li>
                <li>Building code citations and compliance checks</li>
                <li>Date of loss weather verification</li>
                <li>Carrier-specific formatting and requirements</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
