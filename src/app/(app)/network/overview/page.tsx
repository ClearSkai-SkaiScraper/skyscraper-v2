/*
 * PHASE 3: Network Overview
 * Central hub showing Trades, Vendors, and Clients - all three networks integrated
 */

import {
  ArrowRight,
  Briefcase,
  Building2,
  Home,
  MapPin,
  Network,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CountFn = (args?: Record<string, unknown>) => Promise<number>;

export default async function NetworkOverviewPage() {
  const warned = new Set<string>();
  const warnOnce = (label: string, message: string) => {
    if (warned.has(label)) return;
    warned.add(label);
    logger.warn(`[NetworkOverview] ${label}: ${message}`);
  };

  // Safety wrapper to avoid runtime 500s when a table/column is missing locally
  const safeCount = async (
    label: string,
    countFn?: (args?: Record<string, unknown>) => Promise<number>,
    args?: Record<string, unknown>
  ): Promise<number> => {
    if (!countFn) {
      warnOnce(label, "count unavailable on prisma delegate; returning 0");
      return 0;
    }

    try {
      return await countFn(args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnOnce(label, `fallback to 0 (${msg})`);
      return 0;
    }
  };

  // Fetch network stats with defensive guards so signed-out/local runs never crash
  const [tradesCompanies, vendors, clients] = await Promise.all([
    safeCount("tradesCompany", prisma.tradesCompany?.count?.bind(prisma.tradesCompany) as CountFn, {
      where: { isActive: true },
    }),
    safeCount("vendor", prisma.vendor?.count?.bind(prisma.vendor) as CountFn, {
      where: { isActive: true },
    }),
    safeCount(
      "client_networks",
      prisma.client_networks?.count?.bind(prisma.client_networks) as CountFn
    ),
  ]);

  const [tradesMembers, vendorLocations, vendorContacts] = await Promise.all([
    safeCount(
      "tradesCompanyMember",
      prisma.tradesCompanyMember?.count?.bind(prisma.tradesCompanyMember) as CountFn,
      { where: { isActive: true } }
    ),
    safeCount(
      "vendorLocation",
      prisma.vendorLocation?.count?.bind(prisma.vendorLocation) as CountFn,
      {
        where: { isActive: true },
      }
    ),
    safeCount("vendorContact", prisma.vendorContact?.count?.bind(prisma.vendorContact) as CountFn, {
      where: { isActive: true },
    }),
  ]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Hero Section */}
      <PageHero
        section="network"
        title="Your Professional Network"
        subtitle="A complete ecosystem connecting trades companies, vendors, and clients for seamless roofing project management"
        icon={<Network className="h-6 w-6" />}
      />

      {/* Network Stats Overview */}
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <Briefcase className="h-7 w-7 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-900">{tradesCompanies}</p>
              <p className="text-sm text-blue-600">Companies</p>
            </div>
          </div>
          <h3 className="mb-2 text-xl font-bold">Trades Network</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {tradesMembers} employees across roofing, solar, HVAC, and restoration companies
          </p>
          <Link href="/trades">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              View Trades Network
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <div className="mt-2 text-center">
            <Link href="/trades/profile" className="text-sm text-muted-foreground hover:underline">
              Go to My Trades Profile
            </Link>
          </div>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Building2 className="h-7 w-7 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-900">{vendors}</p>
              <p className="text-sm text-green-600">Vendors</p>
            </div>
          </div>
          <h3 className="mb-2 text-xl font-bold">Vendor Network</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {vendorLocations} locations with {vendorContacts} contacts across Arizona
          </p>
          <Link href="/vendors">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              View Vendor Network
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
              <Home className="h-7 w-7 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-900">{clients}</p>
              <p className="text-sm text-purple-600">Clients</p>
            </div>
          </div>
          <h3 className="mb-2 text-xl font-bold">Client Network</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Homeowners with active claims and portal access
          </p>
          <Link href="/portal">
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              View Client Portal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* How It Works */}
      <div className="mb-12">
        <h2 className="mb-8 text-center text-3xl font-bold">How The Network Works</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                1
              </div>
            </div>
            <h3 className="mb-2 text-lg font-bold">Trades Companies Join</h3>
            <p className="text-sm text-muted-foreground">
              Roofing companies create profiles, add employees, and showcase their expertise
            </p>
          </div>

          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-600">
                2
              </div>
            </div>
            <h3 className="mb-2 text-lg font-bold">Vendors Connect</h3>
            <p className="text-sm text-muted-foreground">
              Material suppliers provide products, pricing, and support to trades companies
            </p>
          </div>

          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-2xl font-bold text-purple-600">
                3
              </div>
            </div>
            <h3 className="mb-2 text-lg font-bold">Clients Get Service</h3>
            <p className="text-sm text-muted-foreground">
              Homeowners receive transparent updates and quality work from verified professionals
            </p>
          </div>
        </div>
      </div>

      {/* Network Benefits */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-50 p-8">
        <h2 className="mb-6 text-center text-3xl font-bold">Network Benefits</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="mb-2 font-bold">Faster Project Completion</h3>
              <p className="text-sm text-muted-foreground">
                Direct connections between trades, vendors, and clients eliminate delays
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="mb-2 font-bold">Verified Professionals</h3>
              <p className="text-sm text-muted-foreground">
                All trades companies go through onboarding and verification
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h3 className="mb-2 font-bold">Local Network</h3>
              <p className="text-sm text-muted-foreground">
                Arizona-focused with vendors and trades companies serving your area
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="mb-2 font-bold">Complete Ecosystem</h3>
              <p className="text-sm text-muted-foreground">
                From materials to labor to homeowner communication - all in one place
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
