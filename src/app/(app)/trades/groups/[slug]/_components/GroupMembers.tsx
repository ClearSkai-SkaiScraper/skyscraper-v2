/**
 * Group Members Sidebar Component
 */

"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Member {
  id: string;
  userId: string;
  role: string;
  profile: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    tradeType: string | null;
  } | null;
}

interface GroupMembersProps {
  groupId: string;
  members: Member[];
  totalMembers: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GroupMembers({ groupId, members, totalMembers }: GroupMembersProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    return ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "?";
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
          Admin
        </span>
      );
    }
    if (role === "moderator") {
      return (
        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
          Mod
        </span>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Members</h3>
        <span className="text-sm text-slate-500">{totalMembers}</span>
      </div>

      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <Link
            key={member.id}
            href={`/trades/profiles/${member.profile?.userId || member.userId}/public`}
            className="flex items-center gap-3 rounded-lg p-1 hover:bg-slate-50"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.profile?.avatar ?? undefined} />
              <AvatarFallback className="bg-slate-100 text-xs text-slate-700">
                {getInitials(
                  member.profile?.firstName ?? undefined,
                  member.profile?.lastName ?? undefined
                )}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-900">
                  {member.profile?.firstName} {member.profile?.lastName}
                </span>
                {getRoleBadge(member.role)}
              </div>
              {member.profile?.tradeType && (
                <p className="truncate text-xs text-slate-500">{member.profile.tradeType}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {totalMembers > members.length && (
        <button className="mt-4 w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700">
          View all members
        </button>
      )}
    </div>
  );
}
