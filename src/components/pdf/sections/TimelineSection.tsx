// components/pdf/sections/TimelineSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function TimelineSection({ data }: { data: ReportData }) {
  const t = data.timeline;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!t || !(t as any).aiTimelineSteps || !(t as any).aiTimelineSteps.length) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Project Timeline" />
        <Text style={baseStyles.value}>
          Project timeline details are not available for this report.
        </Text>
      </View>
    );
  }

  return (
    // eslint-disable-next-line react/jsx-no-comment-textnodes
    <View style={baseStyles.section}>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes
      <SectionHeader data={data} title={(t as any).aiTimelineTitle || "Project Timeline"} />

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {((t as any).aiTimelineSteps || []).map((step: any, idx: number) => (
        <View key={idx} style={{ marginBottom: 6 }}>
          <Text style={baseStyles.label}>{step.label}</Text>
          <Text style={baseStyles.value}>{step.description}</Text>
        </View>
      ))}
    </View>
  );
}
