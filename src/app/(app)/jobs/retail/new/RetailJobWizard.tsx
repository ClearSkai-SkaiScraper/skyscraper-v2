"use client";

import {
  Camera,
  CheckCircle,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  Loader2,
  Ruler,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Props = { orgId: string };
type Step = 1 | 2 | 3 | 4 | 5 | 6;

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Step 5 – Scope & Measurements
  const [roofSquares, setRoofSquares] = useState("");
  const [sidingLf, setSidingLf] = useState("");
  const [stories, setStories] = useState("1");
  const [pitch, setPitch] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");

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
    if (s === 4) return true; // Photos optional
    if (s === 5) return true; // Measurements optional
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
        measurements: {
          roofSquares: roofSquares ? parseFloat(roofSquares) : undefined,
          sidingLinearFeet: sidingLf ? parseFloat(sidingLf) : undefined,
          stories: parseInt(stories) || 1,
          pitch: pitch || undefined,
          notes: scopeNotes || undefined,
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

      // Upload photos if any - link to leadId
      if (photos.length > 0 && leadId) {
        setIsUploading(true);
        setUploadProgress(0);
        let completed = 0;
        for (const photo of photos) {
          try {
            const fd = new FormData();
            fd.append("file", photo.file);
            fd.append("type", "leadPhotos");
            fd.append("leadId", leadId); // Link photos to the lead
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
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
    { id: 5 as Step, label: "Measurements", description: "Scope & dimensions" },
    { id: 6 as Step, label: "Review", description: "Confirm & submit" },
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

        {step === 5 && (
          <div className="space-y-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Ruler className="h-5 w-5 text-amber-500" />
              Scope & Measurements
            </h3>
            <p className="text-sm text-slate-500">
              Optional — add roof squares, siding footage, or any measurements you have.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Roof Squares
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="e.g. 24.5"
                  value={roofSquares}
                  onChange={(e) => setRoofSquares(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
                <p className="text-xs text-slate-400">1 square = 100 sq ft</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Siding Linear Feet
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 180"
                  value={sidingLf}
                  onChange={(e) => setSidingLf(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Stories
                </label>
                <select
                  value={stories}
                  onChange={(e) => setStories(e.target.value)}
                  title="Number of stories"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="1">1 Story</option>
                  <option value="2">2 Stories</option>
                  <option value="3">3+ Stories</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Roof Pitch
                </label>
                <select
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  title="Roof pitch"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="">Select pitch...</option>
                  <option value="flat">Flat (0-2/12)</option>
                  <option value="low">Low (3-5/12)</option>
                  <option value="moderate">Moderate (6-8/12)</option>
                  <option value="steep">Steep (9-12/12)</option>
                  <option value="extreme">Extreme (12+/12)</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Scope Notes
              </label>
              <textarea
                rows={3}
                placeholder="Additional details about measurements, materials, access concerns..."
                value={scopeNotes}
                onChange={(e) => setScopeNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
              Review & Confirm
            </h3>
            <p className="text-sm text-slate-500">
              Please review the details before creating the job.
            </p>

            <div className="space-y-4">
              {/* Job Details Summary */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Job Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-medium">{selectedCat?.label ?? jobCategory}</span>
                  <span className="text-slate-500">Work Type:</span>
                  <span className="font-medium">
                    {WORK_TYPES.find((w) => w.value === workType)?.label ?? workType}
                  </span>
                  <span className="text-slate-500">Urgency:</span>
                  <span className="font-medium capitalize">{urgency}</span>
                  {budget && (
                    <>
                      <span className="text-slate-500">Budget:</span>
                      <span className="font-medium">${parseInt(budget).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Customer Summary */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Customer
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-medium">
                    {firstName} {lastName}
                  </span>
                  {phone && (
                    <>
                      <span className="text-slate-500">Phone:</span>
                      <span className="font-medium">{phone}</span>
                    </>
                  )}
                  {email && (
                    <>
                      <span className="text-slate-500">Email:</span>
                      <span className="font-medium">{email}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Property Summary */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Property
                </h4>
                <p className="text-sm font-medium">
                  {address}
                  {city ? `, ${city}` : ""}
                  {state ? `, ${state}` : ""} {zip}
                </p>
              </div>

              {/* Photos & Measurements Summary */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Photos
                  </h4>
                  <p className="text-sm">
                    {photos.length > 0
                      ? `${photos.length} photo${photos.length > 1 ? "s" : ""} attached`
                      : "No photos"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Measurements
                  </h4>
                  {roofSquares || sidingLf || pitch ? (
                    <div className="space-y-1 text-sm">
                      {roofSquares && <p>Roof: {roofSquares} squares</p>}
                      {sidingLf && <p>Siding: {sidingLf} LF</p>}
                      {pitch && <p>Pitch: {pitch}</p>}
                      <p>
                        {stories} stor{stories === "1" ? "y" : "ies"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>
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
          {step < 6 && (
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
              {step === 5 ? "Review" : "Next"}
            </Button>
          )}

          {step === 6 && (
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
