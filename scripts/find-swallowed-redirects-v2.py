#!/usr/bin/env python3
"""Find ALL redirect() inside try blocks, check if catch re-throws NEXT_REDIRECT."""
import os, re

results = []
safe = []
for root, dirs, files in os.walk("src/app"):
    for f in files:
        if not (f.endswith(".ts") or f.endswith(".tsx")):
            continue
        path = os.path.join(root, f)
        with open(path) as fh:
            content = fh.read()
        
        if "redirect(" not in content:
            continue
        
        lines = content.split("\n")
        # Track try/catch blocks properly
        try_depth = 0
        for i, line in enumerate(lines):
            s = line.strip()
            if re.match(r"(}\s*catch|try\s*\{|try\s*$)", s):
                pass
            if "try {" in line or "try{" in line or s == "try":
                try_depth += 1
            if try_depth > 0 and re.search(r"\bcatch\b", s):
                try_depth = max(0, try_depth - 1)
            
            # Only care about next/navigation redirect(), not NextResponse.redirect()
            if try_depth > 0 and "redirect(" in s and "NextResponse" not in s and not s.startswith("//"):
                # Check if the surrounding catch handles isRedirectError
                nearby = content[max(0, i*50):min(len(content), (i+30)*80)]
                if "isRedirectError" in content:
                    safe.append(f"  SAFE {path}:{i+1}: {s}")
                else:
                    results.append(f"  DANGER {path}:{i+1}: {s}")

print("=== DANGEROUS (redirect in try, no NEXT_REDIRECT handling) ===")
for r in results:
    print(r)
print(f"\nDangerous: {len(results)}")
print(f"Already safe: {len(safe)}")
