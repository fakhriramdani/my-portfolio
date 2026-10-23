#!/usr/bin/env node
/**
 * Zero-JS export pruner (NFR-03, BR-017, ADR-0004).
 *
 * The product is one static HTML document with no interactivity: BR-017 says
 * "JavaScript is an enhancement only" and the page must render fully with JS
 * disabled (NFR-11). Next.js nevertheless ships its React + App-Router client
 * runtime (~130 KB gzip) on every route, which exceeds NFR-03's 120 KB
 * first-load JS budget. This step strips that unused runtime from the exported
 * HTML after `next build`, leaving pure HTML + CSS.
 *
 * Guard: if any source file declares "use client", the app genuinely needs
 * hydration, so the prune is skipped and the CI JS-budget gate will fail
 * loudly — forcing a conscious decision instead of a silent break.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "out");

function walk(dir, filter, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, filter, acc);
    else if (!filter || filter(p)) acc.push(p);
  }
  return acc;
}

function hasUseClientDirective(source) {
  // A real directive is a string literal at the top of the module, before any
  // statement. Strip leading comments/whitespace, then check the first token.
  const stripped = source
    .replace(/^\s*\/\*[\s\S]*?\*\//, "")
    .replace(/^(\s*\/\/[^\n]*\n)+/, "")
    .trimStart();
  return /^(['"])use client\1\s*;?/.test(stripped);
}

const clientComponents = walk(SRC, (p) => /\.(tsx?|jsx?)$/.test(p)).filter((p) =>
  hasUseClientDirective(fs.readFileSync(p, "utf8")),
);

if (clientComponents.length > 0) {
  console.warn(
    "prune-runtime: client components present, skipping prune (site needs hydration):",
  );
  for (const f of clientComponents) console.warn("  -", path.relative(ROOT, f));
  process.exit(0);
}

if (!fs.existsSync(OUT)) {
  console.error("prune-runtime: out/ missing; run `next build` first");
  process.exit(1);
}

const htmlFiles = walk(OUT, (p) => p.endsWith(".html"));
if (htmlFiles.length === 0) {
  console.error("prune-runtime: no HTML in out/");
  process.exit(1);
}

let removedScripts = 0;
for (const file of htmlFiles) {
  let html = fs.readFileSync(file, "utf8");

  // 1. Protect the JSON-LD block and whitelisted /enhance.js (TECH-SPEC §4.4, §4.5, ADR-0005).
  const keep = [];
  html = html.replace(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,
    (m) => {
      keep.push(m);
      return `__PRUNE_KEEP_${keep.length - 1}__`;
    },
  );
  html = html.replace(
    /<script\b[^>]*\bsrc=["']\/enhance\.js["'][^>]*>(?:<\/script>)?/gi,
    (m) => {
      keep.push(m);
      return `__PRUNE_KEEP_${keep.length - 1}__`;
    },
  );

  // 2. Remove every remaining <script> (Next.js bootstrap, RSC payload, chunks).
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, () => {
    removedScripts++;
    return "";
  });

  // 3. Remove the script preload hint.
  html = html.replace(/<link\b[^>]*\bas="script"[^>]*\/?>/g, "");

  // 4. Restore preserved scripts (JSON-LD and /enhance.js).
  html = html.replace(/__PRUNE_KEEP_(\d+)__/g, (_, i) => keep[Number(i)]);

  fs.writeFileSync(file, html);
}

// 5. Delete the now-unreferenced JS (Next.js runtime + chunks + manifests).
const jsFiles = walk(path.join(OUT, "_next"), (p) => p.endsWith(".js"));
for (const f of jsFiles) fs.rmSync(f);

// 6. Remove RSC metadata .txt files (nit n2 CR v2) — keep robots.txt.
const txtFiles = walk(OUT, (p) => p.endsWith(".txt")).filter((p) => {
  const rel = path.relative(OUT, p);
  return rel !== "robots.txt";
});
for (const f of txtFiles) fs.rmSync(f);

console.log(
  `prune-runtime: removed ${removedScripts} script tag(s) across ${htmlFiles.length} page(s); deleted ${jsFiles.length} JS file(s); deleted ${txtFiles.length} RSC .txt file(s).`,
);
console.log("prune-runtime: export pruned framework runtime (only whitelisted /enhance.js preserved, 0 KB framework JS).");
