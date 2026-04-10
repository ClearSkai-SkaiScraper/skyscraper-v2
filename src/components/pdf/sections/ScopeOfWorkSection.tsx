// components/pdf/sections/ScopeOfWorkSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function ScopeOfWorkSection({ data }: { data: ReportData }) {
  const claim = data.claim || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const property = (data as any).property || {};

  // Extract relevant fields with fallbacks
  const propertyAddress = claim.propertyAddress || property.address || "the property";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roofType = (claim as any).roof_type || (claim as any).roofType || "asphalt shingle";
  const structureType =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (claim as any).structure_type || (claim as any).structureType || "single-family";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const squareFootage = (claim as any).square_footage || (claim as any).squareFootage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stories = (claim as any).stories || 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slope = (claim as any).slope || "standard pitch";

  // Check if we have AI-generated scope
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiSummary = (data as any).aiSummary || (data as any).aiReport?.summary;
  const hasCustomScope = !!aiSummary;

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Scope of Work" />

      <View style={{ marginBottom: 12 }}>
        <Text style={[baseStyles.paragraph, { fontSize: 10, color: "#64748B" }]}>
          This section outlines the comprehensive scope of work to be performed at the property
          located at <Text style={{ fontWeight: 600 }}>{propertyAddress}</Text>.
        </Text>
      </View>

      {/* Custom AI-generated scope if available */}
      {hasCustomScope && (
        <View style={{ marginBottom: 16 }}>
          <Text style={[baseStyles.sectionTitle, { fontSize: 11, marginBottom: 8 }]}>
            Project Overview
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>{aiSummary}</Text>
        </View>
      )}

      {/* Detailed Work Phases */}
      <View style={{ marginBottom: 16 }}>
        <Text style={[baseStyles.sectionTitle, { fontSize: 11, marginBottom: 8 }]}>
          Work Phases
        </Text>

        {/* Phase 1: Preparation & Tear-Off */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[baseStyles.label, { fontSize: 10, fontWeight: 600, marginBottom: 4 }]}>
            Phase 1: Preparation & Tear-Off
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Install protective measures (tarps, barriers) around property perimeter
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Complete tear-off of existing {roofType} roofing system
            {squareFootage ? ` (approximately ${squareFootage.toLocaleString()} sq. ft.)` : ""}
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Remove all old shingles, underlayment, and damaged decking
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Inspect roof deck for structural integrity and necessary repairs
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Install dumpster and debris management system
          </Text>
        </View>

        {/* Phase 2: Deck Preparation & Waterproofing */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[baseStyles.label, { fontSize: 10, fontWeight: 600, marginBottom: 4 }]}>
            Phase 2: Deck Preparation & Waterproofing
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Replace any damaged or rotted roof decking (additional charge if extensive)
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Install ice & water shield in valleys and eaves per local code
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Apply synthetic underlayment across entire roof surface
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Install drip edge along eaves and rakes
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Prepare and seal all penetrations (vents, pipes, chimneys)
          </Text>
        </View>

        {/* Phase 3: Roofing System Installation */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[baseStyles.label, { fontSize: 10, fontWeight: 600, marginBottom: 4 }]}>
            Phase 3: Roofing System Installation
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Install new {roofType} roofing system per manufacturer specifications
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Install ridge vent for proper attic ventilation
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Install new flashings around chimneys, walls, and valleys
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Replace or install new pipe boots and vent flashings
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Install starter strips and hip & ridge shingles
          </Text>
        </View>

        {/* Phase 4: Final Touches & Cleanup */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[baseStyles.label, { fontSize: 10, fontWeight: 600, marginBottom: 4 }]}>
            Phase 4: Final Touches & Cleanup
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Comprehensive magnetic sweep of property for nails and debris
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Clean gutters and downspouts
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Remove all dumpsters and materials from property
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Final quality inspection and customer walkthrough
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
            • Provide warranty documentation and care instructions
          </Text>
        </View>
      </View>

      {/* Project Details Summary */}
      <View
        style={{
          backgroundColor: "#F8FAFC",
          padding: 12,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#CBD5E1",
          marginBottom: 12,
        }}
      >
        <Text style={[baseStyles.sectionTitle, { fontSize: 11, marginBottom: 8 }]}>
          Project Details
        </Text>

        <View style={[baseStyles.row, { marginBottom: 4 }]}>
          <Text style={[baseStyles.label, { fontSize: 10, flex: 1 }]}>Structure Type:</Text>
          <Text style={[baseStyles.value, { fontSize: 10 }]}>
            {structureType === "SINGLE_FAMILY"
              ? "Single-Family Residence"
              : structureType === "MULTI_FAMILY"
                ? "Multi-Family Building"
                : structureType === "COMMERCIAL"
                  ? "Commercial Building"
                  : structureType || "Residential"}
          </Text>
        </View>

        <View style={[baseStyles.row, { marginBottom: 4 }]}>
          <Text style={[baseStyles.label, { fontSize: 10, flex: 1 }]}>Number of Stories:</Text>
          <Text style={[baseStyles.value, { fontSize: 10 }]}>{stories}</Text>
        </View>

        <View style={[baseStyles.row, { marginBottom: 4 }]}>
          <Text style={[baseStyles.label, { fontSize: 10, flex: 1 }]}>Roof Pitch:</Text>
          <Text style={[baseStyles.value, { fontSize: 10 }]}>{slope}</Text>
        </View>

        {squareFootage && (
          <View style={[baseStyles.row, { marginBottom: 4 }]}>
            <Text style={[baseStyles.label, { fontSize: 10, flex: 1 }]}>
              Approximate Roof Area:
            </Text>
            <Text style={[baseStyles.value, { fontSize: 10 }]}>
              {squareFootage.toLocaleString()} sq. ft.
            </Text>
          </View>
        )}

        <View style={[baseStyles.row]}>
          <Text style={[baseStyles.label, { fontSize: 10, flex: 1 }]}>Estimated Duration:</Text>
          <Text style={[baseStyles.value, { fontSize: 10 }]}>
            {stories === 1 ? "1-2" : stories === 2 ? "2-3" : "3-5"} business days
          </Text>
        </View>
      </View>

      {/* Work Schedule & Conditions */}
      <View>
        <Text style={[baseStyles.sectionTitle, { fontSize: 11, marginBottom: 6 }]}>
          Work Schedule & Conditions
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • Work hours: 8:00 AM - 6:00 PM, Monday through Saturday (weather permitting)
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • Weather delays: Project may be extended due to rain or extreme weather conditions
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • Access required: Clear driveway access for delivery trucks and dumpster placement
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • Homeowner responsibilities: Remove vehicles from driveway, secure pets indoors
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • Safety measures: Work area will be clearly marked; please avoid roof perimeter during
          work hours
        </Text>
      </View>

      {/* Exclusions */}
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
        <Text style={[baseStyles.sectionTitle, { fontSize: 10, marginBottom: 6 }]}>
          Not Included (Additional Charges if Needed)
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 9, color: "#64748B" }]}>
          • Structural repairs beyond standard decking replacement
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 9, color: "#64748B" }]}>
          • Chimney repairs or rebuilding
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 9, color: "#64748B" }]}>
          • Soffit, fascia, or gutter replacement (unless specified)
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 9, color: "#64748B" }]}>
          • Permit fees (if required by local jurisdiction)
        </Text>
      </View>
    </View>
  );
}
