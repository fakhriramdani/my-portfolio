#!/usr/bin/env node
/**
 * scripts/check-tokens.js — guard fondasi token, tema & font.
 * (TECH-SPEC v2.0 §5, §6.2 `E_TOKEN`/`E_CONTRAST`, §7.4 gate 4)
 *
 * Yang diverifikasi:
 *  1. Deklarasi token §5.2–§5.4 lengkap di mode terang dan gelap, dan ketiga
 *     blok tema (media query, `[data-theme="dark"]`, `[data-theme="light"]`)
 *     saling konsisten nilainya.
 *  2. Tidak ada literal warna di `src/**` di luar deklarasi `--color-*`.
 *  3. Tidak ada nilai px yang menduplikasi token (property-aware). Gaya
 *     komponen rilis 1.x yang belum dimigrasi dibekukan di region
 *     `token-guard:legacy-begin`/`-end` pada `globals.css` dengan anggaran
 *     LEGACY_PX_DEBT; anggaran hanya boleh turun.
 *  4. 12 pasangan kontras §5.5 (WCAG 2.x) tetap pada verdictnya.
 *  5. Berkas font 400/500/600/700 benar-benar Inter dengan bobot & cakupan
 *     codepoint yang sama, dan totalnya di bawah anggaran.
 *
 * Jalankan: node scripts/check-tokens.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { readFontMeta } = require("./lib/woff2.js");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const GLOBALS = path.join(SRC, "app", "globals.css");
const LEGACY_MARKER_BEGIN = "token-guard:legacy-begin";
const LEGACY_MARKER_END = "token-guard:legacy-end";

/**
 * Anggaran utang px pada region LEGACY V1 (gaya komponen rilis 1.x yang
 * diganti pada TASK-202…TASK-210). Angka ini hanya boleh TURUN; setiap
 * penambahan baru gagal `E_TOKEN`. Target akhir epic: 0.
 *
 * Riwayat: 35 → 20 pada TASK-202 (header v1, tombol unduh CV, dan nav sticky
 * dihapus sehingga gaya warisannya ikut hilang).
 */
const LEGACY_PX_DEBT = 20;

/** Token warna yang wajib ada di kedua mode (§5.2) — nama properti penuh. */
const COLOR_TOKENS = [
  "color-background",
  "color-surface",
  "color-surface-subtle",
  "color-border",
  "color-text-primary",
  "color-text-secondary",
  "color-text-tertiary",
  "color-accent",
  "color-quote-border",
  "color-link",
  "color-callout-bg",
  "color-scrim",
  "color-focus-ring",
  "color-focus-ring-offset",
];

/** Token non-warna (§5.3–§5.4) — sama di kedua mode, cukup ada di `:root`. */
const STATIC_TOKENS = [
  "font-sans",
  "font-weight-regular",
  "font-weight-medium",
  "font-weight-semibold",
  "font-weight-bold",
  "font-size-12",
  "font-size-13",
  "font-size-14",
  "font-size-15",
  "font-size-16",
  "font-size-18",
  "font-size-22",
  "font-size-32",
  "font-size-44",
  "font-size-h1",
  "font-size-h1-mobile",
  "font-size-h2",
  "font-size-h3",
  "font-size-h4",
  "font-size-subtitle",
  "font-size-subtitle-mobile",
  "font-size-body",
  "font-size-body-sm",
  "font-size-label",
  "font-size-caption",
  "font-size-quote",
  "line-height-h1",
  "line-height-h1-mobile",
  "line-height-subtitle",
  "line-height-body",
  "line-height-body-sm",
  "line-height-quote",
  "line-height-label",
  "line-height-caption",
  "tracking-h1",
  "space-2",
  "space-4",
  "space-8",
  "space-12",
  "space-16",
  "space-20",
  "space-24",
  "space-32",
  "space-40",
  "space-48",
  "space-64",
  "space-80",
  "space-96",
  "container-doc",
  "container-doc-mobile",
  "border-hairline",
  "border-emphasis",
  "radius-sm",
  "radius-md",
  "radius-lg",
  "radius-xl",
  "radius-full",
  "radius-chip",
  "radius-callout",
  "radius-card",
  "radius-pill",
  "motion-fast",
];

/** Nilai desain yang ditolak karena gagal ambang AA (temuan F1 G2). */
const REJECTED_DESIGN_VALUES = [
  { token: "color-text-secondary", value: "#787774", measured: "4.48:1" },
];

/**
 * 12 pasangan kontras §5.5. `fg`/`bg` = nama token (tanpa `--`) atau literal.
 * `verdict`:
 *  - "pass"       → rasio wajib ≥ threshold;
 *  - "superseded" → nilai desain yang ditolak: rasio wajib < threshold;
 *  - "decorative" → token dekoratif: rasio wajib < threshold.
 */
const CONTRAST_PAIRS = [
  {
    id: "text-primary/background",
    threshold: 4.5,
    verdict: "pass",
    light: { fg: "color-text-primary", bg: "color-background" },
    dark: { fg: "color-text-primary", bg: "color-background" },
  },
  {
    id: "text-secondary/surface",
    threshold: 4.5,
    verdict: "pass",
    light: { fg: "color-text-secondary", bg: "color-surface" },
    dark: { fg: "color-text-secondary", bg: "color-surface" },
  },
  {
    id: "design-secondary(#787774)/surface",
    threshold: 4.5,
    verdict: "superseded",
    light: { fg: "#787774", bg: "color-surface", verdict: "superseded" },
    dark: { fg: "#9b9a97", bg: "color-surface", verdict: "pass" },
  },
  {
    id: "text-tertiary/surface",
    threshold: 4.5,
    verdict: "decorative",
    light: { fg: "color-text-tertiary", bg: "color-surface" },
    dark: { fg: "color-text-tertiary", bg: "color-surface" },
  },
  {
    id: "link/surface",
    threshold: 4.5,
    verdict: "pass",
    light: { fg: "color-link", bg: "color-surface" },
    dark: { fg: "color-link", bg: "color-surface" },
  },
  {
    id: "accent/surface",
    threshold: 3,
    verdict: "pass",
    light: { fg: "color-accent", bg: "color-surface" },
    dark: { fg: "color-accent", bg: "color-surface" },
  },
  {
    id: "accent/surface-subtle",
    threshold: 3,
    verdict: "pass",
    light: { fg: "color-accent", bg: "color-surface-subtle" },
    dark: { fg: "color-accent", bg: "color-surface-subtle" },
  },
  {
    id: "quote-border/background",
    threshold: 3,
    verdict: "pass",
    light: { fg: "color-quote-border", bg: "color-background" },
    dark: { fg: "color-quote-border", bg: "color-background" },
  },
  {
    id: "callout-text-primary/callout-bg",
    threshold: 4.5,
    verdict: "pass",
    light: { fg: "color-text-primary", bg: "color-callout-bg" },
    dark: { fg: "color-text-primary", bg: "color-callout-bg" },
  },
  {
    id: "design-secondary(#787774)/callout-bg",
    threshold: 4.5,
    verdict: "superseded",
    light: { fg: "#787774", bg: "color-callout-bg", verdict: "superseded" },
    dark: { fg: "#9b9a97", bg: "color-callout-bg", verdict: "pass" },
  },
  {
    id: "border/surface",
    threshold: 3,
    verdict: "decorative",
    light: { fg: "color-border", bg: "color-surface" },
    dark: { fg: "color-border", bg: "color-surface" },
  },
  {
    id: "avatar-ink/canvas",
    threshold: 3,
    verdict: "pass",
    light: { fg: "#000000", bg: "color-background" },
    dark: { fg: "#ffffff", bg: "color-background" },
  },
];

/** Berkas font & anggaran payload (NFR-03/C-D02; §5.3 ≈ 88 KB). */
const FONT_FILES = [
  { weight: 400, file: "public/fonts/inter-400.woff2" },
  { weight: 500, file: "public/fonts/inter-500.woff2" },
  { weight: 600, file: "public/fonts/inter-600.woff2" },
  { weight: 700, file: "public/fonts/inter-700.woff2" },
];
const FONT_PAYLOAD_BUDGET = 96 * 1024;

/* ------------------------------------------------------------------ parsing */

function stripComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else {
      out += text[i];
      i += 1;
    }
  }
  return out;
}

/** Semua blok CSS beserta rantai prelude-nya (`@media …` > selector). */
function parseBlocks(css) {
  const blocks = [];
  const stack = [];
  let buffer = "";
  let bodyStart = 0;
  let line = 1;
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === "\n") line += 1;
    if (ch === "{") {
      const prelude = buffer.trim();
      const chain = stack.map((entry) => entry.prelude).concat(prelude);
      stack.push({ prelude, chain });
      buffer = "";
      bodyStart = i + 1;
    } else if (ch === "}") {
      const entry = stack.pop();
      if (entry && buffer.trim() !== "") {
        blocks.push({
          chain: entry.chain,
          body: buffer,
          bodyStart,
          bodyEnd: i,
        });
      }
      buffer = "";
    } else {
      buffer += ch;
    }
  }
  return blocks;
}

function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function lineAt(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

function declarations(text, block, starts) {
  const slice = text.slice(block.bodyStart, block.bodyEnd);
  const re = /(--[A-Za-z0-9-]+)\s*:\s*([^;{}]+)/g;
  const out = [];
  let match = re.exec(slice);
  while (match) {
    out.push({
      name: match[1].slice(2),
      value: match[2].trim().replace(/\s+/g, " "),
      line: lineAt(starts, block.bodyStart + match.index),
    });
    match = re.exec(slice);
  }
  return out;
}

function toMap(list) {
  const map = new Map();
  for (const item of list) if (!map.has(item.name)) map.set(item.name, item);
  return map;
}

/** Token mode terang & gelap dari `globals.css`. */
function loadTokenModes() {
  const source = fs.readFileSync(GLOBALS, "utf8");
  const raw = fs.readFileSync(GLOBALS, "utf8");
  const text = stripComments(source);
  const starts = lineStarts(text);
  const blocks = parseBlocks(text);

  const isDarkMedia = (chain) =>
    chain.length === 2 &&
    /^@media\s+\(prefers-color-scheme:\s*dark\)/.test(chain[0]);
  const isDarkHook = (chain) =>
    chain.length === 1 && /^:root\[data-theme="dark"\]$/.test(chain[0]);
  const isLightHook = (chain) =>
    chain.length === 1 && /^:root\[data-theme="light"\]$/.test(chain[0]);
  const isLightRoot = (chain) => chain.length === 1 && chain[0] === ":root";

  const of = (predicate) =>
    toMap(
      blocks
        .filter((block) => predicate(block.chain))
        .flatMap((block) => declarations(text, block, starts)),
    );

  const light = of(isLightRoot);
  const darkMedia = of(isDarkMedia);
  const darkHook = of(isDarkHook);
  const lightHook = of(isLightHook);
  const dark = new Map(light);
  for (const [name, decl] of darkMedia) dark.set(name, decl);

  return {
    source,
    raw,
    light,
    dark,
    darkMedia,
    darkHook,
    lightHook,
    text,
    starts,
  };
}

/** Semua berkas `src/**` yang boleh memuat deklarasi gaya. */
function srcFiles(dir = SRC, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) srcFiles(full, acc);
    else if (/\.(css|ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

/* ----------------------------------------------------------- rumus WCAG 2.x */

function luminance(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map(
    (i) => parseInt(value.slice(i, i + 2), 16) / 255,
  );
  const linear = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Selesaikan `var(--x)` bertingkat di dalam satu mode. */
function resolve(mode, name, seen = []) {
  if (!name.startsWith("color-")) {
    throw new Error(`unresolved literal "${name}"`);
  }
  if (seen.includes(name)) throw new Error(`var() cycle at --${name}`);
  const decl = mode.get(name);
  if (!decl) throw new Error(`E_TOKEN: --${name} missing`);
  const match = /^var\(\s*--([A-Za-z0-9-]+)\s*\)$/.exec(decl.value);
  return match ? resolve(mode, match[1], seen.concat(name)) : decl.value;
}

function colorValue(mode, ref) {
  return ref.startsWith("#") ? ref : resolve(mode, ref);
}

/* ------------------------------------------------------------------ checks */

function dimensionTokenValues(light) {
  const groups = {
    space: new Map(),
    radius: new Map(),
    border: new Map(),
    font: new Map(),
    lineHeight: new Map(),
    container: new Map(),
  };
  for (const [name, decl] of light) {
    const px = /^(\d+)px$/.exec(decl.value);
    if (!px) continue;
    const value = Number(px[1]);
    if (/^space-\d+$/.test(name)) groups.space.set(value, `--${name}`);
    else if (/^radius-(sm|md|lg|xl|full)$/.test(name))
      groups.radius.set(value, `--${name}`);
    else if (/^border-(hairline|emphasis)$/.test(name))
      groups.border.set(value, `--${name}`);
    else if (/^font-size-(\d+)$/.test(name))
      groups.font.set(value, `--${name}`);
    else if (/^line-height-/.test(name))
      groups.lineHeight.set(value, `--${name}`);
    else if (/^container-/.test(name)) groups.container.set(value, `--${name}`);
  }
  return groups;
}

function expectedTokenFor(property, value, groups) {
  const candidates = [];
  if (/^font(-size)?$/.test(property)) candidates.push(groups.font);
  else if (property === "line-height") candidates.push(groups.lineHeight);
  else if (/^border-radius/.test(property)) candidates.push(groups.radius);
  else if (/^border|^outline|^column-rule/.test(property))
    candidates.push(groups.border, groups.space);
  else candidates.push(groups.space, groups.container);
  for (const group of candidates) {
    if (group.has(value)) return group.get(value);
  }
  return null;
}

function checkRawLiterals(errors) {
  let colourViolations = 0;
  let legacyDebt = 0;
  const files = srcFiles();
  const globalsLines = fs.readFileSync(GLOBALS, "utf8").split("\n");
  const legacyBegin = globalsLines.findIndex((l) =>
    l.includes(LEGACY_MARKER_BEGIN),
  );
  const legacyEnd = globalsLines.findIndex((l) =>
    l.includes(LEGACY_MARKER_END),
  );
  if (legacyBegin === -1 || legacyEnd === -1 || legacyEnd < legacyBegin) {
    errors.push(
      `E_TOKEN: legacy region markers not found in src/app/globals.css (${LEGACY_MARKER_BEGIN}/${LEGACY_MARKER_END})`,
    );
  }
  const inLegacy = (file, line) =>
    path.resolve(file) === GLOBALS &&
    line > legacyBegin + 1 &&
    line < legacyEnd + 1;

  const modes = loadTokenModes();
  const groups = dimensionTokenValues(modes.light);
  const colourLiteral = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = stripComments(fs.readFileSync(file, "utf8")).split("\n");
    lines.forEach((text, index) => {
      const line = index + 1;
      const trimmed = text.trim();
      if (trimmed === "") return;

      const isTokenDecl = /^--[A-Za-z0-9-]+\s*:/.test(trimmed);
      if (colourLiteral.test(text)) {
        const isColourToken = /^--color-[A-Za-z0-9-]+\s*:/.test(trimmed);
        if (!isColourToken) {
          errors.push(`E_TOKEN: raw colour literal in ${rel}:${line}`);
          colourViolations += 1;
        }
      }

      if (isTokenDecl || trimmed.startsWith("@")) return;
      const declarationRe = /([A-Za-z-]+)\s*:\s*([^;{}]+)/g;
      let match = declarationRe.exec(text);
      while (match) {
        const property = match[1].toLowerCase();
        const value = match[2];
        const pxRe = /(\d+(?:\.\d+)?)px/g;
        let px = pxRe.exec(value);
        while (px) {
          const token = expectedTokenFor(property, Number(px[1]), groups);
          if (token) {
            if (inLegacy(file, line)) {
              legacyDebt += 1;
            } else {
              errors.push(
                `E_TOKEN: raw px literal in ${rel}:${line} duplicates var(${token})`,
              );
            }
          }
          px = pxRe.exec(value);
        }
        match = declarationRe.exec(text);
      }
    });
  }
  return { colourViolations, legacyDebt };
}

function checkTokens(errors, warnings) {
  const modes = loadTokenModes();
  const missingIn = (map, name, mode) => {
    if (!map.has(name)) {
      errors.push(`E_TOKEN: --${name} missing in ${mode} mode`);
      return true;
    }
    return false;
  };

  for (const name of COLOR_TOKENS) {
    missingIn(modes.light, name, "light");
    missingIn(modes.darkMedia, name, "dark");
    missingIn(modes.darkHook, name, "dark");
  }
  for (const name of STATIC_TOKENS) missingIn(modes.light, name, "light");

  for (const name of modes.darkMedia.keys()) {
    if (!modes.light.has(name)) {
      errors.push(`E_TOKEN: --${name} missing in light mode`);
    }
  }
  for (const name of modes.lightHook.keys()) {
    if (!modes.light.has(name))
      errors.push(`E_TOKEN: --${name} missing in light mode`);
  }

  for (const name of COLOR_TOKENS) {
    const media = modes.darkMedia.get(name);
    const hook = modes.darkHook.get(name);
    const lightHookValue = modes.lightHook.get(name);
    if (media && hook && media.value !== hook.value) {
      errors.push(
        `E_TOKEN: --${name} in [data-theme="dark"] differs from prefers-color-scheme dark ("${hook.value}" vs "${media.value}")`,
      );
    }
    if (
      media &&
      lightHookValue &&
      modes.light.get(name).value !== lightHookValue.value
    ) {
      errors.push(
        `E_TOKEN: --${name} in [data-theme="light"] differs from light :root ("${lightHookValue.value}" vs "${modes.light.get(name).value}")`,
      );
    }
  }

  for (const rejected of REJECTED_DESIGN_VALUES) {
    const decl = modes.light.get(rejected.token);
    if (
      (decl && decl.value.toLowerCase() === rejected.value) ||
      modes.dark.get(rejected.token)?.value.toLowerCase() === rejected.value
    ) {
      errors.push(
        `E_TOKEN: --${rejected.token} restored rejected design value ${rejected.value} (${rejected.measured}, gagal ambang AA)`,
      );
    }
  }

  const literals = checkRawLiterals(errors);
  if (literals.legacyDebt > LEGACY_PX_DEBT) {
    errors.push(
      `E_TOKEN: legacy v1 px debt ${literals.legacyDebt} > budget ${LEGACY_PX_DEBT} (nilai px mentah duplikat token; gunakan var())`,
    );
  } else if (literals.legacyDebt < LEGACY_PX_DEBT) {
    warnings.push(
      `info - legacy v1 px debt turun ke ${literals.legacyDebt}; turunkan LEGACY_PX_DEBT di scripts/check-tokens.js`,
    );
  }

  return { modes, ...literals };
}

function checkContrast(errors) {
  const { light, dark } = loadTokenModes();
  const measured = [];
  for (const pair of CONTRAST_PAIRS) {
    const rows = [];
    for (const [mode, map] of [
      ["light", light],
      ["dark", dark],
    ]) {
      const spec = pair[mode];
      const verdict = spec.verdict ?? pair.verdict;
      const fg = colorValue(map, spec.fg);
      const bg = colorValue(map, spec.bg);
      const ratio = contrastRatio(fg, bg);
      rows.push(Number(ratio.toFixed(2)));
      const failed =
        verdict === "pass" ? ratio < pair.threshold : ratio >= pair.threshold;
      if (failed) {
        errors.push(
          `E_CONTRAST: ${pair.id} (${mode}) ratio ${ratio.toFixed(2)}:1 below ${pair.threshold}:1` +
            (verdict === "pass"
              ? ""
              : ` [verdict ${verdict}: nilai ini wajib TETAP di bawah ambang]`),
        );
      }
    }
    measured.push({
      id: pair.id,
      threshold: pair.threshold,
      verdict: pair.verdict,
      light: rows[0],
      dark: rows[1],
    });
  }
  return measured;
}

function checkFonts(errors) {
  const meta = [];
  let total = 0;
  const coverage = new Map();
  for (const entry of FONT_FILES) {
    const file = path.join(ROOT, entry.file);
    if (!fs.existsSync(file)) {
      errors.push(`E_TOKEN: missing font file ${entry.file}`);
      continue;
    }
    let info;
    try {
      info = readFontMeta(file);
    } catch (error) {
      errors.push(
        `E_TOKEN: ${entry.file} is not a valid woff2 (${error.message})`,
      );
      continue;
    }
    total += info.size;
    if (!/^Inter\b/.test(info.family ?? "") || info.weight !== entry.weight) {
      errors.push(
        `E_TOKEN: ${entry.file} is "${info.family} ${info.subfamily}" (weight ${info.weight}), expected Inter weight ${entry.weight}`,
      );
    }
    coverage.set(entry.weight, info.codepoints);
    meta.push({
      weight: entry.weight,
      file: entry.file,
      size: info.size,
      codepoints: info.codepoints.size,
      version: info.version,
    });
  }
  if (coverage.size === FONT_FILES.length) {
    const [referenceWeight, reference] = [...coverage.entries()][0];
    for (const [weight, codepoints] of coverage) {
      const identical =
        codepoints.size === reference.size &&
        [...reference].every((cp) => codepoints.has(cp));
      if (!identical) {
        errors.push(
          `E_TOKEN: font weight ${weight} covers ${codepoints.size} codepoints, weight ${referenceWeight} covers ${reference.size} — subset tidak konsisten`,
        );
      }
    }
  }
  if (total > FONT_PAYLOAD_BUDGET) {
    errors.push(
      `E_TOKEN: font payload ${(total / 1024).toFixed(1)} KB > ${(FONT_PAYLOAD_BUDGET / 1024).toFixed(0)} KB budget`,
    );
  }
  return { meta, total };
}

function check() {
  const errors = [];
  const warnings = [];
  const tokens = checkTokens(errors, warnings);
  const contrast = checkContrast(errors);
  const fonts = checkFonts(errors);

  if (errors.length > 0) {
    console.error("Token check failed:");
    for (const error of errors) console.error(` - ${error}`);
    for (const warning of warnings) console.error(` - ${warning}`);
    process.exit(1);
  }

  const stat = fs.statSync(GLOBALS);
  console.log(
    [
      `OK: token ${COLOR_TOKENS.length} warna × light/dark + ${STATIC_TOKENS.length} token statis`,
      `${contrast.length} pasangan kontras §5.5`,
      `0 literal warna di src/**`,
      `px legacy ${tokens.legacyDebt}/${LEGACY_PX_DEBT}`,
      `font ${fonts.meta.length}/${FONT_FILES.length} (${(fonts.total / 1024).toFixed(1)} KB)`,
      `globals.css ${(stat.size / 1024).toFixed(1)} KB`,
    ].join(" · "),
  );
  for (const warning of warnings) console.log(` ${warning}`);
  return { tokens, contrast, fonts };
}

module.exports = {
  ROOT,
  GLOBALS,
  LEGACY_PX_DEBT,
  COLOR_TOKENS,
  STATIC_TOKENS,
  REJECTED_DESIGN_VALUES,
  CONTRAST_PAIRS,
  FONT_FILES,
  FONT_PAYLOAD_BUDGET,
  loadTokenModes,
  stripComments,
  contrastRatio,
  luminance,
  colorValue,
  srcFiles,
  checkRawLiterals,
  checkFonts,
  check,
};

if (require.main === module) check();
