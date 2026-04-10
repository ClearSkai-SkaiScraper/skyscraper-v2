// Sprint 12B: Fix all react/no-unescaped-entities violations.
// Reads ESLint JSON output from stdin, fixes the specific lines flagged.
import { readFileSync, writeFileSync } from "fs";

const raw = readFileSync("/dev/stdin", "utf8");
const data = JSON.parse(raw);

let totalFixed = 0;
let fileCount = 0;

for (const f of data) {
  const msgs = f.messages.filter((m) => m.ruleId === "react/no-unescaped-entities");
  if (msgs.length === 0) continue;

  const content = readFileSync(f.filePath, "utf8");
  const lines = content.split("\n");

  // Collect line numbers + column + character from ESLint messages
  const fixes = msgs.map((m) => ({
    line: m.line,
    col: m.column,
    // Extract the character from the message: `'` or `"`
    char: m.message.includes('"') ? '"' : "'",
  }));

  // Group fixes by line
  const byLine = {};
  for (const fix of fixes) {
    if (!byLine[fix.line]) byLine[fix.line] = [];
    byLine[fix.line].push(fix);
  }

  let changed = false;

  for (const [lineNum, lineFixes] of Object.entries(byLine)) {
    const idx = Number(lineNum) - 1;
    if (idx >= lines.length) continue;

    let line = lines[idx];
    const orig = line;

    // Sort fixes by column descending so replacements don't shift positions
    lineFixes.sort((a, b) => b.col - a.col);

    for (const fix of lineFixes) {
      const col = fix.col - 1; // 0-indexed
      const ch = line[col];

      if (ch === "'") {
        line = line.substring(0, col) + "&apos;" + line.substring(col + 1);
      } else if (ch === '"') {
        line = line.substring(0, col) + "&quot;" + line.substring(col + 1);
      } else if (ch === ">") {
        line = line.substring(0, col) + "&gt;" + line.substring(col + 1);
      } else if (ch === "<") {
        line = line.substring(0, col) + "&lt;" + line.substring(col + 1);
      } else if (ch === "}") {
        line = line.substring(0, col) + "&#125;" + line.substring(col + 1);
      } else if (ch === "{") {
        line = line.substring(0, col) + "&#123;" + line.substring(col + 1);
      }
    }

    if (line !== orig) {
      lines[idx] = line;
      changed = true;
      totalFixed += lineFixes.length;
    }
  }

  if (changed) {
    writeFileSync(f.filePath, lines.join("\n"));
    fileCount++;
    console.log(`  ✓ ${f.filePath.replace(/.*preloss-vision-main\//, "")} (${msgs.length} fixes)`);
  }
}

console.log(`\nDone: ${totalFixed} violations fixed in ${fileCount} files`);
