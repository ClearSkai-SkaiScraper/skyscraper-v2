// src/app/(app)/claims-ready-folder/[claimId]/sections/adjuster-cover-letter/page.tsx
"use client";

import { Loader2, Mail, Save, Sparkles } from "lucide-react";
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

interface CoverLetterData {
  adjusterName: string;
  carrierName: string;
  claimNumber: string;
  dateOfLoss: string;
  propertyAddress: string;
  letterBody: string;
  attachmentsList: string[];
  senderName: string;
  senderTitle: string;
}

export default function AdjusterCoverLetterPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<CoverLetterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claims-folder/sections/adjuster-cover-letter?claimId=${claimId}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch cover letter:", err);
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
      await fetch(`/api/claims-folder/sections/adjuster-cover-letter`, {
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

  const handleGenerate = async () => {
    if (!claimId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/claims-folder/generate/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to generate:", err);
    } finally {
      setGenerating(false);
    }
  };

  const updateField = <K extends keyof CoverLetterData>(field: K, value: CoverLetterData[K]) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-rose-600" />
            <h1 className="text-2xl font-bold">Adjuster Cover Letter</h1>
          </div>
          <p className="text-slate-500">Professional introduction letter for carrier submission</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 14 of 17</Badge>
          <Button onClick={handleGenerate} disabled={generating} variant="outline">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {data?.letterBody ? "Regenerate" : "Generate"}
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Recipient Info */}
      <Card>
        <CardHeader>
          <CardTitle>Recipient Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Adjuster Name</Label>
              <Input
                value={data?.adjusterName || ""}
                onChange={(e) => updateField("adjusterName", e.target.value)}
                placeholder="Claims Adjuster Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Insurance Carrier</Label>
              <Input
                value={data?.carrierName || ""}
                onChange={(e) => updateField("carrierName", e.target.value)}
                placeholder="Carrier Name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claim Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Claim Number</Label>
              <Input
                value={data?.claimNumber || ""}
                onChange={(e) => updateField("claimNumber", e.target.value)}
                placeholder="Claim #"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Loss</Label>
              <Input
                type="date"
                value={
                  data?.dateOfLoss ? new Date(data.dateOfLoss).toISOString().split("T")[0] : ""
                }
                onChange={(e) => updateField("dateOfLoss", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Property Address</Label>
              <Input
                value={data?.propertyAddress || ""}
                onChange={(e) => updateField("propertyAddress", e.target.value)}
                placeholder="Property Address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Letter Body */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Letter Content
          </CardTitle>
          <CardDescription>
            AI-generated professional cover letter for the claims package
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.letterBody ? (
            <Textarea
              value={data.letterBody}
              onChange={(e) => updateField("letterBody", e.target.value)}
              rows={15}
              className="font-serif leading-relaxed"
            />
          ) : (
            <div className="py-12 text-center">
              <Mail className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-medium">Generate Cover Letter</h3>
              <p className="mb-4 max-w-md text-slate-500">
                AI will create a professional cover letter summarizing your claims package and
                highlighting key evidence for the adjuster.
              </p>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sender Info */}
      <Card>
        <CardHeader>
          <CardTitle>Sender Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input
                value={data?.senderName || ""}
                onChange={(e) => updateField("senderName", e.target.value)}
                placeholder="Your Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Your Title</Label>
              <Input
                value={data?.senderTitle || ""}
                onChange={(e) => updateField("senderTitle", e.target.value)}
                placeholder="Project Manager"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments List */}
      {data?.attachmentsList && data.attachmentsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments Referenced</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {data.attachmentsList.map((attachment, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {attachment}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
