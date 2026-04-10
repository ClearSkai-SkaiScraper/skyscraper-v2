"use client";

import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import CoverPageCanvas, { type CanvasElement } from "@/components/cover-page/CoverPageCanvas";
import { ImageLibraryCard } from "@/components/cover-page/ImageLibraryCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface BrandingData {
  companyName?: string;
  phone?: string;
  email?: string;
  website?: string;
  license?: string;
  logoUrl?: string | null;
  teamPhotoUrl?: string | null;
  coverPhotoUrl?: string | null;
  colorPrimary?: string;
  colorAccent?: string;
}

interface CoverPageState {
  elements: CanvasElement[];
  backgroundColor: string;
  backgroundImage: string | null;
}

// Default cover page template
const DEFAULT_ELEMENTS: CanvasElement[] = [
  {
    id: "company-name",
    type: "text",
    x: 10,
    y: 40,
    width: 80,
    height: 15,
    zIndex: 2,
    text: "Your Company Name",
    fontSize: 48,
    fontFamily: "Montserrat",
    fontWeight: "bold",
    textAlign: "center",
    color: "#ffffff",
  },
  {
    id: "tagline",
    type: "text",
    x: 15,
    y: 55,
    width: 70,
    height: 8,
    zIndex: 2,
    text: "Professional Roofing & Restoration Services",
    fontSize: 20,
    fontFamily: "Inter",
    fontWeight: "normal",
    textAlign: "center",
    color: "#ffffff",
  },
  {
    id: "contact-info",
    type: "text",
    x: 20,
    y: 85,
    width: 60,
    height: 10,
    zIndex: 2,
    text: "📞 (555) 123-4567  |  ✉️ info@company.com",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "normal",
    textAlign: "center",
    color: "#ffffff",
  },
];

export default function AdvancedCoverPageBuilder() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<BrandingData | null>(null);

  // Canvas state
  const [elements, setElements] = useState<CanvasElement[]>(DEFAULT_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#117CFF");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // File upload refs
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Load existing branding and cover page state
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load branding
        const brandingRes = await fetch("/api/branding");
        if (brandingRes.ok) {
          const data = await brandingRes.json();
          setBranding(data);

          // Apply branding colors
          if (data?.colorPrimary) setBackgroundColor(data.colorPrimary);
          if (data?.coverPhotoUrl) setBackgroundImage(data.coverPhotoUrl);

          // Update default elements with branding data
          setElements((prev) =>
            prev.map((el) => {
              if (el.id === "company-name" && data?.companyName) {
                return { ...el, text: data.companyName };
              }
              if (el.id === "contact-info") {
                const parts: string[] = [];
                if (data?.phone) parts.push(`📞 ${data.phone}`);
                if (data?.email) parts.push(`✉️ ${data.email}`);
                if (parts.length > 0) {
                  return { ...el, text: parts.join("  |  ") };
                }
              }
              return el;
            })
          );
        }

        // Load saved cover page state
        const coverRes = await fetch("/api/branding/cover-page");
        if (coverRes.ok) {
          const coverData = await coverRes.json();
          if (coverData?.elements?.length > 0) {
            setElements(coverData.elements);
          }
          if (coverData?.backgroundColor) {
            setBackgroundColor(coverData.backgroundColor);
          }
          if (coverData?.backgroundImage) {
            setBackgroundImage(coverData.backgroundImage);
          }
        }
      } catch (e) {
        logger.error("[CoverPageBuilder] Failed to load data:", e);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  // Handle background image upload
  const handleBgUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/cover", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      setBackgroundImage(url);
      toast.success("Background uploaded!");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (__e) {
      toast.error("Failed to upload background");
    } finally {
      setUploading(false);
    }
  };

  // Save cover page state
  const handleSave = async () => {
    setSaving(true);
    try {
      const state: CoverPageState = {
        elements,
        backgroundColor,
        backgroundImage,
      };

      const res = await fetch("/api/branding/cover-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "Failed to save");
      }

      toast.success("Cover page saved!");
    } catch (e: unknown) {
      logger.error("[CoverPageBuilder] Save error:", e);
      const msg = e instanceof Error ? e.message : "Failed to save cover page";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    if (!confirm("Reset to default template? This will remove all your customizations.")) {
      return;
    }

    setElements(DEFAULT_ELEMENTS);
    setBackgroundColor("#117CFF");
    setBackgroundImage(null);
    setSelectedId(null);

    // Reapply branding
    if (branding) {
      if (branding.colorPrimary) setBackgroundColor(branding.colorPrimary);

      setElements((prev) =>
        prev.map((el) => {
          if (el.id === "company-name" && branding?.companyName) {
            return { ...el, text: branding.companyName };
          }
          if (el.id === "contact-info") {
            const parts: string[] = [];
            if (branding?.phone) parts.push(`📞 ${branding.phone}`);
            if (branding?.email) parts.push(`✉️ ${branding.email}`);
            if (parts.length > 0) {
              return { ...el, text: parts.join("  |  ") };
            }
          }
          return el;
        })
      );
    }

    toast.success("Reset to default template");
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      toast.info("Generating PDF…");
      const el = document.getElementById("cover-page-canvas-wrapper");
      if (!el) {
        toast.error("Canvas not found");
        return;
      }

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(
        el.querySelector(".aspect-\\[8\\.5\\/11\\]") as HTMLElement,
        {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        }
      );

      const imgData = canvas.toDataURL("image/png");

      // Letter size in pixels at 72 DPI
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: "letter",
      });

      // Add image scaled to fit page
      pdf.addImage(imgData, "PNG", 0, 0, 8.5, 11);
      pdf.save("cover-page.pdf");

      toast.success("PDF exported!");
    } catch (e: unknown) {
      logger.error("[CoverPageBuilder] PDF export error:", e);
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
    <PageContainer maxWidth="full">
      <PageHero
        section="settings"
        title="Cover Page Designer"
        subtitle="Drag and drop elements to create your perfect cover page"
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="flex gap-3">
          <Link href="/settings/branding">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
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

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Main Canvas Area */}
        <div id="cover-page-canvas-wrapper">
          <CoverPageCanvas
            elements={elements}
            onElementsChange={setElements}
            backgroundColor={backgroundColor}
            backgroundImage={backgroundImage}
            selectedId={selectedId}
            onSelectElement={setSelectedId}
            brandingAssets={{
              logoUrl: branding?.logoUrl,
              teamPhotoUrl: branding?.teamPhotoUrl,
              colorPrimary: branding?.colorPrimary,
              colorAccent: branding?.colorAccent,
            }}
          />
        </div>

        {/* Right Sidebar - Background & Assets */}
        <div className="space-y-4">
          {/* Background Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="color">
                <TabsList className="w-full">
                  <TabsTrigger value="color" className="flex-1">
                    Color
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex-1">
                    Image
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="color" className="mt-4 space-y-3">
                  <div>
                    <Label className="text-xs">Background Color</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => {
                          setBackgroundColor(e.target.value);
                          setBackgroundImage(null);
                        }}
                        className="h-10 w-10 cursor-pointer rounded border-0"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => {
                          setBackgroundColor(e.target.value);
                          setBackgroundImage(null);
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Quick color presets */}
                  <div>
                    <Label className="text-xs">Presets</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        // Blues
                        "#117CFF",
                        "#1e40af",
                        "#0ea5e9",
                        "#0891b2",
                        "#06b6d4",
                        // Greens
                        "#059669",
                        "#10b981",
                        "#22c55e",
                        "#16a34a",
                        // Reds/Oranges
                        "#dc2626",
                        "#ef4444",
                        "#f97316",
                        "#ea580c",
                        "#f59e0b",
                        // Purples/Pinks
                        "#7c3aed",
                        "#8b5cf6",
                        "#a855f7",
                        "#d946ef",
                        "#ec4899",
                        // Neutrals
                        "#1f2937",
                        "#374151",
                        "#4b5563",
                        "#64748b",
                        "#0f172a",
                        // Brand colors (if set)
                        ...(branding?.colorPrimary ? [branding.colorPrimary] : []),
                        ...(branding?.colorAccent ? [branding.colorAccent] : []),
                      ].map((color) => (
                        <button
                          key={color}
                          className="h-8 w-8 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setBackgroundColor(color);
                            setBackgroundImage(null);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="image" className="mt-4 space-y-3">
                  <div
                    className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:bg-slate-800"
                    onClick={() => bgInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    ) : backgroundImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={backgroundImage}
                        alt="Background"
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-slate-400" />
                        <span className="text-sm text-slate-500">Click to upload</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={bgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleBgUpload(e.target.files[0])}
                  />
                  {backgroundImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setBackgroundImage(null)}
                    >
                      Remove Background Image
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Saved Branding Assets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4" />
                Your Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {branding?.logoUrl && (
                <div>
                  <Label className="text-xs">Company Logo</Label>
                  // eslint-disable-next-line react/jsx-no-comment-textnodes
                  <div className="mt-2 flex items-center gap-3">
                    // eslint-disable-next-line react/jsx-no-comment-textnodes
                    <div className="h-16 w-16 overflow-hidden rounded-lg border bg-white p-2">
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={branding.logoUrl}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setElements((prev) => [
                          ...prev,
                          {
                            id: `logo-${Date.now()}`,
                            type: "logo",
                            x: 35,
                            y: 5,
                            width: 30,
                            height: 15,
                            zIndex: prev.length,
                            src: branding.logoUrl!,
                            objectFit: "contain",
                          },
                        ]);
                        toast.success("Logo added to canvas");
                      }}
                    >
                      Add to Canvas
                    </Button>
                  </div>
                </div>
              )}

              {branding?.teamPhotoUrl && (
                <div>
                  <Label className="text-xs">Team Photo</Label>
                  // eslint-disable-next-line react/jsx-no-comment-textnodes
                  <div className="mt-2 flex items-center gap-3">
                    // eslint-disable-next-line react/jsx-no-comment-textnodes
                    <div className="h-16 w-20 overflow-hidden rounded-lg border">
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={branding.teamPhotoUrl}
                        alt="Team"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setElements((prev) => [
                          ...prev,
                          {
                            id: `team-${Date.now()}`,
                            type: "image",
                            x: 25,
                            y: 65,
                            width: 50,
                            height: 25,
                            zIndex: prev.length,
                            src: branding.teamPhotoUrl!,
                            objectFit: "cover",
                          },
                        ]);
                        toast.success("Team photo added to canvas");
                      }}
                    >
                      Add to Canvas
                    </Button>
                  </div>
                </div>
              )}

              {!branding?.logoUrl && !branding?.teamPhotoUrl && (
                <p className="text-center text-sm text-slate-500">
                  No branding assets found.{" "}
                  <Link href="/settings/branding" className="text-blue-600 hover:underline">
                    Upload some
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Image Library */}
          <ImageLibraryCard
            onSelectImage={(url) => {
              setElements((prev) => [
                ...prev,
                {
                  id: `img-${Date.now()}`,
                  type: "image",
                  x: 25,
                  y: 30,
                  width: 50,
                  height: 30,
                  zIndex: prev.length,
                  src: url,
                  objectFit: "cover",
                },
              ]);
              toast.success("Image added to canvas");
            }}
            onSelectAsBackground={(url) => {
              setBackgroundImage(url);
              toast.success("Background image set");
            }}
          />

          {/* Help */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-xs text-slate-500">
                <p className="font-medium text-slate-700 dark:text-slate-300">Tips:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Click an element to select it</li>
                  <li>Drag elements to reposition</li>
                  <li>Drag corners to resize</li>
                  <li>Use the toolbar to add new elements</li>
                  <li>Click outside to deselect</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
