"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  Laptop,
  Lock,
  LogOut,
  Shield,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface LoginEvent {
  id: string;
  action: string;
  device: string;
  location: string;
  timestamp: string;
  success: boolean;
}

export default function SettingsSecurityPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sessionTimeout, setSessionTimeout] = useState("24h");
  const [showApiKey, setShowApiKey] = useState(false);

  // Mock sessions — in production, fetch from Clerk
  const sessions: Session[] = [
    {
      id: "1",
      device: "MacBook Pro",
      browser: "Chrome 122",
      location: "Phoenix, AZ",
      lastActive: "Active now",
      isCurrent: true,
    },
    {
      id: "2",
      device: "iPhone 15",
      browser: "Safari",
      location: "Phoenix, AZ",
      lastActive: "2 hours ago",
      isCurrent: false,
    },
  ];

  const loginHistory: LoginEvent[] = [
    {
      id: "1",
      action: "Sign in",
      device: "Chrome / macOS",
      location: "Phoenix, AZ",
      timestamp: new Date().toISOString(),
      success: true,
    },
    {
      id: "2",
      action: "Sign in",
      device: "Safari / iOS",
      location: "Phoenix, AZ",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      success: true,
    },
    {
      id: "3",
      action: "Failed sign in",
      device: "Firefox / Windows",
      location: "Unknown",
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      success: false,
    },
  ];

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Coming Soon Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Preview Mode</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Security settings are currently in preview. Session management and MFA are managed
                through your Clerk account. Full integration is coming soon.
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Shield className="h-6 w-6 text-primary" />
              Security Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account security, sessions, and authentication preferences.
            </p>
          </div>
        </div>

        {/* Password & MFA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password & Authentication
            </CardTitle>
            <CardDescription>
              Manage your password and multi-factor authentication settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  Last changed 30+ days ago. Consider updating regularly.
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <Fingerprint className="h-4 w-4" />
                  Two-Factor Authentication (2FA)
                </p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security with authenticator app or SMS verification.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={mfaEnabled ? "default" : "secondary"}>
                  {mfaEnabled ? "Enabled" : "Disabled"}
                </Badge>
                <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
              </div>
            </div>

            {mfaEnabled && (
              <div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <ShieldCheck className="h-5 w-5" />
                  <p className="font-medium">2FA is active</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your account is protected with multi-factor authentication.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Devices currently signed in to your account. Revoke access to any device you
              don&apos;t recognize.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  {session.device.includes("iPhone") ? (
                    <Smartphone className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Laptop className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {session.device} — {session.browser}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                </div>
                {session.isCurrent ? (
                  <Badge variant="default" className="bg-green-600">
                    Current
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm">
                    <LogOut className="mr-1 h-4 w-4" />
                    Revoke
                  </Button>
                )}
              </div>
            ))}
            <Button variant="destructive" size="sm" className="mt-2">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out All Other Sessions
            </Button>
          </CardContent>
        </Card>

        {/* Login History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Login Activity
            </CardTitle>
            <CardDescription>
              Recent sign-in activity on your account. Review for any suspicious access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loginHistory.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        event.success ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{event.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.device} · {event.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={event.success ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {event.success ? "Success" : "Failed"}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleDateString()} at{" "}
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>Manage API keys for integrations and automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Production API Key</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                    {showApiKey ? "sk_live_abc123...xyz789" : "sk_live_••••••••••••••••"}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
