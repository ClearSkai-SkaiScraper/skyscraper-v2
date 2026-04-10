import * as React from "react";

type Props = {
  customerName?: string;
  manageBillingUrl: string;
  trialEndsOn: string; // ISO or humanized string
  brandName?: string;
};

export default function TrialEndingEmail({
  customerName = "there",
  manageBillingUrl,
  trialEndsOn,
  brandName = "SkaiScraper",
}: Props) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: 0 }}>
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{ background: "#f6f7f9", padding: "24px 0" }}
      >
        <tbody>
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
                style={{ background: "#ffffff", borderRadius: 12, padding: 24 }}
              >
                <tbody>
                  <tr>
                    <td style={{ fontSize: 18, fontWeight: 600 }}>{brandName}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: 12, fontSize: 16 }}>
                      Hi {customerName}, your free trial ends on <strong>{trialEndsOn}</strong>.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: 12, fontSize: 16 }}>
                      To avoid interruption, manage your billing here:
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: 16 }}>
                      <a
                        href={manageBillingUrl}
                        style={{
                          display: "inline-block",
                          padding: "12px 16px",
                          borderRadius: 8,
                          textDecoration: "none",
                          background: "#111827",
                          color: "#ffffff",
                          fontWeight: 600,
                        }}
                      >
                        Manage Billing
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: 24, fontSize: 13, color: "#6b7280" }}>
                      If you have questions, just reply to this email—we&apos;re here to help.
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: "#9ca3af", paddingTop: 12 }}>
                © {new Date().getFullYear()} {brandName}. All rights reserved.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
