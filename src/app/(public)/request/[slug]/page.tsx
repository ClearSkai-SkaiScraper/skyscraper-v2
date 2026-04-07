"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

type Contractor = {
  id: string;
  businessName: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
};

type FormField = {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
};

type FormDefinition = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  requirePhotos?: boolean;
};

export default function RequestServicePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const router = useRouter();

  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const contractorRes = await fetch(`/api/contractors/public/${slug}`);
        if (!contractorRes.ok) {
          setError("Contractor not found");
          setLoading(false);
          return;
        }
        const contractorJson = await contractorRes.json();
        setContractor(contractorJson.contractor);

        const formRes = await fetch(`/api/contractors/forms/public/${slug}`);
        const formJson = await formRes.json();
        setFormDef(formJson.form);

        setLoading(false);
      } catch (err) {
        logger.error(err);
        setError("Failed to load form");
        setLoading(false);
      }
    }
    void load();
  }, [slug]);

  async function submitRequest() {
    // Validate required fields
    if (formDef) {
      for (const field of formDef.fields) {
        if (field.required && !values[field.name]) {
          alert(`${field.label} is required`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // For now, we'll skip photo uploads and just submit the form data
      // In production, you'd upload photos to your storage first
      const photoUrls: string[] = [];

      const res = await fetch("/api/public/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorSlug: slug,
          name: values.name || "",
          email: values.email || "",
          phone: values.phone || "",
          address: values.address || "",
          serviceType: values.serviceType || "",
          details: values,
          photos: photoUrls,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit");
      }

      const json = await res.json();

      router.push(`/request/${slug}/success?lead=${json.leadId}`);
    } catch (err) {
      logger.error(err);
      alert(err.message || "There was an error submitting your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading form...</div>
      </div>
    );
  }

  if (error || !contractor || !formDef) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="mt-2 text-slate-600">{error || "Unable to load form. Please try again."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-center gap-4">
        {contractor.logoUrl && (
          <img
            src={contractor.logoUrl}
            alt={contractor.businessName}
            className="h-12 w-12 rounded-full border object-cover"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">Request Service from {contractor.businessName}</h1>
          <p className="text-sm text-slate-600">
            {contractor.phone && `📞 ${contractor.phone}`}
            {contractor.phone && contractor.email && " • "}
            {contractor.email && `✉️ ${contractor.email}`}
          </p>
        </div>
      </div>

      {formDef.description && <p className="text-slate-600">{formDef.description}</p>}

      {/* Dynamic Form */}
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{formDef.title}</h2>

        {formDef.fields.map((field, i) => {
          if (field.type === "text") {
            return (
              <div key={i}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <Input
                  placeholder={field.label}
                  value={values[field.name] || ""}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                />
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={i}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <Textarea
                  placeholder={field.label}
                  value={values[field.name] || ""}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  rows={4}
                />
              </div>
            );
          }

          if (field.type === "select") {
            return (
              <div key={i}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <select
                  title={field.label}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  value={values[field.name] || ""}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map((opt, j) => (
                    <option key={j} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === "file") {
            return (
              <div key={i}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <input
                  aria-label={field.label}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm"
                />
                {photoFiles.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {photoFiles.length} file(s) selected
                  </p>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          {contractor.businessName} will contact you within 24-48 hours
        </p>
        <Button
          onClick={submitRequest}
          disabled={submitting}
          size="lg"
          className="bg-sky-600 hover:bg-sky-700"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </div>
  );
}
