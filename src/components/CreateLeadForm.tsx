"use client";

import { logger } from "@/lib/logger";
import { AlertCircle, DollarSign, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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

interface CreateLeadFormProps {
  onSuccess?: () => void;
}

export default function CreateLeadForm({ onSuccess }: CreateLeadFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyZip: "",
    leadSource: "",
    notes: "",
    // NEW: Multi-pipeline fields
    workType: "",
    urgency: "medium",
    budget: "",
    // Job category for pipeline routing
    jobCategory: "lead", // lead, claim, financed, out_of_pocket, repair
  });

  // Auto-detect if this should be a claim or retail job
  const getJobType = (workType: string): string => {
    const insuranceKeywords = [
      "insurance",
      "claim",
      "storm damage",
      "hail damage",
      "wind damage",
      "water damage",
    ];
    const workTypeLower = workType.toLowerCase();

    if (insuranceKeywords.some((keyword) => workTypeLower.includes(keyword))) {
      return "CLAIM";
    }

    if (workType.includes("solar")) return "RETAIL";
    if (
      workType.includes("roof replacement") ||
      workType.includes("siding") ||
      workType.includes("windows")
    )
      return "RETAIL";

    return "RETAIL"; // Default to retail
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Determine job type based on work type
      const jobType = getJobType(formData.workType);

      // Format data to match API expectations
      const payload = {
        title: `${formData.firstName} ${formData.lastName} - ${formData.propertyAddress}`,
        description: formData.notes || `Lead from ${formData.leadSource || "direct"}`,
        source: formData.leadSource || "website",
        stage: "new",
        temperature:
          formData.urgency === "urgent" ? "hot" : formData.urgency === "high" ? "warm" : "cold",
        // NEW: Multi-pipeline fields
        jobType: jobType,
        workType: formData.workType,
        urgency: formData.urgency,
        budget: formData.budget ? parseInt(formData.budget) * 100 : undefined, // Convert to cents
        // Job category for pipeline routing
        jobCategory: formData.jobCategory,
        contactData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          street: formData.propertyAddress,
          city: formData.propertyCity,
          state: formData.propertyState,
          zipCode: formData.propertyZip,
        },
      };

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create lead");
      }

      const data = await response.json();
      const leadId = data.lead?.id || data.id;

      // Route based on job category
      if (onSuccess) {
        onSuccess();
      } else if (formData.jobCategory === "claim") {
        toast.success("🛡️ Insurance claim created — opening claims workspace!");
        router.push(`/leads/${leadId}`);
      } else if (["out_of_pocket", "financed", "repair"].includes(formData.jobCategory)) {
        toast.success("🛒 Retail job created — opening retail workspace!");
        router.push(`/jobs/retail/${leadId}`);
      } else {
        toast.success("📋 Lead created — opening lead detail!");
        router.push(`/leads/${leadId}`);
      }
    } catch (error) {
      logger.error("Error creating lead:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create lead");
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

  // Calculate AI warmth score preview (simple version)
  const calculateWarmthScore = (): number => {
    let score = 50; // Base score

    // Urgency boost
    if (formData.urgency === "urgent") score += 30;
    else if (formData.urgency === "high") score += 20;
    else if (formData.urgency === "medium") score += 10;

    // Budget boost
    const budgetNum = parseInt(formData.budget);
    if (budgetNum > 50000) score += 20;
    else if (budgetNum > 25000) score += 15;
    else if (budgetNum > 10000) score += 10;

    // Work type boost (high-value work)
    if (formData.workType.includes("roof replacement") || formData.workType.includes("solar"))
      score += 10;

    return Math.min(100, score);
  };

  const warmthScore = calculateWarmthScore();
  const detectedJobType = formData.workType ? getJobType(formData.workType) : null;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Create New Lead</CardTitle>
          {detectedJobType && (
            <Badge variant={detectedJobType === "CLAIM" ? "secondary" : "default"}>
              {detectedJobType === "CLAIM" ? "🛡️ Insurance Pipeline" : "🛒 Retail Pipeline"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">
                  First Name<span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">
                  Last Name<span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Property Information</h3>
            <div>
              <Label htmlFor="propertyAddress">
                Property Address<span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                id="propertyAddress"
                required
                value={formData.propertyAddress}
                onChange={(e) => handleInputChange("propertyAddress", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="propertyCity">
                  City<span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="propertyCity"
                  required
                  value={formData.propertyCity}
                  onChange={(e) => handleInputChange("propertyCity", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="propertyState">
                  State<span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="propertyState"
                  required
                  value={formData.propertyState}
                  onChange={(e) => handleInputChange("propertyState", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="propertyZip">
                  ZIP Code<span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="propertyZip"
                  required
                  value={formData.propertyZip}
                  onChange={(e) => handleInputChange("propertyZip", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* NEW: Lead Intelligence */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5 text-yellow-500" />
              Lead Intelligence
            </h3>

            <div>
              <Label htmlFor="workType">
                Work Type / Need<span className="ml-1 text-red-500">*</span>
              </Label>
              <Select
                required
                value={formData.workType}
                onValueChange={(value) => handleInputChange("workType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="What type of work does the customer need?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insurance-help">🛡️ Insurance Help / Storm Damage</SelectItem>
                  <SelectItem value="hail-damage">🛡️ Hail Damage</SelectItem>
                  <SelectItem value="wind-damage">🛡️ Wind Damage</SelectItem>
                  <SelectItem value="roof-replacement">🏠 Roof Replacement (Retail)</SelectItem>
                  <SelectItem value="roof-repair">🔧 Roof Repair</SelectItem>
                  <SelectItem value="siding">🏠 Siding Installation</SelectItem>
                  <SelectItem value="windows">🪟 Window Replacement</SelectItem>
                  <SelectItem value="solar">☀️ Solar Installation</SelectItem>
                  <SelectItem value="hvac">❄️ HVAC Installation</SelectItem>
                  <SelectItem value="full-remodel">🏗️ Full Remodel</SelectItem>
                  <SelectItem value="consultation">💬 Consultation / Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="urgency">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Urgency Level<span className="ml-1 text-red-500">*</span>
                  </div>
                </Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => handleInputChange("urgency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low - No rush</SelectItem>
                    <SelectItem value="medium">🟡 Medium - Next few weeks</SelectItem>
                    <SelectItem value="high">🟠 High - This week</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent - ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="budget">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Estimated Budget
                  </div>
                </Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="e.g., 15000"
                  value={formData.budget}
                  onChange={(e) => handleInputChange("budget", e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">Optional - helps with qualification</p>
              </div>
            </div>

            {/* Warmth Score Preview */}
            {formData.workType && (
              <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" id="warmth-label">
                    AI Warmth Score
                  </span>
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line react/forbid-dom-props, jsx-a11y/role-has-required-aria-props, jsx-a11y/aria-proptypes */}
                    <div
                      className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700"
                      role="progressbar"
                      aria-label="AI Warmth Score"
                      aria-valuenow={Number(warmthScore)}
                      aria-valuemin={Number(0)}
                      aria-valuemax={Number(100)}
                    >
                      {/* eslint-disable-next-line react/forbid-dom-props */}
                      <div
                        className={`h-2 rounded-full transition-all ${
                          warmthScore >= 70
                            ? "bg-green-500"
                            : warmthScore >= 50
                              ? "bg-yellow-500"
                              : "bg-orange-500"
                        }`}
                        style={{ width: `${warmthScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold">{warmthScore}/100</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {warmthScore >= 70 && "🔥 Hot lead - High priority follow-up recommended"}
                  {warmthScore >= 50 && warmthScore < 70 && "🌟 Warm lead - Good potential"}
                  {warmthScore < 50 && "❄️ Cold lead - Nurture recommended"}
                </p>
              </div>
            )}
          </div>

          {/* Lead Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lead Details</h3>

            {/* Job Category - Pipeline Routing */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <Label htmlFor="jobCategory" className="text-base font-semibold">
                📁 Route to Pipeline<span className="ml-1 text-red-500">*</span>
              </Label>
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                Choose where this job belongs in your workflow
              </p>
              <Select
                value={formData.jobCategory}
                onValueChange={(value) => handleInputChange("jobCategory", value)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900">
                  <SelectValue placeholder="Select job category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">📋 Lead (Stay in sales pipeline)</SelectItem>
                  <SelectItem value="claim">🛡️ Insurance Claim</SelectItem>
                  <SelectItem value="financed">💳 Financed Job</SelectItem>
                  <SelectItem value="out_of_pocket">💵 Out of Pocket / Retail</SelectItem>
                  <SelectItem value="repair">🔧 Repair Job</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="leadSource">Lead Source</Label>
              <Select onValueChange={(value) => handleInputChange("leadSource", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portal">Client Portal</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="google-ads">Google Ads</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="cold-call">Cold Call</SelectItem>
                  <SelectItem value="door-to-door">Door to Door</SelectItem>
                  <SelectItem value="canvassing">Canvassing</SelectItem>
                  <SelectItem value="trade-show">Trade Show</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Initial Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any additional information about this lead..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
