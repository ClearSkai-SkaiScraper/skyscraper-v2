"use client";

import { ArrowLeft, Globe, Image, Mail, Paintbrush, Palette, Save, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsWhiteLabelPage() {
  const [settings, setSettings] = useState({
    companyName: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",
    accentColor: "#f59e0b",
    customDomain: "",
    emailFromName: "",
    emailReplyTo: "",
    emailFooter: "",
    pdfHeaderText: "",
    pdfFooterText: "",
    customCss: "",
    hidePoweredBy: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Branding settings saved!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold">
                <Paintbrush className="h-6 w-6 text-primary" />
                White Label Branding
              </h1>
              <p className="text-muted-foreground">
                Customize the look and feel of your platform to match your brand.
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Logo & Brand Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Brand Assets
            </CardTitle>
            <CardDescription>
              Upload your logo and favicon. These appear in the dashboard, emails, and reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="mx-auto max-h-16" />
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Drag & drop or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, SVG up to 2MB</p>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50">
                  {settings.faviconUrl ? (
                    <img src={settings.faviconUrl} alt="Favicon" className="mx-auto max-h-8" />
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        32×32 or 64×64 recommended
                      </p>
                      <p className="text-xs text-muted-foreground">ICO, PNG up to 500KB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Colors
            </CardTitle>
            <CardDescription>
              Set your brand colors. These are used across the dashboard, emails, and PDF reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting("primaryColor", e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting("primaryColor", e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <Input
                    value={settings.secondaryColor}
                    onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting("accentColor", e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <Input
                    value={settings.accentColor}
                    onChange={(e) => updateSetting("accentColor", e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 rounded-lg border p-4">
              <p className="mb-3 text-sm text-muted-foreground">Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-24 items-center justify-center rounded text-sm font-medium text-white"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Primary
                </div>
                <div
                  className="flex h-10 w-24 items-center justify-center rounded text-sm font-medium text-white"
                  style={{ backgroundColor: settings.secondaryColor }}
                >
                  Secondary
                </div>
                <div
                  className="flex h-10 w-24 items-center justify-center rounded text-sm font-medium text-white"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  Accent
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Custom Domain
            </CardTitle>
            <CardDescription>
              Use your own domain for the client portal and dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Custom Domain</Label>
              <Input
                placeholder="app.yourcompany.com"
                value={settings.customDomain}
                onChange={(e) => updateSetting("customDomain", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Point a CNAME record to{" "}
                <code className="rounded bg-muted px-1">cname.skaiscrape.com</code>
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Hide &quot;Powered by SkaiScraper&quot;</p>
                <p className="text-sm text-muted-foreground">
                  Remove SkaiScraper branding from the client portal footer.
                </p>
              </div>
              <Switch
                checked={settings.hidePoweredBy}
                onCheckedChange={(v) => updateSetting("hidePoweredBy", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Branding
            </CardTitle>
            <CardDescription>
              Customize the sender name, reply-to address, and footer for outgoing emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input
                  placeholder="Your Company Name"
                  value={settings.emailFromName}
                  onChange={(e) => updateSetting("emailFromName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reply-To Email</Label>
                <Input
                  type="email"
                  placeholder="support@yourcompany.com"
                  value={settings.emailReplyTo}
                  onChange={(e) => updateSetting("emailReplyTo", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Footer Text</Label>
              <Textarea
                placeholder="© 2026 Your Company. All rights reserved."
                value={settings.emailFooter}
                onChange={(e) => updateSetting("emailFooter", e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* PDF Report Branding */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Report Branding</CardTitle>
            <CardDescription>
              Customize headers and footers on generated PDF reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>PDF Header Text</Label>
              <Input
                placeholder="Your Company — Professional Storm Restoration"
                value={settings.pdfHeaderText}
                onChange={(e) => updateSetting("pdfHeaderText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>PDF Footer Text</Label>
              <Input
                placeholder="Licensed & Insured · ROC #123456"
                value={settings.pdfFooterText}
                onChange={(e) => updateSetting("pdfFooterText", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
