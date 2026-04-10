"use client";

import { 
  Award,
  CheckCircle, 
  Clock,
  Mail,
  MapPin, 
  Phone,
  Shield, 
  Star, 
  TrendingUp} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

interface ContractorSocialCardProps {
  contractor: {
    id: string;
    slug: string;
    businessName: string;
    tagline?: string | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    primaryTrade?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    services: string[] | any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceAreas: string[] | any;
    phone?: string | null;
    email?: string | null;
    avgRating?: number | null;
    totalReviews: number;
    verificationStatus?: string | null;
    licensedInsured: boolean;
    emergencyAvailable: boolean;
    acceptingLeads: boolean;
    yearsInBusiness?: number | null;
    // Professional Identity fields (Master Prompt #56)
    headshotUrl?: string | null;
    bio?: string | null;
    yearsExperience?: number | null;
    testimonialCount?: number;
    certificationCount?: number;
  };
}

export default function ContractorSocialCard({ contractor }: ContractorSocialCardProps) {
  // Parse services if they're JSON
  const services = Array.isArray(contractor.services) 
    ? contractor.services 
    : typeof contractor.services === 'string'
    ? JSON.parse(contractor.services || '[]')
    : [];

  // Parse service areas if they're JSON
  const serviceAreas = Array.isArray(contractor.serviceAreas)
    ? contractor.serviceAreas
    : typeof contractor.serviceAreas === 'string'
    ? JSON.parse(contractor.serviceAreas || '[]')
    : [];

  const rating = contractor.avgRating || 0;
  const reviewCount = contractor.totalReviews || 0;

  // Verification badge
  const getVerificationBadge = () => {
    if (contractor.verificationStatus === "VERIFIED") {
      return (
        <Badge className="flex items-center gap-1 border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    if (contractor.licensedInsured) {
      return (
        <Badge className="flex items-center gap-1 border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          <Shield className="h-3 w-3" />
          Licensed
        </Badge>
      );
    }
    return null;
  };

  return (
    <Link href={`/directory/${contractor.slug}`}>
      <div className="hover:shadow-[color:var(--primary)]/20 group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--primary)] hover:shadow-2xl">
        {/* Cover Image */}
        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]">
          {contractor.coverImageUrl ? (
            <Image
              src={contractor.coverImageUrl}
              alt={`${contractor.businessName} cover`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-60" />
          )}
          
          {/* Status Badges - Top Right */}
          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
            {getVerificationBadge()}
            {contractor.emergencyAvailable && (
              <Badge className="flex items-center gap-1 border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                <Clock className="h-3 w-3" />
                24/7
              </Badge>
            )}
            {contractor.acceptingLeads && (
              <Badge className="flex items-center gap-1 border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                <TrendingUp className="h-3 w-3" />
                Accepting Leads
              </Badge>
            )}
          </div>
        </div>

        {/* Profile Content */}
        <div className="relative px-6 pb-6">
          {/* Logo/Avatar - Overlapping cover (use headshot if available) */}
          <div className="-mt-12 mb-4 flex items-start gap-4">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--surface-1)] bg-white shadow-xl dark:bg-gray-800">
              {contractor.headshotUrl ? (
                <Image
                  src={contractor.headshotUrl}
                  alt={`${contractor.businessName} profile`}
                  fill
                  className="object-cover"
                />
              ) : contractor.logoUrl ? (
                <Image
                  src={contractor.logoUrl}
                  alt={`${contractor.businessName} logo`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-bold text-[color:var(--primary)]">
                  {contractor.businessName.charAt(0)}
                </div>
              )}
            </div>

            {/* Rating */}
            {reviewCount > 0 && (
              <div className="mt-14 flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-[color:var(--text)]">
                  {rating.toFixed(1)}
                </span>
                <span className="text-sm text-[color:var(--muted)]">
                  ({reviewCount})
                </span>
              </div>
            )}
          </div>

          {/* Business Info */}
          <div className="space-y-3">
            <div>
              <h3 className="line-clamp-1 text-xl font-bold text-[color:var(--text)] transition-colors group-hover:text-[color:var(--primary)]">
                {contractor.businessName}
              </h3>
              {contractor.tagline && (
                <p className="mt-1 line-clamp-2 text-sm text-[color:var(--muted)]">
                  {contractor.tagline}
                </p>
              )}
            </div>

            {/* Primary Trade */}
            {contractor.primaryTrade && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-[color:var(--primary)]" />
                <span className="text-sm font-semibold text-[color:var(--text)]">
                  {contractor.primaryTrade}
                </span>
                {(contractor.yearsExperience || contractor.yearsInBusiness) && (
                  <span className="text-xs text-[color:var(--muted)]">
                    • {contractor.yearsExperience || contractor.yearsInBusiness} years
                  </span>
                )}
              </div>
            )}
            
            {/* Professional Credentials (Master Prompt #56) */}
            {(contractor.testimonialCount || contractor.certificationCount) && (
              <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
                {contractor.testimonialCount && contractor.testimonialCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{contractor.testimonialCount} testimonial{contractor.testimonialCount > 1 ? 's' : ''}</span>
                  </div>
                )}
                {contractor.certificationCount && contractor.certificationCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 text-blue-500" />
                    <span>{contractor.certificationCount} certification{contractor.certificationCount > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            )}

            {/* Service Areas */}
            {serviceAreas.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[color:var(--muted)]" />
                <p className="line-clamp-1 text-sm text-[color:var(--muted)]">
                  {serviceAreas.slice(0, 3).join(", ")}
                  {serviceAreas.length > 3 && ` +${serviceAreas.length - 3} more`}
                </p>
              </div>
            )}

            {/* Services/Skills Tags */}
            {services.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {services.slice(0, 4).map((service: string, idx: number) => (
                  <Badge 
                    key={idx}
                    variant="outline"
                    className="border-[color:var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text)]"
                  >
                    {service}
                  </Badge>
                ))}
                {services.length > 4 && (
                  <Badge 
                    variant="outline"
                    className="border-[color:var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[color:var(--muted)]"
                  >
                    +{services.length - 4} more
                  </Badge>
                )}
              </div>
            )}

            {/* Quick Contact */}
            <div className="flex items-center gap-4 border-t border-[color:var(--border)] pt-3">
              {contractor.phone && (
                <div className="flex items-center gap-1 text-xs text-[color:var(--muted)]">
                  <Phone className="h-3 w-3" />
                  <span className="line-clamp-1">{contractor.phone}</span>
                </div>
              )}
              {contractor.email && (
                <div className="flex items-center gap-1 text-xs text-[color:var(--muted)]">
                  <Mail className="h-3 w-3" />
                  <span className="line-clamp-1">{contractor.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hover Effect Gradient */}
          <div className="from-[color:var(--primary)]/5 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}
