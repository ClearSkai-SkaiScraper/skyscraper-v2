import * as React from "react";

type Props = {
  customerName?: string;
  dashboardUrl: string;
  brandName?: string;
};

export default function WelcomeEmail({
  customerName = "there",
  dashboardUrl,
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
                      Welcome aboard{customerName ? `, ${customerName}` : ""}! Your account is
                      ready.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: 12, fontSize: 16 }}>Jump into your dashboard now:</td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: 16 }}>
                      <a
                        href={dashboardUrl}
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
                        Open Dashboard
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: 24, fontSize: 13, color: "#6b7280" }}>
                      Need help? Just reply to this email and we&apos;ll take care of you.
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
