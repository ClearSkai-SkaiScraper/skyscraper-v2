/**
 * COVER PAGE EDITOR
 * Section 1 of Universal Claims Report
 */

"use client";

import { Check,Save, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect,useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { logger } from "@/lib/logger";

interface CoverPageData {
  contractorLogo?: string;
  contractorName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  website: string;
  heroImage?: string;
  clientName: string;
  propertyAddress: string;
  claimNumber: string;
  dateOfLoss: string;
  inspectorName: string;
  inspectionDate: string;
}

interface CoverPageEditorProps {
  claimId: string;
  initialData?: CoverPageData;
  orgData?: {
    name: string;
    licenseNumber?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
  };
}

export function CoverPageEditor({ claimId, initialData, orgData }: CoverPageEditorProps) {
  const [data, setData] = useState<CoverPageData>(() => {
    if (initialData) return initialData;

    // Auto-populate from org data
    return {
      contractorName: orgData?.name || "",
      licenseNumber: orgData?.licenseNumber || "",
      phone: orgData?.phone || "",
      email: orgData?.email || "",
      website: orgData?.website || "",
      contractorLogo: orgData?.logoUrl || "",
      heroImage: "",
      clientName: "",
      propertyAddress: "",
      claimNumber: "",
      dateOfLoss: "",
      inspectorName: "",
      inspectionDate: new Date().toISOString().split("T")[0],
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Debounce data changes
  const debouncedData = useDebounce(data, 2000);

  // Auto-save on data change
  useEffect(() => {
    if (debouncedData) {
      saveData();
    }
  }, [debouncedData]);

  async function saveData() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "coverPage",
          data,
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      setLastSaved(new Date());
      logger.debug("[COVER_PAGE] Auto-saved");
    } catch (error) {
      logger.error("[COVER_PAGE] Save error:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function updateField(field: keyof CoverPageData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Upload to storage (S3/Cloudinary)
    // For now, use data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      updateField("contractorLogo", event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      updateField("heroImage", event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      {/* Auto-save indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cover Page</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <>
              <Save className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Company Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Company Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              {data.contractorLogo && (
                <div className="relative h-20 w-40 overflow-hidden rounded border">
                  <Image
                    src={data.contractorLogo}
                    alt="Company logo"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractorName">Company Name</Label>
              <Input
                id="contractorName"
                value={data.contractorName}
                onChange={(e) => updateField("contractorName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={data.licenseNumber}
                onChange={(e) => updateField("licenseNumber", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={data.website}
                onChange={(e) => updateField("website", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hero Image */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Image</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Cover Photo</Label>
            <div className="mt-2 flex items-center gap-4">
              {data.heroImage && (
                <div className="relative h-40 w-60 overflow-hidden rounded border">
                  <Image src={data.heroImage} alt="Hero image" fill className="object-cover" />
                </div>
              )}
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Hero Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeroUpload}
                  />
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claim Details */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={data.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="claimNumber">Claim Number</Label>
              <Input
                id="claimNumber"
                value={data.claimNumber}
                onChange={(e) => updateField("claimNumber", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="propertyAddress">Property Address</Label>
              <Input
                id="propertyAddress"
                value={data.propertyAddress}
                onChange={(e) => updateField("propertyAddress", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateOfLoss">Date of Loss</Label>
              <Input
                id="dateOfLoss"
                type="date"
                value={data.dateOfLoss}
                onChange={(e) => updateField("dateOfLoss", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input
                id="inspectionDate"
                type="date"
                value={data.inspectionDate}
                onChange={(e) => updateField("inspectionDate", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="inspectorName">Inspector Name</Label>
              <Input
                id="inspectorName"
                value={data.inspectorName}
                onChange={(e) => updateField("inspectorName", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
