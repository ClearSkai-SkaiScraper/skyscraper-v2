import { Mail, MapPin, Phone, Star, Users, Wrench } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";

interface ClientProsPageProps {
  params: { slug: string };
}

/**
 * Fetch pros connected to a client via ClientProConnection
 */
async function getConnectedPros(clientSlug: string) {
  // Find the client by slug
  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true },
  });

  if (!client) {
    return null;
  }

  // Fetch all connected pros via ClientProConnection
  const connections = await prisma.clientProConnection.findMany({
    where: {
      clientId: client.id,
      status: { in: ["connected", "accepted"] },
    },
    include: {
      tradesCompany: {
        select: {
          id: true,
          name: true,
          logo: true,
          specialties: true,
          rating: true,
          reviewCount: true,
          city: true,
          state: true,
          phone: true,
          email: true,
          slug: true,
        },
      },
    },
    orderBy: { connectedAt: "desc" },
  });

  // Map to a cleaner format
  return connections.map((conn) => ({
    id: conn.tradesCompany.id,
    name: conn.tradesCompany.name,
    logo: conn.tradesCompany.logo,
    specialties: conn.tradesCompany.specialties || [],
    rating: conn.tradesCompany.rating ? Number(conn.tradesCompany.rating) : null,
    reviewCount: conn.tradesCompany.reviewCount,
    city: conn.tradesCompany.city,
    state: conn.tradesCompany.state,
    phone: conn.tradesCompany.phone,
    email: conn.tradesCompany.email,
    slug: conn.tradesCompany.slug,
    connectedAt: conn.connectedAt,
  }));
}

export default async function ClientProsPage({ params }: ClientProsPageProps) {
  const { slug } = params;

  const pros = await getConnectedPros(slug);

  if (pros === null) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Your Pros</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Trusted trades and vendors connected to your home network.
        </p>
      </header>

      {pros.length === 0 ? (
        <div className="rounded-lg border bg-card p-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Users className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">No pros connected yet</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                When your contractor links vendors and trade professionals to your network,
                they&apos;ll appear here with contact information and specialties.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pros.map((pro) => (
            <div key={pro.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                {pro.logo ? (
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image src={pro.logo} alt={`${pro.name} logo`} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <Wrench className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">{pro.name}</h3>

                  {/* Specialties */}
                  {pro.specialties.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {pro.specialties.slice(0, 3).join(" • ")}
                    </p>
                  )}

                  {/* Rating */}
                  {pro.rating !== null && (
                    <div className="mt-1 flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{pro.rating.toFixed(1)}</span>
                      {pro.reviewCount! > 0 && (
                        <span className="text-slate-500">({pro.reviewCount} reviews)</span>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {(pro.city || pro.state) && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                      <MapPin className="h-3 w-3" />
                      {[pro.city, pro.state].filter(Boolean).join(", ")}
                    </p>
                  )}

                  {/* Contact Info */}
                  <div className="mt-2 space-y-1 text-sm">
                    {pro.phone && (
                      <a
                        href={`tel:${pro.phone}`}
                        className="flex items-center gap-2 text-slate-600 hover:text-primary dark:text-slate-400"
                      >
                        <Phone className="h-3 w-3" />
                        {pro.phone}
                      </a>
                    )}
                    {pro.email && (
                      <a
                        href={`mailto:${pro.email}`}
                        className="flex items-center gap-2 text-slate-600 hover:text-primary dark:text-slate-400"
                      >
                        <Mail className="h-3 w-3" />
                        {pro.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
