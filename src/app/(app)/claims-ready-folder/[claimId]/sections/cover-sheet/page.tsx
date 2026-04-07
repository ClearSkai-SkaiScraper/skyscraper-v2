// src/app/(app)/claims-ready-folder/[claimId]/sections/cover-sheet/page.tsx
"use client";

import { Building2, Calendar, FileText, Phone, Save, User } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface CoverSheetData {
  propertyAddress: string;
  insured_name: string;
  policyNumber: string;
  dateOfLoss: string;
  claimNumber: string;
  carrier: string;
  contractorName: string;
  contractorLicense: string;
  contractorPhone: string;
  contractorEmail: string;
  preparedBy: string;
}

export default function CoverSheetPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<CoverSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/cover-sheet?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch cover sheet:", err);
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
      await fetch(`/api/claims-folder/sections/cover-sheet`, {
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

  const updateField = (field: keyof CoverSheetData, value: string) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Cover Sheet</h1>
          </div>
          <p className="text-slate-500">Property info, policyholder, and claim details</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 1 of 17</Badge>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Property Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Information
          </CardTitle>
          <CardDescription>Loss location and property details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address</Label>
              <Input
                id="propertyAddress"
                value={data?.propertyAddress || ""}
                onChange={(e) => updateField("propertyAddress", e.target.value)}
                placeholder="123 Main St, Phoenix, AZ 85001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfLoss">Date of Loss</Label>
              <Input
                id="dateOfLoss"
                type="date"
                value={
                  data?.dateOfLoss ? new Date(data.dateOfLoss).toISOString().split("T")[0] : ""
                }
                onChange={(e) => updateField("dateOfLoss", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policyholder Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Policyholder Information
          </CardTitle>
          <CardDescription>Insured party details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="insured_name">Insured Name</Label>
              <Input
                id="insured_name"
                value={data?.insured_name || ""}
                onChange={(e) => updateField("insured_name", e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policyNumber">Policy Number</Label>
              <Input
                id="policyNumber"
                value={data?.policyNumber || ""}
                onChange={(e) => updateField("policyNumber", e.target.value)}
                placeholder="POL-123456"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="claimNumber">Claim Number</Label>
              <Input
                id="claimNumber"
                value={data?.claimNumber || ""}
                onChange={(e) => updateField("claimNumber", e.target.value)}
                placeholder="CLM-2025-001234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Insurance Carrier</Label>
              <Input
                id="carrier"
                value={data?.carrier || ""}
                onChange={(e) => updateField("carrier", e.target.value)}
                placeholder="State Farm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contractor Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contractor Information
          </CardTitle>
          <CardDescription>Your company details for the submission</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contractorName">Company Name</Label>
              <Input
                id="contractorName"
                value={data?.contractorName || ""}
                onChange={(e) => updateField("contractorName", e.target.value)}
                placeholder="ABC Roofing Co."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractorLicense">License Number</Label>
              <Input
                id="contractorLicense"
                value={data?.contractorLicense || ""}
                onChange={(e) => updateField("contractorLicense", e.target.value)}
                placeholder="ROC-123456"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contractorPhone">Phone</Label>
              <Input
                id="contractorPhone"
                type="tel"
                value={data?.contractorPhone || ""}
                onChange={(e) => updateField("contractorPhone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractorEmail">Email</Label>
              <Input
                id="contractorEmail"
                type="email"
                value={data?.contractorEmail || ""}
                onChange={(e) => updateField("contractorEmail", e.target.value)}
                placeholder="contact@abcroofing.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preparedBy">Prepared By</Label>
            <Input
              id="preparedBy"
              value={data?.preparedBy || ""}
              onChange={(e) => updateField("preparedBy", e.target.value)}
              placeholder="Your name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Cover Sheet Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 bg-white p-6 font-mono text-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 text-center text-lg font-bold uppercase tracking-wide">
              Claims Documentation Packet — Cover Sheet
            </div>
            <hr className="my-4" />
            <div className="grid gap-2">
              <div>
                <strong>Property:</strong> {data?.propertyAddress || "—"}
              </div>
              <div>
                <strong>Insured:</strong> {data?.insured_name || "—"}
              </div>
              <div>
                <strong>Policy #:</strong> {data?.policyNumber || "—"}
              </div>
              <div>
                <strong>Claim #:</strong> {data?.claimNumber || "—"}
              </div>
              <div>
                <strong>Carrier:</strong> {data?.carrier || "—"}
              </div>
              <div>
                <strong>Date of Loss:</strong>{" "}
                {data?.dateOfLoss ? new Date(data.dateOfLoss).toLocaleDateString() : "—"}
              </div>
              <hr className="my-2" />
              <div>
                <strong>Contractor:</strong> {data?.contractorName || "—"}
              </div>
              <div>
                <strong>License:</strong> {data?.contractorLicense || "—"}
              </div>
              <div>
                <strong>Phone:</strong> {data?.contractorPhone || "—"}
              </div>
              <div>
                <strong>Email:</strong> {data?.contractorEmail || "—"}
              </div>
              <div>
                <strong>Prepared By:</strong> {data?.preparedBy || "—"}
              </div>
              <div>
                <strong>Generated:</strong> {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
