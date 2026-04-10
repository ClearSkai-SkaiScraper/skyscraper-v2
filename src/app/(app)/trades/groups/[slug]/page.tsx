/**
 * Group Detail Page
 * View and interact with a specific group
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Globe, Lock, MessageSquare, Settings, Shield, Users } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

import GroupActions from "./_components/GroupActions";
import GroupFeed from "./_components/GroupFeed";
import GroupMembers from "./_components/GroupMembers";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await prisma.tradesGroup.findUnique({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  });

  if (!group) {
    return { title: "Group Not Found" };
  }

  return {
    title: `${group.name} | Trades Groups`,
    description: group.description || `Join ${group.name} on Skai Trades`,
  };
}

export default async function GroupDetailPage({ params }: Props) {
  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();

  const group = await prisma.tradesGroup.findUnique({
    where: { slug, isActive: true },
    include: {
      tradesGroupMember: {
        take: 12,
        orderBy: { joinedAt: "desc" },
        where: { status: "active" },
      },
    },
  });

  if (!group) {
    notFound();
  }

  // Check membership
  const membership = userId
    ? await prisma.tradesGroupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } },
      })
    : null;

  const isMember = membership?.status === "active";
  const isAdmin = membership?.role === "admin";
  const isModerator = membership?.role === "moderator";
  const canPost = isMember && membership?.status !== "muted";
  const canManage = isAdmin || isModerator;

  // For hidden groups, only members can see
  if (group.privacy === "hidden" && !isMember) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Private Group</h1>
          <p className="mt-2 text-slate-600">This group is hidden and invite-only.</p>
          <Link
            href="/trades/groups"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Browse other groups
          </Link>
        </div>
      </div>
    );
  }

  // Get member profiles
  const memberUserIds = group.tradesGroupMember.map((m) => m.userId);
  const memberProfiles = await prisma.tradesCompanyMember.findMany({
    where: { userId: { in: memberUserIds } },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      avatar: true,
      tradeType: true,
    },
  });

  const profileMap = new Map(memberProfiles.map((p) => [p.userId, p]));
  const membersWithProfiles = group.tradesGroupMember.map((m) => ({
    ...m,
    profile: profileMap.get(m.userId) || null,
  }));

  // Get recent posts count
  const recentPostsCount = await prisma.tradesGroupPost.count({
    where: {
      groupId: group.id,
      isActive: true,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  const PrivacyIcon =
    group.privacy === "public" ? Globe : group.privacy === "private" ? Lock : Shield;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Nav */}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          href="/trades"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Network Hub
        </Link>
        <span className="text-slate-300">/</span>
        <Link
          href="/trades/groups"
          className="text-sm font-medium text-slate-500 hover:text-blue-600"
        >
          Groups
        </Link>
      </div>

      {/* Cover */}
      <div className="relative h-48 overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-600 to-blue-700 md:h-64">
        {group.coverImage && (
          <Image src={group.coverImage} alt={group.name} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="-mt-8 flex flex-col gap-4 pb-4 md:flex-row md:items-end">
            {/* Icon */}
            <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-blue-600 shadow-lg md:h-32 md:w-32">
              {group.iconImage ? (
                <Image src={group.iconImage} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-bold text-white">
                  {group.name[0]}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{group.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <PrivacyIcon className="h-4 w-4" />
                  {group.privacy.charAt(0).toUpperCase() + group.privacy.slice(1)} group
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {group.memberCount.toLocaleString()} members
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {recentPostsCount} posts this week
                </span>
                {group.category && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {group.category}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <GroupActions groupId={group.id} isMember={isMember} membership={membership} />
              {canManage && (
                <Link href={`/trades/groups/${slug}/settings`}>
                  <button
                    className="rounded-lg border bg-white p-2 hover:bg-slate-50"
                    aria-label="Group settings"
                  >
                    <Settings className="h-5 w-5 text-slate-600" />
                  </button>
                </Link>
              )}
            </div>
          </div>

          {group.description && (
            <p className="max-w-3xl pb-4 text-slate-600">{group.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <GroupFeed
              groupId={group.id}
              canPost={canPost}
              isMember={isMember}
              groupPrivacy={group.privacy}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* About */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">About</h3>
              {group.description ? (
                <p className="mt-2 text-sm text-slate-600">{group.description}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-400">No description provided.</p>
              )}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <PrivacyIcon className="h-4 w-4" />
                  <span>
                    {group.privacy === "public" && "Anyone can join"}
                    {group.privacy === "private" && "Admin approval required"}
                    {group.privacy === "hidden" && "Invite only"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4" />
                  <span>{group.memberCount.toLocaleString()} members</span>
                </div>
              </div>
            </div>

            {/* Rules */}
            {group.rules && (
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-slate-900">Group Rules</h3>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{group.rules}</div>
              </div>
            )}

            {/* Members */}
            <GroupMembers
              groupId={group.id}
              members={membersWithProfiles}
              totalMembers={group.memberCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
