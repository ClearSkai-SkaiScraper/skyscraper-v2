"use client";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { ExternalLink, MapPin, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CompanyProfile {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  rating?: number;
  reviewCount?: number;
  specialties?: string[];
  verified?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortalProfilesPage() {
  const { user } = useUser();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfiles = async () => {
      try {
        const res = await fetch("/api/portal/profiles");
        if (res.ok) {
          const data = await res.json();
          setProfiles(data.profiles ?? data ?? []);
        }
      } catch {
        // silently fail — empty state will show
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [user]);

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <PortalPageHero
        title="Company Profiles"
        subtitle="Browse contractors and restoration companies in your network."
        icon={Users}
        gradient="violet"
        stats={[{ label: "Companies", value: profiles.length }]}
      />

      {profiles.length === 0 ? (
        /* ── Empty state ───────────────────────────────────── */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 p-4 dark:from-violet-900/40 dark:to-purple-900/40">
              <Users className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No company profiles yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Companies you connect with will appear here. Browse the marketplace to find
              restoration pros.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <a href="/portal/find-a-pro">Find a Pro →</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ── Profile grid ──────────────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Card                                                       */
/* ------------------------------------------------------------------ */

function ProfileCard({ profile }: { profile: CompanyProfile }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900 dark:text-white">
              {profile.name}
            </h3>
            {(profile.city || profile.state) && (
              <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="h-3 w-3" />
                {[profile.city, profile.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          {profile.verified && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              Verified
            </Badge>
          )}
        </div>

        {profile.rating != null && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{profile.rating.toFixed(1)}</span>
            {profile.reviewCount != null && (
              <span className="text-slate-400">({profile.reviewCount})</span>
            )}
          </div>
        )}

        {profile.specialties && profile.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.specialties.slice(0, 3).map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">
                {s}
              </Badge>
            ))}
            {profile.specialties.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{profile.specialties.length - 3}
              </Badge>
            )}
          </div>
        )}

        <Button variant="ghost" size="sm" className="w-full" asChild>
          <a href={`/portal/profiles/${profile.id}`}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            View Profile
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
