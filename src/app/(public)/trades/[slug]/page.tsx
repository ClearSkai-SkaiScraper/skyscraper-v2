/*
 * Trades Network - Public Company Profile Page
 * /trades/[slug]
 *
 * Features:
 * - Public company profile (no auth required)
 * - Bio, specialties, certifications
 * - Active feed (public posts)
 * - Auth-gated Connect/Message buttons → redirect to sign-up
 */

import {
  Award,
  Building2,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  UserCircle,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: { slug: string };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  // First try to find a tradesCompany by slug
  const company = await prisma.tradesCompany
    .findUnique({
      where: { slug: params.slug },
      include: { members: { take: 1, where: { isAdmin: true } } },
    })
    .catch(() => null);

  // Map company to profile-like object for UI compatibility
  const profile = company
    ? {
        id: company.id,
        contactName: company.name,
        companyName: company.name,
        logoUrl: company.logo,
        bio: company.description,
        phone: company.phone,
        email: company.email,
        city: company.city,
        state: company.state,
        verified: company.isVerified,
        rating: company.rating ? Number(company.rating) : null,
        specialties: company.specialties || [],
        certifications: [],
        active: company.isActive,
      }
    : null;

  if (!profile) {
    notFound();
  }

  // Load public feed posts for this company
  let posts: any[] = [];
  try {
    const feedPosts = await prisma.tradesPost.findMany({
      where: {
        companyId: company?.id ?? undefined,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        content: true,
        postType: true,
        images: true,
        title: true,
        createdAt: true,
      },
    });
    posts = feedPosts;
  } catch {
    /* table may not exist yet */
  }

  const specialties = Array.isArray(profile.specialties) ? profile.specialties : [];
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="flex items-start gap-6">
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt={profile.contactName}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <UserCircle className="h-12 w-12 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold text-slate-900">{profile.contactName}</h1>
              {profile.companyName && (
                <div className="mb-2 flex items-center gap-2 text-slate-600">
                  <Building2 className="h-4 w-4" />
                  {profile.companyName}
                </div>
              )}
              {(profile.city || profile.state) && (
                <div className="mb-2 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.city}
                  {profile.city && profile.state && ", "}
                  {profile.state}
                </div>
              )}
              <div className="flex items-center gap-3">
                {profile.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                    <Award className="h-4 w-4" />
                    Verified
                  </span>
                )}
                {profile.rating && (
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <Star className="h-4 w-4 fill-current" />
                    {profile.rating.toFixed(1)}
                  </div>
                )}
              </div>
            </div>

            {/* Auth-gated CTAs */}
            <div className="hidden flex-col gap-2 sm:flex">
              <Link
                href={`/sign-up?redirect_url=/trades`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Connect
              </Link>
              <Link
                href={`/sign-in?redirect_url=/trades/messages`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* About */}
            {profile.bio && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-3 text-xl font-semibold text-slate-900">About</h2>
                <p className="leading-relaxed text-slate-600">{profile.bio}</p>
              </div>
            )}

            {/* Specialties */}
            {specialties.length > 0 && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-semibold text-slate-900">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((specialty, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <Award className="h-5 w-5" />
                  Certifications
                </h2>
                <ul className="space-y-2">
                  {certifications.map((cert, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-600">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Activity Feed */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900">
                <MessageCircle className="h-5 w-5" />
                Activity Feed
              </h2>
              {posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="mb-2 text-slate-700">{post.content}</p>
                      {post.images && post.images.length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {post.images.slice(0, 3).map((img: string, i: number) => (
                            <img
                              key={i}
                              src={img}
                              alt={`Post ${i + 1}`}
                              className="h-32 w-full rounded object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>
                          {new Date(post.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {post.likes > 0 && <span>👍 {post.likes}</span>}
                        {post.comments > 0 && <span>💬 {post.comments}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No public posts yet. Check back later for updates.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Contact Info */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Contact</h2>
              <div className="space-y-3">
                {profile.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <a href={`tel:${profile.phone}`} className="hover:text-blue-600">
                      {profile.phone}
                    </a>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${profile.email}`} className="hover:text-blue-600">
                      {profile.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {(profile.city || profile.state) && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <MapPin className="h-4 w-4" />
                  Location
                </h2>
                <p className="text-slate-600">
                  {profile.city}
                  {profile.city && profile.state && ", "}
                  {profile.state}
                </p>
              </div>
            )}

            {/* CTA Card */}
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white">
              <h3 className="mb-2 text-lg font-bold">Join the Network</h3>
              <p className="mb-4 text-sm text-blue-100">
                Connect with {profile.contactName} and thousands of trade professionals.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Join Free
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
