// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Building2,
  Database,
  Package,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import { SUPPLIER_CONFIG } from "@/lib/suppliers/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Material Intelligence | SkaiScraper",
  description: "AI-powered material cost analysis, ordering, and vendor intelligence",
};

export default async function MaterialsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supplierCount = Object.keys(SUPPLIER_CONFIG).length;

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <PageHero
        section="build"
        title="Material Intelligence"
        subtitle="AI-powered material cost analysis, ordering, and vendor intelligence"
        icon={<Package className="h-6 w-6" />}
      />

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Link
          href="/materials/cart"
          className="group flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 transition-all hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:border-blue-600 dark:hover:bg-blue-900/30"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Material Cart</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">View & checkout orders</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-blue-600 transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          href="/vendors"
          className="group flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-4 transition-all hover:border-purple-400 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:bg-purple-900/30"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-600 p-2 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Vendor Network</h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {supplierCount}+ connected suppliers
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-purple-600 transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          href="/materials/orders"
          className="group flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 transition-all hover:border-green-400 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:hover:border-green-600 dark:hover:bg-green-900/30"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-600 p-2 text-white">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">Order History</h3>
              <p className="text-sm text-green-700 dark:text-green-300">Track deliveries</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-green-600 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={<Search className="h-6 w-6" />}
          title="Product Search"
          description="Search across multiple suppliers with real-time pricing and availability"
          status="Active"
          href="/materials/cart"
        />
        <FeatureCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Market Trends"
          description="Track material price trends and market volatility in your region"
          status="Coming Soon"
        />
        <FeatureCard
          icon={<Database className="h-6 w-6" />}
          title="Vendor Intelligence"
          description="Compare vendor pricing and reliability scores for better sourcing"
          status="Active"
          href="/vendors"
        />
        <FeatureCard
          icon={<Package className="h-6 w-6" />}
          title="Spec Matcher"
          description="Match manufacturer specs with insurance requirements automatically"
          status="Coming Soon"
        />
      </div>

      <div className="mt-12 rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
        <h2 className="mb-3 text-xl font-semibold">Live Materials Order & Job Flow</h2>
        <p className="mb-4 text-slate-700 dark:text-slate-300">
          Our Material Intelligence platform connects you directly to {supplierCount}+ supplier
          networks including ABC Supply, Beacon, Home Depot Pro, and Lowe&apos;s for Pros. Order
          materials, track deliveries, and automatically sync costs to your jobs and claims.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-2xl font-bold text-blue-600">1</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Search products</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-2xl font-bold text-blue-600">2</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Add to cart</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-2xl font-bold text-blue-600">3</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Link to job/claim</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-2xl font-bold text-blue-600">4</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Track delivery</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  status,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-4">
      <div className="rounded-lg bg-[var(--primary-weak)] p-3 text-[color:var(--primary)]">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="mb-1 font-semibold">{title}</h3>
        <p className="mb-2 text-sm text-slate-700 dark:text-slate-300">{description}</p>
        <span
          className={`inline-block rounded-full px-2 py-1 text-xs ${
            status === "Active"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-[var(--primary-weak)] text-[color:var(--primary)]"
          }`}
        >
          {status === "Coming Soon" ? "Planned Feature" : status}
        </span>
      </div>
    </div>
  );

  const className =
    "relative rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 transition-all hover:scale-[1.01] hover:border-[color:var(--primary)] hover:shadow-lg";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
