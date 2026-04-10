/**
 * Sprint 27 — Remote View Team Selector
 *
 * Dropdown that shows team members available for Remote View.
 * - Admin/Owner: sees all team members
 * - Manager: sees only direct reports
 * - Member/Viewer: hidden entirely
 */

"use client";

import { Eye, Loader2, Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppPermissions } from "@/lib/permissions/client";

import type { RemoteViewTarget } from "./RemoteViewContext";
import { useRemoteView } from "./RemoteViewContext";

interface TeamMemberOption {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  isManager: boolean;
  managerId: string | null;
}

export function RemoteViewSelector() {
  const { canRemoteView } = useAppPermissions();
  const { active, startRemoteView, loading: viewLoading } = useRemoteView();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState<string | null>(null);

  // Don't render if user can't use Remote View or already in Remote View
  if (!canRemoteView || active) return null;

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/remote-view/team");
      if (!res.ok) throw new Error("Failed to load team");
      const data = await res.json();
      setMembers(data.members || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleStartView = async (member: TeamMemberOption) => {
    setStarting(member.userId);
    try {
      const target: RemoteViewTarget = {
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
        avatarUrl: member.avatarUrl,
      };
      await startRemoteView(target);
      setOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to start Remote View");
    } finally {
      setStarting(null);
    }
  };

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) void fetchTeam();
      }}
    >
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-amber-500/50 hover:bg-amber-950/30 hover:text-amber-300"
          title="View as team member"
        >
          <Eye className="h-4 w-4" />
          Remote View
        </button>
      </DialogTrigger>

      <DialogContent className="border-slate-700 bg-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Eye className="h-5 w-5 text-amber-400" />
            Remote View
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            View a team member&apos;s workspace in read-only mode. You can see their claims,
            pipeline, and dashboard exactly as they see it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-slate-700 bg-slate-800 pl-9 text-slate-200 placeholder:text-slate-500"
              data-remote-view-allow
            />
          </div>

          {/* Member list */}
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {search ? "No matching team members" : "No team members available"}
              </div>
            ) : (
              filtered.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => handleStartView(member)}
                  disabled={starting === member.userId || viewLoading}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-800 disabled:opacity-50"
                  data-remote-view-allow
                >
                  <Avatar className="h-9 w-9">
                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                    <AvatarFallback className="bg-slate-700 text-xs text-slate-300">
                      {initials(member.name || member.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-200">
                        {member.name || member.email}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-[10px] text-slate-400"
                      >
                        {member.role}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500">{member.email}</span>
                  </div>

                  {starting === member.userId ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400" />
                  ) : (
                    <Eye className="h-4 w-4 shrink-0 text-slate-600" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Info */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>
                Remote View is read-only. All forms and actions will be disabled. Click &quot;Exit
                Remote View&quot; in the banner to return to your own account.
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
