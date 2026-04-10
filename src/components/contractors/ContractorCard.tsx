"use client";

import Link from "next/link";

import { StarRating } from "@/components/reviews/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Service = {
  name: string;
  description?: string;
};

type ServiceArea = {
  zipCode?: string;
  city?: string;
  state?: string;
};

type ContractorCardProps = {
  slug: string;
  businessName: string;
  logoUrl?: string | null;
  tagline?: string | null;
  serviceAreas?: ServiceArea[];
  services?: Service[];
  verified?: boolean;
  emergencyAvailable?: boolean;
  emergencyReady?: boolean;
  featured?: boolean;
  featuredUntil?: string | null;
  totalJobs?: number;
  trustScore?: number;
  licenseVerified?: boolean;
  insuranceVerified?: boolean;
  businessVerified?: boolean;
  emailVerified?: boolean;
  averageRating?: number;
  totalReviews?: number;
};

export function ContractorCard({
  slug,
  businessName,
  logoUrl,
  tagline,
  serviceAreas = [],
  services = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verified = false,
  emergencyAvailable = false,
  emergencyReady = false,
  featured = false,
  featuredUntil,
  totalJobs = 0,
  trustScore = 0,
  licenseVerified = false,
  insuranceVerified = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  businessVerified = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emailVerified = false,
  averageRating = 0,
  totalReviews = 0,
}: ContractorCardProps) {
  // Calculate if contractor is verified based on trust score
  const isVerified = trustScore >= 70;
  const isFeatured = featuredUntil ? new Date(featuredUntil) > new Date() : featured;
  const primaryLocation = serviceAreas[0];
  const locationText = primaryLocation?.city && primaryLocation?.state
    ? `${primaryLocation.city}, ${primaryLocation.state}`
    : primaryLocation?.zipCode
    ? `ZIP ${primaryLocation.zipCode}`
    : "Service area available";

  const servicesList = services.slice(0, 3).map((s) => s.name).join(", ");
  const moreServices = services.length > 3 ? ` +${services.length - 3} more` : "";

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
        isFeatured ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white" : "border-slate-200"
      }`}
    >
      {isFeatured && (
        <div className="absolute right-0 top-0 z-10">
          <div className="rounded-bl-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
            ⭐ Featured
          </div>
        </div>
      )}

      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <div className="p-4">
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <div className="flex items-start gap-4">
          // eslint-disable-next-line @next/next/no-img-element
          {/* Logo */}
          <Link href={`/c/${slug}`} className="shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-16 w-16 rounded-lg border border-slate-200 object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xl font-bold text-slate-600">
                {businessName.charAt(0)}
              </div>
            )}
          </Link>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div>
              <Link
                href={`/c/${slug}`}
                className="group-hover:underline"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {businessName}
                </h3>
              </Link>
              {tagline && (
                <p className="text-sm text-slate-600">{tagline}</p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              {isVerified && (
                <Badge variant="secondary" className="bg-emerald-100 font-medium text-emerald-700">
                  ✓ Verified
                </Badge>
              )}
              {(emergencyReady || emergencyAvailable) && (
                <Badge variant="secondary" className="bg-red-100 font-medium text-red-700">
                  🚨 24/7 Emergency
                </Badge>
              )}
              {licenseVerified && (
                <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                  License ✓
                </Badge>
              )}
              {insuranceVerified && (
                <Badge variant="outline" className="border-blue-300 text-blue-700">
                  Insured ✓
                </Badge>
              )}
              {totalJobs > 0 && (
                <Badge variant="outline" className="text-slate-600">
                  {totalJobs} jobs completed
                </Badge>
              )}
            </div>

            {/* Services */}
            {services.length > 0 && (
              <p className="text-sm text-slate-600">
                <span className="font-medium">Services:</span> {servicesList}
                {moreServices}
              </p>
            )}

            {/* Location */}
            <p className="text-xs text-slate-500">
              📍 {locationText}
            </p>

            {/* Rating */}
            {totalReviews > 0 && (
              <div className="flex items-center gap-2">
                <StarRating value={averageRating} readonly size="sm" />
                <span className="text-sm font-medium text-slate-700">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">
                  ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Link href={`/request/${slug}`} className="flex-1">
            <Button className="w-full bg-sky-600 hover:bg-sky-700">
              Request Service
            </Button>
          </Link>
          <Link href={`/c/${slug}`}>
            <Button variant="outline">View Profile</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
