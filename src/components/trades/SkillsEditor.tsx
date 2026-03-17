"use client";

import { Check, Edit2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";

interface Skill {
  id: string;
  name: string;
  category?: string;
}

interface SkillsEditorProps {
  initialSkills: Skill[];
  onSave: (skills: Skill[]) => Promise<void>;
  title?: string;
  description?: string;
  placeholder?: string;
  categories?: string[];
}

export function SkillsEditor({
  initialSkills = [],
  onSave,
  title = "Skills & Certifications",
  description = "Add your professional skills and certifications",
  placeholder = "e.g., OSHA 30, EPA Lead-Safe",
  categories = ["Certification", "License", "Skill", "Training"],
}: SkillsEditorProps) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState(categories[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    if (!newSkillName.trim()) {
      toast.error("Please enter a skill name");
      return;
    }

    const newSkill: Skill = {
      id: crypto.randomUUID(),
      name: newSkillName.trim(),
      category: newSkillCategory,
    };

    setSkills([...skills, newSkill]);
    setNewSkillName("");
    setNewSkillCategory(categories[0]);
    toast.success("Skill added");
  };

  const handleRemove = (id: string) => {
    setSkills(skills.filter((s) => s.id !== id));
    toast.success("Skill removed");
  };

  const startEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditCategory(skill.category || categories[0]);
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      toast.error("Skill name cannot be empty");
      return;
    }

    setSkills(
      skills.map((s) =>
        s.id === editingId ? { ...s, name: editName.trim(), category: editCategory } : s
      )
    );
    setEditingId(null);
    setEditName("");
    setEditCategory("");
    toast.success("Skill updated");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCategory("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(skills);
      toast.success("Skills saved successfully");
    } catch (error) {
      logger.error("Failed to save skills:", error);
      toast.error("Failed to save skills");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      {/* Add New Skill */}
      <div className="mb-6 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-skill">Skill/Certification Name</Label>
            <Input
              id="new-skill"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder={placeholder}
              onKeyPress={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-category">Category</Label>
            <select
              id="new-category"
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Select skill category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button onClick={handleAdd} size="sm" className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Skill
        </Button>
      </div>

      {/* Skills List */}
      {skills.length > 0 ? (
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">
              Your Skills ({skills.length})
            </h3>
            <div className="space-y-2">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  {editingId === skill.id ? (
                    // Edit Mode
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="h-8 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="Edit skill category"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={saveEdit}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4 text-gray-600" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{skill.name}</span>
                        {skill.category && (
                          <Badge variant="secondary" className="text-xs">
                            {skill.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => startEdit(skill)}
                        >
                          <Edit2 className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleRemove(skill.id)}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end border-t pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-600">No skills added yet. Add your first skill above.</p>
        </div>
      )}
    </Card>
  );
}
