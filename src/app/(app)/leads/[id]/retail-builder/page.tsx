// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

import RetailBuilderClient from "./RetailBuilderClient";

export default async function LeadRetailBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();

  if (!orgId) {
    redirect("/onboarding/start");
  }

  // Fetch lead
  const lead = await prisma.leads.findFirst({
    where: {
      id,
      orgId,
    },
  });

  if (!lead) {
    notFound();
  }

  const contactRow = await prisma.contacts.findUnique({
    where: { id: lead.contactId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });

  const contact = {
    id: contactRow?.id ?? lead.contactId,
    firstName: contactRow?.firstName ?? "",
    lastName: contactRow?.lastName ?? "",
    email: contactRow?.email ?? null,
    phone: contactRow?.phone ?? null,
  };

  // Fetch materials from vendor catalog
  const materials = await prisma.vendorProduct.findMany({
    take: 50,
    orderBy: {
      createdAt: "desc",
    },
  });

  const materialOptions = materials.map((m) => ({
    id: m.id,
    name: m.name,
    category: undefined,
    price: undefined,
    vendor: m.vendorId,
  }));

  return <RetailBuilderClient lead={lead} contact={contact} materials={materialOptions} />;
}
