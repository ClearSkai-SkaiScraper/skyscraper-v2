// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import ContractorDetailClient from "@/components/contractor/ContractorDetailClient";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function DirectorySlugPage({ params }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const company = await prisma.tradesCompany.findUnique({
    where: { slug: params.slug },
    include: {
      members: {
        take: 1,
      },
    },
  });

  if (!company || !company.isActive) {
    notFound();
  }

  // Get reviews for the company's members
  const memberId = company.members[0]?.id;
  const reviews = memberId
    ? await prisma.trade_reviews.findMany({
        where: { contractorId: memberId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          title: true,
          createdAt: true,
        },
      })
    : [];

  // Serialize dates - use actual tradesCompany fields
  const serializedContractor = {
    id: company.id,
    slug: company.slug,
    businessName: company.name,
    tagline: company.description ?? null,
    about: company.description ?? null,
    logoUrl: company.logo ?? null,
    coverImageUrl: company.coverimage ?? null,
    primaryTrade: company.specialties?.[0] ?? null,
    services: company.specialties ?? [],
    serviceAreas: company.serviceArea ?? [],
    phone: company.phone ?? null,
    email: company.email ?? null,
    website: company.website ?? null,
    avgRating: company.rating ? Number(company.rating) : null,
    totalReviews: company.reviewCount ?? 0,
    verificationStatus: company.isVerified ? "VERIFIED" : null,
    licensedInsured: Boolean(company.licenseNumber),
    licenseNumber: company.licenseNumber ?? null,
    emergencyAvailable: false,
    acceptingLeads: true,
    yearsInBusiness: company.yearsInBusiness ?? null,
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reviewerName: review.title ?? "Anonymous",
      createdAt: review.createdAt.toISOString(),
    })),
  };

  return <ContractorDetailClient contractor={serializedContractor} />;
}
