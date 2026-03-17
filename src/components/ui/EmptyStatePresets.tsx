/**
 * Empty State Presets
 *
 * Per AI advisor: "Add visual empty states everywhere - not just 'No data',
 * but helpful prompts with illustrations."
 *
 * Pre-configured empty states for common platform scenarios.
 * Use these instead of building custom empty states for consistency.
 */

import {
  BarChart3,
  Building2,
  CalendarX,
  Cloud,
  CloudOff,
  FileQuestion,
  FileText,
  FolderOpen,
  Inbox,
  MapPin,
  MessageSquare,
  Search,
  Users,
  Wrench,
} from "lucide-react";

import EmptyState, { type EmptyStateProps } from "@/components/ui/EmptyState";

type PresetProps = Partial<EmptyStateProps>;

/**
 * No claims found
 */
export function NoClaimsEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No claims yet"
      description="Create your first claim to start tracking damage reports and insurance documentation."
      ctaLabel="Create Claim"
      ctaHref="/claims/new"
      {...props}
    />
  );
}

/**
 * No leads found
 */
export function NoLeadsEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={Users}
      title="No leads in pipeline"
      description="Leads will appear here as you add potential customers. Import contacts or add them manually."
      ctaLabel="Add Lead"
      ctaHref="/leads/new"
      {...props}
    />
  );
}

/**
 * No search results
 */
export function NoSearchResultsEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search terms or filters to find what you're looking for."
      size="sm"
      {...props}
    />
  );
}

/**
 * No weather data
 */
export function NoWeatherDataEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={CloudOff}
      title="No weather data available"
      description="Generate a weather report by selecting a date of loss and property location."
      ctaLabel="Generate Report"
      {...props}
    />
  );
}

/**
 * No weather reports
 */
export function NoWeatherReportsEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={Cloud}
      title="No weather reports"
      description="Weather reports help verify storm damage. Generate your first report from a claim page."
      {...props}
    />
  );
}

/**
 * No documents/files
 */
export function NoDocumentsEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No documents uploaded"
      description="Upload photos, estimates, and documentation to support this claim."
      ctaLabel="Upload Files"
      {...props}
    />
  );
}

/**
 * No messages
 */
export function NoMessagesEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages yet"
      description="Start a conversation with your team or clients."
      size="sm"
      {...props}
    />
  );
}

/**
 * No properties
 */
export function NoPropertiesEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={Building2}
      title="No properties added"
      description="Add properties to track job locations and associated claims."
      ctaLabel="Add Property"
      ctaHref="/properties/new"
      {...props}
    />
  );
}

/**
 * No scheduled items
 */
export function NoScheduledEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={CalendarX}
      title="Nothing scheduled"
      description="Schedule inspections, appointments, and follow-ups to stay organized."
      {...props}
    />
  );
}

/**
 * No map pins
 */
export function NoMapPinsEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={MapPin}
      title="No locations to display"
      description="Add properties with addresses to see them on the map."
      size="lg"
      {...props}
    />
  );
}

/**
 * No archived items
 */
export function NoArchivedEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={Inbox}
      title="Archive is empty"
      description="Archived claims, leads, and projects will appear here."
      size="sm"
      {...props}
    />
  );
}

/**
 * No analytics data
 */
export function NoAnalyticsEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={BarChart3}
      title="Not enough data"
      description="Analytics will populate as you add claims and track progress over time."
      {...props}
    />
  );
}

/**
 * No AI content generated
 */
export function NoAIContentEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No AI content generated"
      description="Click the generate button to create AI-powered content for this section."
      {...props}
    />
  );
}

/**
 * No vendors/contractors
 */
export function NoVendorsEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={Wrench}
      title="No vendors added"
      description="Build your network by adding trusted subcontractors and suppliers."
      ctaLabel="Add Vendor"
      ctaHref="/network/vendors/new"
      {...props}
    />
  );
}

/**
 * Generic empty state for tables/lists
 */
export function GenericTableEmpty(props: PresetProps) {
  return (
    <EmptyState
      icon={Inbox}
      title="No data available"
      description="There's nothing to display here yet."
      size="sm"
      {...props}
    />
  );
}
