"use client";

import {
  ArrowLeft,
  Bell,
  Eye,
  FileText,
  Globe,
  Lock,
  MessageSquare,
  Save,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsCustomerPortalPage() {
  const [settings, setSettings] = useState({
    portalEnabled: true,
    clientLoginEnabled: true,
    welcomeMessage:
      "Welcome to your project portal. Here you can view your claim status, documents, and communicate with your project team.",
    documentsVisible: true,
    photosVisible: true,
    estimatesVisible: false,
    invoicesVisible: true,
    timelineVisible: true,
    messagingEnabled: true,
    fileUploadEnabled: true,
    maxUploadSizeMb: 25,
    emailNotifications: true,
    smsNotifications: false,
    statusUpdateNotifications: true,
    documentNotifications: true,
    messageNotifications: true,
    requireApproval: false,
    portalUrl: "",
    customTerms: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/customer-portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Portal settings saved!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string | boolean | number) => {
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
                <Globe className="h-6 w-6 text-primary" />
                Customer Portal
              </h1>
              <p className="text-muted-foreground">
                Configure what homeowners see and can do in their client portal.
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Portal Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Portal Access
            </CardTitle>
            <CardDescription>
              Control who can access the customer portal and how they log in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Enable Customer Portal</p>
                <p className="text-sm text-muted-foreground">
                  Allow homeowners to view their project status online.
                </p>
              </div>
              <Switch
                checked={settings.portalEnabled}
                onCheckedChange={(v) => updateSetting("portalEnabled", v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Client Login</p>
                <p className="text-sm text-muted-foreground">
                  Require clients to sign in to view their portal. If disabled, portal links use a
                  secure token.
                </p>
              </div>
              <Switch
                checked={settings.clientLoginEnabled}
                onCheckedChange={(v) => updateSetting("clientLoginEnabled", v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Require Approval for New Clients</p>
                <p className="text-sm text-muted-foreground">
                  Manually approve each client before they can access the portal.
                </p>
              </div>
              <Switch
                checked={settings.requireApproval}
                onCheckedChange={(v) => updateSetting("requireApproval", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Welcome Message
            </CardTitle>
            <CardDescription>
              Shown to homeowners when they first visit their portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={settings.welcomeMessage}
              onChange={(e) => updateSetting("welcomeMessage", e.target.value)}
              rows={3}
              placeholder="Welcome to your project portal..."
            />
          </CardContent>
        </Card>

        {/* Document Visibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Content Visibility
            </CardTitle>
            <CardDescription>
              Choose what information homeowners can see in their portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                key: "documentsVisible",
                label: "Documents",
                desc: "Contracts, permits, and uploaded files",
                icon: FileText,
              },
              {
                key: "photosVisible",
                label: "Photos",
                desc: "Job site and damage photos",
                icon: Eye,
              },
              {
                key: "estimatesVisible",
                label: "Estimates",
                desc: "Cost estimates and line items",
                icon: FileText,
              },
              {
                key: "invoicesVisible",
                label: "Invoices",
                desc: "Billing and payment records",
                icon: FileText,
              },
              {
                key: "timelineVisible",
                label: "Project Timeline",
                desc: "Milestones and status updates",
                icon: FileText,
              },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={settings[key as keyof typeof settings] as boolean}
                  onCheckedChange={(v) => updateSetting(key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Communication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication
            </CardTitle>
            <CardDescription>Configure messaging and file sharing with homeowners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">In-Portal Messaging</p>
                <p className="text-sm text-muted-foreground">
                  Allow homeowners to send and receive messages through the portal.
                </p>
              </div>
              <Switch
                checked={settings.messagingEnabled}
                onCheckedChange={(v) => updateSetting("messagingEnabled", v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Client File Uploads</p>
                <p className="text-sm text-muted-foreground">
                  Allow homeowners to upload photos and documents.
                </p>
              </div>
              <Switch
                checked={settings.fileUploadEnabled}
                onCheckedChange={(v) => updateSetting("fileUploadEnabled", v)}
              />
            </div>
            {settings.fileUploadEnabled && (
              <div className="space-y-2 border-l-2 pl-4">
                <Label>Max Upload Size (MB)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.maxUploadSizeMb}
                  onChange={(e) => updateSetting("maxUploadSizeMb", parseInt(e.target.value) || 25)}
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Client Notifications
            </CardTitle>
            <CardDescription>
              Configure how homeowners are notified about their project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Send updates via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(v) => updateSetting("emailNotifications", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-xs text-muted-foreground">Send updates via text</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(v) => updateSetting("smsNotifications", v)}
                />
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Notify clients about:</p>
            {[
              {
                key: "statusUpdateNotifications",
                label: "Status Changes",
                desc: "When claim or project status is updated",
              },
              {
                key: "documentNotifications",
                label: "New Documents",
                desc: "When new documents are uploaded or shared",
              },
              {
                key: "messageNotifications",
                label: "New Messages",
                desc: "When a team member sends them a message",
              },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={settings[key as keyof typeof settings] as boolean}
                  onCheckedChange={(v) => updateSetting(key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Custom Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Terms & Legal
            </CardTitle>
            <CardDescription>
              Custom terms of service or legal disclaimers shown to portal users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={settings.customTerms}
              onChange={(e) => updateSetting("customTerms", e.target.value)}
              rows={4}
              placeholder="Enter any custom terms, disclaimers, or legal text that should be displayed to clients in the portal..."
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
