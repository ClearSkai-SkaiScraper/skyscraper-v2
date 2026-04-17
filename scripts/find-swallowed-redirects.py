#!/usr/bin/env python3
"""Find redirect() inside try blocks without NEXT_REDIRECT re-throw."""
import os

results = []
for root, dirs, files in os.walk("src/app"):
    for f in files:
        if not (f.endswith(".ts") or f.endswith(".tsx")):
            continue
        path = os.path.join(root, f)
        with open(path) as fh:
            lines = fh.readlines()
        
        content = "".join(lines)
        # Skip files that already handle NEXT_REDIRECT
        has_next_redirect_handler = "NEXT_REDIRECT" in content
        
        try_depth = 0
        try_start_lines = []
        for i, line in enumerate(lines):
            s = line.strip()
            if s.startswith("try {") or s == "try {" or "try {" in s:
                try_depth += 1
                try_start_lines.append(i)
            
            # redirect() inside a try block
            if try_depth > 0 and "redirect(" in s and not s.startswith("//") and not s.startswith("*"):
                if not has_next_redirect_handler:
                    results.append(f"  {path}:{i+1}: {s}")
            
            if try_depth > 0 and "catch" in s and ("{" in s or (i+1 < len(lines) and "{" in lines[i+1])):
                try_depth = max(0, try_depth - 1)

for r in results:
    print(r)
print(f"\nTotal redirect() inside try WITHOUT NEXT_REDIRECT handling: {len(results)}")
