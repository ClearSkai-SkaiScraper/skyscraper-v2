"use client";

import { useUser } from "@clerk/nextjs";
import { Award, Briefcase, Plus, Save, Trash2, Upload, User, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface Skill {
  skill: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
}

interface JobEntry {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  description: string;
  achievements?: string[];
}

interface Certification {
  name: string;
  issuer: string;
  dateEarned: string;
  expiresAt?: string;
  credentialId?: string;
}

interface Testimonial {
  clientName: string;
  clientCompany?: string;
  quote: string;
  date: string;
  rating: number;
  projectType?: string;
}

export default function ProfileEditPage({ params }: { params: { memberId: string } }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);

  // Form state
  const [headshotUrl, setHeadshotUrl] = useState<string>("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobHistory, setJobHistory] = useState<JobEntry[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    void loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.memberId]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  async function loadProfile() {
    try {
      const res = await fetch(`/api/team/member/${params.memberId}`);
      if (res.ok) {
        const data = await res.json();
        setHeadshotUrl(data.headshotUrl || "");
        setBio(data.bio || "");
        setYearsExperience(data.yearsExperience || 0);
        setSkills(data.publicSkills || []);
        setJobHistory(data.jobHistory || []);
        setCertifications(data.certifications || []);
        setTestimonials(data.clientTestimonials || []);
      }
    } catch (error) {
      logger.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleHeadshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHeadshot(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setHeadshotUrl(data.url);
      } else {
        alert("Failed to upload headshot");
      }
    } catch (error) {
      logger.error("Headshot upload error:", error);
      alert("Failed to upload headshot");
    } finally {
      setUploadingHeadshot(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/team/member/${params.memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headshotUrl,
          bio,
          yearsExperience,
          publicSkills: skills,
          jobHistory,
          certifications,
          clientTestimonials: testimonials,
        }),
      });

      if (res.ok) {
        router.push("/trades/profile");
      } else {
        alert("Failed to save profile");
      }
    } catch (error) {
      logger.error("Save error:", error);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function addSkill() {
    setSkills([...skills, { skill: "", level: "Beginner" }]);
  }

  function updateSkill(index: number, field: keyof Skill, value: string) {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    setSkills(updated);
  }

  function removeSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index));
  }

  function addJobEntry() {
    setJobHistory([
      ...jobHistory,
      { company: "", role: "", startDate: "", description: "", achievements: [] },
    ]);
  }

  function updateJobEntry(index: number, field: keyof JobEntry, value: any) {
    const updated = [...jobHistory];
    updated[index] = { ...updated[index], [field]: value };
    setJobHistory(updated);
  }

  function removeJobEntry(index: number) {
    setJobHistory(jobHistory.filter((_, i) => i !== index));
  }

  function addCertification() {
    setCertifications([...certifications, { name: "", issuer: "", dateEarned: "" }]);
  }

  function updateCertification(index: number, field: keyof Certification, value: string) {
    const updated = [...certifications];
    updated[index] = { ...updated[index], [field]: value };
    setCertifications(updated);
  }

  function removeCertification(index: number) {
    setCertifications(certifications.filter((_, i) => i !== index));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function addTestimonial() {
    setTestimonials([
      ...testimonials,
      { clientName: "", quote: "", date: new Date().toISOString().split("T")[0], rating: 5 },
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function updateTestimonial(index: number, field: keyof Testimonial, value: any) {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setTestimonials(updated);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function removeTestimonial(index: number) {
    setTestimonials(testimonials.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[color:var(--primary)]" />
          <p className="text-slate-700 dark:text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Edit Profile</h1>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Update your professional information for internal Teams and external Trades Network
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-[color:var(--border)] px-4 py-2 transition-colors hover:bg-[var(--surface-1)]"
            aria-label="Close and go back"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Headshot Section */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <User className="h-5 w-5" />
            Profile Photo
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {headshotUrl ? (
                <Image
                  src={headshotUrl}
                  alt="Profile"
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-[color:var(--border)] object-cover"
                />
              ) : (
                <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 border-[color:var(--border)] bg-gradient-indigo">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
            </div>
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-white transition-opacity hover:opacity-90">
                <Upload className="h-4 w-4" />
                {uploadingHeadshot ? "Uploading..." : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHeadshotUpload}
                  className="hidden"
                  disabled={uploadingHeadshot}
                />
              </label>
              <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                JPG, PNG or GIF. Max 5MB. Square format recommended.
              </p>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="mb-4 text-xl font-semibold">Professional Bio</h2>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a brief professional bio (200-300 words)..."
            className="min-h-[150px] w-full rounded-lg border border-[color:var(--border)] bg-[var(--bg)] p-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            maxLength={500}
          />
          <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
            {bio.length}/500 characters
          </p>
        </div>

        {/* Experience Section */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="mb-4 text-xl font-semibold">Years of Experience</h2>
          <input
            type="number"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
            min="0"
            max="50"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--bg)] p-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            aria-label="Years of experience"
          />
        </div>

        {/* Skills Section */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Briefcase className="h-5 w-5" />
              Skills & Expertise
            </h2>
            <button
              onClick={addSkill}
              className="flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-3 py-1 text-sm text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Skill
            </button>
          </div>
          <div className="space-y-3">
            {skills.map((skill, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  value={skill.skill}
                  onChange={(e) => updateSkill(idx, "skill", e.target.value)}
                  placeholder="Skill name (e.g., Roofing, Estimating)"
                  className="flex-1 rounded-lg border border-[color:var(--border)] bg-[var(--bg)] p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                />
                <select
                  value={skill.level}
                  onChange={(e) => updateSkill(idx, "level", e.target.value)}
                  className="rounded-lg border border-[color:var(--border)] bg-[var(--bg)] p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                  aria-label="Skill level"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
                <button
                  onClick={() => removeSkill(idx)}
                  className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                  aria-label="Remove skill"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Job History Section */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Briefcase className="h-5 w-5" />
              Work History
            </h2>
            <button
              onClick={addJobEntry}
              className="flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-3 py-1 text-sm text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Position
            </button>
          </div>
          <div className="space-y-6">
            {jobHistory.map((job, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-lg border border-[color:var(--border)] bg-[var(--bg)] p-4"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">Position #{idx + 1}</h3>
                  <button
                    onClick={() => removeJobEntry(idx)}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    aria-label="Remove job entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={job.company}
                  onChange={(e) => updateJobEntry(idx, "company", e.target.value)}
                  placeholder="Company name"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                />
                <input
                  type="text"
                  value={job.role}
                  onChange={(e) => updateJobEntry(idx, "role", e.target.value)}
                  placeholder="Role/Title"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={job.startDate}
                    onChange={(e) => updateJobEntry(idx, "startDate", e.target.value)}
                    placeholder="Start date"
                    className="rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                  />
                  <input
                    type="date"
                    value={job.endDate || ""}
                    onChange={(e) => updateJobEntry(idx, "endDate", e.target.value)}
                    placeholder="End date (leave blank if current)"
                    className="rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                  />
                </div>
                <textarea
                  value={job.description}
                  onChange={(e) => updateJobEntry(idx, "description", e.target.value)}
                  placeholder="Job description"
                  className="min-h-[80px] w-full rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Certifications Section */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Award className="h-5 w-5" />
              Certifications
            </h2>
            <button
              onClick={addCertification}
              className="flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-3 py-1 text-sm text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Certification
            </button>
          </div>
          <div className="space-y-3">
            {certifications.map((cert, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-lg border border-[color:var(--border)] bg-[var(--bg)] p-4"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">Certification #{idx + 1}</h3>
                  <button
                    onClick={() => removeCertification(idx)}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    aria-label="Remove certification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={cert.name}
                  onChange={(e) => updateCertification(idx, "name", e.target.value)}
                  placeholder="Certification name"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                />
                <input
                  type="text"
                  value={cert.issuer}
                  onChange={(e) => updateCertification(idx, "issuer", e.target.value)}
                  placeholder="Issuing organization"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={cert.dateEarned}
                    onChange={(e) => updateCertification(idx, "dateEarned", e.target.value)}
                    placeholder="Date earned"
                    className="rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                  />
                  <input
                    type="date"
                    value={cert.expiresAt || ""}
                    onChange={(e) => updateCertification(idx, "expiresAt", e.target.value)}
                    placeholder="Expiration date (optional)"
                    className="rounded-lg border border-[color:var(--border)] bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="sticky bottom-4 flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-[color:var(--border)] bg-white px-6 py-3 font-medium transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-gradient-indigo px-6 py-3 font-medium text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
