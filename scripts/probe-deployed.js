#!/usr/bin/env node
/**
 * scripts/probe-deployed.js — Post-deploy probe for live environment.
 * (TECH-SPEC v2.0 §6.1 TASK-215, §7.4 Gate 14, D-049).
 *
 * Validates:
 *  1. Target URL (CLI arg or SITE_URL env, default https://127.0.0.1)
 *  2. Probe /:
 *     - HTTP 200 OK
 *     - Headers: CSP (script-src 'self' without 'unsafe-inline'), HSTS, nosniff, referrer-policy
 *     - Body: <html lang="en">, canonical, JSON-LD Person, 0 _next scripts, 0 inline scripts,
 *       exactly 1 /enhance.js defer, 0 tel:, 0 status badge, 0 CV download button,
 *       Notion structure (.nd-page, .nd-header, .nd-db, 4 tab labels, 5 project cards, 5 dialogs)
 *  3. Probe /enhance.js: HTTP 200, application/javascript, <= 5120 bytes gzip
 *  4. Probe /robots.txt & /sitemap.xml: HTTP 200
 *  5. Probe /404-test-not-found: HTTP 404
 *  6. Live Playwright headless probe:
 *     - Listen to console & page errors: assert 0 CSP violation errors, 0 JS runtime exceptions
 *     - Test tab switching: click tab -> Skills panel visible
 *     - Test modal interaction: click project card -> dialog opens -> Escape -> dialog closes
 *     - Test 0 horizontal overflow across viewports (390px, 880px, 1440px)
 */

"use strict";

const https = require("https");
const http = require("http");
const zlib = require("zlib");
const { URL } = require("url");
const { chromium } = require("@playwright/test");

const DEFAULT_TARGET = "https://127.0.0.1";
const TARGET_URL = process.argv[2] || process.env.SITE_URL || DEFAULT_TARGET;

const failures = [];
let passedCount = 0;

function check(cond, msg) {
  if (cond) {
    console.log("  ok -", msg);
    passedCount++;
  } else {
    console.error("  FAIL -", msg);
    failures.push(msg);
  }
}

function request(rawUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(rawUrl);
    const isHttps = urlObj.protocol === "https:";
    const lib = isHttps ? https : http;

    const headers = { ...options.headers };
    if (
      !headers.Host &&
      (urlObj.hostname === "127.0.0.1" || urlObj.hostname === "localhost")
    ) {
      headers.Host = "fakhriramdani.web.id";
    }

    const reqOptions = {
      method: options.method || "GET",
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers,
      agent: isHttps
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
    };

    const req = lib.request(reqOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString("utf8"),
          buffer,
        });
      });
    });

    req.on("error", reject);
    req.end();
  });
}

(async () => {
  console.log(`Starting post-deploy probe on: ${TARGET_URL}`);
  const targetBase = TARGET_URL.replace(/\/+$/, "");
  const targetObj = new URL(targetBase);
  const isLocalHost =
    targetObj.hostname === "127.0.0.1" || targetObj.hostname === "localhost";

  // ---- 1. Probe / -----------------------------------------------------------
  console.log("\nProbing / endpoint...");
  try {
    const rootRes = await request(`${targetBase}/`);
    check(rootRes.statusCode === 200, "probe / returns HTTP 200 OK");

    const csp = rootRes.headers["content-security-policy"] || "";
    check(csp.length > 0, "Content-Security-Policy header present");
    const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/i);
    const scriptSrc = scriptSrcMatch ? scriptSrcMatch[1] : "";
    check(
      scriptSrc.includes("'self'"),
      "CSP script-src directive contains 'self'",
    );
    check(
      !scriptSrc.includes("'unsafe-inline'"),
      "CSP script-src directive does NOT contain 'unsafe-inline'",
    );

    check(
      !!rootRes.headers["strict-transport-security"],
      "Strict-Transport-Security header present",
    );

    check(
      (rootRes.headers["x-content-type-options"] || "").toLowerCase() ===
        "nosniff",
      "X-Content-Type-Options: nosniff header present",
    );

    check(
      (rootRes.headers["referrer-policy"] || "").toLowerCase() ===
        "strict-origin-when-cross-origin",
      "Referrer-Policy: strict-origin-when-cross-origin header present",
    );

    const html = rootRes.body;
    check(/<html\b[^>]*\blang=["']en["']/i.test(html), '<html lang="en"> present');
    check(
      /<link\b[^>]*\brel=["']canonical["']/i.test(html),
      "Canonical link present",
    );
    check(
      /<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?"@type"\s*:\s*"Person"[\s\S]*?<\/script>/i.test(
        html,
      ),
      "JSON-LD Person schema present",
    );

    const nextScriptMatches =
      html.match(/<script\b[^>]*\bsrc=["'][^"']*_next\/[^"']*\.js["'][^>]*>/gi) ||
      [];
    check(
      nextScriptMatches.length === 0,
      `0 <script> tags pointing to _next/**/*.js (got ${nextScriptMatches.length})`,
    );

    const allScripts = [
      ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
    ];
    const inlineJsScripts = allScripts.filter(([_, attrs, inner]) => {
      const isJsonLd = /type=["']application\/ld\+json["']/i.test(attrs);
      const hasSrc = /\bsrc=["']/i.test(attrs);
      return !hasSrc && !isJsonLd && inner.trim().length > 0;
    });
    check(
      inlineJsScripts.length === 0,
      `0 inline scripts present (got ${inlineJsScripts.length})`,
    );

    const enhanceScripts = allScripts.filter(([_, attrs]) => {
      return (
        /src=["']\/enhance\.js["']/i.test(attrs) && /\bdefer\b/i.test(attrs)
      );
    });
    check(
      enhanceScripts.length === 1,
      `Tepat 1 <script src="/enhance.js" defer></script> present (got ${enhanceScripts.length})`,
    );

    check(!html.includes('href="tel:'), "0 tel: links present (D-028.2)");
    check(
      !html.includes("Terbuka untuk peluang baru"),
      "0 status badge present (D-028.1)",
    );
    check(
      !/href="\/fakhriramdani-cv\.pdf"/i.test(html),
      "0 CV download button present (D-028.3)",
    );

    check(
      html.includes('class="nd-page"') || html.includes("nd-page"),
      "Notion structure: .nd-page present",
    );
    check(html.includes("nd-header"), "Notion structure: .nd-header present");
    check(html.includes("nd-db"), "Notion structure: .nd-db present");

    const tabLabels = [
      ...html.matchAll(/<label\b[^>]*class=["'][^"']*nd-tab[^"']*["'][^>]*>/gi),
    ];
    const dataTabs = [...html.matchAll(/data-tab=["'][^"']+["']/gi)];
    const tabCount = tabLabels.length || dataTabs.length;
    check(tabCount === 4, `4 tab labels present (got ${tabCount})`);

    const projectCards = [...html.matchAll(/data-project-card=["']true["']/gi)];
    check(
      projectCards.length === 5,
      `5 project cards present (got ${projectCards.length})`,
    );

    const dialogs = [
      ...html.matchAll(/<dialog\b[^>]*class=["'][^"']*nd-modal[^"']*["'][^>]*>/gi),
    ];
    check(dialogs.length === 5, `5 dialogs present (got ${dialogs.length})`);
  } catch (err) {
    check(false, `probe / failed with error: ${err.message}`);
  }

  // ---- 2. Probe /enhance.js -------------------------------------------------
  console.log("\nProbing /enhance.js static delivery...");
  try {
    const enhanceRes = await request(`${targetBase}/enhance.js`);
    check(
      enhanceRes.statusCode === 200,
      "probe /enhance.js returns HTTP 200 OK",
    );
    const contentType = enhanceRes.headers["content-type"] || "";
    check(
      contentType.includes("application/javascript") ||
        contentType.includes("text/javascript"),
      `probe /enhance.js Content-Type is javascript (got ${contentType})`,
    );
    const enhanceGzipBytes = zlib.gzipSync(enhanceRes.buffer, {
      level: 9,
    }).length;
    check(
      enhanceGzipBytes <= 5120,
      `probe /enhance.js size <= 5.120 bytes gzip (got ${enhanceGzipBytes} B)`,
    );
  } catch (err) {
    check(false, `probe /enhance.js failed with error: ${err.message}`);
  }

  // ---- 3. Probe /robots.txt & /sitemap.xml -----------------------------------
  console.log("\nProbing /robots.txt & /sitemap.xml...");
  try {
    const robotsRes = await request(`${targetBase}/robots.txt`);
    check(robotsRes.statusCode === 200, "probe /robots.txt returns HTTP 200 OK");

    const sitemapRes = await request(`${targetBase}/sitemap.xml`);
    check(
      sitemapRes.statusCode === 200,
      "probe /sitemap.xml returns HTTP 200 OK",
    );
  } catch (err) {
    check(false, `probe robots/sitemap failed: ${err.message}`);
  }

  // ---- 4. Probe /404-test-not-found -----------------------------------------
  console.log("\nProbing /404-test-not-found...");
  try {
    const notFoundRes = await request(`${targetBase}/404-test-not-found`);
    check(
      notFoundRes.statusCode === 404,
      `probe /404-test-not-found returns HTTP 404 Not Found (got ${notFoundRes.statusCode})`,
    );
  } catch (err) {
    check(false, `probe 404 failed: ${err.message}`);
  }

  // ---- 5. Live CDP / Playwright headless probe -----------------------------
  console.log("\nLaunching Playwright headless live probe...");
  let browser;
  try {
    const launchArgs = [
      "--ignore-certificate-errors",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ];
    if (isLocalHost || process.env.RESOLVE_LOCAL === "1") {
      launchArgs.push("--host-resolver-rules=MAP fakhriramdani.web.id 127.0.0.1");
    }

    browser = await chromium.launch({
      headless: true,
      args: launchArgs,
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const cspViolations = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        consoleErrors.push(text);
      }
      if (/content[- ]security[- ]policy|csp|violate/i.test(text)) {
        cspViolations.push(text);
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message || String(err));
    });

    const pageUrl = `${targetBase}/`;
    await page.goto(pageUrl, { waitUntil: "networkidle" });

    // Assert 0 CSP errors & 0 JS runtime exceptions
    check(
      cspViolations.length === 0,
      `0 CSP violation errors in live probe (got ${cspViolations.length})`,
    );
    check(
      pageErrors.length === 0,
      `0 JS runtime exceptions in live probe (got ${pageErrors.length})`,
    );
    check(
      consoleErrors.length === 0,
      `0 console error messages in live probe (got ${consoleErrors.length})`,
    );

    // Test tab switching: click #tab-skills -> Skills panel visible
    check(
      await page.isVisible("#panel-projects"),
      "Projects panel visible by default",
    );
    check(
      !(await page.isVisible("#panel-skills")),
      "Skills panel hidden by default",
    );

    const skillsTab = page.locator('label[for="tab-skills"]');
    if ((await skillsTab.count()) > 0) {
      await skillsTab.click();
    } else {
      await page.click("#tab-skills", { force: true });
    }
    await page.waitForTimeout(100);

    check(
      await page.isVisible("#panel-skills"),
      "Skills panel visible after clicking #tab-skills",
    );
    check(
      !(await page.isVisible("#panel-projects")),
      "Projects panel hidden after switching to skills",
    );

    // Test modal interaction: click project card -> dialog opens -> Escape -> closes
    const projectsTab = page.locator('label[for="tab-projects"]');
    if ((await projectsTab.count()) > 0) {
      await projectsTab.click();
    }
    await page.waitForTimeout(100);

    const projectTrigger = page
      .locator(
        '.nd-gallery a[href^="#modal-"], .nd-project a[href^="#modal-"], [data-modal-trigger]',
      )
      .first();
    const href = await projectTrigger.getAttribute("href");
    const modalId = href
      ? href.replace("#", "")
      : "modal-syariah-banking-display";

    await projectTrigger.click();
    await page.waitForTimeout(100);

    const isOpen = await page.evaluate((id) => {
      const dlg = document.getElementById(id);
      return dlg ? dlg.open === true : false;
    }, modalId);
    check(isOpen, `project modal #${modalId} opened (dialog.open === true)`);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    const isClosed = await page.evaluate((id) => {
      const dlg = document.getElementById(id);
      return dlg ? !dlg.open : true;
    }, modalId);
    check(isClosed, `project modal #${modalId} closed after Escape`);

    // Test 0 horizontal overflow across viewports (390px, 880px, 1440px)
    for (const w of [390, 880, 1440]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.waitForTimeout(50);
      const hasOverflow = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
      check(!hasOverflow, `0 horizontal overflow at ${w}px viewport`);
    }

    await browser.close();
  } catch (err) {
    if (browser) await browser.close();
    check(false, `Playwright live probe failed with error: ${err.message}`);
  }

  // ---- Summary & Exit -------------------------------------------------------
  console.log("\n========================================");
  console.log(`Probe completed: ${passedCount} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.error("FAILURES:");
    for (const f of failures) {
      console.error(` - ${f}`);
    }
    process.exit(1);
  } else {
    console.log("PROBE PASSED: Deployed environment verified successfully.");
    process.exit(0);
  }
})();
