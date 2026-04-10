// components/pdf/sections/OcrDocsSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function OcrDocsSection({ data }: { data: ReportData }) {
  const docs = data.ocrDocs || [];

  if (!docs.length) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Supporting Documents (OCR)" />
        <Text style={baseStyles.value}>No OCR-processed documents included in this report.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Supporting Documents (OCR)" />

      {docs.map((doc, idx) => (
        <View key={idx} style={{ marginBottom: 8 }}>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <Text style={baseStyles.label}>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {(doc as any).title || "Document"} ({(doc as any).sourceType || "Unknown"})
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          </Text>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {(doc as any).pageCount != null && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Text style={baseStyles.value}>Pages: {(doc as any).pageCount}</Text>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          )}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {(doc as any).aiSummary && (
            <>
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              <Text style={baseStyles.label}>Summary</Text>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Text style={baseStyles.value}>{(doc as any).aiSummary}</Text>
            </>
          )}
        </View>
      ))}
    </View>
  );
}
