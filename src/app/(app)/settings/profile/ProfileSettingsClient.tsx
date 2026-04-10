"use client";

import { useState } from "react";

import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileSettingsClientProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    title: string | null;
    bio: string | null;
    years_experience: number | null;
    headshot_url: string | null;
    public_skills: any;
    certifications: any;
  };
}

export function ProfileSettingsClient({ user }: ProfileSettingsClientProps) {
  const [photoUrl, setPhotoUrl] = useState(user.headshot_url);

  const skills =
    typeof user.public_skills === "string"
      ? JSON.parse(user.public_skills)
      : Array.isArray(user.public_skills)
        ? user.public_skills
        : [];

  const certifications =
    typeof user.certifications === "string"
      ? JSON.parse(user.certifications)
      : Array.isArray(user.certifications)
        ? user.certifications
        : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>
            Upload a professional photo that will appear across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            currentPhotoUrl={photoUrl}
            onUploadComplete={(url) => setPhotoUrl(url)}
            userId={user.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your profile details and professional information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialData={{
              name: user.name || "",
              phone: user.phone || "",
              title: user.title || "",
              bio: user.bio || "",
              years_experience: user.years_experience || 0,
              public_skills: skills,
              certifications: certifications,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
