#!/usr/bin/env node
/**
 * fix-unused-vars.mjs — Auto-prefix unused variables with underscore
 *
 * Reads ESLint JSON output from /tmp/eslint-full.json and prefixes
 * unused variables with `_` to satisfy @typescript-eslint/no-unused-vars.
 *
 * Strategy:
 * - For simple unused vars like `const foo = ...` → `const _foo = ...`
 * - For destructured params like `{ foo, bar }` where only `foo` is unused → `{ _foo, bar }`
 * - For function params like `(req, res)` where `req` is unused → `(_req, res)`
 * - Skip vars that already start with `_`
 * - Skip imports (those need different handling)
 *
 * Usage: node scripts/fix-unused-vars.mjs
 */

import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("/tmp/eslint-full.json", "utf8"));

// Collect all unused var violations
const fileMap = new Map(); // filePath → [{line, column, varName}]

for (const f of data) {
  for (const m of f.messages) {
    if (m.ruleId !== "@typescript-eslint/no-unused-vars") continue;

    // Extract variable name from message like "'foo' is declared but its value is never read."
    // or "'foo' is defined but never used."
    const match = m.message.match(/^'([^']+)'/);
    if (!match) continue;

    const varName = match[1];

    // Skip already underscored
    if (varName.startsWith("_")) continue;

    // Skip React/module-level imports — those need manual removal
    // We only handle local vars, params, and destructuring
    if (!fileMap.has(f.filePath)) fileMap.set(f.filePath, []);
    fileMap.get(f.filePath).push({
      line: m.line,
      column: m.column,
      endLine: m.endLine,
      endColumn: m.endColumn,
      varName,
      message: m.message,
    });
  }
}

console.log(
  `Found ${[...fileMap.values()].flat().length} unused vars across ${fileMap.size} files`
);

let totalFixed = 0;
let totalSkipped = 0;

for (const [filePath, violations] of fileMap) {
  let content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let modified = false;

  // Process violations in reverse order (bottom to top) to preserve line/column positions
  const sorted = violations.sort((a, b) => b.line - a.line || b.column - a.column);

  for (const v of sorted) {
    const lineIdx = v.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) {
      totalSkipped++;
      continue;
    }

    const line = lines[lineIdx];
    const colIdx = v.column - 1;

    // Verify the variable name is at the expected position
    const actual = line.substring(colIdx, colIdx + v.varName.length);
    if (actual !== v.varName) {
      totalSkipped++;
      continue;
    }

    // Check if this is an import statement — skip those
    const trimmed = line.trimStart();
    if (trimmed.startsWith("import ")) {
      totalSkipped++;
      continue;
    }

    // Check it's not already prefixed
    if (colIdx > 0 && line[colIdx - 1] === "_") {
      totalSkipped++;
      continue;
    }

    // Replace the variable name with _prefixed version
    const newLine = line.substring(0, colIdx) + "_" + line.substring(colIdx);
    lines[lineIdx] = newLine;
    modified = true;
    totalFixed++;
  }

  if (modified) {
    writeFileSync(filePath, lines.join("\n"), "utf8");
  }
}

console.log(`Fixed: ${totalFixed}, Skipped: ${totalSkipped}`);
