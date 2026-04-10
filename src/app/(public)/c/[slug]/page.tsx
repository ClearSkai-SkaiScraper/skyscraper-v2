import { auth } from "@clerk/nextjs/server";
import { LogIn, MessageCircle, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReviewList } from "@/components/reviews/ReviewList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function getContractor(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/contractors/public/get?slug=${slug}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    return json.contractor || null;
  } catch (_err) {
    return null;
  }
}

export default async function ContractorPage({ params }: { params: { slug: string } }) {
  const contractor = await getContractor(params.slug);
  const { userId } = await auth();

  if (!contractor) return notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      {/* Top Info Section */}
      <div className="flex flex-col gap-8 sm:flex-row">
        {/* Logo */}
        <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl border">
          {contractor.logoUrl ? (
            <Image
              src={contractor.logoUrl}
              alt={contractor.businessName}
              width={120}
              height={120}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-500">
              No Logo
            </div>
          )}
        </div>

        {/* Business Info */}
        <div className="flex-1 space-y-2">
          <h1 className="text-4xl font-bold">{contractor.businessName}</h1>

          {/* Phase 22.7: Verification Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            {contractor.trustScore >= 70 && (
              <Badge className="bg-emerald-100 text-sm font-semibold text-emerald-700">
                ✓ Verified Contractor
              </Badge>
            )}
            {contractor.featuredUntil && new Date(contractor.featuredUntil) > new Date() && (
              <Badge className="bg-amber-100 text-sm font-semibold text-amber-700">
                ⭐ Featured
              </Badge>
            )}
            {(contractor.emergencyReady || contractor.emergencyAvailable) && (
              <Badge className="bg-red-100 text-sm font-semibold text-red-700">
                🚨 24/7 Emergency Services
              </Badge>
            )}
            {contractor.licenseVerified && (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                License Verified
              </Badge>
            )}
            {contractor.insuranceVerified && (
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                Insurance Verified
              </Badge>
            )}
            {contractor.businessVerified && (
              <Badge variant="outline" className="border-purple-300 text-purple-700">
                Business Verified
              </Badge>
            )}
          </div>

          <p className="text-lg text-gray-600">{contractor.primaryTrade}</p>

          {contractor.city && contractor.state && (
            <p className="text-gray-500">
              Serving: {contractor.city}, {contractor.state}
            </p>
          )}

          {/* Trade badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            {contractor.trades?.map((t: string) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>

          {/* CTA Buttons — auth-gated */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <Link href="/sign-up?redirect_url=/trades" className="w-full sm:w-auto">
              <Button className="w-full" size="lg">
                <UserPlus className="mr-2 h-4 w-4" />
                Connect
              </Button>
            </Link>

            <Link href="/sign-in?redirect_url=/trades/messages" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* About Section */}
      {contractor.about && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">About</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{contractor.about}</p>
        </div>
      )}

      {/* Service Areas */}
      {contractor.serviceAreas?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Service Areas</h2>
          <div className="flex flex-wrap gap-2">
            {contractor.serviceAreas.map((area: string) => (
              <Badge key={area} variant="outline">
                {area}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio */}
      {contractor.portfolio?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Portfolio</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {contractor.portfolio.map((url: string, i: number) => (
              <div key={i} className="h-40 w-full overflow-hidden rounded-lg border">
                <Image
                  src={url}
                  alt="Portfolio Image"
                  width={300}
                  height={300}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-2 border-t pt-6">
        <h2 className="text-2xl font-semibold">Contact</h2>

        {contractor.phone && <p className="text-gray-700">📞 {contractor.phone}</p>}

        {contractor.email && <p className="text-gray-700">📧 {contractor.email}</p>}

        {contractor.website && (
          <p className="text-gray-700">
            🌐{" "}
            <a href={contractor.website} target="_blank" className="text-blue-600 underline">
              {contractor.website}
            </a>
          </p>
        )}
      </div>

      {/* Reviews Section */}
      <div className="space-y-6 border-t pt-6">
        <h2 className="text-2xl font-semibold">Reviews</h2>

        {/* Review Form (only if authenticated) */}
        {userId && <ReviewForm contractorId={contractor.id} publicLeadId={null} />}

        {/* Review List */}
        <ReviewList contractorId={contractor.id} />
      </div>

      {/* CTA Banner */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white">
        <h3 className="mb-2 text-2xl font-bold">Want to work with {contractor.businessName}?</h3>
        <p className="mb-6 text-blue-100">
          Join SkaiScraper to connect, message, and request services from top trade professionals.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-blue-600 transition hover:bg-blue-50"
          >
            <UserPlus className="h-4 w-4" />
            Join Free
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
