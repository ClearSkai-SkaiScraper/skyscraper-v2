"use client";

import { Crown, Mail, MessageCircle, Phone, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TeamMemberCardProps {
  member: {
    id: string;
    userId: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    profilePhoto?: string | null;
    jobTitle?: string | null;
    role?: string | null;
    isOwner?: boolean | null;
    isAdmin?: boolean | null;
    companyId?: string | null;
    companyName?: string | null;
  };
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  const router = useRouter();
  const displayName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Team Member";
  const avatarUrl = member.avatar || member.profilePhoto;
  const initials = `${(member.firstName || "T")[0]}${(member.lastName || "M")[0]}`.toUpperCase();

  const handleCardClick = () => {
    // Navigate to the member's trades profile
    router.push(`/trades/profiles/${member.userId}`);
  };

  const roleBadge = member.isOwner
    ? {
        label: "Owner",
        icon: Crown,
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      }
    : member.isAdmin
      ? {
          label: "Admin",
          icon: Shield,
          color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        }
      : {
          label: "Member",
          icon: User,
          color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        };

  const RoleIcon = roleBadge.icon;

  return (
    <div
      onClick={handleCardClick}
      className="group relative cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-indigo-500/50 hover:shadow-xl dark:border-slate-800/50 dark:bg-slate-900/50"
    >
      <div className="pointer-events-none">
        <div className="mb-4 flex items-start gap-3">
          {/* Avatar */}
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-12 w-12 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-800"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-slate-900 transition group-hover:text-indigo-700 dark:text-white">
              {displayName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={`text-xs ${roleBadge.color}`}>
                <RoleIcon className="mr-1 h-3 w-3" />
                {roleBadge.label}
              </Badge>
              {member.jobTitle && (
                <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {member.jobTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {member.email && (
            <div className="flex items-center gap-2 truncate text-sm text-slate-600 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              {member.email}
            </div>
          )}
          {member.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              {member.phone}
            </div>
          )}
          {member.companyName && (
            <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
              {member.companyName}
            </div>
          )}
        </div>

        {/* Action buttons — Call / Text / Email */}
        {(member.phone || member.email) && (
          <div className="pointer-events-auto mt-4 flex items-center gap-2">
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              </a>
            )}
            {member.phone && (
              <a
                href={`sms:${member.phone}`}
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Text
                </Button>
              </a>
            )}
            {member.email && (
              <a
                href={`mailto:${member.email}`}
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
