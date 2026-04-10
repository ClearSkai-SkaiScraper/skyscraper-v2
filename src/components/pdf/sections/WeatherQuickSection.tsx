// components/pdf/sections/WeatherQuickSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function WeatherQuickSection({ data }: { data: ReportData }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = (data.weather as any)?.quickDol;

  if (!w) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Quick DOL Verification" />
        <Text style={baseStyles.value}>No quick DOL data available.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Quick DOL Verification" />

      <View style={baseStyles.row}>
        <View style={baseStyles.col}>
          <Text style={baseStyles.label}>Event Date</Text>
          <Text style={baseStyles.value}>
            {w.eventDate ? new Date(w.eventDate).toLocaleDateString() : "N/A"}
          </Text>
        </View>
        <View style={baseStyles.col}>
          <Text style={baseStyles.label}>Peril</Text>
          <Text style={baseStyles.value}>{w.peril || "N/A"}</Text>
        </View>
        <View style={baseStyles.col}>
          <Text style={baseStyles.label}>Hail Size</Text>
          <Text style={baseStyles.value}>{w.hailSizeInches ? `${w.hailSizeInches}"` : "N/A"}</Text>
        </View>
        <View style={baseStyles.col}>
          <Text style={baseStyles.label}>Wind Speed</Text>
          <Text style={baseStyles.value}>{w.windSpeedMph ? `${w.windSpeedMph} mph` : "N/A"}</Text>
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <Text style={baseStyles.label}>Provider</Text>
        <Text style={baseStyles.value}>{w.provider || "N/A"}</Text>
      </View>

      {w.aiSummary && (
        <View style={{ marginTop: 10 }}>
          <Text style={baseStyles.label}>AI Summary</Text>
          <Text style={baseStyles.value}>{w.aiSummary}</Text>
        </View>
      )}
    </View>
  );
}
