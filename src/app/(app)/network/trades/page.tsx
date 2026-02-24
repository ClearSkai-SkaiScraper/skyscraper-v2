import {
  Award,
  Briefcase,
  Building2,
  Filter,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Verified,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

import { TradesNetworkClient } from "./TradesNetworkClient";

export const dynamic = "force-dynamic";

type ConnectionStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";

// Featured categories for the network
const FEATURED_CATEGORIES = [
  { icon: "🏠", label: "Roofing", count: 24 },
  { icon: "🔧", label: "HVAC", count: 18 },
  { icon: "💧", label: "Plumbing", count: 15 },
  { icon: "⚡", label: "Electrical", count: 12 },
  { icon: "🪟", label: "Windows", count: 9 },
  { icon: "🌿", label: "Landscaping", count: 7 },
];

export default async function TradesNetworkPage() {
  const ctx = await getOrg({ mode: "required" });
  if (!ctx.ok) throw new Error("Unreachable: mode required should redirect");
  const orgId = ctx.orgId;
  const userId = ctx.userId;

  // Fetch contractor profiles (excluding current user's org)
  let contractors: Array<{
    id: string;
    businessName: string;
    companyLogoUrl: string | null;
    coverPhoto: string | null;
    rating: number | null;
    reviewCount: number;
    serviceAreas: string[];
    primaryServices: string[];
    emergencyService: boolean;
    isVerified: boolean;
    description: string | null;
    yearsInBusiness: number | null;
    clientConnections: Array<{ status: ConnectionStatus }>;
  }> = [];

  // Fetch recent posts/updates from trades network
  let recentPosts: Array<{
    id: string;
    authorName: string;
    authorLogo: string | null;
    authorVerified: boolean;
    content: string;
    imageUrl: string | null;
    likes: number;
    comments: number;
    createdAt: Date;
  }> = [];

  try {
    // Get contractor profiles from tradesCompany (main company profiles)
    const companyProfiles = await prisma.tradesCompany.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ isVerified: "desc" }, { rating: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        name: true,
        logo: true,
        coverimage: true,
        rating: true,
        reviewCount: true,
        specialties: true,
        description: true,
        yearsInBusiness: true,
        isVerified: true,
        city: true,
        state: true,
      },
    });

    // Get recent posts from trades network (using any[] due to model complexity)
    const posts = await prisma.tradesPost
      .findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          tradesCompany: {
            select: {
              name: true,
              logo: true,
              isVerified: true,
            },
          },
        },
      })
      .catch(() => []);

    recentPosts = posts.map((post) => ({
      id: post.id,
      authorName: post.tradesCompany?.name ?? "Unknown",
      authorLogo: post.tradesCompany?.logo ?? null,
      authorVerified: post.tradesCompany?.isVerified ?? false,
      content: post.content ?? "",
      imageUrl: post.images?.[0] || null,
      likes: 0,
      comments: 0,
      createdAt: post.createdAt ?? new Date(),
    }));

    contractors = companyProfiles.map((p) => ({
      id: p.id,
      businessName: p.name,
      companyLogoUrl: p.logo ?? null,
      coverPhoto: p.coverimage ?? null,
      rating: p.rating ? parseFloat(p.rating.toString()) : null,
      reviewCount: p.reviewCount ?? 0,
      serviceAreas: p.city && p.state ? [`${p.city}, ${p.state}`] : [],
      primaryServices: p.specialties || [],
      emergencyService: false,
      isVerified: p.isVerified ?? false,
      description: p.description,
      yearsInBusiness: p.yearsInBusiness,
      clientConnections: [],
    }));
  } catch (error) {
    logger.error("[TradesNetworkPage] Failed to fetch contractors:", error);
  }

  // Top rated contractors for sidebar
  const topRated = contractors.filter((c) => c.rating && c.rating >= 4.5).slice(0, 3);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Header */}
      <div className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
                  <Users className="h-5 w-5 text-white" />
                </div>
                Trades Network
              </h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Connect with verified contractors • Build your professional network • Grow your
                business
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/settings/company">
                <Button variant="outline" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
              <Link href="/invitations">
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="h-4 w-4" />
                  Invite Pro
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search contractors, services, or locations..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Category Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {FEATURED_CATEGORIES.map((cat) => (
              <Badge
                key={cat.label}
                variant="secondary"
                className="cursor-pointer px-3 py-1.5 text-sm transition-all hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30"
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.label}
                <span className="ml-1.5 text-xs text-slate-500">({cat.count})</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main Feed Area */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="discover" className="w-full">
              <TabsList className="mb-4 w-full justify-start rounded-xl bg-white p-1 shadow-sm dark:bg-slate-800">
                <TabsTrigger value="discover" className="gap-2 rounded-lg">
                  <Sparkles className="h-4 w-4" />
                  Discover
                </TabsTrigger>
                <TabsTrigger value="connections" className="gap-2 rounded-lg">
                  <Users className="h-4 w-4" />
                  My Network
                </TabsTrigger>
                <TabsTrigger value="feed" className="gap-2 rounded-lg">
                  <MessageCircle className="h-4 w-4" />
                  Feed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discover" className="space-y-6">
                {contractors.length === 0 ? (
                  <Card className="rounded-2xl border-2 border-dashed">
                    <CardContent className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold">No contractors yet</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Be the first to join or invite your network
                      </p>
                      <Link href="/invitations" className="mt-4 inline-block">
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Invite Pros
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {contractors.map((contractor) => (
                      <Card
                        key={contractor.id}
                        className="group overflow-hidden rounded-2xl border-slate-200/50 bg-white transition-all hover:border-blue-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-blue-800"
                      >
                        {/* Cover Photo */}
                        <div className="relative h-24 bg-gradient-to-br from-blue-500 to-indigo-600">
                          {contractor.coverPhoto && (
                            <Image
                              src={contractor.coverPhoto}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>

                        <CardContent className="relative -mt-10 p-4">
                          {/* Avatar */}
                          <Avatar className="h-16 w-16 border-4 border-transparent shadow-lg dark:border-slate-800">
                            <AvatarImage src={contractor.companyLogoUrl || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                              {contractor.businessName?.slice(0, 2).toUpperCase() || "CO"}
                            </AvatarFallback>
                          </Avatar>

                          {/* Company Info */}
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {contractor.businessName}
                              </h3>
                              {contractor.isVerified && (
                                <Verified className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            {contractor.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                                {contractor.description}
                              </p>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="mt-3 flex items-center gap-4 text-sm">
                            {contractor.rating && (
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star className="h-4 w-4 fill-current" />
                                <span className="font-medium">{contractor.rating.toFixed(1)}</span>
                                <span className="text-slate-400">({contractor.reviewCount})</span>
                              </div>
                            )}
                            {contractor.yearsInBusiness && (
                              <div className="flex items-center gap-1 text-slate-500">
                                <Award className="h-4 w-4" />
                                <span>{contractor.yearsInBusiness}+ yrs</span>
                              </div>
                            )}
                          </div>

                          {/* Services */}
                          {contractor.primaryServices.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {contractor.primaryServices.slice(0, 3).map((service) => (
                                <Badge key={service} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-4 flex gap-2">
                            <Link href={`/contractors/${contractor.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full">
                                View Profile
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                            >
                              Connect
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="connections">
                <TradesNetworkClient contractors={contractors} currentUserId={userId} />
              </TabsContent>

              <TabsContent value="feed" className="space-y-4">
                {recentPosts.length === 0 ? (
                  <Card className="rounded-2xl">
                    <CardContent className="py-12 text-center">
                      <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
                      <h3 className="mt-4 font-semibold">No posts yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Be the first to share an update with your network
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  recentPosts.map((post) => (
                    <Card key={post.id} className="rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarImage src={post.authorLogo || undefined} />
                            <AvatarFallback>{post.authorName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{post.authorName}</span>
                              {post.authorVerified && (
                                <Verified className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            <p className="mt-2 text-slate-700 dark:text-slate-300">
                              {post.content}
                            </p>
                            {post.imageUrl && (
                              <div className="relative mt-3 aspect-video overflow-hidden rounded-xl">
                                <Image src={post.imageUrl} alt="" fill className="object-cover" />
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                              <span>❤️ {post.likes}</span>
                              <span>💬 {post.comments}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Rated */}
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Top Rated Pros
                </h3>
                <div className="space-y-3">
                  {topRated.length > 0 ? (
                    topRated.map((pro) => (
                      <Link
                        key={pro.id}
                        href={`/contractors/${pro.id}`}
                        className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={pro.companyLogoUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-sm text-white">
                            {pro.businessName?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium">{pro.businessName}</p>
                          <div className="flex items-center gap-1 text-xs text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {pro.rating?.toFixed(1)}
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No top rated pros yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <CardContent className="p-4">
                <h3 className="mb-2 font-semibold">Grow Your Network</h3>
                <p className="mb-4 text-sm text-blue-100">
                  Invite your trusted contractors and partners to join the network.
                </p>
                <Link href="/invitations">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Send Invitations
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Company Setup CTA */}
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-4 text-center">
                <Briefcase className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold">Add Your Company</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Want to register your company? Contact us to get set up.
                </p>
                <Link href="/contact">
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
