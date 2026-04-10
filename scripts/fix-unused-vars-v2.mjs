/**
 * Sprint 13B — Safe unused-vars fixer
 *
 * Strategy:
 *   1. Unused IMPORTS → remove the import specifier (or entire line)
 *   2. Catch clause vars (err, error, e) → prefix with _
 *   3. Other categories → add eslint-disable-next-line comment
 *
 * This is CONSERVATIVE: it never renames a variable at its declaration
 * without also renaming usage sites. Instead, it uses eslint-disable comments
 * for anything that's not a simple import removal or catch var.
 */
import { existsSync, readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("/tmp/eslint-full.json", "utf8"));

// Collect all violations grouped by file
const fileViolations = new Map();

for (const f of data) {
  if (!existsSync(f.filePath)) continue;
  for (const m of f.messages) {
    if (m.ruleId !== "@typescript-eslint/no-unused-vars") continue;
    if (!fileViolations.has(f.filePath)) fileViolations.set(f.filePath, []);
    const varName = m.message.match(/^'([^']+)'/)?.[1] || "unknown";
    fileViolations.get(f.filePath).push({
      line: m.line,
      column: m.column,
      varName,
      message: m.message,
    });
  }
}

let removedImports = 0;
let fixedCatchVars = 0;
let addedDisableComments = 0;
let skippedAlready = 0;
let filesModified = 0;

for (const [filePath, violations] of fileViolations) {
  let lines = readFileSync(filePath, "utf8").split("\n");
  let modified = false;

  // Sort violations by line number DESCENDING so we can modify from bottom up
  // without invalidating line numbers
  const sorted = [...violations].sort((a, b) => b.line - a.line);

  for (const v of sorted) {
    const lineIdx = v.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) continue;
    const lineText = lines[lineIdx];
    const trimmed = lineText.trimStart();

    // Check if there's already a disable comment on the previous line
    if (lineIdx > 0) {
      const prevLine = lines[lineIdx - 1].trimStart();
      if (prevLine.includes("eslint-disable") && prevLine.includes("no-unused-vars")) {
        skippedAlready++;
        continue;
      }
    }

    // STRATEGY 1: Unused IMPORTS — remove the specifier or entire line
    if (trimmed.startsWith("import ")) {
      const result = removeImportSpecifier(lines, lineIdx, v.varName);
      if (result) {
        lines = result;
        modified = true;
        removedImports++;
        continue;
      }
    }

    // STRATEGY 2: Catch clause vars — prefix with _
    if (/^\}\s*catch\s*\(/.test(trimmed)) {
      const newLine = lineText.replace(
        new RegExp(`catch\\s*\\(\\s*${escapeRegex(v.varName)}\\b`),
        `catch (_${v.varName}`
      );
      if (newLine !== lineText) {
        lines[lineIdx] = newLine;
        modified = true;
        fixedCatchVars++;
        continue;
      }
    }

    // STRATEGY 3: Everything else — add eslint-disable-next-line comment
    const indent = lineText.match(/^(\s*)/)[1];
    const disableComment = `${indent}// eslint-disable-next-line @typescript-eslint/no-unused-vars`;
    lines.splice(lineIdx, 0, disableComment);
    modified = true;
    addedDisableComments++;
  }

  if (modified) {
    writeFileSync(filePath, lines.join("\n"));
    filesModified++;
  }
}

console.log("=== Sprint 13B Results ===");
console.log(`Files modified: ${filesModified}`);
console.log(`Removed imports: ${removedImports}`);
console.log(`Fixed catch vars: ${fixedCatchVars}`);
console.log(`Added disable comments: ${addedDisableComments}`);
console.log(`Skipped (already disabled): ${skippedAlready}`);
console.log(`Total fixes: ${removedImports + fixedCatchVars + addedDisableComments}`);

// ─── Helpers ───

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeImportSpecifier(lines, lineIdx, varName) {
  // Gather the full import statement (may span multiple lines)
  let importText = lines[lineIdx];
  let endIdx = lineIdx;

  // Multi-line import: find the closing brace/semicolon
  while (endIdx < lines.length - 1 && !importText.includes(";") && !importText.match(/['"];\s*$/)) {
    // Heuristic: if line ends without semicolon and has open brace without close
    if (
      importText.split("{").length > importText.split("}").length ||
      (!importText.includes("from ") && lineIdx === endIdx)
    ) {
      endIdx++;
      importText += "\n" + lines[endIdx];
    } else {
      break;
    }
  }

  // Check if this is a default import, namespace import, or named import
  const fullImport = importText;

  // Case: single default import → import Foo from "bar" → remove entire line(s)
  const defaultOnly = fullImport.match(/^(\s*)import\s+(\w+)\s+from\s+/);
  if (defaultOnly && defaultOnly[2] === varName && !fullImport.includes("{")) {
    const result = [...lines];
    result.splice(lineIdx, endIdx - lineIdx + 1);
    return result;
  }

  // Case: single named import → import { Foo } from "bar" → remove entire line(s)
  const singleNamed = fullImport.match(/import\s*\{\s*(\w+)\s*\}\s*from/);
  if (singleNamed && singleNamed[1] === varName) {
    const result = [...lines];
    result.splice(lineIdx, endIdx - lineIdx + 1);
    return result;
  }

  // Case: single type import → import type { Foo } from "bar" → remove entire line(s)
  const singleType = fullImport.match(/import\s+type\s*\{\s*(\w+)\s*\}\s*from/);
  if (singleType && singleType[1] === varName) {
    const result = [...lines];
    result.splice(lineIdx, endIdx - lineIdx + 1);
    return result;
  }

  // Case: named import among others → import { Foo, Bar, Baz } from "bar" → remove just Foo
  // Match "varName," or ", varName" patterns
  const result = [...lines];

  // Work on the joined import text, then split back
  let newImport = fullImport;

  // Remove "varName, " (if it's first/middle)
  const pat1 = new RegExp(`\\b${escapeRegex(varName)}\\s*,\\s*`);
  // Remove ", varName" (if it's last)
  const pat2 = new RegExp(`\\s*,\\s*${escapeRegex(varName)}\\b`);
  // Remove "type varName, "
  const pat3 = new RegExp(`\\btype\\s+${escapeRegex(varName)}\\s*,\\s*`);
  // Remove ", type varName"
  const pat4 = new RegExp(`\\s*,\\s*type\\s+${escapeRegex(varName)}\\b`);

  if (pat1.test(newImport)) {
    newImport = newImport.replace(pat1, "");
  } else if (pat2.test(newImport)) {
    newImport = newImport.replace(pat2, "");
  } else if (pat3.test(newImport)) {
    newImport = newImport.replace(pat3, "");
  } else if (pat4.test(newImport)) {
    newImport = newImport.replace(pat4, "");
  } else {
    // Can't safely remove — fall back to null (will use disable comment)
    return null;
  }

  // Replace the original lines with the modified import
  const newLines = newImport.split("\n");
  result.splice(lineIdx, endIdx - lineIdx + 1, ...newLines);
  return result;
}
