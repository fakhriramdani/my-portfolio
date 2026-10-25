/**
 * tests/runtime-budget.test.ts — Unit tests for CSP hardening, pruner logic,
 * and runtime budget ratchet (TASK-211, TECH-SPEC v2.0 §4.4, §4.7, §6.1,
 * ADR-0004, ADR-0005, NFR-03, NFR-10).
 *
 * AC coverage:
 *   AC-CSP-1  Both Nginx configs have script-src 'self' (no unsafe-inline).
 *   AC-CSP-2  Both Nginx configs have no 'unsafe-eval'.
 *   AC-PRUNE-1 prune-runtime.js strips Next.js chunks but preserves /enhance.js.
 *   AC-PRUNE-2 prune-runtime.js updated log message matches CR-TASK-209 Nit N1.
 *   AC-BUDGET-1 enhance.js ≤ 5 KB gzip.
 *   AC-BUDGET-2 Framework JS in out/_next/ is 0 KB after prune.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(__dirname, "..");
const NGINX_DIR = path.join(ROOT, "config", "nginx");
const ENHANCE_PATH = path.join(ROOT, "public", "enhance.js");
const PRUNE_SCRIPT = path.join(ROOT, "scripts", "prune-runtime.js");
const OUT_DIR = path.join(ROOT, "out");

// ============================================================================
// PART 1: CSP — AC-CSP-1, AC-CSP-2
// ============================================================================

const nginxConfs = fs
  .readdirSync(NGINX_DIR)
  .filter((f) => f.endsWith(".conf"))
  .map((f) => ({ name: f, text: fs.readFileSync(path.join(NGINX_DIR, f), "utf8") }));

for (const { name, text } of nginxConfs) {
  const cspLine = text
    .split("\n")
    .find((l) => /^\s*add_header\s+Content-Security-Policy/.test(l));

  test(`AC-CSP-1: ${name} CSP has script-src 'self'`, () => {
    assert.ok(cspLine, `${name} must have a Content-Security-Policy header`);
    assert.match(cspLine!, /script-src\s+'self'/, `${name}: script-src must include 'self'`);
  });

  test(`AC-CSP-1: ${name} CSP has no unsafe-inline in script-src`, () => {
    assert.ok(cspLine, `${name} must have a Content-Security-Policy header`);
    assert.ok(
      !/script-src[^;]*'unsafe-inline'/.test(cspLine!),
      `${name}: script-src must NOT contain 'unsafe-inline'`,
    );
  });

  test(`AC-CSP-2: ${name} CSP has no unsafe-eval`, () => {
    assert.ok(cspLine, `${name} must have a Content-Security-Policy header`);
    assert.ok(
      !cspLine!.includes("unsafe-eval"),
      `${name}: CSP must NOT contain 'unsafe-eval'`,
    );
  });
}

// ============================================================================
// PART 2: Pruner source analysis — AC-PRUNE-1, AC-PRUNE-2
// ============================================================================

test("AC-PRUNE-1: prune-runtime.js whitelist regex preserves /enhance.js script tag", () => {
  const source = fs.readFileSync(PRUNE_SCRIPT, "utf8");
  // The whitelist regex must match <script ... src="/enhance.js" ...>.
  const whitelistMatch = source.match(
    /html\.replace\(\s*\/(.*?\/enhance\\\.js.*?)\/[gi]*/,
  );
  assert.ok(whitelistMatch, "prune-runtime.js must have a whitelist regex covering /enhance.js");

  // Verify the script source contains the key pattern literally.
  assert.ok(
    source.includes("enhance.js"),
    "prune-runtime.js source must reference enhance.js in the whitelist",
  );
  assert.ok(
    source.includes("PRUNE_KEEP"),
    "prune-runtime.js must use PRUNE_KEEP placeholder to protect whitelisted scripts",
  );
});

test("AC-PRUNE-1: prune-runtime.js removes all remaining script tags", () => {
  const source = fs.readFileSync(PRUNE_SCRIPT, "utf8");
  // Step 2 removes every leftover <script> (Next.js bootstrap, RSC, chunks).
  assert.ok(
    source.includes("Remove every remaining"),
    "prune-runtime.js must have a step that removes remaining <script> tags",
  );
  assert.ok(
    source.includes("removedScripts++"),
    "prune-runtime.js must count removed script tags",
  );
});

test("AC-PRUNE-1: prune-runtime.js deletes JS files from out/_next/", () => {
  const source = fs.readFileSync(PRUNE_SCRIPT, "utf8");
  assert.ok(
    source.includes('OUT, "_next"'),
    "prune-runtime.js must target out/_next/ for JS deletion",
  );
  assert.ok(
    source.includes("fs.rmSync"),
    "prune-runtime.js must use fs.rmSync to delete JS files",
  );
});

test("AC-PRUNE-2: prune-runtime.js log message matches CR-TASK-209 Nit N1", () => {
  const source = fs.readFileSync(PRUNE_SCRIPT, "utf8");
  assert.ok(
    source.includes(
      "export pruned framework runtime (only whitelisted /enhance.js preserved, 0 KB framework JS).",
    ),
    "prune-runtime.js final log must match the Nit N1 wording",
  );
  assert.ok(
    !source.includes("export is now HTML + CSS only (0 KB JS)."),
    "prune-runtime.js must NOT still contain the old Nit N1 log message",
  );
});

// ============================================================================
// PART 3: Budget ratchet — AC-BUDGET-1, AC-BUDGET-2
// These run only when out/ exists (i.e. after npm run build).
// ============================================================================

const outExists = fs.existsSync(OUT_DIR);

test("AC-BUDGET-1: enhance.js ≤ 5 KB gzip (public/enhance.js source budget)", () => {
  assert.ok(
    fs.existsSync(ENHANCE_PATH),
    "public/enhance.js must exist before budget check",
  );
  const gzipBytes = zlib.gzipSync(fs.readFileSync(ENHANCE_PATH), { level: 9 }).length;
  assert.ok(
    gzipBytes <= 5120,
    `enhance.js must be ≤ 5 KB gzip; got ${(gzipBytes / 1024).toFixed(1)} KB`,
  );
});

test("AC-BUDGET-2: framework JS in out/_next/ is 0 after prune (requires npm run build)", {
  skip: outExists ? false : "out/ not present — run npm run build first",
}, () => {
  function walkJs(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...walkJs(p));
      else if (entry.name.endsWith(".js")) results.push(p);
    }
    return results;
  }

  const nextDir = path.join(OUT_DIR, "_next");
  const jsFiles = walkJs(nextDir);
  assert.equal(
    jsFiles.length,
    0,
    `out/_next/ must have 0 .js files after prune; got ${jsFiles.length}: ${jsFiles.map((f) => path.relative(OUT_DIR, f)).join(", ")}`,
  );
});

test("AC-BUDGET-1: out/enhance.js ≤ 5 KB gzip (post-build copy, requires npm run build)", {
  skip: outExists ? false : "out/ not present — run npm run build first",
}, () => {
  const outEnhance = path.join(OUT_DIR, "enhance.js");
  assert.ok(fs.existsSync(outEnhance), "out/enhance.js must exist in export");
  const gzipBytes = zlib.gzipSync(fs.readFileSync(outEnhance), { level: 9 }).length;
  assert.ok(
    gzipBytes <= 5120,
    `out/enhance.js must be ≤ 5 KB gzip; got ${(gzipBytes / 1024).toFixed(1)} KB`,
  );
});
