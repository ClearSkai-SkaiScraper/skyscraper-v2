// components/pdf/sections/WeatherFullSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function WeatherFullSection({ data }: { data: ReportData }) {
  const full = (data.weather as any)?.fullReport;

  if (!full) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Full Weather Report" />
        <Text style={baseStyles.value}>No detailed weather data available.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Full Weather Report" />

      <View style={baseStyles.table}>
        <View style={baseStyles.tableRow}>
          <Text style={baseStyles.tableHeaderCell}>Date</Text>
          <Text style={baseStyles.tableHeaderCell}>Peril</Text>
          <Text style={baseStyles.tableHeaderCell}>Hail Size (&quot;)</Text>
          <Text style={baseStyles.tableHeaderCell}>Wind (mph)</Text>
          <Text style={baseStyles.tableHeaderCell}>Distance (mi)</Text>
        </View>
        {full.events.map((e, idx) => (
          <View style={baseStyles.tableRow} key={idx}>
            <Text style={baseStyles.tableCell}>{new Date(e.date).toLocaleDateString()}</Text>
            <Text style={baseStyles.tableCell}>{e.peril}</Text>
            <Text style={baseStyles.tableCell}>{e.hailSizeInches ?? "-"}</Text>
            <Text style={baseStyles.tableCell}>{e.windSpeedMph ?? "-"}</Text>
            <Text style={baseStyles.tableCell}>{e.distanceMiles ?? "-"}</Text>
          </View>
        ))}
      </View>

      {full.aiNarrative && (
        <View style={{ marginTop: 10 }}>
          <Text style={baseStyles.label}>AI Narrative</Text>
          <Text style={baseStyles.value}>{full.aiNarrative}</Text>
        </View>
      )}
    </View>
  );
}
