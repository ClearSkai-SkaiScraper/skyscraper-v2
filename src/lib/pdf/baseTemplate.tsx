/* eslint-disable jsx-a11y/alt-text -- react-pdf Image component doesn't support alt prop */
import { Document, Image, Page, Text, View } from "@react-pdf/renderer";

export function BasePDFTemplate({
  landscape = true,
  branding,
  header,
  children,
  qrUrl,
  footer,
}: {
  landscape?: boolean;
  branding: { logo?: string; company?: string; color?: string };
  header?: React.ReactNode;
  children: React.ReactNode;
  qrUrl?: string;
  footer?: React.ReactNode;
}) {
  const pageSize = landscape ? "A4" : "LETTER";
  return (
    <Document>
      <Page size={pageSize} style={{ padding: 32 }}>
        {/* Header: Logo + Company Branding */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          {branding.logo ? (
            <Image src={branding.logo} style={{ width: 64, height: 64, borderRadius: 8 }} />
          ) : null}
          <Text
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginLeft: 16,
              color: branding.color ?? "#117CFF",
            }}
          >
            {branding.company ?? "Company"}
          </Text>
        </View>
        {header}
        {/* Main Content */}
        <View style={{ marginVertical: 12 }}>{children}</View>
        {/* QR Code Footer */}
        {qrUrl ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 24 }}>
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrUrl)}`}
              style={{ width: 80, height: 80 }}
            />
            <Text style={{ marginLeft: 12, fontSize: 10, color: "#6B7280" }}>
              Scan for live report
            </Text>
          </View>
        ) : null}
        {/* Footer */}
        {footer}
      </Page>
    </Document>
  );
}
