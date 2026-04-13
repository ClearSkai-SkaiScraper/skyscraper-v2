#!/usr/bin/env python3
"""Pull Sentry errors for SkaiScraper production."""
import json
import urllib.request
import urllib.error
import sys
import os

TOKEN = "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"
ORG = "clearskai-technologies"
PROJECT = "javascript-nextjs"

def fetch_issues(period="24h", query="is:unresolved"):
    url = f"https://us.sentry.io/api/0/projects/{ORG}/{PROJECT}/issues/?query={query}&statsPeriod={period}&sort=freq"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Sentry API error {e.code}: {body[:300]}")
        return None

def fetch_issue_events(issue_id, limit=3):
    url = f"https://us.sentry.io/api/0/issues/{issue_id}/events/?full=true"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    try:
        with urllib.request.urlopen(req) as resp:
            events = json.loads(resp.read())
            return events[:limit]
    except:
        return []

print("=" * 60)
print("  SENTRY ERROR REPORT — SkaiScraper Production")
print("=" * 60)

# Try last 24h first, then expand to 14d if empty
for period, label in [("24h", "Last 24 Hours"), ("14d", "Last 14 Days")]:
    print(f"\n--- {label} (Unresolved) ---")
    issues = fetch_issues(period=period)
    if issues is None:
        sys.exit(1)
    if not issues:
        print(f"  No unresolved issues in {label}!")
        if period == "24h":
            continue
        else:
            break
    
    print(f"  Found {len(issues)} unresolved issues:\n")
    for i, issue in enumerate(issues[:25], 1):
        title = issue.get("title", "Unknown")
        culprit = issue.get("culprit", "")
        count = issue.get("count", "?")
        level = issue.get("level", "?")
        first = issue.get("firstSeen", "")[:19]
        last = issue.get("lastSeen", "")[:19]
        link = issue.get("permalink", "")
        
        print(f"  {i:2}. [{level.upper()}] {title}")
        print(f"      Culprit: {culprit}")
        print(f"      Count: {count} | First: {first} | Last: {last}")
        
        # Get stack trace for top errors
        if i <= 10:
            events = fetch_issue_events(issue.get("id"))
            for ev in events[:1]:
                entries = ev.get("entries", [])
                for entry in entries:
                    if entry.get("type") == "exception":
                        values = entry.get("data", {}).get("values", [])
                        for exc in values[:1]:
                            exc_type = exc.get("type", "")
                            exc_value = exc.get("value", "")[:200]
                            print(f"      Exception: {exc_type}: {exc_value}")
                            frames = exc.get("stacktrace", {}).get("frames", [])
                            for frame in frames[-3:]:
                                fn = frame.get("function", "?")
                                filename = frame.get("filename", "?")
                                lineno = frame.get("lineNo", "?")
                                print(f"        → {filename}:{lineno} in {fn}")
        print(f"      Link: {link}")
        print()
    break  # Don't do 14d if 24h had results

# Also fetch errors specifically
print("\n--- Error-Level Issues (14d) ---")
error_issues = fetch_issues(period="14d", query="is:unresolved level:error")
if error_issues:
    print(f"  {len(error_issues)} error-level issues")
    for i, issue in enumerate(error_issues[:15], 1):
        title = issue.get("title", "Unknown")
        count = issue.get("count", "?")
        last = issue.get("lastSeen", "")[:19]
        print(f"  {i:2}. {title} (count: {count}, last: {last})")
else:
    print("  No error-level issues!")

print("\n" + "=" * 60)
print("  REPORT COMPLETE")
print("=" * 60)
