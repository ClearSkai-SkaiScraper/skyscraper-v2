"use client";

/**
 * ═══════════════════════════════════════════════════════════════════
 * ONBOARDING WIZARD — 5-Step Guided Setup
 * ═══════════════════════════════════════════════════════════════════
 *
 * Step 1: Company Profile (name, phone, email, license, service area)
 * Step 2: Branding (logo, primary color, tagline)
 * Step 3: Invite Team (email + role, skip allowed)
 * Step 4: First Claim (create or load sample data)
 * Step 5: Completion + Dashboard Tour
 */

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CloudLightning,
  Loader2,
  Mail,
  Palette,
  PartyPopper,
  Rocket,
  SkipForward,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Step Labels ─────────────────────────────────────────────────────
const STEP_LABELS = ["Company", "Branding", "Team", "First Claim", "Done!"];
const TOTAL_STEPS = 5;

// ── Types ───────────────────────────────────────────────────────────
interface TeamInvite {
  email: string;
  role: string;
}

// ═══════════════════════════════════════════════════════════════════
// STEP 1 — Company Profile
// ═══════════════════════════════════════════════════════════════════
function StepCompanyProfile({
  onNext,
  data,
  setData,
}: {
  onNext: () => void;
  data: Record<string, string>;
  setData: (d: Record<string, string>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!data.companyName?.trim()) {
      setError("Company name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Save company profile via bootstrap (creates org if needed)
      const res = await fetch("/api/org/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName: data.companyName.trim() }),
      });
      const json = await res.json();

      // Handle pending invite — bootstrap returns 409 when user has a pending team invitation
      if (res.status === 409 && json.pendingInvite) {
        setError(
          "You have a pending team invitation! Please accept it from your dashboard instead of creating a new company."
        );
        // Redirect to dashboard where the Accept Invitation banner will show
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2500);
        return;
      }

      if (!json.ok) throw new Error(json.error || "Failed to save");

      // Save additional fields to company settings
      if (data.phone || data.email || data.license || data.serviceArea) {
        await fetch("/api/settings/company", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: data.phone,
            contactEmail: data.email,
            licenseNumber: data.license,
            serviceArea: data.serviceArea,
          }),
        }).catch((e) => console.warn("[ONBOARDING] Company settings save failed:", e?.message));
      }

      // Track step
      await fetch("/api/onboarding/track-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 1 }),
      }).catch((e) => console.warn("[ONBOARDING] Step 1 tracking failed:", e?.message));

      onNext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold">Tell us about your company</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This info appears on reports, proposals, and client-facing documents.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            placeholder="Acme Restoration, Inc."
            value={data.companyName || ""}
            onChange={(e) => setData({ ...data, companyName: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="(555) 123-4567"
              value={data.phone || ""}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Company Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="info@acmerestoration.com"
              value={data.email || ""}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="license">Contractor License #</Label>
            <Input
              id="license"
              placeholder="ROC-12345"
              value={data.license || ""}
              onChange={(e) => setData({ ...data, license: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceArea">Service Area</Label>
            <Input
              id="serviceArea"
              placeholder="Phoenix Metro, AZ"
              value={data.serviceArea || ""}
              onChange={(e) => setData({ ...data, serviceArea: e.target.value })}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          <>
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 2 — Branding
// ═══════════════════════════════════════════════════════════════════
function StepBranding({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [tagline, setTagline] = useState("");
  const [saving, setSaving] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload logo if provided
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        fd.append("category", "branding");
        await fetch("/api/upload", { method: "POST", body: fd }).catch((e) =>
          console.warn("[ONBOARDING] Logo upload failed:", e?.message)
        );
      }

      // Save branding settings
      await fetch("/api/branding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorPrimary: primaryColor,
          tagline,
        }),
      }).catch((e) => console.warn("[ONBOARDING] Branding save failed:", e?.message));

      // Track step
      await fetch("/api/onboarding/track-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 2 }),
      }).catch((e) => console.warn("[ONBOARDING] Step 2 tracking failed:", e?.message));

      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Palette className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold">Brand your workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your logo and colors appear on reports, proposals, and the client portal.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-16 w-16 rounded-lg border object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <Upload className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <label className="cursor-pointer rounded-md border bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, SVG up to 2MB</p>
            </div>
          </div>
        </div>

        {/* Primary Color */}
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Brand Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="primaryColor"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-28 font-mono"
              placeholder="#2563eb"
            />
            <div className="h-10 flex-1 rounded-md" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline (optional)</Label>
          <Input
            id="tagline"
            placeholder="Your trusted storm restoration partner"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          <SkipForward className="mr-2 h-4 w-4" /> Skip for now
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 3 — Invite Team
// ═══════════════════════════════════════════════════════════════════
function StepInviteTeam({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [invites, setInvites] = useState<TeamInvite[]>([
    { email: "", role: "member" },
    { email: "", role: "member" },
  ]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const updateInvite = (idx: number, field: keyof TeamInvite, value: string) => {
    setInvites((prev) => prev.map((inv, i) => (i === idx ? { ...inv, [field]: value } : inv)));
  };

  const addRow = () => {
    if (invites.length < 10) setInvites([...invites, { email: "", role: "member" }]);
  };

  const handleSend = async () => {
    const validInvites = invites.filter((inv) => inv.email.includes("@"));
    if (!validInvites.length) {
      onSkip();
      return;
    }

    setSending(true);
    try {
      for (const inv of validInvites) {
        await fetch("/api/team/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inv.email, role: inv.role }),
        }).catch((e) => console.warn("[ONBOARDING] Invite send failed:", e?.message));
      }

      // Track step
      await fetch("/api/onboarding/track-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 3, metadata: { inviteCount: validInvites.length } }),
      }).catch((e) => console.warn("[ONBOARDING] Step 3 tracking failed:", e?.message));

      setSent(true);
      setTimeout(onNext, 1500);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold">Invite your team</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your sales reps, project managers, and office staff. They&apos;ll get an email invite.
        </p>
      </div>

      {sent ? (
        <div className="rounded-lg bg-emerald-50 p-6 text-center dark:bg-emerald-900/20">
          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
          <p className="font-medium text-emerald-800 dark:text-emerald-300">
            Invitations sent! They&apos;ll receive an email shortly.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {invites.map((inv, i) => (
              <div key={i} className="flex gap-3">
                <Input
                  type="email"
                  placeholder="teammate@company.com"
                  value={inv.email}
                  onChange={(e) => updateInvite(i, "email", e.target.value)}
                  className="flex-1"
                />
                <select
                  value={inv.role}
                  onChange={(e) => updateInvite(i, "role", e.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="member">Sales Rep</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="field_tech">Field Tech</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Add another
          </button>

          {/* Role explanations */}
          <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <p className="mb-1 font-semibold">Role Guide:</p>
            <ul className="space-y-0.5">
              <li>
                <strong>Admin</strong> — Full access including billing & team management
              </li>
              <li>
                <strong>Manager</strong> — Approve job values, view all reps, run reports
              </li>
              <li>
                <strong>Sales Rep</strong> — Create claims, submit values, use AI tools
              </li>
              <li>
                <strong>Field Tech</strong> — Upload photos, update claim status
              </li>
              <li>
                <strong>Viewer</strong> — Read-only access to dashboards & reports
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onSkip} className="flex-1">
              <SkipForward className="mr-2 h-4 w-4" /> Skip for now
            </Button>
            <Button onClick={handleSend} disabled={sending} className="flex-1">
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" /> Send Invites
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 4 — First Claim
// ═══════════════════════════════════════════════════════════════════
function StepFirstClaim({ onNext }: { onNext: () => void }) {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [claimId, setClaimId] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mode, setMode] = useState<"choose" | "sample" | "manual">("choose");

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/create-sample", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setClaimId(data.data.claimId);
        setCreated(true);

        // Track step
        await fetch("/api/onboarding/track-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: 4, metadata: { mode: "sample" } }),
        }).catch((e) => console.warn("[ONBOARDING] Step 4 tracking failed:", e?.message));

        setTimeout(onNext, 2000);
      } else if (res.status === 400) {
        // Sample already exists
        setCreated(true);
        setTimeout(onNext, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seed-demo", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCreated(true);
        await fetch("/api/onboarding/track-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: 4, metadata: { mode: "demo-seed" } }),
        }).catch((e) => console.warn("[ONBOARDING] Step 4 demo tracking failed:", e?.message));
        setTimeout(onNext, 2000);
      }
    } catch {
      // Fallback to sample data
      await handleLoadSample();
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold">Data loaded!</h2>
        <p className="text-muted-foreground">
          Your dashboard is ready to explore. Moving to the final step...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <CloudLightning className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold">See it in action</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Load sample data to explore the full platform, or jump straight to creating your first
          real claim.
        </p>
      </div>

      <div className="grid gap-4">
        {/* Option 1: Load Demo Data */}
        <button
          onClick={handleLoadDemoData}
          disabled={loading}
          className={cn(
            "flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all hover:shadow-md",
            "border-blue-200 bg-blue-50/50 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-900/20"
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Rocket className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Load demo data (recommended)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Populate your dashboard with 15 claims, team members, pipeline stages, and leaderboard
              data. Perfect for exploring every feature.
            </p>
          </div>
        </button>

        {/* Option 2: Single Sample */}
        <button
          onClick={handleLoadSample}
          disabled={loading}
          className={cn(
            "flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all hover:shadow-md",
            "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Create one sample claim</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A single test claim to see the workflow. You can add more later.
            </p>
          </div>
        </button>

        {/* Option 3: Skip */}
        <button
          onClick={onNext}
          className="py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Skip — I&apos;ll create my own data →
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading data...
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 5 — Completion
// ═══════════════════════════════════════════════════════════════════
function StepComplete() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Mark onboarding complete — server-side DB update
    fetch("/api/onboarding/track-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: 5, complete: true }),
    }).catch((e) => console.warn("[ONBOARDING] Step 5 completion tracking failed:", e?.message));

    // Set cookie so middleware knows onboarding is complete (prevents redirect loop)
    document.cookie = "x-onboarding-complete=1;path=/;max-age=31536000;SameSite=Lax";

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          router.refresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
        <PartyPopper className="h-12 w-12 text-white" />
      </div>

      <div>
        <h2 className="text-3xl font-bold">You&apos;re all set! 🎉</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          Your workspace is ready. Let&apos;s go make some deals.
        </p>
      </div>

      <div className="mx-auto grid max-w-sm gap-3 text-left">
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium">Company profile configured</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium">Branding ready for reports</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium">AI tools unlocked</span>
        </div>
      </div>

      <Button
        size="lg"
        onClick={() => {
          router.push("/dashboard");
          router.refresh();
        }}
      >
        <Rocket className="mr-2 h-5 w-5" />
        Go to Dashboard
      </Button>

      <p className="text-xs text-muted-foreground">Auto-redirecting in {countdown}s...</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WIZARD ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════
function WizardContent() {
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  const initialStep = Math.min(
    Math.max(parseInt(searchParams?.get("step") || "1", 10), 1),
    TOTAL_STEPS
  );
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [companyData, setCompanyData] = useState<Record<string, string>>({});

  // Sync URL with step
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    window.history.replaceState(null, "", `/onboarding/wizard?step=${step}`);
  }, []);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <OnboardingProgress
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            stepLabels={STEP_LABELS}
          />
        </div>

        {/* Step Card */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {currentStep === 1 && (
              <StepCompanyProfile onNext={handleNext} data={companyData} setData={setCompanyData} />
            )}
            {currentStep === 2 && <StepBranding onNext={handleNext} onSkip={handleNext} />}
            {currentStep === 3 && <StepInviteTeam onNext={handleNext} onSkip={handleNext} />}
            {currentStep === 4 && <StepFirstClaim onNext={handleNext} />}
            {currentStep === 5 && <StepComplete />}
          </CardContent>
        </Card>

        {/* Back button (steps 2-4 only) */}
        {currentStep > 1 && currentStep < 5 && (
          <button
            onClick={handleBack}
            className="mt-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to {STEP_LABELS[currentStep - 2]}
          </button>
        )}
      </div>
    </div>
  );
}

export default function OnboardingWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WizardContent />
    </Suspense>
  );
}
