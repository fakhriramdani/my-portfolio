/**
 * tests/print.test.ts — Automated Print Stylesheet & PDF Verification (TASK-213)
 *
 * Refs:
 *  · TECH-SPEC v2.0 §3.14, §4.6, §6.1 TASK-213, §7.7
 *  · PRD v1.2 FR-D11 (NFR-09 warisan), AC-010.1
 *  · Decisions D-015 (print <= 3 pages A4), D-041, D-044–D-053
 *
 * Verifications:
 *  1. CSS Rules Verification in src/app/globals.css:
 *     - @page declarations: A4 size and 8mm margin
 *     - .nd-tabbar has display: none !important
 *     - dialog.nd-modal and [data-modal] have display: none !important
 *     - .skip-link has display: none !important
 *     - .nd-modal__close has display: none !important
 *     - All 4 panels (#panel-projects, #panel-skills, #panel-education, #panel-language)
 *       and .nd-db__panel / .nd-db__panel[hidden] have display: block !important
 *     - .nd-card has box-shadow: none !important and break-inside: avoid
 *     - .nd-entry has break-inside: avoid
 *     - Body styles: font-size: 14px, line-height: 20px, background: none !important
 *  2. Live PDF Generation & Page Count Verification (Chromium / Playwright):
 *     - Renders out/index.html in print media
 *     - Emulates print media
 *     - Generates A4 PDF
 *     - Counts total PDF pages via /Type /Page
 *     - Asserts total pages <= 3 (NFR-09, AC-010.1, D-015)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright-core";

const ROOT = path.resolve(__dirname, "..");
const GLOBALS_PATH = path.join(ROOT, "src", "app", "globals.css");
const OUT_DIR = path.join(ROOT, "out");
const OUT_INDEX = path.join(OUT_DIR, "index.html");

const css = fs.readFileSync(GLOBALS_PATH, "utf8");

// ============================================================================
// PART 1: CSS Rules Verification (TECH-SPEC §7.7, TASK-213)
// ============================================================================

test("print CSS: @page declares A4 size and 8mm margin", () => {
  assert.match(
    css,
    /@page\s*\{[^}]*size:\s*A4\s+portrait;[^}]*margin:\s*8mm;/,
    "@page must declare size: A4 portrait and margin: 8mm",
  );
});

test("print CSS: body declares font-size 14px, line-height 20px, and high-contrast background", () => {
  assert.match(
    css,
    /body\s*\{[^}]*font-size:\s*14px;[^}]*line-height:\s*20px;[^}]*background:\s*none\s*!important;/,
    "body in print must declare font-size: 14px, line-height: 20px, and background: none !important",
  );
});

test("print CSS: interactive controls are hidden (.skip-link, .nd-tabbar, .nd-modal__close, dialog.nd-modal)", () => {
  assert.match(
    css,
    /\.skip-link,\s*\n\s*\.nd-tabbar,\s*\n\s*\.nd-modal__close,\s*\n\s*dialog\.nd-modal,\s*\n\s*\[data-modal\]\s*\{[^}]*display:\s*none\s*!important;/,
    "non-printable and interactive controls must have display: none !important",
  );
});

test("print CSS: sequential display of all 4 database panels (#panel-projects, #panel-skills, #panel-education, #panel-language)", () => {
  assert.match(
    css,
    /#panel-projects,\s*\n\s*#panel-skills,\s*\n\s*#panel-education,\s*\n\s*#panel-language,\s*\n\s*\.nd-db__panel,\s*\n\s*\.nd-db__panel\[hidden\]\s*\{[^}]*display:\s*block\s*!important;/,
    "all 4 database panels must be displayed sequentially with display: block !important",
  );
});

test("print CSS: cards have no box-shadow in print and avoid break-inside", () => {
  assert.match(
    css,
    /\.nd-card\s*\{[^}]*box-shadow:\s*none\s*!important;[^}]*break-inside:\s*avoid;/,
    ".nd-card must have box-shadow: none !important and break-inside: avoid",
  );
});

test("print CSS: work experience entries avoid break-inside", () => {
  assert.match(
    css,
    /\.nd-entry\s*\{[^}]*break-inside:\s*avoid;/,
    ".nd-entry must have break-inside: avoid",
  );
});

test("print CSS: gallery grid uses 2-column repeat in print", () => {
  assert.match(
    css,
    /\.nd-grid\s*\{[^}]*display:\s*grid\s*!important;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important;/,
    ".nd-grid must be 2-column repeat in print",
  );
});

// ============================================================================
// PART 2: Live PDF Generation & Page Count Verification (NFR-09, D-015)
// ============================================================================

const outExists = fs.existsSync(OUT_INDEX);

test("live PDF: generated A4 print PDF has <= 3 pages (NFR-09, D-015, AC-010.1)", {
  skip: outExists ? false : "out/index.html not found — run npm run build first",
}, async () => {
  const MIME: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".png": "image/png",
    ".woff2": "font/woff2",
  };

  const server = http.createServer((req, res) => {
    let p = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(OUT_DIR, p);
    if ((!file.startsWith(OUT_DIR + path.sep) && file !== OUT_DIR) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end("Not Found");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;

  let browser;
  try {
    const executablePath =
      process.env.CHROME_PATH ||
      (fs.existsSync(chromium.executablePath()) ? chromium.executablePath() : undefined);
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });

    // Verify computed styles in print media
    const computed = await page.evaluate(() => {
      const panels = [
        "#panel-projects",
        "#panel-skills",
        "#panel-education",
        "#panel-language",
      ].map((id) => {
        const el = document.querySelector(id);
        return {
          id,
          display: el ? window.getComputedStyle(el).display : "missing",
        };
      });

      const tabbar = document.querySelector(".nd-tabbar");
      const skipLink = document.querySelector(".skip-link");
      const modalClose = document.querySelector(".nd-modal__close");
      const dialogModal = document.querySelector("dialog.nd-modal");
      const cards = Array.from(document.querySelectorAll(".nd-card")).map(
        (c) => window.getComputedStyle(c).boxShadow,
      );
      const body = window.getComputedStyle(document.body);

      return {
        panels,
        tabbarDisplay: tabbar ? window.getComputedStyle(tabbar).display : "missing",
        skipLinkDisplay: skipLink ? window.getComputedStyle(skipLink).display : "missing",
        modalCloseDisplay: modalClose ? window.getComputedStyle(modalClose).display : "missing",
        dialogModalDisplay: dialogModal ? window.getComputedStyle(dialogModal).display : "missing",
        uniqueCardBoxShadows: Array.from(new Set(cards)),
        bodyFontSize: body.fontSize,
        bodyLineHeight: body.lineHeight,
      };
    });

    // Computed style assertions in real browser
    for (const panel of computed.panels) {
      assert.equal(
        panel.display,
        "block",
        `Panel ${panel.id} must have display: block in print`,
      );
    }
    assert.equal(computed.tabbarDisplay, "none", "tabbar must be hidden in print");
    assert.equal(computed.skipLinkDisplay, "none", "skip-link must be hidden in print");
    assert.equal(computed.modalCloseDisplay, "none", "modal close must be hidden in print");
    assert.equal(computed.dialogModalDisplay, "none", "modal dialog must be hidden in print");
    assert.deepEqual(
      computed.uniqueCardBoxShadows,
      ["none"],
      "cards must have box-shadow: none in print",
    );
    assert.equal(computed.bodyFontSize, "14px", "body font size must be 14px in print");
    assert.equal(computed.bodyLineHeight, "20px", "body line height must be 20px in print");

    // Print to PDF and verify page count
    const pdfBuffer = await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
    });

    const pdfString = pdfBuffer.toString("latin1");
    const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
    const totalPages = pageMatches ? pageMatches.length : 0;

    assert.ok(
      totalPages >= 1 && totalPages <= 3,
      `Print PDF page count must be <= 3 pages (NFR-09, D-015); got ${totalPages}`,
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
