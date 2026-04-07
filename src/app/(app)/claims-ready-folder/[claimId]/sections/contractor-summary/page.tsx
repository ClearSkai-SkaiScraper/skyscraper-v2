// src/app/(app)/claims-ready-folder/[claimId]/sections/contractor-summary/page.tsx
"use client";

import { Building2, HardHat, Save, Shield } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface ContractorSummaryData {
  companyName: string;
  contactName: string;
  license: string;
  phone: string;
  email: string;
  whyReplacementRequired: string;
  scopeOverview: string;
  complianceNeeds: string[];
  safetyIssues: string[];
  matchingConcerns: string[];
  estimatedDuration: string;
  warrantyOffered: string;
}

export default function ContractorSummaryPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<ContractorSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/contractor-summary?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch contractor summary:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!data || !claimId) return;
    setSaving(true);
    try {
      await fetch(`/api/claims-folder/sections/contractor-summary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, data }),
      });
    } catch (err) {
      logger.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof ContractorSummaryData>(
    field: K,
    value: ContractorSummaryData[K]
  ) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-yellow-600" />
            <h1 className="text-2xl font-bold">Contractor Summary</h1>
          </div>
          <p className="text-slate-500">Why replacement, compliance needs, and scope overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 11 of 17</Badge>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={data?.companyName || ""}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={data?.contactName || ""}
                onChange={(e) => updateField("contactName", e.target.value)}
                placeholder="Primary Contact"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input
                value={data?.license || ""}
                onChange={(e) => updateField("license", e.target.value)}
                placeholder="ROC-123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={data?.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={data?.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replacement Justification */}
      <Card>
        <CardHeader>
          <CardTitle>Why Replacement is Required</CardTitle>
          <CardDescription>Professional explanation for full system replacement</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data?.whyReplacementRequired || ""}
            onChange={(e) => updateField("whyReplacementRequired", e.target.value)}
            rows={6}
            placeholder="Explain why a full roof replacement is necessary rather than repairs..."
          />
        </CardContent>
      </Card>

      {/* Scope Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Scope Overview</CardTitle>
          <CardDescription>Summary of the work to be performed</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data?.scopeOverview || ""}
            onChange={(e) => updateField("scopeOverview", e.target.value)}
            rows={6}
            placeholder="Describe the scope of work including materials, labor, and any special requirements..."
          />
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Estimated Duration</Label>
              <Input
                value={data?.estimatedDuration || ""}
                onChange={(e) => updateField("estimatedDuration", e.target.value)}
                placeholder="3-5 business days"
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty Offered</Label>
              <Input
                value={data?.warrantyOffered || ""}
                onChange={(e) => updateField("warrantyOffered", e.target.value)}
                placeholder="10-year workmanship, 30-year manufacturer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance & Safety */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Compliance Needs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.complianceNeeds && data.complianceNeeds.length > 0 ? (
              <ul className="space-y-2">
                {data.complianceNeeds.map((need, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>{need}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No specific compliance needs documented.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">Safety Issues</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.safetyIssues && data.safetyIssues.length > 0 ? (
              <ul className="space-y-2">
                {data.safetyIssues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No safety issues documented.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
