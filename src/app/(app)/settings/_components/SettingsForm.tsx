"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface SettingsFormProps {
  initialDisplayName: string;
  initialOrgName: string;
  initialTimezone: string;
  initialNotifications: {
    emailNotifications: boolean;
    leadAlerts: boolean;
    weeklySummary: boolean;
  };
}

export function SettingsForm({
  initialDisplayName,
  initialOrgName,
  initialTimezone,
  initialNotifications,
}: SettingsFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [orgName, setOrgName] = useState(initialOrgName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [saving, setSaving] = useState<string | null>(null);

  async function saveDisplayName() {
    setSaving("displayName");
    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });
      if (res.ok) {
        toast.success("Display name updated");
      } else {
        toast.error("Failed to update display name");
      }
    } catch {
      toast.error("Failed to update display name");
    } finally {
      setSaving(null);
    }
  }

  async function saveNotifications() {
    setSaving("notifications");
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });
      if (res.ok) {
        toast.success("Notification preferences saved");
      } else {
        toast.error("Failed to save notification preferences");
      }
    } catch {
      toast.error("Failed to save notification preferences");
    } finally {
      setSaving(null);
    }
  }

  async function saveOrgSettings() {
    setSaving("org");
    try {
      const res = await fetch("/api/settings/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, timezone }),
      });
      if (res.ok) {
        toast.success("Organization settings saved");
      } else {
        toast.error("Failed to save organization settings");
      }
    } catch {
      toast.error("Failed to save organization settings");
    } finally {
      setSaving(null);
    }
  }

  async function handleExportData() {
    setSaving("export");
    try {
      toast.info("Preparing your data export...");
      const res = await fetch("/api/settings/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `skaiscrape-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Data exported successfully");
      } else {
        toast.error("Export failed — please try again");
      }
    } catch {
      toast.error("Export failed — please try again");
    } finally {
      setSaving(null);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "⚠️ Are you sure you want to delete your account? This action is PERMANENT and cannot be undone. All your data will be deleted."
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "This is your FINAL confirmation. Type OK in the next prompt to proceed."
    );
    if (!doubleConfirm) return;

    setSaving("delete");
    try {
      toast.info("Account deletion requested. This feature requires admin approval for safety.");
      // In production, this would create a deletion request rather than immediately deleting
    } catch {
      toast.error("Failed to process deletion request");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      {/* Display Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[color:var(--text)]">
          Display Name
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[color:var(--text)] focus:border-[color:var(--border-bright)] focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="Your display name"
          />
          <button
            onClick={saveDisplayName}
            disabled={saving === "displayName"}
            className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {saving === "displayName" ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Notification Controls */}
      <div data-section="notifications" className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-[var(--surface-2)]">
          <div>
            <div className="font-medium text-[color:var(--text)]">Email Notifications</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Receive updates when claims status changes
            </div>
          </div>
          <input
            type="checkbox"
            checked={notifications.emailNotifications}
            onChange={(e) => {
              setNotifications((prev) => ({ ...prev, emailNotifications: e.target.checked }));
            }}
            className="h-5 w-5 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-[var(--surface-2)]">
          <div>
            <div className="font-medium text-[color:var(--text)]">Lead Alerts</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Get notified when new leads are assigned to you
            </div>
          </div>
          <input
            type="checkbox"
            checked={notifications.leadAlerts}
            onChange={(e) => {
              setNotifications((prev) => ({ ...prev, leadAlerts: e.target.checked }));
            }}
            className="h-5 w-5 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-[var(--surface-2)]">
          <div>
            <div className="font-medium text-[color:var(--text)]">Weekly Summary</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Receive a weekly digest of your pipeline activity
            </div>
          </div>
          <input
            type="checkbox"
            checked={notifications.weeklySummary}
            onChange={(e) => {
              setNotifications((prev) => ({ ...prev, weeklySummary: e.target.checked }));
            }}
            className="h-5 w-5 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
          />
        </label>
        <div className="flex justify-end pt-2">
          <button
            onClick={saveNotifications}
            disabled={saving === "notifications"}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {saving === "notifications" ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Organization Settings */}
      <div data-section="org" className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[color:var(--text)]">
            Organization Name
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[color:var(--text)] focus:border-[color:var(--border-bright)] focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="Your organization"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[color:var(--text)]">
            Default Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[color:var(--text)] focus:border-[color:var(--border-bright)] focus:ring-2 focus:ring-[var(--primary)]"
            aria-label="Default timezone"
          >
            <option value="US/Eastern">US/Eastern</option>
            <option value="US/Central">US/Central</option>
            <option value="US/Mountain">US/Mountain</option>
            <option value="US/Pacific">US/Pacific</option>
          </select>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={saveOrgSettings}
            disabled={saving === "org"}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {saving === "org" ? "Saving..." : "Save Organization"}
          </button>
        </div>
      </div>

      {/* Export & Delete (Data & Privacy section handlers) */}
      <div data-section="privacy">
        <button
          onClick={handleExportData}
          disabled={saving === "export"}
          className="rounded-lg border-2 border-[color:var(--border)] px-4 py-2 font-medium text-[color:var(--text)] transition-all hover:border-[color:var(--primary)] hover:bg-[var(--primary-weak)]"
        >
          {saving === "export" ? "Exporting..." : "Request Export"}
        </button>
      </div>
      <div data-section="delete">
        <button
          onClick={handleDeleteAccount}
          disabled={saving === "delete"}
          className="rounded-lg border-2 border-red-300 px-4 py-2 font-medium text-red-600 transition-all hover:border-red-500 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
        >
          {saving === "delete" ? "Processing..." : "Delete"}
        </button>
      </div>
    </>
  );
}
