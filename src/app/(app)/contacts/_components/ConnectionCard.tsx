"use client";

import {
  Ban,
  Building2,
  Mail,
  MessageCircle,
  MoreVertical,
  Phone,
  UserCheck,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConnectionCardProps {
  conn: {
    id: string;
    type: string;
    name: string;
    logo?: string | null;
    verified?: boolean;
    city?: string | null;
    state?: string | null;
    email?: string | null;
    phone?: string | null;
    specialties?: string[];
    companyId?: string;
    profileId?: string; // Profile ID for block functionality
  };
  onRemoved?: () => void;
}

export function ConnectionCard({ conn, onRemoved }: ConnectionCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCardClick = () => {
    // Navigate to trades company profile if we have a companyId
    if (conn.companyId) {
      router.push(`/trades/companies/${conn.companyId}`);
    }
  };

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this connection?")) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/trades/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", connectionId: conn.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove connection");
      }

      toast.success(`${conn.name} has been removed from your connections.`);
      onRemoved?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove connection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!conn.profileId) {
      toast.error("Profile information not available");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to block ${conn.name}? This will remove the connection and prevent future contact.`
      )
    )
      return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/trades/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block", profileId: conn.profileId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to block user");
      }

      toast.success(`${conn.name} has been blocked.`);
      onRemoved?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to block user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group block cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-amber-500/50 hover:shadow-xl dark:border-slate-800/50 dark:bg-slate-900/50"
    >
      <div className="pointer-events-none">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {conn.logo ? (
              <img src={conn.logo} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 transition group-hover:text-amber-700 dark:text-white">
                {conn.name}
              </h3>
              <Badge
                variant="secondary"
                className={`text-xs ${
                  conn.type === "vendor"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : conn.type === "subcontractor"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                }`}
              >
                {conn.type === "vendor"
                  ? "Vendor"
                  : conn.type === "subcontractor"
                    ? "Subcontractor"
                    : "Contractor"}
              </Badge>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {conn.verified && <UserCheck className="h-5 w-5 text-green-500" />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isLoading}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  className="text-amber-600 focus:text-amber-700"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Remove Connection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBlock} className="text-red-600 focus:text-red-700">
                  <Ban className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="space-y-2">
          {conn.city && conn.state && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {conn.city}, {conn.state}
            </div>
          )}
          {conn.email && (
            <div className="truncate text-sm text-slate-600 dark:text-slate-400">{conn.email}</div>
          )}
          {conn.phone && (
            <div className="text-sm text-slate-600 dark:text-slate-400">{conn.phone}</div>
          )}
          {conn.specialties && conn.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {conn.specialties.slice(0, 3).map((s: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Action buttons */}
        {(conn.phone || conn.email) && (
          <div className="pointer-events-auto mt-4 flex items-center gap-2">
            {conn.phone && (
              <a href={`tel:${conn.phone}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              </a>
            )}
            {conn.phone && (
              <a href={`sms:${conn.phone}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Text
                </Button>
              </a>
            )}
            {conn.email && (
              <a
                href={`mailto:${conn.email}`}
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
