"use client";

import { Check, ChevronDown, Loader2, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
}

interface LeadAssignmentDropdownProps {
  leadId: string;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
}

export function LeadAssignmentDropdown({
  leadId,
  currentAssigneeId,
  currentAssigneeName,
}: LeadAssignmentDropdownProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignedTo, setAssignedTo] = useState(currentAssigneeId);
  const [assigneeName, setAssigneeName] = useState(currentAssigneeName);

  // Fetch team members when dropdown opens
  const loadTeamMembers = async () => {
    if (teamMembers.length > 0) return; // Already loaded

    setLoading(true);
    try {
      const res = await fetch("/api/team/members");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (memberId: string | null) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: memberId }),
      });

      if (!res.ok) {
        throw new Error("Failed to assign");
      }

      setAssignedTo(memberId);

      if (memberId) {
        const member = teamMembers.find((m) => m.id === memberId);
        const name = member
          ? `${member.firstName || ""} ${member.lastName || ""}`.trim()
          : "Assigned";
        setAssigneeName(name);
        toast.success(`Lead assigned to ${name}`);
      } else {
        setAssigneeName(null);
        toast.success("Lead unassigned");
      }
    } catch {
      toast.error("Failed to assign lead");
    } finally {
      setAssigning(false);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const f = firstName?.[0] || "";
    const l = lastName?.[0] || "";
    return (f + l).toUpperCase() || "?";
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && loadTeamMembers()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-teal-200 bg-teal-50 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/20 dark:hover:bg-teal-900/40"
          disabled={assigning}
        >
          {assigning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : assignedTo ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-teal-600 text-[10px] text-white">
                  {assigneeName?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate text-xs">{assigneeName || "Assigned"}</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 text-teal-600" />
              <span className="text-xs">Assign</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Assign Lead To
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-slate-500">No team members found</div>
        ) : (
          <>
            {/* Unassign option */}
            <DropdownMenuItem onClick={() => handleAssign(null)} className="gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-slate-300">
                <User className="h-3 w-3 text-slate-400" />
              </div>
              <span className="text-slate-500">Unassigned</span>
              {!assignedTo && <Check className="ml-auto h-4 w-4 text-teal-600" />}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Team members */}
            {teamMembers.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onClick={() => handleAssign(member.id)}
                className="gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-[10px] text-white">
                    {getInitials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <span className="text-sm">
                    {member.firstName} {member.lastName}
                  </span>
                  {member.role && (
                    <span className="ml-1 text-xs text-slate-400">• {member.role}</span>
                  )}
                </div>
                {assignedTo === member.id && <Check className="h-4 w-4 text-teal-600" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
