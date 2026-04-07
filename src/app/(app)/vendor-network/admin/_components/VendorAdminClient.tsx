/**
 * VIN — Vendor Admin Client
 * List all vendors, inline edit, create new, toggle featured/verified
 */

"use client";

import { Loader2, Plus, Search, ShieldCheck, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TRADE_TYPE_LABELS, VENDOR_TYPE_LABELS } from "@/lib/vendors/vin-types";

interface AdminVendor {
  id: string;
  name: string;
  slug: string;
  category: string;
  isFeatured: boolean;
  isVerified: boolean;
  tradeTypes: string[];
  vendorTypes: string[];
  rating: number | null;
  locationCount: number;
  productCount: number;
}

interface CreateForm {
  name: string;
  slug: string;
  category: string;
  tradeTypes: string[];
  vendorTypes: string[];
  description: string;
  website: string;
  primaryPhone: string;
  primaryEmail: string;
}

const EMPTY_FORM: CreateForm = {
  name: "",
  slug: "",
  category: "",
  tradeTypes: [],
  vendorTypes: [],
  description: "",
  website: "",
  primaryPhone: "",
  primaryEmail: "",
};

export function VendorAdminClient() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (search) params.set("q", search);
      const res = await fetch(`/api/vin?${params}`);
      const data = await res.json();
      if (data.success) {
        setVendors(data.vendors);
      }
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const d = setTimeout(fetchVendors, 300);
    return () => clearTimeout(d);
  }, [fetchVendors]);

  const toggleField = async (
    vendorId: string,
    field: "isFeatured" | "isVerified",
    current: boolean
  ) => {
    try {
      const res = await fetch(`/api/vin/${vendorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !current }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `${field === "isFeatured" ? "Featured" : "Verified"} ${!current ? "enabled" : "disabled"}`
        );
        void fetchVendors();
      }
    } catch {
      toast.error("Update failed");
    }
  };

  const createVendor = async () => {
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/vin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${form.name} created!`);
        setForm(EMPTY_FORM);
        setShowCreate(false);
        void fetchVendors();
      } else {
        toast.error(data.error || "Create failed");
      }
    } catch {
      toast.error("Create failed");
    } finally {
      setCreating(false);
    }
  };

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="space-y-4 p-5">
          <h3 className="text-sm font-semibold">Create New Vendor</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: autoSlug(name) }));
                }}
                placeholder="ABC Supply Co."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Slug *</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="abc-supply-co"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Category</label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Roofing Distributor"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Website</label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Phone</label>
              <Input
                value={form.primaryPhone}
                onChange={(e) => setForm((f) => ({ ...f, primaryPhone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Email</label>
              <Input
                value={form.primaryEmail}
                onChange={(e) => setForm((f) => ({ ...f, primaryEmail: e.target.value }))}
                placeholder="pro@vendor.com"
              />
            </div>
          </div>

          {/* Trade Types */}
          <div>
            <label className="mb-1 block text-xs font-medium">Trade Types</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TRADE_TYPE_LABELS)
                .slice(0, 15)
                .map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        tradeTypes: f.tradeTypes.includes(key)
                          ? f.tradeTypes.filter((t) => t !== key)
                          : [...f.tradeTypes, key],
                      }))
                    }
                    className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                      form.tradeTypes.includes(key)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
            </div>
          </div>

          {/* Vendor Types */}
          <div>
            <label className="mb-1 block text-xs font-medium">Vendor Types</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(VENDOR_TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      vendorTypes: f.vendorTypes.includes(key)
                        ? f.vendorTypes.filter((t) => t !== key)
                        : [...f.vendorTypes, key],
                    }))
                  }
                  className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                    form.vendorTypes.includes(key)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Description</label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={createVendor} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Vendor
            </Button>
          </div>
        </Card>
      )}

      {/* Vendors Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Vendor</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Trades</th>
                <th className="px-4 py-3 text-center font-medium">Locations</th>
                <th className="px-4 py-3 text-center font-medium">Products</th>
                <th className="px-4 py-3 text-center font-medium">Featured</th>
                <th className="px-4 py-3 text-center font-medium">Verified</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <a
                      href={`/vendor-network/${v.slug}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {v.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{v.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.tradeTypes.slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {TRADE_TYPE_LABELS[t as keyof typeof TRADE_TYPE_LABELS] || t}
                        </Badge>
                      ))}
                      {v.tradeTypes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{v.tradeTypes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{v.locationCount}</td>
                  <td className="px-4 py-3 text-center">{v.productCount}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleField(v.id, "isFeatured", v.isFeatured)}
                      aria-label="Toggle featured"
                      className={`rounded-full p-1 transition-colors ${
                        v.isFeatured
                          ? "bg-amber-100 text-amber-600"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Star className={`h-4 w-4 ${v.isFeatured ? "fill-current" : ""}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleField(v.id, "isVerified", v.isVerified)}
                      aria-label="Toggle verified"
                      className={`rounded-full p-1 transition-colors ${
                        v.isVerified
                          ? "bg-green-100 text-green-600"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
