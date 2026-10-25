/**
 * tests/interactive-states.test.tsx — Interactive States & Touch Targets (TASK-210).
 *
 * Refs:
 *  · TECH-SPEC v2.0 §3.12 (Interactive states table), §6.1 TASK-210
 *  · PRD v1.2 FR-D14, AC-D01.4, AC-D06.5, AC-D10.3, NFR-D07, NFR-05, NFR-18
 *  · Decisions D-041, D-044, D-045, D-046, D-047, D-048, D-049, D-050
 *  · Code Reviews: CR-TASK-207 N1/N3, CR-TASK-208 N1
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../src/app/page";
import { DatabaseView } from "../src/components/DatabaseView";
import { ProjectModal } from "../src/components/ProjectModal";

const ROOT = path.resolve(__dirname, "..");
const GLOBALS_PATH = path.join(ROOT, "src", "app", "globals.css");
const css = fs.readFileSync(GLOBALS_PATH, "utf8");

test("tab bar interactive states match TECH-SPEC §3.12 table", () => {
  // Default state: color secondary, font-weight medium (500)
  assert.match(
    css,
    /\.nd-tab\s*\{[^}]*color:\s*var\(--color-text-secondary\);[\s\S]*?font-weight:\s*var\(--font-weight-medium\);/,
    "tab bar default state must declare color secondary and font-weight medium (500)",
  );

  // Hover state: background surface-subtle
  assert.match(
    css,
    /\.nd-tab:hover\s*\{[^}]*background:\s*var\(--color-surface-subtle\);/,
    "tab bar hover state must declare background surface-subtle",
  );

  // Focus-visible: 2px outline accent with 2px offset
  assert.match(
    css,
    /\.nd-tabbar:has\(#tab-[^)]+\)\s*\[data-tab=[^\]]+\],[\s\S]*?\.nd-tab:focus-visible\s*\{[^}]*outline:\s*var\(--border-emphasis\)\s*solid\s*var\(--color-accent\);[\s\S]*?outline-offset:\s*var\(--space-2\);/,
    "tab bar focus-visible must declare 2px outline var(--color-accent) and offset var(--space-2)",
  );

  // Active / checked state: font-weight semibold (600) + bottom border 2px accent (shape indicator)
  assert.match(
    css,
    /\.nd-db:has\(#tab-projects:checked\)[\s\S]*?\{[^}]*font-weight:\s*var\(--font-weight-semibold\);[\s\S]*?border-bottom:\s*var\(--border-emphasis\)\s*solid\s*var\(--color-accent\);/,
    "tab bar active state must declare font-weight semibold (600) and 2px accent bottom border",
  );
});

test("project card (.nd-project) interactive states match TECH-SPEC §3.12 table", () => {
  // Default state: cursor pointer, border hairline solid border
  assert.match(
    css,
    /\.nd-project\s*\{[^}]*cursor:\s*pointer;[\s\S]*?border:\s*var\(--border-hairline\)\s*solid\s*var\(--color-border\);/,
    "project card default must have cursor: pointer and border: 1px solid var(--color-border)",
  );

  // Hover state: border-color text-tertiary + subtle box-shadow
  assert.match(
    css,
    /\.nd-project:hover\s*\{[^}]*border-color:\s*var\(--color-text-tertiary\);[\s\S]*?box-shadow:\s*0\s*1px\s*var\(--space-2\)\s*color-mix\(in\s*srgb,\s*var\(--color-text-primary\)\s*6%,\s*transparent\);/,
    "project card hover must change border-color to text-tertiary and apply box-shadow",
  );

  // Focus-visible on title: 2px outline accent with offset 2px
  assert.match(
    css,
    /\.nd-project__title:focus-visible\s*\{[^}]*outline:\s*var\(--border-emphasis\)\s*solid\s*var\(--color-accent\);[\s\S]*?outline-offset:\s*var\(--space-2\);/,
    "project title focus-visible must have 2px outline accent with 2px offset",
  );

  // Active state: transform translateY(1px)
  assert.match(
    css,
    /\.nd-project:active\s*\{[^}]*transform:\s*translateY\(1px\);/,
    "project card active must apply transform: translateY(1px)",
  );
});

test("contact links (.nd-contacts a) interactive states match TECH-SPEC §3.12 table", () => {
  // Default state: color link, text-decoration none
  assert.match(
    css,
    /\.nd-contacts\s+a\s*\{[^}]*color:\s*var\(--color-link\);[\s\S]*?text-decoration:\s*none;/,
    "contact link default must have color link and text-decoration none",
  );

  // Hover state: text-decoration underline
  assert.match(
    css,
    /\.nd-contacts\s+a:hover\s*\{[^}]*text-decoration:\s*underline;/,
    "contact link hover must have text-decoration underline",
  );

  // Focus-visible: 2px outline accent (offset 2px) + text-decoration underline
  assert.match(
    css,
    /\.nd-contacts\s+a:focus-visible\s*\{[^}]*text-decoration:\s*underline;[\s\S]*?outline:\s*var\(--border-emphasis\)\s*solid\s*var\(--color-accent\);[\s\S]*?outline-offset:\s*var\(--space-2\);/,
    "contact link focus-visible must have 2px outline accent and underline",
  );
});

test("modal close button (.nd-modal__close) interactive states match TECH-SPEC §3.12 table", () => {
  // Default state: color text-secondary, min-height 44px, min-width 44px
  assert.match(
    css,
    /\.nd-modal__close\s*\{[^}]*min-height:\s*44px;[\s\S]*?min-width:\s*44px;[\s\S]*?color:\s*var\(--color-text-secondary\);/,
    "modal close button default must have min 44x44px and color text-secondary",
  );

  // Hover state: color text-primary, background surface-subtle
  assert.match(
    css,
    /\.nd-modal__close:hover\s*\{[^}]*background:\s*var\(--color-surface-subtle\);[\s\S]*?color:\s*var\(--color-text-primary\);/,
    "modal close hover must have background surface-subtle and color text-primary",
  );

  // Focus-visible: 2px outline accent with offset 2px
  assert.match(
    css,
    /\.nd-modal__close:focus-visible\s*\{[^}]*outline:\s*var\(--border-emphasis\)\s*solid\s*var\(--color-accent\);[\s\S]*?outline-offset:\s*var\(--space-2\);/,
    "modal close focus-visible must have 2px outline accent with 2px offset",
  );
});

test("chip tags (.nd-tags li) are non-interactive and static by design", () => {
  // Check CSS: no cursor pointer, no hover or active rules
  assert.doesNotMatch(
    css,
    /\.nd-tags\s+li:hover/,
    "tags must not declare hover state",
  );
  assert.doesNotMatch(
    css,
    /\.nd-tags\s+li:active/,
    "tags must not declare active state",
  );
  assert.doesNotMatch(
    css,
    /\.nd-tags\s+li:focus/,
    "tags must not declare focus state",
  );

  // Render static HTML and ensure no tabindex or interactive roles
  const html = renderToStaticMarkup(<Home />);
  const tagLists = html.match(/<ul class="nd-tags"[^>]*>[\s\S]*?<\/ul>/g) ?? [];
  assert.ok(tagLists.length > 0, "tag lists must be present in DOM");
  for (const list of tagLists) {
    const items = list.match(/<li[^>]*>/g) ?? [];
    assert.ok(items.length > 0, "tag list must contain li elements");
    for (const tag of items) {
      assert.doesNotMatch(tag, /tabindex/i, "tag must not have tabindex");
      assert.doesNotMatch(tag, /role="button"/i, "tag must not have button role");
    }
  }
});

test("touch targets meet >= 44px on mobile (< 640px) and >= 24px on desktop (NFR-D07, NFR-05)", () => {
  // Mobile < 640px rules in globals.css
  const mobileMediaMatches = css.match(
    /@media\s*\(max-width:\s*639px\)\s*\{([\s\S]*?)\n\}/g,
  );
  assert.ok(mobileMediaMatches, "must have @media (max-width: 639px) blocks");
  const allMobileCss = mobileMediaMatches.join("\n");

  // .nd-tab: min-height: 44px on mobile
  assert.match(
    allMobileCss,
    /\.nd-tab\s*\{[^}]*min-height:\s*44px;/,
    ".nd-tab must specify min-height: 44px under max-width: 639px",
  );

  // .nd-contacts a: min-height: 44px and inline-flex on mobile
  assert.match(
    allMobileCss,
    /\.nd-contacts\s+a\s*\{[^}]*display:\s*inline-flex;[\s\S]*?min-height:\s*44px;/,
    ".nd-contacts a must specify min-height: 44px and inline-flex under max-width: 639px",
  );

  // .nd-project__title: min-height: 44px on mobile
  assert.match(
    allMobileCss,
    /\.nd-project__title\s*\{[^}]*min-height:\s*44px;/,
    ".nd-project__title must specify min-height: 44px under max-width: 639px",
  );

  // .nd-modal__close: min-height: 44px; min-width: 44px (universal)
  assert.match(
    css,
    /\.nd-modal__close\s*\{[^}]*min-height:\s*44px;[\s\S]*?min-width:\s*44px;/,
    ".nd-modal__close must have min-height 44px and min-width 44px",
  );

  // Desktop baseline targets (>= 24px)
  assert.match(
    css,
    /\.nd-tab\s*\{[^}]*min-height:\s*var\(--space-24\);/,
    ".nd-tab desktop target must be at least 24px via var(--space-24)",
  );
  assert.match(
    css,
    /\.nd-contacts\s+a\s*\{[^}]*min-height:\s*var\(--space-24\);/,
    ".nd-contacts a desktop target must be at least 24px via var(--space-24)",
  );
  assert.match(
    css,
    /\.nd-project\s*\{[^}]*min-height:\s*var\(--space-24\);/,
    ".nd-project desktop target must be at least 24px via var(--space-24)",
  );
});

test("motion discipline: transitions <= 150ms and disabled under prefers-reduced-motion", () => {
  // All transitions in globals.css must use var(--motion-fast) (150ms) or none
  const transitionRegex = /transition:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  let foundTransitions = 0;
  while ((match = transitionRegex.exec(css)) !== null) {
    const value = match[1]?.trim() ?? "";
    if (value === "none") continue;
    foundTransitions++;
    assert.match(
      value,
      /var\(--motion-fast\)/,
      `transition '${value}' must use var(--motion-fast) (<= 150ms)`,
    );
  }
  assert.ok(foundTransitions > 0, "transitions must exist in globals.css");

  // Under @media (prefers-reduced-motion: reduce), all interactive selectors have transition: none
  const reducedMotionBlocks = css.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/g,
  );
  assert.ok(reducedMotionBlocks, "must have @media (prefers-reduced-motion: reduce) blocks");
  const allReducedMotionCss = reducedMotionBlocks.join("\n");

  const requiredSelectors = [
    ".skip-link",
    ".nd-tab",
    ".nd-project",
    ".nd-modal__close",
    ".nd-contacts a",
    "a",
  ];

  for (const sel of requiredSelectors) {
    const escaped = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escaped}[^;{}]*\\{[^}]*transition:\\s*none`);
    assert.match(
      allReducedMotionCss,
      regex,
      `selector '${sel}' must specify transition: none in prefers-reduced-motion`,
    );
  }
});

test("active tab indicator does not rely on color alone (WCAG 1.4.1)", () => {
  // Active tab must combine color/background with font-weight: 600 and a 2px underline border
  const activeTabRule = css.match(
    /\.nd-db:has\(#tab-projects:checked\)[^{]*\{([^}]+)\}/,
  );
  assert.ok(activeTabRule, "active tab CSS rule must exist");
  const declarations = activeTabRule[1] ?? "";

  assert.match(
    declarations,
    /font-weight:\s*var\(--font-weight-semibold\)/,
    "active tab must set font-weight: semibold (600) for non-color visual distinction",
  );
  assert.match(
    declarations,
    /border-bottom:\s*var\(--border-emphasis\)\s*solid\s*var\(--color-accent\)/,
    "active tab must render 2px solid bottom border shape indicator",
  );
});

test("interactive elements are rendered without relying on JavaScript (Opsi C baseline)", () => {
  const dbHtml = renderToStaticMarkup(<DatabaseView />);
  const modalHtml = renderToStaticMarkup(<ProjectModal />);

  // Radio buttons for tab switching exist in static markup
  assert.match(dbHtml, /<input[^>]*type="radio"[^>]*id="tab-projects"/);
  assert.match(dbHtml, /<label[^>]*for="tab-projects"/);

  // Modal triggers are native links with href pointing to modal ID
  assert.match(dbHtml, /<a[^>]*href="#modal-syariah-banking-display"/);

  // Modal dialogs have native close links pointing to #database
  assert.match(modalHtml, /<a[^>]*class="nd-modal__close"[^>]*href="#database"/);
});
