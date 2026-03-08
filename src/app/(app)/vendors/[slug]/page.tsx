"use client";

import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  Shield,
  Star,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VendorLogo } from "@/components/vendors/VendorLogo";
import { getVendorResources } from "@/lib/vendors/vendorResources";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import VendorLocationMap from "./_components/VendorLocationMap";

interface VendorLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  email: string | null;
  hours: Record<string, string> | null;
  lat: string | null;
  lng: string | null;
  deliveryRadiusMi: number | null;
  localRepName: string | null;
  localRepPhone: string | null;
  emergencyPhone: string | null;
  contacts: VendorContact[];
}

interface VendorContact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  territory: string[];
  isPrimary: boolean;
}

interface VendorResource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string;
  fileSize: string | null;
  format: string | null;
  category: string | null;
  tags: string[];
}

interface Vendor {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  website: string | null;
  category: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
  emergencyPhone: string | null;
  tradeTypes: string[];
  vendorTypes: string[];
  serviceRegions: string[];
  rating: number | null;
  reviewCount: number;
  deliveryRadiusMi: number | null;
  financingAvail: boolean;
  rebatesAvail: boolean;
  certifications: string[];
  foundedYear: number | null;
  locations: VendorLocation[];
  resources: VendorResource[];
}

const DAYS_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export default function VendorDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchVendor();
  }, [slug]);

  const fetchVendor = async () => {
    try {
      const response = await fetch(`/api/vendors/${slug}`);
      if (!response.ok) throw new Error("Vendor not found");
      const data = await response.json();

      // Merge database resources with registry resources
      const registryResources = getVendorResources(slug);
      const mergedResources = [
        ...registryResources.map((r) => ({
          ...r,
          type: r.category,
        })),
        ...(data.vendor.resources || []),
      ];

      setVendor({
        ...data.vendor,
        tradeTypes: data.vendor.tradeTypes || [],
        vendorTypes: data.vendor.vendorTypes || [],
        serviceRegions: data.vendor.serviceRegions || [],
        certifications: data.vendor.certifications || [],
        reviewCount: data.vendor.reviewCount || 0,
        resources: mergedResources,
      });
    } catch (error) {
      logger.error("Failed to fetch vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} link copied to clipboard`);
  };

  // Group locations by AZ region
  const groupLocationsByRegion = (locations: VendorLocation[]) => {
    const regionMap: Record<string, VendorLocation[]> = {
      "Northern Arizona": [],
      "Central Arizona": [],
      "Southern Arizona": [],
    };

    locations.forEach((loc) => {
      const city = loc.city.toLowerCase();
      if (
        city.includes("flagstaff") ||
        city.includes("prescott") ||
        city.includes("sedona") ||
        city.includes("show low") ||
        city.includes("page") ||
        city.includes("kingman")
      ) {
        regionMap["Northern Arizona"].push(loc);
      } else if (
        city.includes("tucson") ||
        city.includes("sierra vista") ||
        city.includes("yuma") ||
        city.includes("nogales") ||
        city.includes("green valley")
      ) {
        regionMap["Southern Arizona"].push(loc);
      } else {
        regionMap["Central Arizona"].push(loc);
      }
    });

    return regionMap;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        {/* Hero skeleton */}
        <div className="relative h-64 animate-pulse bg-gradient-to-r from-blue-600/20 to-indigo-600/20" />
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
                <div className="mb-2 h-3 w-20 rounded bg-muted" />
                <div className="h-6 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4 md:col-span-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border bg-card p-6">
                  <div className="mb-4 h-5 w-32 rounded bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
            <div className="animate-pulse rounded-lg border bg-card p-6">
              <div className="mb-4 h-5 w-24 rounded bg-muted" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 w-full rounded bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Vendor Not Found</h1>
        <p className="text-muted-foreground">
          This vendor may have been removed or the URL is incorrect.
        </p>
        <Link href="/vendor-network">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vendors
          </Button>
        </Link>
      </div>
    );
  }

  const regionMap = groupLocationsByRegion(vendor.locations);
  const hasMapLocations = vendor.locations.some((loc) => loc.lat && loc.lng);
  const yearsInBusiness = vendor.foundedYear ? new Date().getFullYear() - vendor.foundedYear : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Photo / Hero */}
      <div
        className="relative h-64 overflow-hidden bg-gradient-to-r from-blue-600 to-blue-800"
        {...{
          style: vendor.coverImage
            ? {
                backgroundImage: `url(${vendor.coverImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {},
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Back Button */}
        <div className="absolute left-4 top-4">
          <Link href="/vendors">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Vendors
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-24 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 p-6">
              {/* Logo - Top Left with Placeholder Fallback */}
              <div className="-mt-20 mb-4">
                <VendorLogo logo={vendor.logo} name={vendor.name} size="xl" />
              </div>

              {/* Name & Category */}
              <h1 className="mb-1 text-2xl font-bold text-gray-900">{vendor.name}</h1>
              {vendor.category && (
                <p className="mb-2 flex items-center text-lg text-gray-600">
                  <Building2 className="mr-2 h-4 w-4" />
                  {vendor.category}
                </p>
              )}

              {/* Rating */}
              {vendor.rating && Number(vendor.rating) > 0 && (
                <div className="mb-4 flex items-center">
                  <Star className="mr-1 h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold">{Number(vendor.rating).toFixed(1)}</span>
                  <span className="ml-2 text-sm text-gray-500">({vendor.reviewCount} reviews)</span>
                </div>
              )}

              {/* Trade Types */}
              {vendor.tradeTypes.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Trade Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {vendor.tradeTypes.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendor Types */}
              {vendor.vendorTypes.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Vendor Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {vendor.vendorTypes.map((v) => (
                      <Badge key={v} variant="outline">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Buttons */}
              <div className="space-y-2">
                {vendor.primaryPhone && (
                  <Button className="w-full" size="lg" asChild>
                    <a href={`tel:${vendor.primaryPhone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      {vendor.primaryPhone}
                    </a>
                  </Button>
                )}
                {vendor.emergencyPhone && (
                  <Button variant="destructive" className="w-full" asChild>
                    <a href={`tel:${vendor.emergencyPhone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      24/7: {vendor.emergencyPhone}
                    </a>
                  </Button>
                )}
                {vendor.primaryEmail && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`mailto:${vendor.primaryEmail}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email Us
                    </a>
                  </Button>
                )}
                {vendor.website && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={
                        vendor.website.startsWith("http")
                          ? vendor.website
                          : `https://${vendor.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </div>

              {/* Quick Badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {vendor.emergencyPhone && (
                  <Badge variant="destructive" className="text-xs">
                    24/7 Emergency
                  </Badge>
                )}
                {vendor.financingAvail && (
                  <Badge variant="secondary" className="text-xs">
                    Financing Available
                  </Badge>
                )}
                {vendor.rebatesAvail && (
                  <Badge variant="secondary" className="text-xs">
                    Rebates Available
                  </Badge>
                )}
                {vendor.deliveryRadiusMi && (
                  <Badge variant="outline" className="text-xs">
                    <Truck className="mr-1 h-3 w-3" />
                    {vendor.deliveryRadiusMi} mi delivery
                  </Badge>
                )}
              </div>

              {/* Certifications */}
              {vendor.certifications.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-700">
                    <Shield className="mr-2 h-4 w-4" />
                    Certifications
                  </h3>
                  <div className="space-y-2 text-sm">
                    {vendor.certifications.map((cert) => (
                      <div key={cert} className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Regions */}
              {vendor.serviceRegions.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                    <MapPin className="mr-2 h-4 w-4" />
                    Service Regions
                  </h3>
                  <p className="text-sm text-gray-600">{vendor.serviceRegions.join(", ")}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2">
            {/* Company Info Bar */}
            {(vendor.foundedYear || yearsInBusiness || vendor.locations.length > 0) && (
              <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                {vendor.foundedYear && (
                  <Card className="p-4 text-center">
                    <Calendar className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                    <p className="text-2xl font-bold">{vendor.foundedYear}</p>
                    <p className="text-xs text-gray-500">Est.</p>
                  </Card>
                )}
                {yearsInBusiness && yearsInBusiness > 0 && (
                  <Card className="p-4 text-center">
                    <Award className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                    <p className="text-2xl font-bold">{yearsInBusiness}+</p>
                    <p className="text-xs text-gray-500">Years Experience</p>
                  </Card>
                )}
                {vendor.locations.length > 0 && (
                  <Card className="p-4 text-center">
                    <MapPin className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                    <p className="text-2xl font-bold">{vendor.locations.length}</p>
                    <p className="text-xs text-gray-500">AZ Locations</p>
                  </Card>
                )}
                {vendor.resources.length > 0 && (
                  <Card className="p-4 text-center">
                    <FileText className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                    <p className="text-2xl font-bold">{vendor.resources.length}</p>
                    <p className="text-xs text-gray-500">Resources</p>
                  </Card>
                )}
              </div>
            )}

            {/* About */}
            {vendor.description && (
              <Card className="mb-8 p-6">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">About {vendor.name}</h2>
                <p className="whitespace-pre-wrap text-gray-700">{vendor.description}</p>
              </Card>
            )}

            {/* Map Section */}
            {hasMapLocations && (
              <Card className="mb-8 overflow-hidden">
                <div className="border-b p-4">
                  <h2 className="flex items-center text-xl font-bold">
                    <MapPin className="mr-2 h-5 w-5 text-blue-600" />
                    Location Map
                  </h2>
                </div>
                <div className="h-80">
                  <VendorLocationMap
                    locations={vendor.locations
                      .filter((loc) => loc.lat && loc.lng)
                      .map((loc) => ({
                        id: loc.id,
                        name: loc.name,
                        lat: parseFloat(loc.lat!),
                        lng: parseFloat(loc.lng!),
                        address: `${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}`,
                        phone: loc.phone,
                      }))}
                  />
                </div>
              </Card>
            )}

            {/* Locations with AZ Region Grouping */}
            {vendor.locations.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 flex items-center text-2xl font-bold">
                  <Building2 className="mr-2 h-6 w-6 text-blue-600" />
                  Arizona Locations
                </h2>
                {Object.entries(regionMap).map(([region, locations]) => {
                  if (locations.length === 0) return null;
                  return (
                    <div key={region} className="mb-6">
                      <h3 className="mb-3 text-lg font-semibold text-muted-foreground">{region}</h3>
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {locations.map((location) => (
                          <Card key={location.id} className="overflow-hidden">
                            <div className="border-b bg-gray-50 px-6 py-3">
                              <h4 className="text-lg font-bold">{location.name}</h4>
                            </div>
                            <div className="p-6">
                              {/* Address */}
                              <div className="mb-4 flex gap-3">
                                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                                <div>
                                  <p>{location.address}</p>
                                  <p>
                                    {location.city}, {location.state} {location.zip}
                                  </p>
                                  {location.lat && location.lng && (
                                    <a
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 inline-block text-sm text-primary hover:underline"
                                    >
                                      Get Directions →
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Contact Info */}
                              <div className="mb-4 space-y-2">
                                {location.phone && (
                                  <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-muted-foreground" />
                                    <a href={`tel:${location.phone}`} className="hover:underline">
                                      {location.phone}
                                    </a>
                                  </div>
                                )}
                                {location.email && (
                                  <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <a
                                      href={`mailto:${location.email}`}
                                      className="hover:underline"
                                    >
                                      {location.email}
                                    </a>
                                  </div>
                                )}
                                {location.emergencyPhone && (
                                  <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-red-500" />
                                    <a
                                      href={`tel:${location.emergencyPhone}`}
                                      className="text-red-600 hover:underline"
                                    >
                                      Emergency: {location.emergencyPhone}
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Local Rep */}
                              {location.localRepName && (
                                <div className="mb-4 rounded-lg bg-blue-50 p-3">
                                  <p className="text-sm font-medium text-blue-800">
                                    Local Representative: {location.localRepName}
                                  </p>
                                  {location.localRepPhone && (
                                    <a
                                      href={`tel:${location.localRepPhone}`}
                                      className="text-sm text-blue-600 hover:underline"
                                    >
                                      {location.localRepPhone}
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Hours */}
                              <div className="mb-4">
                                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  Business Hours
                                </div>
                                {location.hours ? (
                                  <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
                                    {DAYS_ORDER.map((day) => {
                                      const hours = location.hours?.[day];
                                      if (!hours) return null;
                                      return (
                                        <div key={day} className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">
                                            {DAY_LABELS[day]}
                                          </span>
                                          <span
                                            className={hours === "Closed" ? "text-gray-400" : ""}
                                          >
                                            {hours}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm italic text-muted-foreground">
                                    Hours vary by branch — call ahead to confirm
                                  </p>
                                )}
                              </div>

                              {/* Delivery Info */}
                              {location.deliveryRadiusMi && (
                                <div className="mb-4 flex items-center gap-2 text-sm">
                                  <Truck className="h-4 w-4 text-green-600" />
                                  <span>Delivers within {location.deliveryRadiusMi} miles</span>
                                </div>
                              )}

                              {/* Contacts */}
                              {location.contacts.length > 0 && (
                                <div>
                                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    Location Contacts
                                  </div>
                                  <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                                    {location.contacts.map((contact) => (
                                      <div key={contact.id} className="text-sm">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium">{contact.name}</p>
                                          {contact.isPrimary && (
                                            <Badge variant="secondary" className="text-xs">
                                              Primary
                                            </Badge>
                                          )}
                                        </div>
                                        {contact.title && (
                                          <p className="text-muted-foreground">{contact.title}</p>
                                        )}
                                        {contact.territory.length > 0 && (
                                          <p className="text-xs text-blue-600">
                                            Territory: {contact.territory.join(", ")}
                                          </p>
                                        )}
                                        <div className="mt-1 flex flex-wrap gap-3">
                                          {contact.phone && (
                                            <a
                                              href={`tel:${contact.phone}`}
                                              className="text-primary hover:underline"
                                            >
                                              {contact.phone}
                                            </a>
                                          )}
                                          {contact.mobilePhone && (
                                            <a
                                              href={`tel:${contact.mobilePhone}`}
                                              className="text-primary hover:underline"
                                            >
                                              📱 {contact.mobilePhone}
                                            </a>
                                          )}
                                          {contact.email && (
                                            <a
                                              href={`mailto:${contact.email}`}
                                              className="text-primary hover:underline"
                                            >
                                              {contact.email}
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resources / Brochures Section */}
            {vendor.resources.length > 0 && (
              <Card className="mb-8 overflow-hidden">
                <div className="border-b bg-gray-50 p-4">
                  <h2 className="flex items-center text-xl font-bold">
                    <Package className="mr-2 h-5 w-5 text-blue-600" />
                    Brochures & Resources
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Official PDFs and product documentation
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
                  {vendor.resources.map((resource) => {
                    const isLocalResource = resource.url.startsWith("/");
                    const isExternalPDF = resource.url.startsWith("http");

                    return (
                      <Card
                        key={resource.id}
                        className="group relative overflow-hidden p-4 transition-all hover:shadow-md"
                      >
                        {/* Available Badge */}
                        {isLocalResource && (
                          <div className="absolute right-2 top-2">
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              ✓ Available
                            </span>
                          </div>
                        )}

                        <div className="mb-3 flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 pr-16">
                            <h3 className="mb-1 font-semibold leading-tight">{resource.title}</h3>
                            {resource.description && (
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Meta Pills */}
                        <div className="mb-4 flex flex-wrap gap-2">
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {resource.type.replace(/_/g, " ").toUpperCase()}
                          </span>
                          {resource.format && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                              {resource.format}
                            </span>
                          )}
                          {resource.fileSize && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                              {resource.fileSize}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {isExternalPDF ? (
                          <div className="flex gap-2">
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1"
                            >
                              <Button className="w-full" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            </a>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open PDF in new tab"
                            >
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        ) : isLocalResource ? (
                          <div className="flex gap-2">
                            <a
                              href={resource.url}
                              download
                              className="flex-1"
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(resource.url, "_blank");
                              }}
                            >
                              <Button className="w-full" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            </a>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  `${window.location.origin}${resource.url}`,
                                  resource.title
                                )
                              }
                              title="Copy link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="mb-2 text-xs text-amber-800">
                              This resource is hosted externally.
                            </p>
                            {vendor.website && (
                              <a href={vendor.website} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="w-full">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Visit Vendor Website
                                </Button>
                              </a>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Padding */}
      <div className="h-16" />
    </div>
  );
}
