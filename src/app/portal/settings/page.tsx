"use client";

import { Bell, Check, Globe, Lock, Settings, Shield, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function PortalSettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load preferences from API
  const loadPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/settings");
      const data = await res.json();
      if (data.ok && data.preferences) {
        setEmailNotifications(data.preferences.emailNotifications ?? true);
        setPushNotifications(data.preferences.pushNotifications ?? true);
        setMarketingEmails(data.preferences.marketingEmails ?? false);
      }
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  // Save preferences to API
  const savePreferences = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/portal/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotifications,
          pushNotifications,
          marketingEmails,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setSaving(false);
    }
  }, [emailNotifications, pushNotifications, marketingEmails]);

  // Auto-save on change after initial load
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(savePreferences, 500);
      return () => clearTimeout(timer);
    }
  }, [emailNotifications, pushNotifications, marketingEmails, loading, savePreferences]);

  return (
    <div className="space-y-8">
      <PortalPageHero
        title="Settings"
        subtitle="Manage your account preferences, notifications, and privacy settings."
        icon={Settings}
        badge="Account Settings"
        gradient="blue"
        stats={[]}
      />

      <div className="mx-auto max-w-3xl space-y-6">
        {saved && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-center text-sm text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
            <Check className="mr-1 inline h-4 w-4" />
            <strong>Saved</strong> — Your preferences have been updated.
          </div>
        )}
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Manage your personal information and profile settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/portal/profile">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose how you receive notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif" className="flex flex-col">
                <span>Email Notifications</span>
                <span className="text-sm text-muted-foreground">Receive updates via email</span>
              </Label>
              <Switch
                id="email-notif"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notif" className="flex flex-col">
                <span>Push Notifications</span>
                <span className="text-sm text-muted-foreground">Browser push notifications</span>
              </Label>
              <Switch
                id="push-notif"
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="marketing" className="flex flex-col">
                <span>Marketing Emails</span>
                <span className="text-sm text-muted-foreground">Product updates and offers</span>
              </Label>
              <Switch
                id="marketing"
                checked={marketingEmails}
                onCheckedChange={setMarketingEmails}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your account is secured through Clerk authentication. To change your password or
              manage two-factor authentication, visit your account settings.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/user" target="_blank" rel="noopener noreferrer">
                <Lock className="mr-2 h-4 w-4" />
                Manage Security
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>Privacy</CardTitle>
                <CardDescription>Control your data and privacy preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your data is stored securely. For questions about data handling, see our{" "}
              <Link href="/privacy" className="text-purple-600 underline hover:text-purple-700">
                Privacy Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
