"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMemberActionsProps {
  memberId: string;
  memberName: string;
  memberEmail: string;
  currentRole: string;
  isCurrentUser: boolean;
}

interface RoleOption {
  key: string;
  label: string;
  description: string;
}

// Enterprise roles — kept in sync with src/lib/auth/role-presets.ts
const ROLE_OPTIONS: RoleOption[] = [
  { key: "owner", label: "Owner", description: "Full platform access" },
  { key: "admin", label: "Admin", description: "Full access except ownership" },
  { key: "manager", label: "Manager", description: "Manages projects & workflows" },
  { key: "project_manager", label: "Project Manager", description: "Oversees assigned projects" },
  { key: "sales_rep", label: "Sales Rep", description: "Creates leads & claims" },
  { key: "field_tech", label: "Field Technician", description: "Field updates & photos" },
  { key: "finance", label: "Finance", description: "Financial reports & billing" },
  { key: "member", label: "Member", description: "Standard team access" },
  { key: "viewer", label: "Viewer", description: "Read-only access" },
];

export function TeamMemberActions({
  memberId,
  memberName,
  memberEmail,
  currentRole,
  isCurrentUser,
}: TeamMemberActionsProps) {
  const router = useRouter();
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole.toLowerCase());

  const handleRoleChange = async (newRole: string) => {
    if (newRole === selectedRole || isCurrentUser) return;

    setIsChangingRole(true);
    try {
      const res = await fetch(`/api/team/member/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setSelectedRole(newRole);
      toast.success("Role updated", {
        description: `${memberName}'s role has been changed to ${newRole}`,
      });
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to update role",
      });
      // Reset to original role on error
      setSelectedRole(currentRole.toLowerCase());
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (isCurrentUser) return;

    setIsRemoving(true);
    try {
      const res = await fetch(`/api/team/member/${memberId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      toast.success("Member removed", {
        description: `${memberName} has been removed from the team`,
      });
      setShowRemoveDialog(false);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to remove member",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={isChangingRole || isCurrentUser}
            className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Change role for ${memberName}`}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
          {isChangingRole && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/50 dark:bg-slate-900/50">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            </div>
          )}
        </div>
        <button
          onClick={() => setShowRemoveDialog(true)}
          disabled={isCurrentUser || isRemoving}
          className="rounded-lg p-2 text-slate-700 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-red-900/20"
          title={isCurrentUser ? "Cannot remove yourself" : "Remove member"}
        >
          {isRemoving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Trash2 className="h-5 w-5" />
          )}
        </button>
      </div>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberName}</strong> ({memberEmail}) from the
              team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
