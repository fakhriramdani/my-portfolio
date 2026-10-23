/**
 * tests/token-contrast.test.ts — fondasi token, tema & font (TASK-201).
 *
 * Cakupan (TECH-SPEC v2.0 §5, §6.3):
 *  · AC-D10.1/.2 — token §5.2–§5.4 lengkap di kedua mode, 12 pasangan kontras.
 *  · AC-D10.4    — tidak ada literal warna di src/** di luar `--color-*`.
 *  · AC-D11.1/.2 — tiga blok tema konsisten + `meta color-scheme`.
 *  · NFR-03/C-D02 — Inter 400/500/600/700, subset identik, di bawah anggaran.
 *
 * Sumber kebenaran ekspektasi: `scripts/check-tokens.js` (kontrak `E_TOKEN` /
 * `E_CONTRAST`). Berkas ini memakai fungsi guard yang sama supaya aturan dan
 * pembuktiannya tidak bisa bercabang, lalu menambahkan uji negatif yang
 * membuktikan guard benar-benar gagal saat token dirusak.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);
const guard = nodeRequire("../scripts/check-tokens.js");
const ROOT = path.resolve(
  path.dirname(nodeRequire.resolve("../scripts/check-tokens.js")),
  "..",
);

/** Rasio terukur §5.5 (dibulatkan 2 desimal) — dipin agar regresi terdeteksi. */
const EXPECTED_RATIO: Record<string, { light: number; dark: number }> = {
  "text-primary/background": { light: 12.26, dark: 13.58 },
  "text-secondary/surface": { light: 5.42, dark: 5.29 },
  "design-secondary(#787774)/surface": { light: 4.48, dark: 5.79 },
  "text-tertiary/surface": { light: 2.81, dark: 2.55 },
  "link/surface": { light: 5.19, dark: 5.41 },
  "accent/surface": { light: 3.88, dark: 5.41 },
  "accent/surface-subtle": { light: 3.43, dark: 5.02 },
  "quote-border/background": { light: 3.88, dark: 5.83 },
  "callout-text-primary/callout-bg": { light: 11.64, dark: 12.56 },
  "design-secondary(#787774)/callout-bg": { light: 4.25, dark: 5.78 },
  "border/surface": { light: 1.26, dark: 1.2 },
  "avatar-ink/canvas": { light: 21, dark: 17.58 },
};

test("§5.2–§5.4 tokens exist in both themes (AC-D10.1, AC-D10.2)", () => {
  const { light, dark, darkMedia, darkHook, lightHook } =
    guard.loadTokenModes();

  for (const name of guard.COLOR_TOKENS) {
    assert.ok(light.has(name), `--${name} missing in light :root`);
    assert.ok(darkMedia.has(name), `--${name} missing in @media dark`);
    assert.ok(darkHook.has(name), `--${name} missing in [data-theme="dark"]`);
    assert.ok(lightHook.has(name), `--${name} missing in [data-theme="light"]`);
  }
  for (const name of guard.STATIC_TOKENS) {
    assert.ok(light.has(name), `--${name} missing in light :root`);
  }
  // Dark mode hanya menimpa; tidak boleh punya token yang tidak ada di light.
  assert.equal(
    dark.size,
    light.size,
    "dark theme token set differs from light",
  );
});

test("the three theme blocks agree value for value (AC-D11.1)", () => {
  const { light, darkMedia, darkHook, lightHook } = guard.loadTokenModes();
  for (const name of guard.COLOR_TOKENS) {
    assert.equal(
      darkHook.get(name).value,
      darkMedia.get(name).value,
      `--${name} differs between [data-theme="dark"] and prefers-color-scheme`,
    );
    assert.equal(
      lightHook.get(name).value,
      light.get(name).value,
      `--${name} differs between [data-theme="light"] and light :root`,
    );
  }
});

test("the 12 contrast pairs of §5.5 hold their verdict (AC-D10.2, AC-D11.2)", () => {
  const { light, dark } = guard.loadTokenModes();
  assert.equal(
    guard.CONTRAST_PAIRS.length,
    12,
    "§5.5 defines 12 contrast pairs",
  );

  for (const pair of guard.CONTRAST_PAIRS) {
    const expected = EXPECTED_RATIO[pair.id];
    assert.ok(expected, `no pinned ratio for pair ${pair.id}`);

    for (const modeName of ["light", "dark"] as const) {
      const modeMap = modeName === "light" ? light : dark;
      const spec = pair[modeName];
      const ratio = guard.contrastRatio(
        guard.colorValue(modeMap, spec.fg),
        guard.colorValue(modeMap, spec.bg),
      );
      const verdict = spec.verdict ?? pair.verdict;

      assert.ok(
        Math.abs(ratio - expected[modeName]) <= 0.01,
        `${pair.id} (${modeName}) measured ${ratio.toFixed(2)}, expected ${expected[modeName]}`,
      );
      if (verdict === "pass") {
        assert.ok(
          ratio >= pair.threshold,
          `${pair.id} (${modeName}) ${ratio.toFixed(2)}:1 below ${pair.threshold}:1`,
        );
      } else {
        assert.ok(
          ratio < pair.threshold,
          `${pair.id} (${modeName}) ${ratio.toFixed(2)}:1 must stay below ${pair.threshold}:1 (${verdict})`,
        );
      }
    }
  }
});

test("rejected design secondary is not reused and is no longer needed (F1 G2)", () => {
  const { light, dark } = guard.loadTokenModes();

  assert.notEqual(
    guard.colorValue(light, "color-text-secondary").toLowerCase(),
    "#787774",
  );
  assert.notEqual(
    guard.colorValue(dark, "color-text-secondary").toLowerCase(),
    "#787774",
  );
  // Nilai desain wajib tetap di bawah ambang — bukti koreksi §5.2 memang perlu.
  assert.ok(guard.contrastRatio("#787774", "#ffffff") < 4.5);

  // Nilai terkoreksi juga lulus di permukaan callout pada kedua mode, sehingga
  // isi callout tidak lagi bergantung pada aturan "wajib text-primary" saja.
  for (const modeMap of [light, dark]) {
    const ratio = guard.contrastRatio(
      guard.colorValue(modeMap, "color-text-secondary"),
      guard.colorValue(modeMap, "color-callout-bg"),
    );
    assert.ok(
      ratio >= 4.5,
      `corrected secondary on callout-bg is only ${ratio.toFixed(2)}:1`,
    );
  }
});

test("no raw colour literal outside --color-* declarations in src/** (AC-D10.4)", () => {
  const errors: string[] = [];
  const result = guard.checkRawLiterals(errors);
  assert.deepEqual(
    errors,
    [],
    `raw literal guard reported:\n${errors.join("\n")}`,
  );
  assert.equal(result.colourViolations, 0);
  assert.ok(
    result.legacyDebt <= guard.LEGACY_PX_DEBT,
    `legacy px debt ${result.legacyDebt} exceeds budget ${guard.LEGACY_PX_DEBT}`,
  );
  assert.ok(
    [...guard.srcFiles()].some((file: string) => file.endsWith("globals.css")),
    "guard must scan src/** including globals.css",
  );
});

test("font payload: four Inter weights, identical subsets, under budget (NFR-03)", () => {
  const errors: string[] = [];
  const { meta, total } = guard.checkFonts(errors);
  assert.deepEqual(errors, [], `font guard reported:\n${errors.join("\n")}`);
  assert.equal(meta.length, 4);
  assert.deepEqual(
    meta
      .map((entry: { weight: number }) => entry.weight)
      .sort((a: number, b: number) => a - b),
    [400, 500, 600, 700],
  );
  assert.ok(
    total <= guard.FONT_PAYLOAD_BUDGET,
    `font payload ${total} B over budget`,
  );
  // Keempat bobot wajib berasal dari versi & subset yang sama (metrik konsisten).
  const versions = new Set(
    meta.map((entry: { version: string }) => entry.version),
  );
  assert.equal(
    versions.size,
    1,
    `mixed Inter versions: ${[...versions].join(", ")}`,
  );
  const coverages = new Set(
    meta.map((entry: { codepoints: number }) => entry.codepoints),
  );
  assert.equal(coverages.size, 1, "font subsets differ in codepoint coverage");
});

test("@font-face lists Inter 400–700 and every file is present woff2", () => {
  const css = guard.stripComments(fs.readFileSync(guard.GLOBALS, "utf8"));
  const bodies = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(
    (match) => match[1],
  );
  const weights: number[] = [];

  for (const body of bodies) {
    assert.equal(/font-family:\s*"([^"]+)"/.exec(body)?.[1], "Inter");
    assert.match(body, /font-style:\s*normal/);
    assert.match(body, /font-display:\s*swap/);
    const weight = Number(/font-weight:\s*(\d+)/.exec(body)?.[1]);
    const src = /url\("([^"]+)"\)/.exec(body)?.[1];
    assert.ok(
      Number.isInteger(weight),
      `unreadable weight in @font-face: ${body}`,
    );
    assert.ok(src, `missing src in @font-face: ${body}`);

    const file = path.join(ROOT, "public", src.replace(/^\//, ""));
    assert.ok(fs.existsSync(file), `@font-face src ${src} does not exist`);
    assert.equal(
      fs.readFileSync(file).subarray(0, 4).toString("ascii"),
      "wOF2",
      `${src} is not a woff2 font`,
    );
    weights.push(weight);
  }

  assert.deepEqual(
    weights.sort((a, b) => a - b),
    [400, 500, 600, 700],
  );
});

test("layout declares meta color-scheme light dark (AC-D11.1)", () => {
  const layout = fs.readFileSync(
    path.join(ROOT, "src", "app", "layout.tsx"),
    "utf8",
  );
  assert.match(layout, /<meta name="color-scheme" content="light dark" \/>/);
});

/* ------------------------------------------------------------------ negative
   Guard yang tidak pernah gagal bukan guard. Setiap uji berikut menyalin repo
   ke direktori sementara, merusak satu hal, lalu menjalankan
   `node scripts/check-tokens.js` dan memastikan exit code 1 + pesan §6.2. */

function makeFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "token-guard-"));
  for (const entry of ["scripts", "src"]) {
    fs.cpSync(path.join(ROOT, entry), path.join(dir, entry), {
      recursive: true,
    });
  }
  fs.mkdirSync(path.join(dir, "public"), { recursive: true });
  fs.cpSync(
    path.join(ROOT, "public", "fonts"),
    path.join(dir, "public", "fonts"),
    {
      recursive: true,
    },
  );
  return dir;
}

function runGuard(dir: string): { status: number | null; output: string } {
  const result = spawnSync(
    process.execPath,
    [path.join(dir, "scripts", "check-tokens.js")],
    { cwd: dir, encoding: "utf8" },
  );
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function patch(file: string, from: string | RegExp, to: string): void {
  const text = fs.readFileSync(file, "utf8");
  const next = text.replace(from, to);
  assert.notEqual(next, text, `fixture patch had no effect on ${file}`);
  fs.writeFileSync(file, next);
}

test("guard passes on the untouched baseline (positive control)", () => {
  const dir = makeFixture();
  const { status, output } = runGuard(dir);
  assert.equal(status, 0, `baseline fixture failed:\n${output}`);
});

test("guard fails when a dark-mode token is missing (E_TOKEN)", () => {
  const dir = makeFixture();
  const globals = path.join(dir, "src", "app", "globals.css");
  patch(globals, /^.*--color-scrim: rgb\(0 0 0 \/ 0\.6\);.*\n/gm, "");

  const { status, output } = runGuard(dir);
  assert.equal(status, 1);
  assert.match(output, /E_TOKEN: --color-scrim missing in dark mode/);
});

test("guard fails when the theme hook drifts from the media query (E_TOKEN)", () => {
  const dir = makeFixture();
  const globals = path.join(dir, "src", "app", "globals.css");
  patch(
    globals,
    /(:root\[data-theme="dark"\] \{[\s\S]*?--color-border: )#2e2e2e;/,
    "$1#2e2e2f;",
  );

  const { status, output } = runGuard(dir);
  assert.equal(status, 1);
  assert.match(
    output,
    /E_TOKEN: --color-border in \[data-theme="dark"\] differs from prefers-color-scheme dark/,
  );
});

test("guard fails on a raw colour literal in a component (E_TOKEN)", () => {
  const dir = makeFixture();
  fs.writeFileSync(
    path.join(dir, "src", "app", "probe.module.css"),
    ".probe {\n  color: #ff0000;\n}\n",
  );

  const { status, output } = runGuard(dir);
  assert.equal(status, 1);
  assert.match(
    output,
    /E_TOKEN: raw colour literal in src\/app\/probe\.module\.css:2/,
  );
});

test("guard fails on a raw px value that duplicates a token (E_TOKEN)", () => {
  const dir = makeFixture();
  fs.writeFileSync(
    path.join(dir, "src", "app", "probe.module.css"),
    ".probe {\n  padding: 16px;\n}\n",
  );

  const { status, output } = runGuard(dir);
  assert.equal(status, 1);
  assert.match(
    output,
    /E_TOKEN: raw px literal in src\/app\/probe\.module\.css:2 duplicates var\(--space-16\)/,
  );
});

test("guard fails when a text token drops below AA (E_CONTRAST)", () => {
  const dir = makeFixture();
  const globals = path.join(dir, "src", "app", "globals.css");
  patch(
    globals,
    /--color-text-secondary: #6b6a65;/,
    "--color-text-secondary: #cccccc;",
  );

  const { status, output } = runGuard(dir);
  assert.equal(status, 1);
  assert.match(
    output,
    /E_CONTRAST: text-secondary\/surface \(light\) ratio 1\.6\d:1 below 4\.5:1/,
  );
});

test("guard fails when legacy v1 px debt grows past its budget (ratchet)", () => {
  const dir = makeFixture();
  const globals = path.join(dir, "src", "app", "globals.css");
  patch(
    globals,
    /\n\/\* token-guard:legacy-end \*\/\n/,
    "\n.legacy-probe {\n  padding: 16px;\n}\n\n/* token-guard:legacy-end */\n",
  );

  const { status, output } = runGuard(dir);
  assert.equal(status, 1);
  // Angka ekspektasi diturunkan dari anggaran guard supaya ratchet yang
  // diturunkan (mis. 35 → 20 pada TASK-202) tidak membuat uji ini basi.
  const oneOverBudget = guard.LEGACY_PX_DEBT + 1;
  assert.match(
    output,
    new RegExp(
      `E_TOKEN: legacy v1 px debt ${oneOverBudget} > budget ${guard.LEGACY_PX_DEBT}`,
    ),
  );
});
