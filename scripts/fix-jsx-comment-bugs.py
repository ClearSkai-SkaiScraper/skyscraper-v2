#!/usr/bin/env python3
"""Fix JS comments inside JSX that render as visible text.
Converts: // eslint-disable-next-line @next/next/no-img-element
To:        {/* eslint-disable-next-line @next/next/no-img-element */}
And removes preceding jsx-no-comment-textnodes suppress lines."""
import os

fixed_count = 0
files_fixed = set()

for root, dirs, files in os.walk("src"):
    for f in files:
        if not f.endswith(".tsx"):
            continue
        path = os.path.join(root, f)
        with open(path) as fh:
            lines = fh.readlines()

        changed = False
        new_lines = []
        skip_next = False
        
        for i, line in enumerate(lines):
            if skip_next:
                skip_next = False
                continue
                
            s = line.strip()
            
            # Remove standalone jsx-no-comment-textnodes suppress that precedes a no-img-element comment
            if "eslint-disable-next-line" in s and "jsx-no-comment-textnodes" in s and not s.startswith("{/*"):
                # Check if next line is the no-img-element comment
                if i + 1 < len(lines) and "no-img-element" in lines[i + 1] and lines[i + 1].strip().startswith("//"):
                    # Skip this line (remove it)
                    changed = True
                    continue
            
            # Convert JS comment to JSX comment
            if s.startswith("// eslint-disable-next-line") and "@next/next/no-img-element" in s:
                # Check if next line has <img (meaning we're in JSX)
                if i + 1 < len(lines) and "<img" in lines[i + 1]:
                    indent = line[:len(line) - len(line.lstrip())]
                    new_lines.append(f"{indent}{{/* eslint-disable-next-line @next/next/no-img-element */}}\n")
                    changed = True
                    files_fixed.add(path)
                    continue
            
            new_lines.append(line)
        
        if changed:
            with open(path, "w") as fh:
                fh.writelines(new_lines)
            fixed_count += 1

print(f"Fixed {fixed_count} files:")
for f in sorted(files_fixed):
    print(f"  {f}")
