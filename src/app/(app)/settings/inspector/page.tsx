"use client";

import { Award, CheckCircle2, FileText, Loader2, Phone, Save, Shield, User, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface InspectorProfile {
  id: string;
  name: string | null;
  email: string;
  headshot_url: string | null;
  title: string | null;
  phone: string | null;
  bio: string | null;
  license_number: string | null;
  license_state: string | null;
  certifications: string[];
  signature_url: string | null;
  years_experience: number | null;
  specialties: string[];
  is_default_inspector: boolean;
  completeness: number;
}

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const COMMON_CERTIFICATIONS = [
  "HAAG Certified Inspector",
  "HAAG Certified - Residential Roofs",
  "HAAG Certified - Commercial Roofs",
  "IICRC WRT (Water Restoration Technician)",
  "IICRC FSRT (Fire & Smoke Restoration)",
  "RCI Registered Roof Observer",
  "Xactimate Level 1",
  "Xactimate Level 2",
  "Xactimate Level 3",
  "InterNACHI Certified",
  "ASHI Certified Inspector",
  "ICC Certified Building Inspector",
  "NRCA ProCertified",
  "GAF Master Elite",
  "Owens Corning Preferred",
];

const COMMON_SPECIALTIES = [
  "Roofing (Shingle)",
  "Roofing (Tile)",
  "Roofing (Metal)",
  "Roofing (Flat/Commercial)",
  "Siding",
  "Gutters & Downspouts",
  "Windows & Doors",
  "Stucco & EIFS",
  "HVAC",
  "Interior Water Damage",
  "Hail Damage Assessment",
  "Wind Damage Assessment",
  "Fire Damage Assessment",
  "Structural Assessment",
  "Foundation",
];

export default function InspectorProfilePage() {
  const [profile, setProfile] = useState<InspectorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCert, setNewCert] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    phone: "",
    bio: "",
    license_number: "",
    license_state: "",
    years_experience: 0,
    certifications: [] as string[],
    specialties: [] as string[],
    is_default_inspector: false,
  });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/inspector/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setProfile(data.profile);
      setFormData({
        title: data.profile.title || "",
        phone: data.profile.phone || "",
        bio: data.profile.bio || "",
        license_number: data.profile.license_number || "",
        license_state: data.profile.license_state || "",
        years_experience: data.profile.years_experience || 0,
        certifications: data.profile.certifications || [],
        specialties: data.profile.specialties || [],
        is_default_inspector: data.profile.is_default_inspector || false,
      });
    } catch (err) {
      toast.error("Failed to load inspector profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/inspector/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          years_experience: formData.years_experience || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      const data = await res.json();
      setProfile((prev) => (prev ? { ...prev, ...data.profile } : prev));
      toast.success("Inspector profile saved!");
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addCertification = (cert: string) => {
    if (cert && !formData.certifications.includes(cert)) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, cert],
      }));
    }
    setNewCert("");
  };

  const removeCertification = (cert: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== cert),
    }));
  };

  const addSpecialty = (spec: string) => {
    if (spec && !formData.specialties.includes(spec)) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, spec],
      }));
    }
    setNewSpecialty("");
  };

  const removeSpecialty = (spec: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((s) => s !== spec),
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inspector Profile</h2>
          <p className="text-muted-foreground">
            Your professional credentials appear on damage assessment reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <Badge
              variant={profile.completeness >= 80 ? "default" : "secondary"}
              className="text-sm"
            >
              {profile.completeness}% complete
            </Badge>
          )}
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Profile
          </Button>
        </div>
      </div>

      {/* Professional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Professional Information
          </CardTitle>
          <CardDescription>
            Your name and title as they&apos;ll appear on inspection reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Professional Title</Label>
            <Input
              id="title"
              placeholder="e.g., Senior Property Inspector"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="(555) 555-1234"
                className="pl-9"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="years">Years of Experience</Label>
            <Input
              id="years"
              type="number"
              min={0}
              max={75}
              value={formData.years_experience || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  years_experience: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default">Default Inspector</Label>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="default"
                checked={formData.is_default_inspector}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_default_inspector: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="default" className="text-sm font-normal text-muted-foreground">
                Auto-assign as inspector for new claims
              </Label>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              placeholder="Brief professional summary for report covers..."
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">{formData.bio.length}/500 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Licensing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            License &amp; Credentials
          </CardTitle>
          <CardDescription>
            License information for regulatory compliance and report credibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="license">License Number</Label>
            <Input
              id="license"
              placeholder="ROC-123456"
              value={formData.license_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, license_number: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">License State</Label>
            <Select
              value={formData.license_state}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, license_state: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </CardTitle>
          <CardDescription>
            Industry certifications that appear on your inspection reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.certifications.map((cert) => (
              <Badge key={cert} variant="secondary" className="pr-1 text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
                {cert}
                <button
                  onClick={() => removeCertification(cert)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Select value={newCert} onValueChange={(v) => addCertification(v)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add a certification..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_CERTIFICATIONS.filter((c) => !formData.certifications.includes(c)).map(
                  (cert) => (
                    <SelectItem key={cert} value={cert}>
                      {cert}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Input
              placeholder="Or type custom..."
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCert) {
                  addCertification(newCert);
                }
              }}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Specialties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Specialties
          </CardTitle>
          <CardDescription>Areas of expertise for claim assignment matching.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.specialties.map((spec) => (
              <Badge key={spec} variant="outline" className="pr-1 text-sm">
                {spec}
                <button
                  onClick={() => removeSpecialty(spec)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Select value={newSpecialty} onValueChange={(v) => addSpecialty(v)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add a specialty..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_SPECIALTIES.filter((s) => !formData.specialties.includes(s)).map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Or type custom..."
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSpecialty) {
                  addSpecialty(newSpecialty);
                }
              }}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
