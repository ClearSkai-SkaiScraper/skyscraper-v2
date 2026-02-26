/**
 * k6 Load Test — Critical API Routes (Sprint 10.2)
 *
 * Run with: k6 run load-tests/critical-apis.js
 *
 * Tests:
 *   1. Dashboard API (GET /api/dashboard)
 *   2. Claims list (GET /api/claims)
 *   3. Create claim (POST /api/claims)
 *   4. Messages (GET /api/messages/threads)
 *   5. Health check (GET /api/health)
 */

import { check, group, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

// ── Custom metrics ──────────────────────────────────────────────────
const errorRate = new Rate("errors");
const dashboardLatency = new Trend("dashboard_latency", true);
const claimsLatency = new Trend("claims_latency", true);
const messagesLatency = new Trend("messages_latency", true);

// ── Config ──────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "test-token";

export const options = {
  scenarios: {
    // Ramp up to 100 concurrent users
    load_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 }, // ramp up
        { duration: "1m", target: 50 }, // sustain
        { duration: "30s", target: 100 }, // peak
        { duration: "1m", target: 100 }, // hold peak
        { duration: "30s", target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"], // 95th < 2s, 99th < 5s
    errors: ["rate<0.05"], // < 5% error rate
    dashboard_latency: ["p(95)<1500"],
    claims_latency: ["p(95)<1500"],
    messages_latency: ["p(95)<1500"],
  },
};

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${AUTH_TOKEN}`,
};

// ── Test scenarios ──────────────────────────────────────────────────
export default function () {
  group("Health Check", function () {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      "health returns 200": (r) => r.status === 200,
      "health response time < 500ms": (r) => r.timings.duration < 500,
    });
    errorRate.add(res.status !== 200);
  });

  group("Dashboard", function () {
    const res = http.get(`${BASE_URL}/api/dashboard`, { headers });
    dashboardLatency.add(res.timings.duration);
    check(res, {
      "dashboard returns 200 or 401": (r) => [200, 401].includes(r.status),
      "dashboard response time < 2s": (r) => r.timings.duration < 2000,
    });
    errorRate.add(res.status >= 500);
  });

  group("Claims List", function () {
    const res = http.get(`${BASE_URL}/api/claims?limit=20`, { headers });
    claimsLatency.add(res.timings.duration);
    check(res, {
      "claims returns 200 or 401": (r) => [200, 401].includes(r.status),
      "claims response time < 2s": (r) => r.timings.duration < 2000,
    });
    errorRate.add(res.status >= 500);
  });

  group("Create Claim", function () {
    const payload = JSON.stringify({
      claimNumber: `CLM-LOAD-${Date.now()}`,
      homeownerName: "Load Test User",
      address: "123 Test St",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
    });
    const res = http.post(`${BASE_URL}/api/claims`, payload, { headers });
    check(res, {
      "create claim returns 200/201/401": (r) => [200, 201, 401].includes(r.status),
    });
    errorRate.add(res.status >= 500);
  });

  group("Messages", function () {
    const res = http.get(`${BASE_URL}/api/messages/threads`, { headers });
    messagesLatency.add(res.timings.duration);
    check(res, {
      "messages returns 200 or 401": (r) => [200, 401].includes(r.status),
    });
    errorRate.add(res.status >= 500);
  });

  sleep(1); // Think time between iterations
}

// ── Summary ─────────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    "load-tests/results/summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

function textSummary(data, opts) {
  // k6 will use its built-in text summary
  return "";
}
