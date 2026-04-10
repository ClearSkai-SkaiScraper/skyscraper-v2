"use client";

import { LucideIcon } from "lucide-react";

import { BrandingTemplateSelector } from "@/components/ai/BrandingTemplateSelector";
import { ClaimSelect } from "@/components/claims/ClaimSelect";
import { PageHero } from "@/components/layout/PageHero";
import { Label } from "@/components/ui/label";

interface Claim {
  id: string;
  claimNumber: string | null;
  propertyAddress: string | null;
  dateOfLoss: Date | null;
}

interface ClaimContextHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ReactElement<LucideIcon>;
  claims: Claim[];
  selectedClaimId: string;
  onClaimChange: (claimId: string) => void;
  selectedTemplate?: string;
  onTemplateChange?: (template: string) => void;
  showTemplateSelector?: boolean;
  children?: React.ReactNode;
}

/**
 * Shared header component for claim-based AI tools
 * Provides consistent claim selection + branding template picker
 */
export function ClaimContextHeader({
  title,
  subtitle,
  icon,
  claims,
  selectedClaimId,
  onClaimChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selectedTemplate,
  onTemplateChange,
  showTemplateSelector = true,
  children,
}: ClaimContextHeaderProps) {
  return (
    <PageHero section="claims" title={title} subtitle={subtitle} icon={icon}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="claim-select" className="text-sm font-medium">
            Claim:
          </Label>
          <ClaimSelect
            claims={claims}
            selectedClaimId={selectedClaimId}
            onClaimChange={onClaimChange}
          />
        </div>
        {showTemplateSelector && onTemplateChange && (
          <BrandingTemplateSelector onApplyTemplate={onTemplateChange} />
        )}
        {children}
      </div>
    </PageHero>
  );
}
