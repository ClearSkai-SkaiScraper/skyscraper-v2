/**
 * Simple test page to verify auth works
 * GET /test-auth
 */
"use client";

import { useEffect, useState } from "react";

export default function TestAuthPage() {
  const [status, setStatus] = useState<string>("Checking...");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/public/whoami")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setStatus(d.ok ? "AUTHENTICATED ✅" : "NOT AUTHENTICATED ❌");
      })
      .catch((e) => {
        setStatus("ERROR: " + e.message);
      });
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "system-ui", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>Auth Test Page</h1>

      <div
        style={{
          padding: "20px",
          borderRadius: "8px",
          backgroundColor: status.includes("✅")
            ? "#dcfce7"
            : status.includes("❌")
              ? "#fee2e2"
              : "#f3f4f6",
          marginBottom: "20px",
        }}
      >
        <p style={{ fontSize: "18px", fontWeight: "bold" }}>{status}</p>
      </div>

      {data && !data.ok && (
        <div style={{ marginBottom: "20px" }}>
          <p>You need to sign in first.</p>
          <a
            href="/sign-in"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#2563eb",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              marginTop: "10px",
            }}
          >
            Go to Sign In →
          </a>
        </div>
      )}

      {data && data.ok && (
        <div style={{ marginBottom: "20px" }}>
          <p>✅ You are logged in!</p>
          <p>User ID: {data.clerkAuth?.userId}</p>
          <p>Email: {data.clerkAuth?.email}</p>
          <p>Memberships: {data.database?.membershipCount}</p>
          <a
            href="/claims"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#16a34a",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              marginTop: "10px",
            }}
          >
            Go to Claims →
          </a>
        </div>
      )}

      <details style={{ marginTop: "20px" }}>
        <summary style={{ cursor: "pointer" }}>Debug Data</summary>
        <pre
          style={{
            backgroundColor: "#1e293b",
            color: "#e2e8f0",
            padding: "15px",
            borderRadius: "6px",
            overflow: "auto",
            fontSize: "12px",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>

      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#fef3c7",
          borderRadius: "8px",
        }}
      >
        <p style={{ fontWeight: "bold" }}>⚠️ If Sign-In shows white screen:</p>
        <ol style={{ marginLeft: "20px", marginTop: "10px" }}>
          <li>Open browser console (F12 → Console)</li>
          <li>Look for any red errors</li>
          <li>
            Try accessing:{" "}
            <a href="https://clerk.skaiscrape.com" target="_blank">
              https://clerk.skaiscrape.com
            </a>
          </li>
        </ol>
      </div>
    </div>
  );
}
