// Pull Sentry errors for SkaiScraper production
const https = require("https");

const TOKEN =
  "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";
const ORG = "clearskai-technologies";
const PROJECT = "javascript-nextjs";

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${TOKEN}` } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data.slice(0, 500) });
        }
      });
    });
    req.on("error", reject);
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("  SENTRY ERROR REPORT — SkaiScraper Production");
  console.log("=".repeat(60));

  // Try 24h first
  for (const [period, label] of [
    ["24h", "Last 24 Hours"],
    ["14d", "Last 14 Days"],
  ]) {
    console.log(`\n--- ${label} (Unresolved) ---`);
    const url = `https://us.sentry.io/api/0/projects/${ORG}/${PROJECT}/issues/?query=is%3Aunresolved&statsPeriod=${period}&sort=freq`;
    const { status, body } = await fetchJSON(url);

    if (status !== 200) {
      console.log(
        `  API Error ${status}:`,
        typeof body === "string" ? body : JSON.stringify(body).slice(0, 300)
      );
      continue;
    }

    if (!Array.isArray(body) || body.length === 0) {
      console.log(`  No unresolved issues in ${label}!`);
      if (period === "24h") continue;
      break;
    }

    console.log(`  Found ${body.length} unresolved issues:\n`);
    for (let i = 0; i < Math.min(body.length, 25); i++) {
      const issue = body[i];
      console.log(`  ${i + 1}. [${(issue.level || "?").toUpperCase()}] ${issue.title}`);
      console.log(`     Culprit: ${issue.culprit || "N/A"}`);
      console.log(
        `     Count: ${issue.count} | First: ${(issue.firstSeen || "").slice(0, 19)} | Last: ${(issue.lastSeen || "").slice(0, 19)}`
      );

      // Get stack trace for top 10
      if (i < 10) {
        try {
          const evUrl = `https://us.sentry.io/api/0/issues/${issue.id}/events/?full=true`;
          const evRes = await fetchJSON(evUrl);
          if (evRes.status === 200 && Array.isArray(evRes.body) && evRes.body[0]) {
            const ev = evRes.body[0];
            for (const entry of ev.entries || []) {
              if (entry.type === "exception") {
                for (const exc of (entry.data?.values || []).slice(0, 1)) {
                  console.log(`     Exception: ${exc.type}: ${(exc.value || "").slice(0, 200)}`);
                  const frames = (exc.stacktrace?.frames || []).slice(-3);
                  for (const f of frames) {
                    console.log(`       → ${f.filename}:${f.lineNo} in ${f.function}`);
                  }
                }
              }
            }
          }
        } catch (e) {
          /* skip event details */
        }
      }
      console.log(`     Link: ${issue.permalink || ""}`);
      console.log();
    }
    break; // Don't expand if we found results
  }

  // Also get error-level specifically
  console.log("\n--- Error-Level Issues (14d) ---");
  const errUrl = `https://us.sentry.io/api/0/projects/${ORG}/${PROJECT}/issues/?query=is%3Aunresolved%20level%3Aerror&statsPeriod=14d&sort=freq`;
  const errRes = await fetchJSON(errUrl);
  if (errRes.status === 200 && Array.isArray(errRes.body)) {
    if (errRes.body.length === 0) {
      console.log("  No error-level issues!");
    } else {
      console.log(`  ${errRes.body.length} error-level issues:`);
      for (let i = 0; i < Math.min(errRes.body.length, 15); i++) {
        const issue = errRes.body[i];
        console.log(
          `  ${i + 1}. ${issue.title} (count: ${issue.count}, last: ${(issue.lastSeen || "").slice(0, 19)})`
        );
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("  REPORT COMPLETE");
  console.log("=".repeat(60));
}

main().catch((e) => console.error("Fatal:", e));
