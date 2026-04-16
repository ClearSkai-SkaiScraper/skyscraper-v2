// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { User } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import prisma from "@/lib/prisma";

import { ProfileSettingsClient } from "./ProfileSettingsClient";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const currentAuthUser = await currentUser();
  if (!currentAuthUser) redirect("/sign-in");
  const userId = currentAuthUser.id;

  const user = await prisma.users.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      name: true,
      email: true,
      headshot_url: true,
      phone: true,
      title: true,
      bio: true,
      years_experience: true,
      certifications: true,
      specialties: true,
      license_number: true,
      license_state: true,
      signature_url: true,
    },
  });

  if (!user) {
    redirect("/");
  }

  // Map DB fields to what the client component expects
  const userWithDefaults = {
    ...user,
    phone: user.phone ?? null,
    title: user.title ?? null,
    bio: user.bio ?? null,
    years_experience: user.years_experience ?? null,
    public_skills: user.specialties ?? null,
    certifications: user.certifications ?? null,
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <PageHero
          section="settings"
          title="Profile Settings"
          subtitle="Manage your personal information and professional profile"
          icon={<User className="h-6 w-6" />}
        />

        <ProfileSettingsClient user={userWithDefaults} />
      </div>
    </div>
  );
}
