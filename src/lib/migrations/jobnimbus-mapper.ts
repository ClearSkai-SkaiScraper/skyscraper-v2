/**
 * JobNimbus → SkaiScraper Data Mapper
 *
 * Transforms JobNimbus API objects into SkaiScraper's Prisma schema.
 * Maps contacts, jobs, tasks, files, and activities.
 */

import "server-only";

// ---------------------------------------------------------------------------
// Status mapping — JobNimbus status_name → SkaiScraper enum
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, string> = {
  lead: "NEW",
  "new lead": "NEW",
  new: "NEW",
  contacted: "CONTACTED",
  scheduled: "SCHEDULED",
  "in progress": "IN_PROGRESS",
  "work complete": "COMPLETE",
  completed: "COMPLETE",
  closed: "CLOSED",
  won: "WON",
  lost: "LOST",
  on_hold: "ON_HOLD",
  on_hold_: "ON_HOLD",
};

function mapStatus(statusName: string | null): string {
  if (!statusName) return "UNKNOWN";
  const normalized = statusName.toLowerCase().trim();
  return STATUS_MAP[normalized] ?? "UNKNOWN";
}

// ---------------------------------------------------------------------------
// Contact Mapper
// ---------------------------------------------------------------------------

export function mapContact(jn: {
  jnid: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  home_phone: string | null;
  mobile_phone: string | null;
  work_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_text: string | null;
  zip: string | null;
  country: string | null;
  date_created: number | null;
  date_updated: number | null;
}) {
  // Prefer mobile, then home, then work
  const phone = jn.mobile_phone || jn.home_phone || jn.work_phone || null;
  // Alt phone: next available after primary
  let phoneAlt: string | null = null;
  if (phone === jn.mobile_phone) {
    phoneAlt = jn.home_phone || jn.work_phone || null;
  } else if (phone === jn.home_phone) {
    phoneAlt = jn.work_phone || null;
  }

  return {
    externalId: jn.jnid,
    firstName: jn.first_name || "",
    lastName: jn.last_name || "",
    email: jn.email || null,
    phone,
    phoneAlt,
    addressLine1: jn.address_line1 || null,
    addressLine2: jn.address_line2 || null,
    addressCity: jn.city || null,
    addressState: jn.state_text || null,
    addressZip: jn.zip || null,
    addressCountry: jn.country || null,
    source: "JOBNIMBUS" as const,
    createdAt: jn.date_created ? new Date(jn.date_created * 1000) : new Date(),
    updatedAt: jn.date_updated ? new Date(jn.date_updated * 1000) : new Date(),
  };
}

// ---------------------------------------------------------------------------
// Job Mapper
// ---------------------------------------------------------------------------

export function mapJob(jn: {
  jnid: string;
  number: number | null;
  name: string | null;
  status_name: string | null;
  description: string | null;
  sales_rep: string | null;
  sales_rep_name: string | null;
  location: {
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state_text: string | null;
    zip: string | null;
    country: string | null;
    geo?: { lat: number | null; lon: number | null } | null;
  } | null;
  related: string[];
  date_created: number | null;
  date_updated: number | null;
  date_start: number | null;
  date_end: number | null;
  approved_estimate_total: number | null;
  approved_estimate_subtotal: number | null;
}) {
  const loc = jn.location;

  return {
    externalId: jn.jnid,
    claimNumber: jn.number ? `JN-${jn.number}` : null,
    projectName: jn.name || "Untitled Job",
    status: mapStatus(jn.status_name),
    description: jn.description || null,
    assignedTo: jn.sales_rep_name || null,
    assignedRepId: jn.sales_rep || null,
    addressLine1: loc?.address_line1 || null,
    addressLine2: loc?.address_line2 || null,
    addressCity: loc?.city || null,
    addressState: loc?.state_text || null,
    addressZip: loc?.zip || null,
    addressCountry: loc?.country || null,
    latitude: loc?.geo?.lat ?? null,
    longitude: loc?.geo?.lon ?? null,
    estimateTotal: jn.approved_estimate_total ?? null,
    estimateSubtotal: jn.approved_estimate_subtotal ?? null,
    relatedContactIds: jn.related || [],
    source: "JOBNIMBUS" as const,
    createdAt: jn.date_created ? new Date(jn.date_created * 1000) : new Date(),
    updatedAt: jn.date_updated ? new Date(jn.date_updated * 1000) : new Date(),
    startDate: jn.date_start ? new Date(jn.date_start * 1000) : null,
    endDate: jn.date_end ? new Date(jn.date_end * 1000) : null,
  };
}

// ---------------------------------------------------------------------------
// Task Mapper
// ---------------------------------------------------------------------------

export function mapTask(jn: {
  jnid: string;
  title: string | null;
  description: string | null;
  type: string | null;
  is_completed: boolean;
  date_due: number | null;
  date_completed: number | null;
  related: string[];
  date_created: number | null;
  date_updated: number | null;
}) {
  return {
    externalId: jn.jnid,
    title: jn.title || "Untitled Task",
    description: jn.description || null,
    type: jn.type || "TASK",
    isCompleted: jn.is_completed ?? false,
    dueDate: jn.date_due ? new Date(jn.date_due * 1000) : null,
    completedDate: jn.date_completed ? new Date(jn.date_completed * 1000) : null,
    relatedJobIds: jn.related || [],
    source: "JOBNIMBUS" as const,
    createdAt: jn.date_created ? new Date(jn.date_created * 1000) : new Date(),
    updatedAt: jn.date_updated ? new Date(jn.date_updated * 1000) : new Date(),
  };
}

// ---------------------------------------------------------------------------
// File Mapper
// ---------------------------------------------------------------------------

export function mapFile(jn: {
  jnid: string;
  filename: string | null;
  description: string | null;
  url: string | null;
  content_type: string | null;
  related: string[];
  date_created: number | null;
}) {
  return {
    externalId: jn.jnid,
    filename: jn.filename || "unknown",
    description: jn.description || null,
    sourceUrl: jn.url || null,
    contentType: jn.content_type || "application/octet-stream",
    relatedJobIds: jn.related || [],
    source: "JOBNIMBUS" as const,
    createdAt: jn.date_created ? new Date(jn.date_created * 1000) : new Date(),
  };
}

// ---------------------------------------------------------------------------
// Activity Mapper — returns null for empty activities
// ---------------------------------------------------------------------------

export function mapActivity(jn: {
  jnid: string;
  type: string | null;
  note: string | null;
  related: string[];
  date_created: number | null;
}) {
  // Skip activities with no content
  if (!jn.note) return null;

  return {
    externalId: jn.jnid,
    type: jn.type || "NOTE",
    content: jn.note,
    relatedJobIds: jn.related || [],
    source: "JOBNIMBUS" as const,
    createdAt: jn.date_created ? new Date(jn.date_created * 1000) : new Date(),
  };
}

// ---------------------------------------------------------------------------
// Batch Mapper — map all data types together with stats
// ---------------------------------------------------------------------------

export function mapAllData(
  contacts: Parameters<typeof mapContact>[0][],
  jobs: Parameters<typeof mapJob>[0][],
  tasks: Parameters<typeof mapTask>[0][],
  files: Parameters<typeof mapFile>[0][],
  activities: Parameters<typeof mapActivity>[0][]
) {
  const leads = contacts.map(mapContact);
  const claims = jobs.map(mapJob);
  const mappedTasks = tasks.map(mapTask);
  const documents = files.map(mapFile);
  const notes = activities.map(mapActivity).filter(Boolean);

  return {
    leads,
    claims,
    tasks: mappedTasks,
    documents,
    notes,
    stats: {
      contactsProcessed: contacts.length,
      jobsProcessed: jobs.length,
      tasksProcessed: tasks.length,
      filesProcessed: files.length,
      activitiesProcessed: activities.length,
      notesCreated: notes.length,
    },
  };
}
