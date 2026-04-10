/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
// components/pdf/sections/RetailSignatureSection.tsx

import { Text, View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function RetailSignatureSection({ data }: { data: ReportData }) {
  const org = data.org || {};
  const claim = data.claim || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contact = (data as any).contact || {};

  const companyName = org.name || "Contractor";
  const customerName =
    contact.firstName && contact.lastName
      ? `${contact.firstName} ${contact.lastName}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (claim as any).insured_name || "Homeowner";
  const propertyAddress = claim.propertyAddress || "the property";
  const proposalDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Customer Acceptance & Signatures" />

      {/* Acceptance Statement */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={[baseStyles.sectionTitle, { fontSize: 12, marginBottom: 12, color: "#1E293B" }]}
        >
          Proposal Acceptance
        </Text>

        <Text style={[baseStyles.paragraph, { fontSize: 10, lineHeight: 1.6, marginBottom: 12 }]}>
          By signing below, the undersigned (&ldquo;Customer&rdquo;) agrees to retain{" "}
          <Text style={{ fontWeight: 600 }}>{companyName}</Text> (&ldquo;Contractor&rdquo;) to
          perform the roofing work described in this proposal at the property located at{" "}
          <Text style={{ fontWeight: 600 }}>{propertyAddress}</Text> according to the scope of work,
          timeline, and pricing outlined in the preceding sections.
        </Text>

        <Text style={[baseStyles.paragraph, { fontSize: 10, lineHeight: 1.6, marginBottom: 8 }]}>
          Customer acknowledges and agrees to the following terms:
        </Text>

        <View style={{ marginLeft: 12, marginBottom: 12 }}>
          <Text style={[baseStyles.paragraph, { fontSize: 9, lineHeight: 1.5, marginBottom: 4 }]}>
            1. The scope of work, pricing, and payment terms outlined in this proposal are accurate
            and acceptable.
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 9, lineHeight: 1.5, marginBottom: 4 }]}>
            2. A 10% deposit is due upon signing this agreement to secure scheduling and materials.
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 9, lineHeight: 1.5, marginBottom: 4 }]}>
            3. Any changes to the scope of work must be documented in writing and may result in
            additional charges.
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 9, lineHeight: 1.5, marginBottom: 4 }]}>
            4. Contractor will make reasonable efforts to complete work within the estimated
            timeline, but delays due to weather, material availability, or unforeseen conditions are
            beyond Contractor&apos;s control.
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 9, lineHeight: 1.5, marginBottom: 4 }]}>
            5. Customer is responsible for securing any required permits (or reimbursing Contractor
            for permit fees if Contractor obtains them).
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 9, lineHeight: 1.5, marginBottom: 4 }]}>
            6. This proposal is valid for 30 days from the date below. Pricing may change if not
            accepted within this period.
          </Text>
          <Text style={[baseStyles.paragraph, { fontSize: 9, lineHeight: 1.5 }]}>
            7. Warranty terms as described in the Warranty section of this proposal will apply upon
            project completion.
          </Text>
        </View>
      </View>

      {/* Customer Signature Block */}
      <View
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: "#F8FAFC",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#CBD5E1",
        }}
      >
        <Text style={[baseStyles.sectionTitle, { fontSize: 11, marginBottom: 12 }]}>
          Customer Signature
        </Text>

        <View style={{ marginBottom: 16 }}>
          <Text style={[baseStyles.label, { fontSize: 9, marginBottom: 4 }]}>
            Customer Name (Printed)
          </Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#94A3B8",
              paddingBottom: 2,
              marginBottom: 4,
            }}
          >
            <Text style={[baseStyles.value, { fontSize: 11, minHeight: 16 }]}>{customerName}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={[baseStyles.label, { fontSize: 9, marginBottom: 4 }]}>
            Customer Signature
          </Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#94A3B8",
              paddingBottom: 2,
              marginBottom: 4,
              minHeight: 40,
            }}
          >
            <Text
              style={[
                baseStyles.paragraph,
                { fontSize: 8, color: "#94A3B8", fontStyle: "italic", marginTop: 14 },
              ]}
            >
              (Sign here)
            </Text>
          </View>
        </View>

        <View>
          <Text style={[baseStyles.label, { fontSize: 9, marginBottom: 4 }]}>Date</Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#94A3B8",
              paddingBottom: 2,
              width: "40%",
            }}
          >
            <Text style={[baseStyles.value, { fontSize: 10, minHeight: 16 }]}>{proposalDate}</Text>
          </View>
        </View>
      </View>

      {/* Contractor Signature Block */}
      <View
        style={{
          padding: 16,
          backgroundColor: "#F8FAFC",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#CBD5E1",
        }}
      >
        <Text style={[baseStyles.sectionTitle, { fontSize: 11, marginBottom: 12 }]}>
          Contractor Representative
        </Text>

        <View style={{ marginBottom: 16 }}>
          <Text style={[baseStyles.label, { fontSize: 9, marginBottom: 4 }]}>Company Name</Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#94A3B8",
              paddingBottom: 2,
              marginBottom: 4,
            }}
          >
            <Text style={[baseStyles.value, { fontSize: 11, minHeight: 16 }]}>{companyName}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={[baseStyles.label, { fontSize: 9, marginBottom: 4 }]}>
            Representative Signature
          </Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#94A3B8",
              paddingBottom: 2,
              marginBottom: 4,
              minHeight: 40,
            }}
          >
            <Text
              style={[
                baseStyles.paragraph,
                { fontSize: 8, color: "#94A3B8", fontStyle: "italic", marginTop: 14 },
              ]}
            >
              (Authorized signature)
            </Text>
          </View>
        </View>

        <View>
          <Text style={[baseStyles.label, { fontSize: 9, marginBottom: 4 }]}>Date</Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#94A3B8",
              paddingBottom: 2,
              width: "40%",
            }}
          >
            <Text style={[baseStyles.value, { fontSize: 10, minHeight: 16 }]}>{proposalDate}</Text>
          </View>
        </View>
      </View>

      {/* Footer Disclaimer */}
      <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
        <Text
          style={[
            baseStyles.paragraph,
            { fontSize: 8, color: "#64748B", fontStyle: "italic", textAlign: "center" },
          ]}
        >
          This proposal becomes a binding contract upon signature by both parties. Both parties
          should retain a copy for their records.
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        </Text>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {(org as any).licenseNumber && (
          <Text
            style={[
              baseStyles.paragraph,
              { fontSize: 8, color: "#64748B", textAlign: "center", marginTop: 4 },
            ]}
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          >
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            License #{(org as any).licenseNumber}
          </Text>
        )}
      </View>
    </View>
  );
}
