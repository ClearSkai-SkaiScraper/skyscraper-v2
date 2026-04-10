/**
 * Trades Groups List Page
 * Browse and discover trades professional groups
 */

import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Globe, Lock, Plus, Users } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Trades Groups | Skai",
  description: "Connect with trades professionals in focused communities",
};

const CATEGORIES = [
  "All",
  "Roofing",
  "Plumbing",
  "Electrical",
  "HVAC",
  "General Contractors",
  "Networking",
  "Business",
  "Training",
];

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; myGroups?: string }>;
}) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  const params = await searchParams;
  const selectedCategory = params.category || "All";
  const showMyGroups = params.myGroups === "true";

  // Build query
  const where: any = { isActive: true };

  if (selectedCategory !== "All") {
    where.category = selectedCategory;
  }

  if (showMyGroups && userId) {
    const memberships = await prisma.tradesGroupMember.findMany({
      where: { userId, status: "active" },
      select: { groupId: true },
    });
    where.id = { in: memberships.map((m) => m.groupId) };
  } else {
    where.privacy = { in: ["public", "private"] };
  }

  const groups = await prisma.tradesGroup.findMany({
    where,
    orderBy: { memberCount: "desc" },
    take: 50,
    include: {
      tradesGroupMember: {
        take: 3,
        select: { userId: true },
      },
    },
  });

  // Get membership status for logged in user
  let userMemberships: Set<string> = new Set();
  if (userId) {
    const memberships = await prisma.tradesGroupMember.findMany({
      where: { userId, groupId: { in: groups.map((g) => g.id) } },
      select: { groupId: true },
    });
    userMemberships = new Set(memberships.map((m) => m.groupId));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back to Hub */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Link
            href="/trades"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Network Hub
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <PageHero
            title="Trades Groups"
            subtitle="Connect with trades professionals in focused communities"
            icon={<Users className="h-5 w-5" />}
          >
            {userId && (
              <Link href="/trades/groups/create">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </Link>
            )}
          </PageHero>

          {/* Tabs */}
          <div className="mt-6 flex gap-4 border-b">
            <Link
              href="/trades/groups"
              className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                !showMyGroups
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Discover
            </Link>
            {userId && (
              <Link
                href="/trades/groups?myGroups=true"
                className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                  showMyGroups
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                My Groups
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/trades/groups?category=${cat}${showMyGroups ? "&myGroups=true" : ""}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {groups.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No groups found</h3>
            <p className="mt-2 text-slate-600">
              {showMyGroups
                ? "You haven't joined any groups yet. Discover groups to join!"
                : "Be the first to create a group in this category."}
            </p>
            {userId && (
              <Link href="/trades/groups/create" className="mt-4 inline-block">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const isMember = userMemberships.has(group.id);
              return (
                <Link
                  key={group.id}
                  href={`/trades/groups/${group.slug}`}
                  className="group overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Cover Image */}
                  <div className="relative h-32 bg-gradient-to-br from-blue-500 to-blue-600">
                    {group.coverImage && (
                      <Image
                        src={group.coverImage}
                        alt={group.name}
                        fill
                        className="object-cover"
                      />
                    )}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
                      {group.privacy === "public" ? (
                        <>
                          <Globe className="h-3 w-3" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          Private
                        </>
                      )}
                    </div>
                    {isMember && (
                      <div className="absolute right-3 top-3 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                        Joined
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {group.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Users className="h-4 w-4" />
                        {group.memberCount.toLocaleString()} members
                      </div>
                      {group.category && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {group.category}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
