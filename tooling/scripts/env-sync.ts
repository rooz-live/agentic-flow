#!/usr/bin/env node
/* env-sync: propagate active env -> templates (mask secrets) */
import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";
import { resolve } from "path";

type Catalog = Record<string, { secret?: boolean; default?: string; desc?: string }>;

const ROOT = process.cwd();
const CATALOG_PATH = resolve(ROOT, "config/env.catalog.json");
const TEMPLATE_GLOBS = [
  ".env.example",
  ".env.template",
  ".env.integration",
  ".env.docker-test",
  "config/.env.example",
  "config/.env.fastmcp",
  "config/*/*.env.template",
  "docker/configs/*.env.template",
  "examples/**/.env.example"
];

const WRITE = process.argv.includes("--write");
let catalog: Catalog;

try {
  catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
} catch (e) {
  console.error(`Error loading catalog from ${CATALOG_PATH}:`, e);
  process.exit(1);
}

/* load .env (fallback) without deps */
function parseDotenv(text: string) {
  const obj: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    obj[m[1]] = v;
  }
  return obj;
}

function stringifyValue(v: string) {
  return /^[A-Za-z0-9._-]*$/.test(v) ? v : JSON.stringify(v);
}

function mask(key: string, v: string) {
  const c = catalog[key];
  if (c?.secret) return "<REQUIRED>";
  // Non-secret: use active if present, else catalog default, else keep empty
  return v ?? c?.default ?? "";
}

function loadActive() {
  let active: Record<string, string> = {};
  try {
    const dot = readFileSync(resolve(ROOT, ".env"), "utf8");
    active = { ...parseDotenv(dot) };
  } catch {}
  // process.env takes precedence
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string" && v.length) active[k] = v;
  }
  return active;
}

function rewriteTemplate(path: string, active: Record<string, string>) {
  const src = readFileSync(path, "utf8");
  const lines = src.split(/\r?\n/);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of lines) {
    const m = raw.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) {
      out.push(raw);
      continue;
    }
    const key = m[1];
    seen.add(key);
    const next = mask(key, active[key]);
    out.push(`${key}=${stringifyValue(next)}`);
  }

  // Append missing keys from catalog
  const missing = Object.keys(catalog).filter(k => !seen.has(k));
  if (missing.length) {
    out.push("", `# Added keys (${new Date().toISOString().slice(0,10)})`);
    for (const k of missing) {
      const v = mask(k, active[k]);
      const desc = catalog[k]?.desc;
      if (desc) out.push(`# ${desc}`);
      out.push(`${k}=${stringifyValue(v)}`);
    }
  }

  const updated = out.join("\n");
  if (updated !== src) {
    if (WRITE) writeFileSync(path, updated);
    return { path, changed: true };
  }
  return { path, changed: false };
}

function main() {
  const active = loadActive();
  const files = TEMPLATE_GLOBS.flatMap(g => globSync(g, { cwd: ROOT, dot: true, nodir: true }))
    .map(p => resolve(ROOT, p));

  if (files.length === 0) {
    console.log("No template files found matching patterns:", TEMPLATE_GLOBS);
    process.exit(0);
  }

  const results = files.map(f => rewriteTemplate(f, active));
  const changed = results.filter(r => r.changed).map(r => r.path);
  
  if (!WRITE) {
    console.log("\n🔍 DRY RUN - Would update:");
    if (changed.length) {
      changed.forEach(p => console.log(`  - ${p.replace(ROOT, '.')}`));
    } else {
      console.log("  (no changes needed)");
    }
    console.log("\n✅ Pass --write to apply changes.\n");
    process.exit(changed.length > 0 ? 1 : 0);
  } else {
    console.log("\n✅ Updated:");
    if (changed.length) {
      changed.forEach(p => console.log(`  - ${p.replace(ROOT, '.')}`));
    } else {
      console.log("  (no changes needed)");
    }
    console.log();
    process.exit(0);
  }
}

main();