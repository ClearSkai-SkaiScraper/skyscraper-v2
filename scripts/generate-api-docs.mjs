/**
 * API Documentation Generator (Sprint 10.4.3)
 *
 * Auto-generates API documentation from Zod schemas.
 *
 * Run: node scripts/generate-api-docs.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const VALIDATION_DIR = join(process.cwd(), "src", "lib", "validation");
const OUTPUT_FILE = join(process.cwd(), "docs", "API_REFERENCE.md");

function findSchemaFiles(dir) {
  const entries = [];
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (file.endsWith(".ts") && !file.startsWith("index")) {
        entries.push(join(dir, file));
      }
    }
  } catch {
    console.warn(`Could not read directory: ${dir}`);
  }
  return entries;
}

function extractSchemas(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const schemas = [];

  // Find exported z.object definitions
  const schemaRegex = /export\s+(?:const|let)\s+(\w+Schema)\s*=\s*z\.(object|enum|union|array|string|number)/g;
  let match;

  while ((match = schemaRegex.exec(content)) !== null) {
    const name = match[1];
    const type = match[2];

    // Try to extract the full schema block (rough heuristic)
    const startIdx = match.index;
    let depth = 0;
    let endIdx = startIdx;
    let started = false;

    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === "(") {
        depth++;
        started = true;
      }
      if (content[i] === ")") depth--;
      if (started && depth === 0) {
        // Find the semicolon or end of statement
        endIdx = content.indexOf(";", i);
        if (endIdx === -1) endIdx = i + 1;
        break;
      }
      if (i - startIdx > 2000) break; // safety
    }

    const block = content.slice(startIdx, endIdx + 1);

    // Extract field names from z.object blocks
    const fields = [];
    if (type === "object") {
      const fieldRegex = /(\w+)\s*:\s*z\.(\w+)\(([^)]*)\)/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(block)) !== null) {
        const optional = block.slice(fieldMatch.index).includes(".optional()");
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2],
          details: fieldMatch[3] || "",
          optional,
        });
      }
    }

    schemas.push({ name, type, fields, raw: block });
  }

  return schemas;
}

function generateMarkdown(schemaFiles) {
  let md = `# SkaiScrape API Reference\n\n`;
  md += `> Auto-generated from Zod validation schemas.\n`;
  md += `> Last updated: ${new Date().toISOString().split("T")[0]}\n\n`;
  md += `---\n\n`;

  for (const filePath of schemaFiles) {
    const relPath = relative(process.cwd(), filePath);
    const schemas = extractSchemas(filePath);

    if (schemas.length === 0) continue;

    md += `## \`${relPath}\`\n\n`;

    for (const schema of schemas) {
      md += `### ${schema.name}\n\n`;
      md += `**Type:** \`z.${schema.type}()\`\n\n`;

      if (schema.fields.length > 0) {
        md += `| Field | Type | Required |\n`;
        md += `|-------|------|----------|\n`;
        for (const field of schema.fields) {
          md += `| \`${field.name}\` | ${field.type} | ${field.optional ? "❌" : "✅"} |\n`;
        }
        md += `\n`;
      }

      md += `<details><summary>Schema source</summary>\n\n`;
      md += `\`\`\`typescript\n${schema.raw}\n\`\`\`\n\n`;
      md += `</details>\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

// ── Main ────────────────────────────────────────────────────────────
const schemaFiles = findSchemaFiles(VALIDATION_DIR);
console.log(`Found ${schemaFiles.length} schema files`);

const markdown = generateMarkdown(schemaFiles);
writeFileSync(OUTPUT_FILE, markdown, "utf-8");
console.log(`✅ API docs written to ${OUTPUT_FILE}`);
