"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SkillsEditor } from "@/components/trades/SkillsEditor";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface Skill {
  id: string;
  name: string;
  category?: string;
}

export default function SkillsCertificationsPage() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const res = await fetch("/api/trades/profile", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await res.json();

        // Convert existing skills to the expected format
        if (data.profile?.specialties && Array.isArray(data.profile.specialties)) {
          setSkills(
            data.profile.specialties.map((name: string, index: number) => ({
              id: `${index}`,
              name,
              category: "Skill",
            }))
          );
        }
      } catch (error) {
        logger.error("[SkillsPage] Failed to load skills:", error);
        toast.error("Failed to load skills");
      } finally {
        setInitialLoading(false);
      }
    };

    loadSkills();
  }, []);

  const handleSave = async (updatedSkills: Skill[]) => {
    // Convert skills back to array of names for the API
    const specialties = updatedSkills.map((s) => s.name);

    const res = await fetch("/api/trades/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        specialties,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to save skills");
    }

    setSkills(updatedSkills);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/trades/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skills & Certifications</h1>
            <p className="text-sm text-gray-600">
              Manage your professional skills, licenses, and certifications
            </p>
          </div>
        </div>

        {/* Editor */}
        <SkillsEditor
          initialSkills={skills}
          onSave={handleSave}
          title="Professional Qualifications"
          description="Add licenses, certifications, and specialized skills to showcase your expertise"
          placeholder="e.g., OSHA 30, EPA Lead-Safe Certified, Roofing Master"
          categories={["License", "Certification", "Skill", "Training", "Award"]}
        />

        {/* Tips */}
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">💡 Tips for Adding Skills</h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>• Include state licenses (e.g., "Arizona Roofing License #123456")</li>
            <li>• Add industry certifications (e.g., "GAF Master Elite", "CertainTeed SELECT")</li>
            <li>• List safety training (e.g., "OSHA 30", "Fall Protection")</li>
            <li>• Mention specialized skills (e.g., "Commercial Roofing", "Metal Roofing")</li>
            <li>• Include software proficiency (e.g., "EagleView", "Xactimate")</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
