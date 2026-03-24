// Role Badge Component - Display user role with icon and color
// Uses System B canonical roles (lowercase)
// Usage: <RoleBadge role="admin" />

import { Briefcase, Crown, Eye, User } from "lucide-react";

import { type TeamRole } from "@/lib/auth/rbac";

interface RoleBadgeProps {
  role: TeamRole | string;
  size?: "sm" | "md" | "lg";
}

const roleConfig: Record<TeamRole, { icon: any; color: string; label: string }> = {
  admin: { icon: Crown, color: "purple", label: "Admin" },
  manager: { icon: Briefcase, color: "green", label: "Manager" },
  member: { icon: User, color: "blue", label: "Member" },
  viewer: { icon: Eye, color: "slate", label: "Viewer" },
};

/** Map legacy uppercase roles to System B */
const LEGACY_ROLE_MAP: Record<string, TeamRole> = {
  OWNER: "admin",
  ADMIN: "admin",
  PM: "manager",
  FIELD_TECH: "member",
  OFFICE_STAFF: "member",
  CLIENT: "viewer",
};

const sizeClasses = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1.5",
  lg: "text-base px-4 py-2",
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function RoleBadge({ role, size = "md" }: RoleBadgeProps) {
  // Normalize: accept both System A (uppercase) and System B (lowercase) roles
  const normalizedRole: TeamRole = (
    role in roleConfig ? role : LEGACY_ROLE_MAP[role] || "member"
  ) as TeamRole;
  const config = roleConfig[normalizedRole];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full font-medium ${sizeClasses[size]} bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:text-${config.color}-300`}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </div>
  );
}
