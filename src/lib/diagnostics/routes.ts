import fs from "fs";
import path from "path";

export interface RouteInventory {
  pages: string[];
  api: string[];
  totalPages: number;
  totalApi: number;
  scannedAt: string;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

export function collectRoutes(appDir = path.join(process.cwd(), "src", "app")): RouteInventory {
  const files: string[] = [];
  try {
    walk(appDir, files);
  } catch (_e) {
    return { pages: [], api: [], totalPages: 0, totalApi: 0, scannedAt: new Date().toISOString() };
  }
  const pageFiles = files.filter((f) => /page\.(t|j)sx?$/.test(f));
  const routeFiles = files.filter((f) => /route\.(t|j)s$/.test(f));
  const pages = pageFiles.map((f) => f.split("src/app")[1].replace(/\/page\.(t|j)sx?$/, "") || "/");
  const api = routeFiles.map((f) => f.split("src/app")[1].replace(/\/route\.(t|j)s$/, ""));
  return {
    pages: pages.sort(),
    api: api.sort(),
    totalPages: pages.length,
    totalApi: api.length,
    scannedAt: new Date().toISOString(),
  };
}
