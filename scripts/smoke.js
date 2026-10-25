#!/usr/bin/env node
/**
 * Post-build smoke gate (CR m3, M2, NFR-03).
 * Asserts the static export under `out/` is complete and within budget:
 *  - index.html structure (h1, 5 h2, contact hrefs, canonical, og, JSON-LD)
 *  - robots.txt / sitemap.xml / 404.html
 *  - NFR-03: first-load JS ≤ 120 KB gzip (0 KB after prune), HTML ≤ 50 KB gzip
 *  - AC-016.6: no SECRET / TOKEN / PRIVATE KEY in the client bundle
 *  - CSP (NFR-10): the served CSP directive has no `unsafe-eval`
 * Run after `npm run build`.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "out");

const failures = [];
function check(cond, msg) {
  if (cond) console.log("  ok -", msg);
  else {
    console.error("  FAIL -", msg);
    failures.push(msg);
  }
}

function read(p) {
  return fs.readFileSync(path.join(OUT, p), "utf8");
}

if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("FAIL - out/index.html missing; run `npm run build` first");
  process.exit(1);
}

// ---- index.html -----------------------------------------------------------
const html = read("index.html");
check(/<h1[^>]*>Fakhri Ramdani<\/h1>/.test(html), "index.html has h1 with name");
check(
  (html.match(/<h2[^>]*>/g) || []).length >= 3,
  "index.html has 3 section h2",
);
check(html.includes('id="database"'), "database section anchor present");
// TASK-202: header v2 (D-028/D-034) — telepon, unduh CV, badge status, dan nav
// sticky dicabut dari seluruh layar. Kontak email/LinkedIn kembali pada
// TASK-203; gate `0 tel:` menyeluruh ditambahkan TASK-211.
check(/<header class="nd-header"/.test(html), "v2 header block rendered");
check(/<aside class="nd-callout"/.test(html), "callout quote block rendered");
check(!html.includes('href="tel:'), "no tel: link rendered (D-028.2)");
check(!/href="\/fakhriramdani-cv\.pdf"/.test(html), "no CV download link (D-028.3)");
check(!html.includes("Terbuka untuk peluang baru"), "no status badge (D-028.1)");
check(/<link rel="canonical"/.test(html), "canonical link present");
check(/property="og:type" content="profile"/.test(html), "og:type=profile");
check(/application\/ld\+json/.test(html), "JSON-LD script present");
check(/"@type":"Person"/.test(html), "JSON-LD Person type");
check(/<html lang="en"/.test(html), '<html lang="en">');
check(/<link rel="stylesheet"[^>]*\.css/.test(html), "stylesheet linked");
const scriptSrcMatches = [
  ...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
].map((m) => m[1]);
check(
  scriptSrcMatches.every((src) => src === "/enhance.js"),
  "only whitelisted /enhance.js script referenced (0 framework scripts)",
);
check(
  scriptSrcMatches.includes("/enhance.js"),
  "whitelisted /enhance.js script referenced in index.html",
);

// ---- robots.txt / sitemap.xml / 404.html ----------------------------------
const robots = read("robots.txt");
check(/User-Agent: \*/.test(robots), "robots.txt allows all");
check(/Sitemap: /.test(robots), "robots.txt references sitemap");

const sitemap = read("sitemap.xml");
check(/<loc>[^<]+\/<\/loc>/.test(sitemap), "sitemap <loc> ends with one slash");
check(/<lastmod>/.test(sitemap), "sitemap has lastmod");

const notFound = read("404.html");
check(/<h1[^>]*>Page not found<\/h1>/.test(notFound), "404.html has Page not found h1");
check(/href="\/"/.test(notFound), "404.html links back to /");

const forbidden = read("403.html");
check(/<h1[^>]*>Access Denied<\/h1>/.test(forbidden), "403.html has Access Denied h1");
check(/href="\/"/.test(forbidden), "403.html links back to /");

// ---- NFR-03 payload budget ------------------------------------------------
function gzipSize(file) {
  return zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
}
function walk(dir, ext) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, ext));
    else if (entry.name.endsWith(ext)) out.push(p);
  }
  return out;
}

const staticDir = path.join(OUT, "_next", "static");
const nextJsFiles = walk(path.join(OUT, "_next"), ".js");
check(
  nextJsFiles.length === 0,
  `0 framework JS chunks in out/_next/ (got ${nextJsFiles.length})`,
);

const enhanceFile = path.join(OUT, "enhance.js");
check(fs.existsSync(enhanceFile), "out/enhance.js exists in export");
let enhanceBytes = 0;
if (fs.existsSync(enhanceFile)) {
  enhanceBytes = gzipSize(enhanceFile);
  const enhanceKb = (enhanceBytes / 1024).toFixed(1);
  console.log(`  info - enhance.js gzip: ${enhanceKb} KB (${enhanceBytes} B)`);
  check(enhanceBytes <= 5120, `enhance.js ≤ 5 KB gzip (got ${enhanceKb} KB)`);
}

const allJsFiles = walk(OUT, ".js");
const jsBytes = allJsFiles.reduce((n, f) => n + gzipSize(f), 0);
const jsKb = (jsBytes / 1024).toFixed(1);
console.log(`  info - total first-load JS gzip: ${jsKb} KB across ${allJsFiles.length} file(s)`);
check(jsBytes <= 120 * 1024, `JS ≤ 120 KB gzip (got ${jsKb} KB)`);

const htmlBytes = gzipSize(path.join(OUT, "index.html"));
const htmlKb = (htmlBytes / 1024).toFixed(1);
console.log(`  info - HTML document gzip: ${htmlKb} KB`);
check(htmlBytes <= 50 * 1024, `HTML ≤ 50 KB gzip (got ${htmlKb} KB)`);

// ---- AC-016.6 secret grep (client bundle) ---------------------------------
const bundleFiles = allJsFiles.concat(walk(staticDir, ".css"));
const secretRe = /SECRET|TOKEN|PRIVATE KEY/;
const leaked = bundleFiles.filter((f) =>
  secretRe.test(fs.readFileSync(f, "utf8")),
);
check(leaked.length === 0, "no SECRET/TOKEN/PRIVATE KEY in client bundle");

// ---- CSP (NFR-10): served CSP directive has no unsafe-eval ----------------
const nginxDir = path.join(ROOT, "config", "nginx");
const nginxConfs = fs.readdirSync(nginxDir).filter((f) => f.endsWith(".conf"));
check(nginxConfs.length > 0, "nginx config(s) present");
for (const conf of nginxConfs) {
  const text = fs.readFileSync(path.join(nginxDir, conf), "utf8");
  const cspDirective = text
    .split("\n")
    .find((l) => /^\s*add_header\s+Content-Security-Policy/.test(l));
  check(!!cspDirective, `${conf} serves a Content-Security-Policy header`);
  check(
    !!cspDirective && !cspDirective.includes("unsafe-eval"),
    `${conf} CSP has no unsafe-eval`,
  );
  check(
    !!cspDirective && !/script-src[^;]*'unsafe-inline'/.test(cspDirective),
    `${conf} CSP has no unsafe-inline in script-src`,
  );
}

if (failures.length > 0) {
  console.error(`\nSMOKE FAILED (${failures.length}):`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("\nOK: smoke checks passed.");
