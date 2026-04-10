import { Document, Page, StyleSheet,Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12, fontFamily: "Helvetica" },
  section: { marginBottom: 20 },
  title: { fontSize: 24, marginBottom: 10, fontWeight: "bold" },
  subtitle: { fontSize: 16, marginBottom: 8, fontWeight: "bold" },
  label: { fontSize: 12, marginBottom: 4, color: "#4B5563" },
  value: { fontSize: 12, marginBottom: 8, fontWeight: "bold" },
  divider: { borderBottom: 1, borderColor: "#E5E7EB", marginVertical: 10 },
});

interface InspectionReportProps {
  claim: {
    claimNumber: string;
    damageType: string;
    dateOfLoss: Date;
    status: string;
    description?: string;
  };
  property: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    name?: string;
  };
  contractor?: {
    name: string;
  };
  modules?: Record<string, boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiAnalysis?: any;
  products?: Array<{
    id: string;
    name: string;
    category: string;
    spec?: string;
    warranty?: string;
    specSheetUrl?: string;
    vendor: { name: string };
  }>;
}

export function InspectionReportPDF({ claim, property, contractor, modules, aiAnalysis, products }: InspectionReportProps) {
  const address = property
    ? `${property.street || ""}, ${property.city || ""}, ${property.state || ""} ${property.zipCode || ""}`.trim()
    : "Address not available";

  const hasModules = modules && Object.keys(modules).length > 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.section}>
          <Text style={styles.title}>Inspection Report</Text>
          <Text style={styles.label}>
            Generated: {new Date().toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Claim Information */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Claim Information</Text>
          <Text style={styles.label}>Claim Number:</Text>
          <Text style={styles.value}>{claim.claimNumber}</Text>

          <Text style={styles.label}>Damage Type:</Text>
          <Text style={styles.value}>{claim.damageType || "Not specified"}</Text>

          <Text style={styles.label}>Date of Loss:</Text>
          <Text style={styles.value}>
            {claim.dateOfLoss
              ? new Date(claim.dateOfLoss).toLocaleDateString()
              : "Not specified"}
          </Text>

          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{claim.status || "Pending"}</Text>
        </View>

        <View style={styles.divider} />

        {/* Property Information */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Property Information</Text>
          <Text style={styles.label}>Property Name:</Text>
          <Text style={styles.value}>{property.name || "N/A"}</Text>

          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{address}</Text>
        </View>

        <View style={styles.divider} />

        {/* Inspector Information */}
        {contractor && (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Inspector Information</Text>
            <Text style={styles.label}>Inspector:</Text>
            <Text style={styles.value}>{contractor.name}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Findings */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Inspection Findings</Text>
          <Text style={styles.value}>
            {claim.description || "No findings recorded at this time."}
          </Text>
        </View>

        {/* AI Damage Analysis Section (if enabled) */}
        {hasModules && modules?.ai_damage && aiAnalysis && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.subtitle}>🤖 AI Damage Analysis</Text>
              <Text style={styles.label}>Analysis Status:</Text>
              <Text style={styles.value}>
                {typeof aiAnalysis === "object" && aiAnalysis.status 
                  ? aiAnalysis.status 
                  : "AI analysis completed"}
              </Text>
              <Text style={styles.label}>Findings:</Text>
              <Text style={styles.value}>
                {typeof aiAnalysis === "object" && aiAnalysis.findings
                  ? JSON.stringify(aiAnalysis.findings, null, 2)
                  : "AI-detected damage patterns available in detailed analysis."}
              </Text>
            </View>
          </>
        )}

        {/* AI Summary Section (if enabled) */}
        {hasModules && modules?.ai_summary && aiAnalysis && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.subtitle}>📊 AI Value Assessment</Text>
              <Text style={styles.value}>
                {typeof aiAnalysis === "object" && aiAnalysis.summary
                  ? aiAnalysis.summary
                  : "Predicted claim value and strategy recommendations available."}
              </Text>
            </View>
          </>
        )}

        {/* Vendor Materials Section (if enabled) */}
        {hasModules && modules?.vendor_materials && products && products.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.subtitle}>📦 Materials & Products</Text>
              {products.map((product, idx) => (
                <View key={product.id} style={{ marginBottom: 12 }}>
                  <Text style={styles.label}>
                    {idx + 1}. {product.name} ({product.category})
                  </Text>
                  <Text style={styles.value}>Vendor: {product.vendor.name}</Text>
                  {product.spec && (
                    <Text style={{ fontSize: 10, marginBottom: 4 }}>
                      Spec: {product.spec}
                    </Text>
                  )}
                  {product.warranty && (
                    <Text style={{ fontSize: 10, marginBottom: 4 }}>
                      Warranty: {product.warranty}
                    </Text>
                  )}
                  {product.specSheetUrl && (
                    <Text style={{ fontSize: 9, color: "#6366F1" }}>
                      Spec Sheet: {product.specSheetUrl}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Code Requirements Section (if enabled) */}
        {hasModules && modules?.code_requirements && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.subtitle}>📋 Code & Manufacturer Requirements</Text>
              <Text style={styles.value}>
                Local building codes and manufacturer warranty requirements for this repair.
              </Text>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={{ position: "absolute", bottom: 30, left: 30, right: 30 }}>
          <Text style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center" }}>
            This report was generated by PreLossVision CRM
          </Text>
        </View>
      </Page>
    </Document>
  );
}
