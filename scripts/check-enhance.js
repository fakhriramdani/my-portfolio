#!/usr/bin/env node
/**
 * scripts/check-enhance.js — Hygiene and size guard for public/enhance.js.
 * (ADR-0005, TECH-SPEC v2.0 §4.5, §4.7, TASK-209).
 *
 * Enforces:
 *  1. Syntax validity (compiles via Node.js vm.Script).
 *  2. Gzip size budget: <= 5 KB (5120 bytes) at level 9 compression.
 *  3. Hygiene rules: strictly forbids eval, new Function, innerHTML/outerHTML,
 *     external URLs, network calls (fetch/XHR/WS/EventSource/sendBeacon),
 *     and client storage (localStorage, sessionStorage, cookie, indexedDB).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_TARGET = path.join(ROOT, "public", "enhance.js");
const MAX_GZIP_BYTES = 5 * 1024; // 5120 bytes

const FORBIDDEN_RULES = [
  {
    name: "eval",
    pattern: /\beval\s*\(/,
    description: "eval(...) is strictly forbidden",
  },
  {
    name: "new Function",
    pattern: /new\s+Function\b|\bFunction\s*\(/,
    description: "Function constructor is strictly forbidden",
  },
  {
    name: "innerHTML/outerHTML",
    pattern: /\b(innerHTML|outerHTML)\b/,
    description: "innerHTML and outerHTML are forbidden (use textContent or DOM APIs)",
  },
  {
    name: "external URLs",
    pattern: /https?:\/\/|\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
    description: "External URLs are strictly forbidden (self-contained only)",
  },
  {
    name: "network requests (fetch)",
    pattern: /\bfetch\s*\(/,
    description: "Network requests (fetch) are strictly forbidden",
  },
  {
    name: "network requests (XMLHttpRequest)",
    pattern: /\bXMLHttpRequest\b/,
    description: "Network requests (XMLHttpRequest) are strictly forbidden",
  },
  {
    name: "network requests (WebSocket/EventSource/sendBeacon)",
    pattern: /\b(WebSocket|EventSource|sendBeacon)\b/,
    description: "Network connections are strictly forbidden",
  },
  {
    name: "storage (localStorage/sessionStorage)",
    pattern: /\b(localStorage|sessionStorage)\b/,
    description: "Client storage is strictly forbidden",
  },
  {
    name: "storage (cookies)",
    pattern: /\b(document\.cookie|cookie)\b/,
    description: "Cookie access is strictly forbidden",
  },
  {
    name: "storage (indexedDB)",
    pattern: /\bindexedDB\b/,
    description: "IndexedDB access is strictly forbidden",
  },
];

/**
 * Checks a JavaScript source string against hygiene guards and size limit.
 *
 * @param {string} source - The JS source code to check
 * @param {string} [filename="anonymous"] - Filename for error reporting
 * @returns {{ ok: boolean, gzipBytes: number, errors: string[] }}
 */
function checkEnhanceSource(source, filename = "anonymous") {
  const errors = [];

  // 1. Syntax check
  try {
    new vm.Script(source, { filename });
  } catch (err) {
    errors.push(`E_ENHANCE: [syntax] ${filename}: ${err.message}`);
  }

  // 2. Gzip budget check
  const gzipBytes = zlib.gzipSync(Buffer.from(source, "utf8"), { level: 9 }).length;
  if (gzipBytes > MAX_GZIP_BYTES) {
    errors.push(
      `E_ENHANCE: [size] ${filename} gzip size ${gzipBytes} exceeds ${MAX_GZIP_BYTES} bytes budget`,
    );
  }

  // 3. Hygiene pattern checks
  const lines = source.split(/\r?\n/);
  for (const rule of FORBIDDEN_RULES) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (rule.pattern.test(line)) {
        errors.push(
          `E_ENHANCE: [forbidden:${rule.name}] banned pattern "${rule.name}" found in ${filename}:${i + 1} — ${rule.description} (found: "${line.trim()}")`,
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    gzipBytes,
    errors,
  };
}

/**
 * Checks a file on disk.
 *
 * @param {string} filePath - Absolute or relative path to file
 * @returns {{ ok: boolean, gzipBytes: number, errors: string[] }}
 */
function checkEnhanceFile(filePath = DEFAULT_TARGET) {
  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      gzipBytes: 0,
      errors: [`E_ENHANCE: [not_found] Target file does not exist: ${filePath}`],
    };
  }

  const content = fs.readFileSync(filePath, "utf8");
  return checkEnhanceSource(content, path.relative(ROOT, filePath));
}

function runCli() {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_TARGET;
  const relPath = path.relative(ROOT, target);
  console.log(`Running check-enhance guard on ${relPath}...`);

  const result = checkEnhanceFile(target);

  if (result.ok) {
    console.log(`  ok - syntax valid`);
    console.log(
      `  ok - size: ${result.gzipBytes} B gzip <= ${MAX_GZIP_BYTES} B (5 KB) [${((result.gzipBytes / MAX_GZIP_BYTES) * 100).toFixed(1)}% of budget]`,
    );
    console.log(`  ok - 0 forbidden patterns found (${FORBIDDEN_RULES.length} hygiene rules checked)`);
    console.log(`CHECK-ENHANCE PASS: ${relPath} conforms to ADR-0005.`);
    return true;
  } else {
    console.error(`CHECK-ENHANCE FAIL: ${result.errors.length} error(s) found in ${relPath}:`);
    for (const err of result.errors) {
      console.error(`  FAIL - ${err}`);
    }
    return false;
  }
}

if (require.main === module) {
  const passed = runCli();
  process.exit(passed ? 0 : 1);
}

module.exports = {
  checkEnhanceSource,
  checkEnhanceFile,
  FORBIDDEN_RULES,
  MAX_GZIP_BYTES,
  DEFAULT_TARGET,
};
