"use client";

import { Camera, CheckCircle, CreditCard, DollarSign, Loader2, Wrench, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Props = { orgId: string };
type Step = 1 | 2 | 3 | 4;

type JobCategory = "out_of_pocket" | "financed" | "repair";

interface PhotoFile {
  file: File;
  preview: string;
  tag: string;
}

const JOB_CATEGORIES: { id: JobCategory; label: string; icon: any; color: string; desc: string }[] =
  [
    {
      id: "out_of_pocket",
      label: "Out of Pocket",
      icon: DollarSign,
      color: "bg-amber-500",
      desc: "Customer pays directly",
    },
    {
      id: "financed",
      label: "Financed",
      icon: CreditCard,
      color: "bg-green-500",
      desc: "Through financing partners",
    },
    {
      id: "repair",
      label: "Repair",
      icon: Wrench,
      color: "bg-slate-500",
      desc: "Standard repair or service",
    },
  ];

const WORK_TYPES = [
  { value: "roof-replacement", label: "🏠 Roof Replacement" },
  { value: "roof-repair", label: "🔧 Roof Repair" },
  { value: "siding", label: "🏠 Siding Installation" },
  { value: "windows", label: "🪟 Window Replacement" },
  { value: "gutters", label: "🏠 Gutters" },
  { value: "solar", label: "☀️ Solar Installation" },
  { value: "hvac", label: "❄️ HVAC" },
  { value: "plumbing", label: "🔧 Plumbing" },
  { value: "electrical", label: "⚡ Electrical" },
  { value: "painting", label: "🎨 Painting" },
  { value: "flooring", label: "🪵 Flooring" },
  { value: "remodel", label: "🏗️ Full Remodel" },
  { value: "consultation", label: "💬 Consultation / Quote" },
  { value: "other", label: "📋 Other" },
];

export function RetailJobWizard({ orgId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 – Job Details
  const [jobCategory, setJobCategory] = useState<JobCategory>("out_of_pocket");
  const [workType, setWorkType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [urgency, setUrgency] = useState("medium");

  // Step 2 – Customer Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 3 – Property
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // Step 4 – Photos
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const addPhotos = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 20);
    setPhotos((prev) => [
      ...prev,
      ...arr.map((file) => ({ file, preview: URL.createObjectURL(file), tag: "Exterior" })),
    ]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  function canGoNext(s: Step): boolean {
    if (s === 1) return !!workType;
    if (s === 2) return !!firstName && !!lastName;
    if (s === 3) return !!address;
    return true;
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        title: title || `${firstName} ${lastName} - ${workType}`,
        description: description || `Retail job: ${workType}`,
        source: "direct",
        stage: "new",
        temperature: urgency === "urgent" ? "hot" : urgency === "high" ? "warm" : "cold",
        jobType: "RETAIL",
        workType,
        urgency,
        budget: budget ? parseInt(budget) * 100 : undefined,
        jobCategory,
        contactData: {
          firstName,
          lastName,
          email: email || undefined,
          phone: phone || undefined,
          street: address,
          city,
          state,
          zipCode: zip,
        },
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to create job.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const leadId = data.lead?.id || data.id;

      // Upload photos if any
      if (photos.length > 0) {
        setIsUploading(true);
        setUploadProgress(0);
        let completed = 0;
        for (const photo of photos) {
          try {
            const fd = new FormData();
            fd.append("file", photo.file);
            fd.append("type", "leadPhotos");
            await fetch("/api/upload/supabase", { method: "POST", body: fd });
            completed++;
            setUploadProgress(Math.round((completed / photos.length) * 100));
          } catch {
            // Continue with other photos
          }
        }
        setIsUploading(false);
      }

      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      toast.success("✅ Retail job created successfully!");
      router.push(`/jobs/retail/${leadId}`);
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  }

  const steps = [
    { id: 1 as Step, label: "Job Details", description: "Type, category & scope" },
    { id: 2 as Step, label: "Customer", description: "Who needs the work" },
    { id: 3 as Step, label: "Property", description: "Location & address" },
    { id: 4 as Step, label: "Photos", description: "Upload site photos (optional)" },
  ];

  const selectedCat = JOB_CATEGORIES.find((c) => c.id === jobCategory);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* Stepper */}
      <ol className="mb-6 flex items-center justify-between gap-4 text-sm">
        {steps.map((s) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-3">
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                  done
                    ? "border-amber-500 bg-amber-500 text-white"
                    : active
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-slate-50 text-slate-400",
                ].join(" ")}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : s.id}
              </div>
              <div className="hidden md:block">
                <p className={active ? "font-semibold text-amber-700" : "text-slate-500"}>
                  {s.label}
                </p>
                <p className="text-xs text-slate-400">{s.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[320px]">
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">Job Category</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {JOB_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const selected = jobCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setJobCategory(cat.id)}
                    className={[
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                      selected
                        ? "border-amber-500 bg-amber-50 shadow-md dark:bg-amber-900/20"
                        : "border-slate-200 hover:border-amber-300 dark:border-slate-700",
                    ].join(" ")}
                  >
                    <div className={`rounded-full ${cat.color} p-2`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">{cat.label}</p>
                      <p className="text-xs text-slate-500">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Work Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  title="Work Type"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="" disabled>
                    Select work type...
                  </option>
                  {WORK_TYPES.map((wt) => (
                    <option key={wt.value} value={wt.value}>
                      {wt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Urgency
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  title="Urgency"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="low">🟢 Low - No rush</option>
                  <option value="medium">🟡 Medium - Next few weeks</option>
                  <option value="high">🟠 High - This week</option>
                  <option value="urgent">🔴 Urgent - ASAP</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Job Title (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Smith Roof Replacement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Estimated Budget ($)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 15000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Description / Notes
              </label>
              <textarea
                rows={3}
                placeholder="Any details about the job..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">Customer Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">Property Address</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="Prescott"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="AZ"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    ZIP
                  </label>
                  <input
                    type="text"
                    placeholder="86301"
                    maxLength={10}
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Upload Site Photos</h3>
            <div
              onDrop={(e) => {
                e.preventDefault();
                addPhotos(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-amber-400 hover:bg-amber-50 dark:border-slate-600 dark:bg-slate-800"
            >
              <input
                type="file"
                id="retail-photo-upload"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && addPhotos(e.target.files)}
                className="hidden"
              />
              <label htmlFor="retail-photo-upload" className="cursor-pointer">
                <Camera className="mx-auto mb-3 h-10 w-10 text-amber-400" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Drag & drop or click to upload
                </p>
                <p className="text-xs text-slate-500">JPG, PNG, HEIC • Up to 20 photos</p>
              </label>
            </div>

            {isUploading && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-amber-700">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </span>
                  <span className="font-medium text-amber-800">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((photo, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-lg border">
                    <div className="relative aspect-square">
                      <Image
                        src={photo.preview}
                        alt={`Photo ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      title="Remove photo"
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <p className="font-medium">💡 Photos are optional</p>
                <p className="mt-1 text-xs">Add site photos now or upload them later.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-2">
          {step < 4 && (
            <Button
              type="button"
              onClick={() => {
                if (canGoNext(step)) {
                  setStep((s) => (s + 1) as Step);
                }
              }}
              disabled={!canGoNext(step) || loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Next
            </Button>
          )}

          {step === 4 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || isUploading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isUploading
                ? `Uploading... ${uploadProgress}%`
                : loading
                  ? "Creating..."
                  : photos.length > 0
                    ? `Create Job & Upload ${photos.length} Photo${photos.length > 1 ? "s" : ""}`
                    : "Create Retail Job"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
