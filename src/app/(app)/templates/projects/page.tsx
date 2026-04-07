"use client";

import { useUser } from "@clerk/nextjs";
import { Copy, FileText, Plus, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  tasks: number;
  estimatedDays: number;
  popular: boolean;
}

export default function ProjectTemplatesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const [templates] = useState<ProjectTemplate[]>([
    {
      id: "1",
      name: "Residential Roof Replacement",
      category: "Roofing",
      description:
        "Complete roof replacement workflow with inspection, material ordering, installation, and cleanup",
      tasks: 12,
      estimatedDays: 3,
      popular: true,
    },
    {
      id: "2",
      name: "Commercial Roof Repair",
      category: "Roofing",
      description:
        "Repair workflow for commercial properties including safety protocols and permits",
      tasks: 8,
      estimatedDays: 2,
      popular: true,
    },
    {
      id: "3",
      name: "Gutter Installation",
      category: "Gutters",
      description:
        "End-to-end gutter installation with measurements, material selection, and installation",
      tasks: 6,
      estimatedDays: 1,
      popular: false,
    },
  ]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Project Templates</h1>
          <p className="text-gray-600">Pre-built workflows for common job types</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-5 w-5" />
          Create Template
        </Button>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg bg-white shadow transition-shadow hover:shadow-lg"
          >
            <div className="p-6">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                {template.popular && (
                  <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                    <Star className="h-3 w-3" />
                    Popular
                  </span>
                )}
              </div>

              <h3 className="mb-2 text-lg font-bold">{template.name}</h3>
              <p className="mb-4 text-sm text-gray-600">{template.description}</p>

              <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
                <div>{template.tasks} tasks</div>
                <div>•</div>
                <div>{template.estimatedDays} days</div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2">
                  <Copy className="h-4 w-4" />
                  Use Template
                </Button>
                <Button variant="outline">Preview</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
