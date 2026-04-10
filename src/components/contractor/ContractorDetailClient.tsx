"use client";

import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Share2,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string | null;
  createdAt: string;
}

interface ContractorDetailClientProps {
  contractor: {
    id: string;
    slug: string;
    businessName: string;
    tagline: string | null;
    about: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    primaryTrade: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    services: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceAreas: any;
    phone: string | null;
    email: string | null;
    website: string | null;
    avgRating: number | null;
    totalReviews: number;
    verificationStatus: string | null;
    licensedInsured: boolean;
    licenseNumber: string | null;
    emergencyAvailable: boolean;
    acceptingLeads: boolean;
    yearsInBusiness: number | null;
    reviews: Review[];
  };
}

export default function ContractorDetailClient({ contractor }: ContractorDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"about" | "reviews" | "contact">("about");

  const services = Array.isArray(contractor.services)
    ? contractor.services
    : typeof contractor.services === "string"
    ? JSON.parse(contractor.services || "[]")
    : [];

  const serviceAreas = Array.isArray(contractor.serviceAreas)
    ? contractor.serviceAreas
    : typeof contractor.serviceAreas === "string"
    ? JSON.parse(contractor.serviceAreas || "[]")
    : [];

  const rating = contractor.avgRating || 0;
  const reviewCount = contractor.totalReviews || 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Cover Image / Header */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] md:h-80">
        {contractor.coverImageUrl ? (
          <Image
            src={contractor.coverImageUrl}
            alt={`${contractor.businessName} cover`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-80" />
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back button */}
        <div className="absolute left-6 top-6">
          <Link
            href="/network"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-white backdrop-blur-md transition hover:bg-white/20"
          >
            ← Back to Network
          </Link>
        </div>

        {/* Share button */}
        <div className="absolute right-6 top-6">
          <button className="rounded-xl bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/20">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container relative z-10 mx-auto -mt-20 px-4 pb-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Sidebar - Profile Info */}
          <div className="space-y-6 lg:col-span-1">
            {/* Profile Card */}
            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-xl">
              {/* Logo */}
              <div className="relative mx-auto -mt-20 mb-4 h-32 w-32 overflow-hidden rounded-2xl border-4 border-[var(--surface-1)] bg-white shadow-xl dark:bg-gray-800">
                {contractor.logoUrl ? (
                  <Image
                    src={contractor.logoUrl}
                    alt={`${contractor.businessName} logo`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl font-bold text-[color:var(--primary)]">
                    {contractor.businessName.charAt(0)}
                  </div>
                )}
              </div>

              {/* Business Name */}
              <h1 className="mb-2 text-center text-2xl font-bold text-[color:var(--text)]">
                {contractor.businessName}
              </h1>

              {/* Tagline */}
              {contractor.tagline && (
                <p className="mb-4 text-center text-sm text-[color:var(--muted)]">
                  {contractor.tagline}
                </p>
              )}

              {/* Rating */}
              {reviewCount > 0 && (
                <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-2)] p-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-[color:var(--text)]">
                    {rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-[color:var(--muted)]">
                    ({reviewCount} reviews)
                  </span>
                </div>
              )}

              {/* Status Badges */}
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                {contractor.verificationStatus === "VERIFIED" && (
                  <Badge className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
                {contractor.licensedInsured && (
                  <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    <Shield className="h-3 w-3" />
                    Licensed & Insured
                  </Badge>
                )}
                {contractor.emergencyAvailable && (
                  <Badge className="flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    <Clock className="h-3 w-3" />
                    24/7 Available
                  </Badge>
                )}
                {contractor.acceptingLeads && (
                  <Badge className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    <TrendingUp className="h-3 w-3" />
                    Accepting Leads
                  </Badge>
                )}
              </div>

              {/* CTA Button */}
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
                size="lg"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Request Quote
              </Button>
            </div>

            {/* Contact Info Card */}
            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-[color:var(--text)]">
                <Phone className="h-5 w-5 text-[color:var(--primary)]" />
                Contact Information
              </h3>
              <div className="space-y-3">
                {contractor.phone && (
                  <a
                    href={`tel:${contractor.phone}`}
                    className="flex items-center gap-3 rounded-xl p-3 text-[color:var(--text)] transition hover:bg-[var(--surface-2)]"
                  >
                    <Phone className="h-4 w-4 text-[color:var(--muted)]" />
                    <span className="text-sm">{contractor.phone}</span>
                  </a>
                )}
                {contractor.email && (
                  <a
                    href={`mailto:${contractor.email}`}
                    className="flex items-center gap-3 rounded-xl p-3 text-[color:var(--text)] transition hover:bg-[var(--surface-2)]"
                  >
                    <Mail className="h-4 w-4 text-[color:var(--muted)]" />
                    <span className="break-all text-sm">{contractor.email}</span>
                  </a>
                )}
                {contractor.website && (
                  <a
                    href={contractor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl p-3 text-[color:var(--text)] transition hover:bg-[var(--surface-2)]"
                  >
                    <Globe className="h-4 w-4 text-[color:var(--muted)]" />
                    <span className="truncate text-sm">{contractor.website}</span>
                    <ExternalLink className="ml-auto h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Service Areas Card */}
            {serviceAreas.length > 0 && (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-[color:var(--text)]">
                  <MapPin className="h-5 w-5 text-[color:var(--primary)]" />
                  Service Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((area: string, idx: number) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-[color:var(--border)] bg-[var(--surface-2)] text-[color:var(--text)]"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Content - Tabs */}
          <div className="space-y-6 lg:col-span-2">
            {/* Tab Navigation */}
            <div className="flex gap-2 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-2">
              <button
                onClick={() => setActiveTab("about")}
                className={`flex-1 rounded-xl px-4 py-3 font-medium transition ${
                  activeTab === "about"
                    ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg"
                    : "text-[color:var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Award className="mr-2 inline h-4 w-4" />
                About
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`flex-1 rounded-xl px-4 py-3 font-medium transition ${
                  activeTab === "reviews"
                    ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg"
                    : "text-[color:var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Star className="mr-2 inline h-4 w-4" />
                Reviews ({reviewCount})
              </button>
              <button
                onClick={() => setActiveTab("contact")}
                className={`flex-1 rounded-xl px-4 py-3 font-medium transition ${
                  activeTab === "contact"
                    ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg"
                    : "text-[color:var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <MessageSquare className="mr-2 inline h-4 w-4" />
                Contact
              </button>
            </div>

            {/* Tab Content */}
            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8">
              {activeTab === "about" && (
                <div className="space-y-8">
                  {/* About Section */}
                  {contractor.about && (
                    <div>
                      <h2 className="mb-4 text-2xl font-bold text-[color:var(--text)]">
                        About Us
                      </h2>
                      <p className="whitespace-pre-wrap leading-relaxed text-[color:var(--text)]">
                        {contractor.about}
                      </p>
                    </div>
                  )}

                  {/* Primary Trade & Experience */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {contractor.primaryTrade && (
                      <div className="rounded-xl bg-[var(--surface-2)] p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-[color:var(--primary)]" />
                          <span className="text-sm font-medium text-[color:var(--muted)]">
                            Primary Trade
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-[color:var(--text)]">
                          {contractor.primaryTrade}
                        </p>
                      </div>
                    )}
                    {contractor.yearsInBusiness && (
                      <div className="rounded-xl bg-[var(--surface-2)] p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-[color:var(--primary)]" />
                          <span className="text-sm font-medium text-[color:var(--muted)]">
                            Experience
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-[color:var(--text)]">
                          {contractor.yearsInBusiness} Years
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  {services.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-xl font-bold text-[color:var(--text)]">
                        Services Offered
                      </h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {services.map((service: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] p-4"
                          >
                            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                            <span className="font-medium text-[color:var(--text)]">{service}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* License Info */}
                  {contractor.licenseNumber && (
                    <div className="rounded-xl border-2 border-[color:var(--border)] bg-[var(--surface-2)] p-6">
                      <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-[color:var(--primary)]" />
                        <div>
                          <p className="text-sm text-[color:var(--muted)]">License Number</p>
                          <p className="font-mono font-bold text-[color:var(--text)]">
                            {contractor.licenseNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-[color:var(--text)]">
                    Client Reviews
                  </h2>
                  
                  {contractor.reviews.length === 0 ? (
                    <div className="py-12 text-center">
                      <Star className="mx-auto mb-4 h-16 w-16 text-[color:var(--muted)]" />
                      <p className="text-[color:var(--muted)]">No reviews yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contractor.reviews.map((review) => (
                        <div
                          key={review.id}
                          className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] p-6"
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-[color:var(--text)]">
                                {review.reviewerName || "Anonymous"}
                              </p>
                              <p className="text-sm text-[color:var(--muted)]">
                                {new Date(review.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="leading-relaxed text-[color:var(--text)]">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "contact" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-[color:var(--text)]">
                    Get in Touch
                  </h2>
                  <div className="rounded-xl border-2 border-[color:var(--border)] bg-[var(--surface-2)] p-8 text-center">
                    <MessageSquare className="mx-auto mb-4 h-16 w-16 text-[color:var(--primary)]" />
                    <h3 className="mb-2 text-xl font-bold text-[color:var(--text)]">
                      Request a Quote
                    </h3>
                    <p className="mb-6 text-[color:var(--muted)]">
                      Contact {contractor.businessName} for a free consultation and quote
                    </p>
                    <div className="space-y-3">
                      {contractor.phone && (
                        <a
                          href={`tel:${contractor.phone}`}
                          className="block w-full rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-semibold text-white transition hover:scale-[1.02]"
                        >
                          <Phone className="mr-2 inline h-4 w-4" />
                          Call {contractor.phone}
                        </a>
                      )}
                      {contractor.email && (
                        <a
                          href={`mailto:${contractor.email}`}
                          className="block w-full rounded-xl border-2 border-[color:var(--primary)] px-6 py-3 font-semibold text-[color:var(--primary)] transition hover:bg-[color:var(--primary)] hover:text-white"
                        >
                          <Mail className="mr-2 inline h-4 w-4" />
                          Email Us
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
