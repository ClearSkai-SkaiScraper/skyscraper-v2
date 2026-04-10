"use client";

import { Loader2, Mail, Send, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TeamInviteFormProps {
  onSuccess?: () => void;
}

export default function TeamInviteForm({ onSuccess }: TeamInviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const data = await response.json();
      toast.success(`Invitation sent to ${email}!`);

      // Reset form
      setEmail("");
      setMessage("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-[color:var(--text)]">Invite Team Member</h3>
        </div>

        <div className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="colleague@company.com"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">Role</label>
            <select
              title="Select role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            >
              <option value="member">Member - Standard team access</option>
              <option value="admin">Admin - Full access including team management</option>
              <option value="manager">Manager - Manages projects & workflows</option>
              <option value="project_manager">Project Manager - Oversees assigned projects</option>
              <option value="sales_rep">Sales Rep - Creates leads & claims</option>
              <option value="field_tech">Field Technician - Field updates & photos</option>
              <option value="finance">Finance - Financial reports & billing</option>
              <option value="viewer">Viewer - Read-only access</option>
            </select>
          </div>

          {/* Optional Message */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
              Personal Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Add a personal note to your invitation..."
              className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-600 dark:text-blue-400">
            <p className="mb-1 font-semibold">How it works:</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>Enter the email address of the person you want to invite</li>
              <li>They&apos;ll receive an invitation link valid for 7 days</li>
              <li>Once accepted, they&apos;ll have immediate access to your organization</li>
            </ol>
          </div>
        </div>
      </div>
    </form>
  );
}
