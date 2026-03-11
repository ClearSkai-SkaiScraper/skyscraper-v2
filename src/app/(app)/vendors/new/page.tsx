"use client";

import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";

export default function NewVendorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    licenseNumber: "",
    phone: "",
    email: "",
    specialties: [] as string[],
  });

  // Specialty options matching the seed data
  const specialtyOptions = [
    { value: "roofing", label: "Roofing" },
    { value: "plumbing", label: "Plumbing" },
    { value: "electrical", label: "Electrical" },
    { value: "hvac", label: "HVAC" },
    { value: "mitigation", label: "Water Damage / Mitigation" },
    { value: "general_contractor", label: "General Contractor" },
    { value: "flooring", label: "Flooring" },
    { value: "painting", label: "Painting" },
    { value: "landscaping", label: "Landscaping" },
    { value: "windows", label: "Windows & Doors" },
    { value: "siding", label: "Siding" },
    { value: "insurance_claims", label: "Insurance Claims Specialist" },
    { value: "storm_damage", label: "Storm Damage" },
    { value: "emergency", label: "Emergency Services" },
    { value: "commercial", label: "Commercial" },
    { value: "residential", label: "Residential" },
  ];

  function toggleSpecialty(value: string) {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(value)
        ? f.specialties.filter((s) => s !== value)
        : [...f.specialties, value],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.businessName) {
      alert("Please provide business name");
      return;
    }

    if (form.specialties.length === 0) {
      alert("Please select at least one specialty");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`❌ ${data.error || "Failed to create vendor. Please try again."}`);
        setSaving(false);
        return;
      }

      router.push("/vendors");
      router.refresh();
    } catch (err) {
      logger.error(err);
      alert(`Failed to create vendor: ${err.message}`);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/vendors"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Building2 className="h-6 w-6" />
            Add New Vendor
          </h1>
          <p className="text-sm text-muted-foreground">
            Add a trade partner or service provider to your network
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            value={form.businessName}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            placeholder="ABC Roofing & Construction"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseNumber">License Number</Label>
          <Input
            id="licenseNumber"
            value={form.licenseNumber}
            onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
            placeholder="ROC-12345"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Contact Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="contact@vendor.com"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Specialties * (Select all that apply)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {specialtyOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={form.specialties.includes(option.value)}
                  onChange={() => toggleSpecialty(option.value)}
                  className="h-4 w-4 rounded text-primary"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
          {form.specialties.length > 0 && (
            <p className="text-xs text-muted-foreground">Selected: {form.specialties.join(", ")}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Vendor"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
