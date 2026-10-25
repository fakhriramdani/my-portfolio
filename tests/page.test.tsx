/**
 * tests/page.test.tsx — halaman `/` v2: kerangka dokumen + header personal.
 *
 * Cakupan (TASK-202, TECH-SPEC v2.0 §3.1/§3.2, §6.1):
 *  · AC-D01.1 — tepat 1 `<h1>` berisi `Fakhri Ramdani`, 0 badge status,
 *    0 ikon/emoji, 0 CTA, 0 tautan `tel:` (D-028.1–.3, D-034).
 *  · AC-D02.2 — setiap gaya teks header/callout memakai token (`var(--…)`),
 *    bukan nilai hardcoded; kontainer dokumen 358 px → 880 px (§3.1).
 *  · AC-009.4 (warisan) — skip-link adalah elemen fokusabel pertama dan
 *    menunjuk `#main` yang fokusabel.
 *  · BR-005/BR-006 (warisan) — urutan seksi & tidak ada tanggal numerik bocor.
 *
 * Uji kontak (email/LinkedIn) pindah ke `AboutTwoColumn` pada TASK-203; uji
 * unduh CV dihapus karena D-028.3 mencabut affordance itu dari seluruh layar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../src/app/page";
import { cvData } from "../src/content/cv.data";
import { uiLabels } from "../src/content/ui.labels";

const nodeRequire = createRequire(import.meta.url);
const guard = nodeRequire("../scripts/check-tokens.js");
const ROOT = path.resolve(
  path.dirname(nodeRequire.resolve("../scripts/check-tokens.js")),
  "..",
);

const html = renderToStaticMarkup(<Home />);
/** Sub-markup header — dipakai untuk membatasi larangan D-028/D-034. */
const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";

/** Emoji/pictograph: rentang emoji utama + variation selector. */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

test("renders exactly one h1 with the name (AC-001.1, AC-D01.1)", () => {
  const h1 = html.match(/<h1[^>]*>/g);
  assert.equal(h1?.length, 1);
  assert.match(html, /<h1[^>]*>Fakhri Ramdani<\/h1>/);
});

test("no status badge in the header (AC-D01.1 versi D-028.1)", () => {
  assert.ok(header.length > 0, "header block must be rendered");
  assert.ok(!html.includes("Terbuka untuk peluang baru"));
  assert.ok(!header.includes("Terbuka untuk peluang baru"));
});

test("no icon, image or emoji in the header (D-028.1, D-034)", () => {
  assert.doesNotMatch(header, /<img|<svg|<use\b/);
  assert.doesNotMatch(header, EMOJI);
});

test("no CTA, no link and no CV download in the header (D-028.3)", () => {
  assert.doesNotMatch(header, /<a\b/);
  assert.doesNotMatch(html, /<a[^>]*\sdownload\b/);
  assert.doesNotMatch(html, /Download CV|Unduh CV/);
});

test("no tel: link and no phone number anywhere on the page (D-028.2, CR-2, D-067)", () => {
  assert.doesNotMatch(html, /href="tel:/);
  const phone = (cvData.contacts as Array<{ kind: string }>).find((c) => c.kind === "phone");
  assert.equal(phone, undefined, "phone contact must be completely absent from cvData.contacts");
  assert.doesNotMatch(html, /tel:\+/);
});

test("header subtitle is the pinned D-034 string (design-spec v10 §1.2)", () => {
  const expected =
    "Software Engineer · Backend Developer · West Jakarta, Indonesia";
  assert.equal(
    `${cvData.profile.headline} · ${uiLabels.header.backendRole} · ${uiLabels.header.location}`,
    expected,
  );
  assert.match(
    html,
    /<p class="nd-header__meta" data-subtitle="">Software Engineer · Backend Developer · West Jakarta, Indonesia<\/p>/,
  );
});

test("callout quote block renders with its accessible name (§3.2)", () => {
  assert.match(
    html,
    /<aside class="nd-callout" data-callout="" aria-label="Quote">/,
  );
  assert.equal(uiLabels.header.calloutLabel, "Quote");
  assert.ok(
    html.includes(uiLabels.header.callout),
    "callout copy must come from ui.labels.ts verbatim",
  );
});

test("skip-link is first and targets the focusable main landmark (AC-009.4)", () => {
  const skipAt = html.indexOf('class="skip-link"');
  const headerAt = html.indexOf("<header");
  assert.ok(skipAt > -1, "skip-link missing");
  assert.ok(skipAt < headerAt, "skip-link must precede the header");
  assert.match(html, /<a class="skip-link" href="#main">Skip to content<\/a>/);
  assert.match(html, /<main id="main" tabindex="-1">/);
});

test("renders 3 h2 section headings in fixed order (AC-001.1, BR-006)", () => {
  const h2 = html.match(/<h2[^>]*>[^<]*<\/h2>/g) ?? [];
  const labels = h2.map((s) => s.replace(/<[^>]+>/g, ""));
  assert.deepEqual(labels, [
    "About Me",
    "Work Experience",
    "Projects, Skills, Education and Language",
  ]);
});

test("renders section anchors in order (BR-006)", () => {
  const ids = ["about", "experience", "database"];
  let prev = -1;
  for (const id of ids) {
    const idx = html.indexOf(`id="${id}"`);
    assert.ok(idx > prev, `section #${id} missing or out of order`);
    prev = idx;
  }
});

test("obsolete sticky section nav is gone (D-031, TASK-202)", () => {
  assert.ok(
    !fs.existsSync(path.join(ROOT, "src", "app", "site-nav.tsx")),
    "src/app/site-nav.tsx must be removed",
  );
  assert.doesNotMatch(html, /class="site-nav"/);
});

test("no numeric dates leak into visible copy (BR-005)", () => {
  assert.doesNotMatch(html, /2021-09|2019-10|2015-09/);
});

test("no progress bars / percentage / star rating (AC-006.3)", () => {
  assert.doesNotMatch(html, /progress|role="progressbar"|%/);
});

/* ------------------------------------------------------- CSS kontainer/token */

const css = guard.stripComments(fs.readFileSync(guard.GLOBALS, "utf8"));
const DESKTOP = "@media (min-width: 1024px)";

interface CssBlock {
  chain: string[];
  body: string;
}

/** Rantai prelude (`@media …` > selector) → body, dari CSS tanpa komentar. */
function cssBlocks(source: string): CssBlock[] {
  const out: CssBlock[] = [];
  const stack: string[] = [];
  let buffer = "";
  for (const ch of source) {
    if (ch === "{") {
      stack.push(buffer.trim());
      buffer = "";
    } else if (ch === "}") {
      const prelude = stack.pop();
      if (prelude !== undefined && buffer.trim() !== "") {
        out.push({ chain: [...stack, prelude], body: buffer });
      }
      buffer = "";
    } else {
      buffer += ch;
    }
  }
  return out;
}

const blocks = cssBlocks(css);

/** Body aturan untuk selector, opsional dibatasi ke satu media query. */
function block(selector: string, media?: string): string {
  const found = blocks.find(
    (entry) =>
      entry.chain.at(-1) === selector &&
      (media === undefined ? entry.chain.length === 1 : entry.chain[0] === media),
  );
  assert.ok(found, `missing CSS block "${selector}"${media ? ` in ${media}` : ""}`);
  return found.body;
}

const declarations = (body: string): [string, string][] =>
  body
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const at = entry.indexOf(":");
      return [entry.slice(0, at).trim(), entry.slice(at + 1).trim()] as [
        string,
        string,
      ];
    });

function value(body: string, property: string): string {
  const found = declarations(body).find(([prop]) => prop === property);
  assert.ok(found, `missing "${property}" in CSS block`);
  return found[1];
}

/** Selesaikan rantai alias `var(--…)` pada mode terang sampai nilai literal. */
function tokenValue(name: string): string {
  const { light } = guard.loadTokenModes();
  let current = name;
  for (let hop = 0; hop < 5; hop += 1) {
    const decl = light.get(current);
    assert.ok(decl, `--${current} missing in light :root`);
    const alias = /^var\(--([a-z0-9-]+)\)$/.exec(decl.value);
    if (!alias) return decl.value;
    current = alias[1]!;
  }
  throw new Error(`var() alias chain too deep at --${name}`);
}

test("document container is 358 px mobile / 880 px desktop (§3.1, FR-D10)", () => {
  assert.equal(tokenValue("container-doc-mobile"), "358px");
  assert.equal(tokenValue("container-doc"), "880px");

  const mobile = block(".nd-page");
  assert.equal(value(mobile, "max-width"), "var(--container-doc-mobile)");
  assert.equal(value(mobile, "margin-inline"), "auto");
  assert.equal(value(mobile, "padding-inline"), "var(--space-24)");

  const desktop = block(".nd-page", DESKTOP);
  assert.equal(value(desktop, "max-width"), "var(--container-doc)");
});

test("header & callout type resolve to tokens, never literals (AC-D02.2)", () => {
  const selectors = [".nd-header__title", ".nd-header__meta", ".nd-callout"];
  const bodies: string[] = [];
  for (const selector of selectors) {
    bodies.push(block(selector));
    const desktop = blocks.find(
      (entry) => entry.chain.at(-1) === selector && entry.chain[0] === DESKTOP,
    );
    if (desktop) bodies.push(desktop.body);
  }

  const typeProps =
    /^(font-size|line-height|font-weight|letter-spacing|color|background)$/;
  let checked = 0;
  for (const body of bodies) {
    for (const [property, raw] of declarations(body)) {
      if (!typeProps.test(property)) continue;
      assert.match(
        raw,
        /^var\(--[a-z0-9-]+\)$/,
        `${property}: ${raw} must be a design token`,
      );
      checked += 1;
    }
  }
  assert.ok(checked >= 10, `expected token-backed type declarations, got ${checked}`);

  assert.equal(tokenValue("font-size-h1"), "44px");
  assert.equal(tokenValue("font-size-h1-mobile"), "32px");
  assert.equal(tokenValue("line-height-h1"), "52px");
  assert.equal(tokenValue("font-size-subtitle"), "16px");
  assert.equal(tokenValue("font-size-subtitle-mobile"), "14px");
  assert.equal(tokenValue("font-size-quote"), "15px");
  assert.equal(tokenValue("line-height-quote"), "22px");

  const title = block(".nd-header__title");
  assert.equal(value(title, "font-size"), "var(--font-size-h1-mobile)");
  assert.equal(value(title, "line-height"), "var(--line-height-h1-mobile)");
  assert.equal(value(title, "font-weight"), "var(--font-weight-bold)");
  assert.equal(value(title, "letter-spacing"), "var(--tracking-h1)");
  assert.equal(
    value(block(".nd-header__title", DESKTOP), "font-size"),
    "var(--font-size-h1)",
  );
  assert.equal(
    value(block(".nd-header__title", DESKTOP), "line-height"),
    "var(--line-height-h1)",
  );
  assert.equal(
    value(block(".nd-header__meta", DESKTOP), "font-size"),
    "var(--font-size-subtitle)",
  );
});

test("callout is a 4 px accent quote block on the callout surface (§3.2)", () => {
  const callout = block(".nd-callout");
  assert.equal(value(callout, "background"), "var(--color-callout-bg)");
  assert.equal(
    value(callout, "border-left"),
    "var(--space-4) solid var(--color-quote-border)",
  );
  assert.equal(value(callout, "border-radius"), "var(--radius-callout)");
  assert.equal(value(callout, "color"), "var(--color-text-primary)");

  assert.equal(tokenValue("space-4"), "4px");
  assert.equal(tokenValue("radius-callout"), "6px");

  // Padding 18 px × 20 px hanya di desktop; mobile 16 px (design-spec §1.4).
  assert.equal(
    value(block(".nd-callout", DESKTOP), "padding"),
    "18px var(--space-20)",
  );
  assert.equal(value(callout, "padding"), "var(--space-16)");
});
