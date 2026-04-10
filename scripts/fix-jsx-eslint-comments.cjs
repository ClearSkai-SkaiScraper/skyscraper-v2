#!/usr/bin/env node
/**
 * Fix eslint-disable comments that are incorrectly placed inside JSX
 * These render as visible text in the browser!
 *
 * Pattern: Lines that start with whitespace + "// eslint-disable" inside JSX
 * are converted to {/* eslint-disable ... * /} or removed entirely
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Find all .tsx files with the problematic pattern
const result = execSync(
  `grep -rln "// eslint-disable" "${path.join(__dirname, "..", "src", "app")}" --include="*.tsx"`,
  { encoding: "utf8" }
).trim();

const files = result.split("\n").filter(Boolean);

console.log(`Found ${files.length} files with eslint-disable comments to check...\n`);

let totalFixed = 0;

for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let modified = false;
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a standalone eslint-disable comment that might be inside JSX
    // Pattern: whitespace followed by // eslint-disable
    const match = line.match(/^(\s*)(\/\/ eslint-disable[^\n]*)/);

    if (match) {
      const indent = match[1];
      const comment = match[2];

      // Check context: is this inside JSX?
      // Look at surrounding lines for JSX indicators
      const prevLine = i > 0 ? lines[i - 1] : "";
      const nextLine = i < lines.length - 1 ? lines[i + 1] : "";

      // If prev line ends with > or has JSX elements, and next line has JSX
      const insideJsx =
        prevLine.match(/>\s*$/) ||
        prevLine.match(/<[A-Z][a-z]*/) ||
        prevLine.match(/^\s*</) ||
        nextLine.match(/^\s*</) ||
        nextLine.match(/^\s*{/) ||
        // Also check for { preceding and } following patterns
        prevLine.match(/{\s*$/) ||
        prevLine.match(/^\s*[^/]*>/);

      if (insideJsx) {
        // Option 1: Convert to JSX comment (not recommended for eslint-disable)
        // Option 2: Just remove the line (cleaner)
        // We'll remove the line since eslint-disable shouldn't be needed inline
        console.log(`  [REMOVE] ${filePath}:${i + 1}: ${line.trim()}`);
        modified = true;
        totalFixed++;
        // Don't add this line to newLines
        continue;
      }
    }

    newLines.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join("\n"));
    console.log(`  ✓ Fixed ${filePath}\n`);
  }
}

console.log(`\n✅ Removed ${totalFixed} problematic eslint-disable comments from JSX`);
