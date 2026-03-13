/**
 * VIN — Vendor Detail Page (slug-based)
 * Full vendor profile with locations, products, programs, assets
 */

import { ArrowLeft, Globe, MapPin, Package, Phone, ShieldCheck, Star, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { TRADE_TYPE_LABELS, VENDOR_TYPE_LABELS } from "@/lib/vendors/vin-types";

import { VendorLogo } from "../_components/VendorLogo";
import { VendorDetailTabs } from "./_components/VendorDetailTabs";

interface Props {
  params: { vendorSlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vendor = await prisma.vendor.findFirst({
    where: { slug: params.vendorSlug },
    select: { name: true },
  });
  return { title: vendor ? `${vendor.name} — Vendor Network` : "Vendor Not Found" };
}

export default async function VendorDetailPage({ params }: Props) {
  let vendor;
  try {
    vendor = await prisma.vendor.findFirst({
      where: { slug: params.vendorSlug },
      include: {
        VendorLocation: { orderBy: { city: "asc" } },
        VendorContact: { orderBy: { isPrimary: "desc" } },
        vendor_products_v2: { where: { isActive: true }, take: 50 },
        vendor_assets: { where: { isActive: true }, take: 50 },
        vendor_programs: { where: { isActive: true }, take: 50 },
      },
    });
  } catch (err) {
    // Prisma query error — vendor not found
    return notFound();
  }

  if (!vendor) return notFound();

  const primaryLocation = vendor.VendorLocation[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Back link */}
      <Link
        href="/vendor-network"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Vendor Network
      </Link>

      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
          {/* Logo */}
          <VendorLogo logo={vendor.logo} name={vendor.name} website={vendor.website} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{vendor.name}</h1>
                  {vendor.isVerified && (
                    <Badge
                      variant="secondary"
                      className="border-green-200 bg-green-50 text-green-700"
                    >
                      <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                    </Badge>
                  )}
                  {vendor.isFeatured && (
                    <Badge
                      variant="secondary"
                      className="border-amber-200 bg-amber-50 text-amber-700"
                    >
                      <Star className="mr-1 h-3 w-3" /> Featured
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{vendor.category}</p>
              </div>

              <div className="flex gap-2">
                {vendor.primaryPhone && (
                  <a href={`tel:${vendor.primaryPhone}`}>
                    <Button variant="outline" size="sm">
                      <Phone className="mr-2 h-4 w-4" /> Call
                    </Button>
                  </a>
                )}
                {vendor.website && (
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Globe className="mr-2 h-4 w-4" /> Website
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {vendor.description && (
              <p className="mt-3 text-sm text-muted-foreground">{vendor.description}</p>
            )}

            {/* Trade & Type badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              {((vendor.tradeTypes as string[]) ?? []).map((t: string) => (
                <Badge key={t} variant="outline">
                  {TRADE_TYPE_LABELS[t as keyof typeof TRADE_TYPE_LABELS] || t}
                </Badge>
              ))}
              {((vendor.vendorTypes as string[]) ?? []).map((vt: string) => (
                <span
                  key={vt}
                  className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {VENDOR_TYPE_LABELS[vt as keyof typeof VENDOR_TYPE_LABELS] || vt}
                </span>
              ))}
            </div>

            {/* Quick stats */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {vendor.rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {Number(vendor.rating).toFixed(1)} ({vendor.reviewCount ?? 0} reviews)
                </span>
              )}
              {primaryLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {[primaryLocation.city, primaryLocation.state].filter(Boolean).join(", ")}
                </span>
              )}
              {vendor.deliveryRadiusMi && (
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  {vendor.deliveryRadiusMi} mi delivery
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {vendor.VendorLocation.length} locations
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {vendor.vendor_products_v2.length} products
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabbed Content */}
      <VendorDetailTabs
        vendor={{
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
          emergencyPhone: vendor.emergencyPhone,
          financingAvail: vendor.financingAvail ?? false,
          rebatesAvail: vendor.rebatesAvail ?? false,
          certifications: (vendor.certifications as string[]) ?? [],
          serviceRegions: (vendor.serviceRegions as string[]) ?? [],
        }}
        locations={vendor.VendorLocation.map((l) => ({
          id: l.id,
          locationName: l.name,
          address: l.address,
          city: l.city,
          state: l.state,
          zip: l.zip,
          phone: l.phone,
          email: l.email,
          hours: l.hours as Record<string, string> | null,
          isPrimary: false,
          deliveryRadiusMi: l.deliveryRadiusMi ?? null,
          localRepName: l.localRepName ?? null,
          localRepPhone: l.localRepPhone ?? null,
          emergencyPhone: l.emergencyPhone ?? null,
        }))}
        products={vendor.vendor_products_v2.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          unitPrice: p.priceRangeLow ? Number(p.priceRangeLow) : null,
          unit: p.unit,
          inStock: p.inStock ?? true,
          tradeType: p.tradeType,
        }))}
        programs={vendor.vendor_programs.map((pr) => ({
          id: pr.id,
          name: pr.name,
          programType: pr.programType,
          description: pr.description,
          discountPct: pr.percentOff ? Number(pr.percentOff) : null,
          url: pr.applicationUrl,
          startsAt: pr.validFrom?.toISOString() ?? null,
          endsAt: pr.validTo?.toISOString() ?? null,
        }))}
        assets={vendor.vendor_assets.map((a) => ({
          id: a.id,
          assetType: a.type,
          label: a.title,
          url: a.pdfUrl,
          fileSize: a.fileSize ? parseInt(a.fileSize, 10) : null,
        }))}
      />
    </div>
  );
}
