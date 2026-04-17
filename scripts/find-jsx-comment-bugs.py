#!/usr/bin/env python3
"""Find JS comments inside JSX that render as visible text on screen."""
import os

hits = []
for root, dirs, files in os.walk("src"):
    for f in files:
        if not f.endswith(".tsx"):
            continue
        path = os.path.join(root, f)
        with open(path) as fh:
            lines = fh.readlines()
        for i, line in enumerate(lines):
            s = line.strip()
            if not s.startswith("// eslint-disable-next-line"):
                continue
            if "@next/next/no-img-element" not in s:
                continue
            # Next line should have <img
            if i + 1 < len(lines) and "<img" in lines[i + 1]:
                # Check JSX context above
                ctx = "".join(lines[max(0, i - 5) : i])
                jsx_markers = ["<div", "<span", "<p ", "return (", "<section", "<main",
                               "<Card", "<Dialog", "<button", "<a ", "<li", "<td", "<tr",
                               "<figure", "<label", "{(", "&&", "? (", "<motion"]
                if any(m in ctx for m in jsx_markers):
                    hits.append(f"  {path}:{i+1}")

print(f"Found {len(hits)} JS comments inside JSX (render as text):")
for h in hits:
    print(h)
