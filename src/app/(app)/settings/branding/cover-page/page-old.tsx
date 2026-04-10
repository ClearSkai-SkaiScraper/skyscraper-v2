"use client";

import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface CoverPageData {
  companyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  license: string;
  logoUrl: string | null;
  backgroundUrl: string | null;
  colorPrimary: string;
  colorAccent: string;
}

export default function CoverPageBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "background" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<CoverPageData>({
    companyName: "",
    tagline: "Professional Roofing & Restoration Services",
    address: "",
    phone: "",
    email: "",
    website: "",
    license: "",
    logoUrl: null,
    backgroundUrl: null,
    colorPrimary: "#117CFF",
    colorAccent: "#FFC838",
  });

  // Load existing branding data
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const res = await fetch("/api/branding");
        if (res.ok) {
          const branding = await res.json();
          if (branding) {
            setData((prev) => ({
              ...prev,
              companyName: branding.companyName || prev.companyName,
              phone: branding.phone || prev.phone,
              email: branding.email || prev.email,
              website: branding.website || prev.website,
              license: branding.license || prev.license,
              logoUrl: branding.logoUrl || prev.logoUrl,
              backgroundUrl: branding.coverPhotoUrl || prev.backgroundUrl,
              colorPrimary: branding.colorPrimary || prev.colorPrimary,
              colorAccent: branding.colorAccent || prev.colorAccent,
            }));
          }
        }
      } catch (e) {
        logger.error("Failed to load branding:", e);
      } finally {
        setLoading(false);
      }
    };
    void loadBranding();
  }, []);

  const handleInputChange = (field: keyof CoverPageData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (type: "logo" | "background", file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be less than 5MB");
      return;
    }

    setUploading(type);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = type === "logo" ? "/api/branding/upload" : "/api/upload/cover";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      if (type === "logo") {
        setData((prev) => ({ ...prev, logoUrl: url }));
      } else {
        setData((prev) => ({ ...prev, backgroundUrl: url }));
      }
      toast.success(`${type === "logo" ? "Logo" : "Background"} uploaded!`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/branding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.companyName,
          phone: data.phone,
          email: data.email,
          website: data.website,
          license: data.license,
          colorPrimary: data.colorPrimary,
          colorAccent: data.colorAccent,
          logoUrl: data.logoUrl,
          coverPhotoUrl: data.backgroundUrl,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error || `Server error: ${res.status}`;
        logger.error("[CoverPage] Save failed:", errorMsg);
        throw new Error(errorMsg);
      }
      toast.success("Cover page settings saved!");
    } catch (e) {
      logger.error("[CoverPage] Save error:", e);
      toast.error(e?.message || "Failed to save cover page settings");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Generating PDF…");
      const el = document.getElementById("cover-page-preview");
      if (!el) {
        toast.error("Preview not found");
        return;
      }
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("cover-page.pdf");
      toast.success("PDF exported!");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      logger.error("[CoverPage] PDF export error:", e);
      toast.error("Failed to export PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHero
        section="settings"
        title="Cover Page Builder"
        subtitle="Design professional cover pages for your reports and proposals"
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="flex gap-3">
          <Link href="/settings/branding">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Branding
            </Button>
          </Link>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </PageHero>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Editor Panel */}
        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>This information will appear on your cover page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  value={data.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <Label>Tagline</Label>
                <Input
                  value={data.tagline}
                  onChange={(e) => handleInputChange("tagline", e.target.value)}
                  placeholder="Professional Roofing & Restoration"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={data.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={data.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label>License #</Label>
                  <Input
                    value={data.license}
                    onChange={(e) => handleInputChange("license", e.target.value)}
                    placeholder="ROC-123456"
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={data.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="info@company.com"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={data.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="www.company.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Upload your logo and choose colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div>
                <Label>Company Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div
                    className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-500"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {data.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : uploading === "logo" ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    ) : (
                      <Upload className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading === "logo"}
                  >
                    {uploading === "logo" ? "Uploading..." : "Upload Logo"}
                  </Button>
                  <input
                    placeholder="Enter value"
                    title="Input field"
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFileUpload("logo", e.target.files[0])
                    }
                  />
                </div>
              </div>

              {/* Background Upload */}
              <div>
                <Label>Background Image (Optional)</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div
                    className="flex h-24 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-500"
                    onClick={() => bgInputRef.current?.click()}
                  >
                    {data.backgroundUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.backgroundUrl}
                        alt="Background"
                        className="h-full w-full object-cover"
                      />
                    ) : uploading === "background" ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bgInputRef.current?.click()}
                    disabled={uploading === "background"}
                  >
                    {uploading === "background" ? "Uploading..." : "Upload Background"}
                  </Button>
                  <input
                    placeholder="Enter value"
                    title="Input field"
                    ref={bgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFileUpload("background", e.target.files[0])
                    }
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      placeholder="Enter value"
                      title="Input field"
                      type="color"
                      value={data.colorPrimary}
                      onChange={(e) => handleInputChange("colorPrimary", e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded border-0"
                    />
                    <Input
                      value={data.colorPrimary}
                      onChange={(e) => handleInputChange("colorPrimary", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      placeholder="Enter value"
                      title="Input field"
                      type="color"
                      value={data.colorAccent}
                      onChange={(e) => handleInputChange("colorAccent", e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded border-0"
                    />
                    <Input
                      value={data.colorAccent}
                      onChange={(e) => handleInputChange("colorAccent", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <div
                className="relative aspect-[8.5/11] overflow-hidden rounded-lg border shadow-lg"
                style={{
                  background: data.backgroundUrl
                    ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${data.backgroundUrl})`
                    : `linear-gradient(135deg, ${data.colorPrimary}, ${data.colorAccent})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Cover Page Content */}
                <div className="flex h-full flex-col items-center justify-between p-8 text-white">
                  {/* Top - Logo */}
                  <div className="flex flex-col items-center">
                    {data.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.logoUrl}
                        alt="Logo"
                        className="mb-4 h-20 w-auto rounded bg-white/90 p-2"
                      />
                    ) : (
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                        <ImageIcon className="h-10 w-10 text-white/60" />
                      </div>
                    )}
                  </div>

                  {/* Center - Company Name */}
                  <div className="text-center">
                    <h1 className="text-3xl font-bold drop-shadow-lg">
                      {data.companyName || "Your Company Name"}
                    </h1>
                    <p className="mt-2 text-lg opacity-90">
                      {data.tagline || "Professional Services"}
                    </p>
                  </div>

                  {/* Bottom - Contact Info */}
                  <div className="text-center text-sm opacity-80">
                    {data.address && <p>{data.address}</p>}
                    <div className="mt-2 flex flex-wrap justify-center gap-4">
                      {data.phone && <span>📞 {data.phone}</span>}
                      {data.email && <span>✉️ {data.email}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap justify-center gap-4">
                      {data.website && <span>🌐 {data.website}</span>}
                      {data.license && <span>📋 License: {data.license}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
