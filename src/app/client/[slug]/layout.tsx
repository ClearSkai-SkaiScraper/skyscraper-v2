// src/app/client/[slug]/layout.tsx
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import prisma from "@/lib/prisma";

interface ClientLayoutProps {
  children: ReactNode;
  params: { slug: string };
}

export default async function ClientLayout({ children, params }: ClientLayoutProps) {
  const { userId } = await auth();
  if (!userId) redirect("/client/sign-in");

  const { slug } = params;

  // SECURITY: Verify this slug belongs to the authenticated user
  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  if (userEmail) {
    const client = await prisma.client.findFirst({
      where: { slug, email: userEmail },
      select: { id: true },
    });
    if (!client) {
      redirect("/portal");
    }
  }

  const basePath = `/client/${slug}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Your Client Network</div>
            <div className="truncate text-xs text-muted-foreground">{slug}</div>
          </div>
          <nav className="flex gap-4 text-xs md:text-sm">
            <Link href={basePath} className="transition-colors hover:text-primary">
              Overview
            </Link>
            <Link href={`${basePath}/pros`} className="transition-colors hover:text-primary">
              Pros
            </Link>
            <Link href={`${basePath}/projects`} className="transition-colors hover:text-primary">
              Projects
            </Link>
            <Link href={`${basePath}/shared`} className="transition-colors hover:text-primary">
              Shared
            </Link>
            <Link href={`${basePath}/documents`} className="transition-colors hover:text-primary">
              Documents
            </Link>
            <Link href={`${basePath}/activity`} className="transition-colors hover:text-primary">
              Activity
            </Link>
            <Link href={`${basePath}/request`} className="transition-colors hover:text-primary">
              New Request
            </Link>
            <Link href={`${basePath}/profile`} className="transition-colors hover:text-primary">
              Profile
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
