"use client";

import { Loader2, Mail, Send, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface NetworkInviteFormProps {
  orgId: string;
}

export function NetworkInviteForm({ orgId }: NetworkInviteFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "vendor" as "vendor" | "client",
    companyName: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/network/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          orgId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      toast.success("Invitation sent successfully!");

      // Reset form
      setFormData({
        email: "",
        role: "vendor",
        companyName: "",
        message: "",
      });
    } catch (err) {
      logger.error("Invite error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="their-email@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">
          Role <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.role}
          onValueChange={(value) =>
            setFormData({ ...formData, role: value as "vendor" | "client" })
          }
        >
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vendor">Vendor / Contractor</SelectItem>
            <SelectItem value="client">Client / Homeowner</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          {formData.role === "vendor"
            ? "For contractors, trades professionals, or service providers"
            : "For homeowners, property managers, or clients seeking services"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name (Optional)</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="companyName"
            type="text"
            placeholder="Acme Roofing LLC"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Personal Message (Optional)</Label>
        <Textarea
          id="message"
          placeholder="I'd like to invite you to join our network..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={4}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Invitation
            </>
          )}
        </Button>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
        <p className="font-medium text-blue-900 dark:text-blue-100">What happens next?</p>
        <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-200">
          <li>• They&apos;ll receive an email invitation with a unique link</li>
          <li>• They can create an account and complete their profile</li>
          <li>• Once accepted, they&apos;ll appear in your network</li>
        </ul>
      </div>
    </form>
  );
}
