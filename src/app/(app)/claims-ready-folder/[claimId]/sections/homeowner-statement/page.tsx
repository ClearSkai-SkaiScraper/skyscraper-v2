// src/app/(app)/claims-ready-folder/[claimId]/sections/homeowner-statement/page.tsx
"use client";

import { FileSignature, PenTool, Save, UserCheck } from "lucide-react";
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

interface HomeownerStatementData {
  statementText: string;
  homeownerName: string;
  signedAt?: string;
  ipAddress?: string;
  witnessName?: string;
}

export default function HomeownerStatementPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<HomeownerStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/homeowner-statement?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(
          json.data || {
            statementText: "",
            homeownerName: "",
          }
        );
      }
    } catch (err) {
      logger.error("Failed to fetch homeowner statement:", err);
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
      await fetch(`/api/claims-folder/sections/homeowner-statement`, {
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

  const updateField = <K extends keyof HomeownerStatementData>(
    field: K,
    value: HomeownerStatementData[K]
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

  const defaultStatement = `I, the undersigned homeowner, hereby attest that:

1. The damage described in this claim package occurred as a direct result of the weather event described herein.

2. I have reviewed the scope of work and pricing presented by the contractor and find it to be a fair and accurate representation of the repairs needed.

3. I authorize the contractor named in this document to represent my interests in discussions with my insurance carrier regarding this claim.

4. All information I have provided regarding this claim is true and accurate to the best of my knowledge.

5. I understand that providing false information may result in denial of my claim and potential legal consequences.`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-teal-600" />
            <h1 className="text-2xl font-bold">Homeowner Statement</h1>
          </div>
          <p className="text-slate-500">Digitally signed attestation from the property owner</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 13 of 17</Badge>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Signature Status */}
      {data?.signedAt ? (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <FileSignature className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Statement Signed by {data.homeownerName}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Signed on {new Date(data.signedAt).toLocaleString()}
                {data.ipAddress && ` • IP: ${data.ipAddress}`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <PenTool className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Awaiting Homeowner Signature
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                The statement must be reviewed and signed by the homeowner
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statement Text */}
      <Card>
        <CardHeader>
          <CardTitle>Homeowner Attestation</CardTitle>
          <CardDescription>
            This statement will be included in the claim package and must be signed by the homeowner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data?.statementText || defaultStatement}
            onChange={(e) => updateField("statementText", e.target.value)}
            rows={12}
            className="font-serif leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* Signature Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Signature Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Homeowner Name</Label>
              <Input
                value={data?.homeownerName || ""}
                onChange={(e) => updateField("homeownerName", e.target.value)}
                placeholder="Full legal name"
              />
            </div>
            <div className="space-y-2">
              <Label>Witness Name (optional)</Label>
              <Input
                value={data?.witnessName || ""}
                onChange={(e) => updateField("witnessName", e.target.value)}
                placeholder="Witness name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Signature */}
      {!data?.signedAt && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="font-medium">Ready to collect signature?</p>
              <p className="text-sm text-slate-500">
                Send a secure link to the homeowner for digital signature
              </p>
            </div>
            <Button>
              <PenTool className="mr-2 h-4 w-4" />
              Request Signature
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
