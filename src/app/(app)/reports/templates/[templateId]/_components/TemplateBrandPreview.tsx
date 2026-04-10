"use client";

import { report_templates } from "@prisma/client";
import { Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TemplateBrandPreviewProps {
  template: report_templates;
  onBrandingUpdate: (branding: any) => void;
}

export function TemplateBrandPreview({ template, onBrandingUpdate }: TemplateBrandPreviewProps) {
  // Note: brandingConfig doesn't exist on report_templates; use defaults as fallback
  let brandingConfig: any = {};
  try {
    const defaults = template.defaults as any;
    brandingConfig = defaults?.branding || {
      logoUrl: null,
      primaryColor: "#117CFF",
      secondaryColor: "#64748b",
    };
  } catch {
    brandingConfig = {
      logoUrl: null,
      primaryColor: "#117CFF",
      secondaryColor: "#64748b",
    };
  }

  const [logoUrl, setLogoUrl] = useState(brandingConfig.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(brandingConfig.primaryColor || "#117CFF");
  const [secondaryColor, setSecondaryColor] = useState(brandingConfig.secondaryColor || "#64748b");

  const handleApplyBranding = () => {
    onBrandingUpdate({
      logoUrl: logoUrl || null,
      primaryColor,
      secondaryColor,
    });
  };

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">Branding</h3>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label htmlFor="logo">Company Logo</Label>
          <div className="flex gap-2">
            <Input
              id="logo"
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          {logoUrl && (
            <div className="mt-2 rounded-lg border border-[color:var(--border)] bg-white p-2">
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo preview" className="h-12 object-contain" />
            </div>
          )}
        </div>

        {/* Primary Color */}
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Color</Label>
          <div className="flex gap-2">
            <Input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-20"
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#117CFF"
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div className="space-y-2">
          <Label htmlFor="secondaryColor">Secondary Color</Label>
          <div className="flex gap-2">
            <Input
              id="secondaryColor"
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-10 w-20"
            />
            <Input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#64748b"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div
            className="space-y-4 rounded-lg border-2 p-6"
            {...{ style: { borderColor: primaryColor, backgroundColor: `${primaryColor}08` } }}
          >
            {logoUrl && (
              <div className="mb-4 flex justify-center">
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
              </div>
            )}

            <div>
              <h4 className="mb-2 text-xl font-bold" {...{ style: { color: primaryColor } }}>
                Report Title
              </h4>
              <p className="text-sm" {...{ style: { color: secondaryColor } }}>
                Property Address • Date
              </p>
            </div>

            <div className="h-20 rounded" {...{ style: { backgroundColor: primaryColor } }}>
              <div className="p-4">
                <p className="font-semibold text-white">Section Header</p>
              </div>
            </div>

            <div className="space-y-2">
              <div
                className="h-2 rounded"
                {...{ style: { backgroundColor: secondaryColor, opacity: 0.3 } }}
              />
              <div
                className="h-2 w-3/4 rounded"
                {...{ style: { backgroundColor: secondaryColor, opacity: 0.2 } }}
              />
              <div
                className="h-2 w-1/2 rounded"
                {...{ style: { backgroundColor: secondaryColor, opacity: 0.1 } }}
              />
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <Button onClick={handleApplyBranding} className="w-full">
          Apply Branding
        </Button>
      </div>
    </div>
  );
}
