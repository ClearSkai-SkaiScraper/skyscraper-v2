import prisma from "@/lib/prisma";

export interface LeadDTO {
  id: string;
  orgId: string;
  title: string | null;
  description: string | null;
  source: string | null;
  stage: string | null;
  status: string | null; // legacy / alternate status field if present
  temperature: string | null;
  probability: number | null;
  value: number | null;
  assignedTo: string | null;
  followUpDate: string | null;
  contact?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

type ContactLite = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLead(lead: any, contact: ContactLite | null): LeadDTO {
  return {
    id: lead.id,
    orgId: lead.orgId,
    title: lead.title || null,
    description: lead.description || null,
    source: lead.source || null,
    stage: lead.stage || null,
    status: lead.status || null,
    temperature: lead.temperature || null,
    probability: typeof lead.probability === "number" ? lead.probability : null,
    value: typeof lead.value === "number" ? lead.value : null,
    assignedTo: lead.assignedTo || null,
    followUpDate: lead.followUpDate ? lead.followUpDate.toISOString?.() || lead.followUpDate : null,
    contact: contact
      ? {
          id: contact.id,
          firstName: contact.firstName || null,
          lastName: contact.lastName || null,
          email: contact.email || null,
          phone: contact.phone || null,
          company: contact.company || null,
        }
      : null,
    createdAt: lead.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: lead.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

interface CreateLeadInput {
  id?: string;
  orgId: string;
  title: string;
  description?: string | null;
  source: string;
  value?: number | null;
  probability?: number | null;
  stage?: string;
  temperature?: string;
  assignedTo?: string | null;
  createdBy?: string | null;
  followUpDate?: Date | null;
  contactId?: string | null;
  // NEW: Multi-pipeline fields
  jobType?: string | null;
  workType?: string | null;
  urgency?: string | null;
  budget?: number | null;
  warmthScore?: number | null;
  // Job category for pipeline routing
  jobCategory?: string | null;
  clientId?: string | null;
}

export async function createLead(data: CreateLeadInput): Promise<LeadDTO> {
  if (!data.contactId) {
    throw new Error("contactId is required to create a lead");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadData: any = {
    id: data.id || crypto.randomUUID(),
    orgId: data.orgId,
    contactId: data.contactId,
    title: data.title,
    description: data.description ?? null,
    source: data.source,
    value: data.value ?? null,
    probability: data.probability ?? null,
    stage: data.stage || "new",
    temperature: data.temperature || "warm",
    assignedTo: data.assignedTo ?? null,
    createdBy: data.createdBy ?? null,
    followUpDate: data.followUpDate ?? null,
    updatedAt: new Date(),
    // NEW: Multi-pipeline fields
    jobType: data.jobType ?? null,
    workType: data.workType ?? null,
    urgency: data.urgency ?? null,
    budget: data.budget ?? null,
    warmthScore: data.warmthScore ?? null,
    // Job category for pipeline routing
    jobCategory: data.jobCategory ?? "lead",
    clientId: data.clientId ?? null,
  };

  const lead = await prisma.leads.create({
    data: leadData,
  });

  const contact = await prisma.contacts.findUnique({
    where: { id: lead.contactId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      company: true,
    },
  });

  return mapLead(lead, contact);
}

interface ListLeadsParams {
  orgId: string;
  limit?: number;
  offset?: number;
  stage?: string | null;
  source?: string | null;
  assignedTo?: string | null;
  search?: string | null;
}

export async function listLeads(
  params: ListLeadsParams
): Promise<{ leads: LeadDTO[]; total: number; limit: number; offset: number }> {
  const { orgId, limit = 50, offset = 0, stage, source, assignedTo, search } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { orgId, archivedAt: null };
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (assignedTo) where.assignedTo = assignedTo;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
    ];
  }
  const [leads, total] = await Promise.all([
    prisma.leads.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.leads.count({ where }),
  ]);

  const contactIds = Array.from(new Set(leads.map((lead) => lead.contactId).filter(Boolean)));
  const contacts =
    contactIds.length > 0
      ? await prisma.contacts.findMany({
          where: { id: { in: contactIds }, orgId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
          },
        })
      : [];

  const contactsById = new Map<string, ContactLite>(contacts.map((c) => [c.id, c]));

  return {
    leads: leads.map((lead) => mapLead(lead, contactsById.get(lead.contactId) ?? null)),
    total,
    limit,
    offset,
  };
}
