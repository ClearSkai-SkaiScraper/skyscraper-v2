"use client";

/**
 * Company Documents Settings Page
 *
 * Upload and manage company-wide document templates
 */

import { Eye, FileText, Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
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
import { logger } from "@/lib/logger";

interface Template {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  storagePath: string;
  sizeBytes: number;
  createdAt: string;
}

export default function CompanyDocumentsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [draftPurpose, setDraftPurpose] = useState("");

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await fetch("/api/company-docs/list");
      const data = await res.json();
      if (data.ok) {
        setTemplates(data.templates);
      }
    } catch (error) {
      logger.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      if (description) formData.append("description", description);

      const res = await fetch("/api/company-docs/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.ok) {
        alert("Template uploaded successfully!");
        setFile(null);
        setTitle("");
        setDescription("");
        void loadTemplates();
      } else {
        alert(data.message || "Upload failed");
      }
    } catch (error) {
      logger.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <PageContainer>
      <PageHero
        section="settings"
        title="Company Documents"
        subtitle="Upload, manage, and generate reusable templates for agreements and warranties"
        icon={<FileText className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle>Upload a Company Document</CardTitle>
              <CardDescription>
                Add workmanship warranties, authorizations, or custom contracts for your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Workmanship Warranty"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain when this document should be used"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="file">PDF File *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Max size: 10MB • PDF only</p>
                </div>

                <div className="md:col-span-2">
                  <Button type="submit" disabled={uploading || !file || !title} className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Templates List */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>View and reuse company-wide PDFs</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-500">No documents uploaded yet</p>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{template.title}</h4>
                        {template.description && (
                          <p className="mt-1 text-xs text-gray-600">{template.description}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {template.fileName} • {(template.sizeBytes / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(template.storagePath, "_blank")}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI Summary Box
              </CardTitle>
              <CardDescription>Auto-summarize uploaded documents for quick reuse</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-blue-100 bg-white p-4 text-sm text-blue-900">
                Upload a PDF to see an AI summary here. This will highlight key terms, coverage, and
                signature requirements.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create a New Document Draft</CardTitle>
              <CardDescription>Start from a template and generate a new variation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No templates available</div>
                    ) : (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Draft Purpose</Label>
                <Textarea
                  value={draftPurpose}
                  onChange={(e) => setDraftPurpose(e.target.value)}
                  placeholder="Example: Create a warranty addendum for 10-year coverage"
                  rows={4}
                />
              </div>

              <Button disabled className="w-full">
                Generate Draft (AI)
              </Button>
              <p className="text-xs text-muted-foreground">
                AI drafting will be enabled once templates are indexed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
