"use client";

import {
  ArrowRightLeft,
  Crown,
  GitBranch,
  MoreVertical,
  Shield,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { HierarchyMember } from "./OrgChartFullView";

interface OrgChartMemberCardProps {
  member: HierarchyMember;
  reportCount: number;
  depth: number;
  isRoot?: boolean;
  onAction: (type: "add-to-manager" | "promote" | "remove" | "reassign") => void;
  isDragTarget?: boolean;
}

export function OrgChartMemberCard({
  member,
  reportCount,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  depth,
  isRoot,
  onAction,
  isDragTarget,
}: OrgChartMemberCardProps) {
  const roleColor = member.isOwner
    ? "from-amber-500 to-orange-600"
    : member.isAdmin
      ? "from-red-500 to-rose-600"
      : member.isManager
        ? "from-purple-500 to-indigo-600"
        : "from-blue-500 to-cyan-600";

  const borderColor = member.isOwner
    ? "border-amber-300 dark:border-amber-700"
    : member.isAdmin
      ? "border-red-200 dark:border-red-800"
      : member.isManager
        ? "border-purple-200 dark:border-purple-800"
        : "border-slate-200 dark:border-slate-700";

  const RoleIcon = member.isOwner
    ? Crown
    : member.isAdmin
      ? Shield
      : member.isManager
        ? GitBranch
        : null;

  return (
    <div
      className={`group relative rounded-xl border bg-white p-3 transition-all duration-200 dark:bg-slate-900 ${borderColor} ${
        isDragTarget
          ? "scale-[1.02] border-purple-400 shadow-lg shadow-purple-100 ring-2 ring-purple-300 dark:shadow-purple-900/30 dark:ring-purple-700"
          : "hover:shadow-md"
      } ${isRoot ? "shadow-lg" : "shadow-sm"}`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar with gradient ring */}
        <div className={`rounded-full bg-gradient-to-br ${roleColor} p-0.5`}>
          <Avatar
            className={`${isRoot ? "h-14 w-14" : "h-10 w-10"} ring-2 ring-white dark:ring-slate-900`}
          >
            <AvatarImage src={member.avatarUrl || undefined} className="object-cover" />
            <AvatarFallback
              className={`bg-gradient-to-br ${roleColor} text-sm font-bold text-white ${isRoot ? "text-lg" : ""}`}
            >
              {member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className={`truncate font-bold text-slate-900 dark:text-white ${isRoot ? "text-base" : "text-sm"}`}
            >
              {member.name}
            </p>
            {RoleIcon && (
              <RoleIcon
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  member.isOwner
                    ? "text-amber-500"
                    : member.isAdmin
                      ? "text-red-500"
                      : "text-purple-500"
                }`}
              />
            )}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.title}</p>
          {member.email && (
            <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
              {member.email}
            </p>
          )}
        </div>

        {/* Badges & actions */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {/* Role badge */}
          <Badge
            className={`text-[10px] ${
              member.isOwner
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                : member.isAdmin
                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                  : member.isManager
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
            }`}
          >
            {member.isOwner
              ? "Owner"
              : member.isAdmin
                ? "Admin"
                : member.isManager
                  ? "Manager"
                  : "Member"}
          </Badge>

          {/* Report count */}
          {reportCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
              👥 {reportCount} report{reportCount !== 1 ? "s" : ""}
            </span>
          )}

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {(member.isManager || member.isAdmin || member.isOwner) && (
                <DropdownMenuItem onClick={() => onAction("add-to-manager")}>
                  <UserPlus className="mr-2 h-4 w-4 text-purple-500" />
                  Add Employee
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => onAction("reassign")}>
                <ArrowRightLeft className="mr-2 h-4 w-4 text-blue-500" />
                {member.managerId ? "Move to Different Manager" : "Assign to Manager"}
              </DropdownMenuItem>

              {!member.isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAction("promote")}>
                    <GitBranch className="mr-2 h-4 w-4 text-purple-500" />
                    {member.isManager ? "Remove Manager Status" : "Promote to Manager"}
                  </DropdownMenuItem>
                </>
              )}

              {member.managerId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onAction("remove")}
                    className="text-red-600 focus:text-red-600"
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove from Manager
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
