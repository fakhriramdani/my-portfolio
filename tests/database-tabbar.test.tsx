/**
 * tests/database-tabbar.test.tsx — DatabaseView & TabBar baseline CSS (TASK-206, TECH-SPEC v2.0 §3.5).
 *
 * Coverage:
 *  · AC-D09.1 — renders <section class="nd-db" id="database"> with sr-only H2
 *  · AC-D09.2 — renders 4 radio inputs with same name="dbview" and tab-projects checked
 *  · Labels: 4 labels with htmlFor matching the 4 input IDs
 *  · Panels: renders all 4 panels simultaneously in DOM with correct data-tab-panel and aria-labelledby
 *  · ADR-0008: CSS :has() rules for panel switching and active tab state
 *  · NFR-D07: Mobile touch target height ≥ 44px and F2 anti-clip rules
 *  · NFR-11: 0 client JavaScript required (pure HTML/CSS baseline)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { DatabaseView } from "../src/components/DatabaseView";
import { uiLabels } from "../src/content/ui.labels";

const html = renderToStaticMarkup(<DatabaseView />);

test("renders section with id=database and sr-only H2 (AC-D09.1)", () => {
  assert.match(
    html,
    /<section class="nd-db" id="database" aria-labelledby="database-heading"[^>]*data-database-view/,
  );
  assert.match(
    html,
    /<h2 id="database-heading" class="nd-sr-only">Projects, Skills, Education and Language<\/h2>/,
  );
  assert.equal(
    uiLabels.sections.database,
    "Projects, Skills, Education and Language",
  );
});

test("renders 4 radio inputs with same name='dbview' and tab-projects checked (AC-D09.2)", () => {
  const inputs = html.match(/<input[^>]*>/g) ?? [];
  assert.equal(inputs.length, 4, "exactly 4 radio inputs");

  const expectedIds = [
    "tab-projects",
    "tab-skills",
    "tab-education",
    "tab-language",
  ];
  for (const id of expectedIds) {
    const input = inputs.find((tag) => tag.includes(`id="${id}"`));
    assert.ok(input, `input with id="${id}" must exist`);
    assert.match(input, /class="nd-sr-only"/);
    assert.match(input, /type="radio"/);
    assert.match(input, /name="dbview"/);
    assert.match(input, /data-tab-input/);
  }

  // Only tab-projects has checked attribute
  assert.match(html, /id="tab-projects"[^>]*checked/);
  assert.doesNotMatch(html, /id="tab-skills"[^>]*checked/);
  assert.doesNotMatch(html, /id="tab-education"[^>]*checked/);
  assert.doesNotMatch(html, /id="tab-language"[^>]*checked/);
});

test("renders 4 labels with for matching the 4 input IDs and icons", () => {
  const labels = html.match(/<label[^>]*>[\s\S]*?<\/label>/g) ?? [];
  assert.equal(labels.length, 4, "exactly 4 tab labels");

  assert.match(
    html,
    /<label class="nd-tab" for="tab-projects" data-tab="projects">\s*<span aria-hidden="true">▦<\/span>\s*Projects\s*<\/label>/,
  );
  assert.match(
    html,
    /<label class="nd-tab" for="tab-skills" data-tab="skills">\s*<span aria-hidden="true">⚡<\/span>\s*Skills\s*<\/label>/,
  );
  assert.match(
    html,
    /<label class="nd-tab" for="tab-education" data-tab="education">\s*<span aria-hidden="true">🎓<\/span>\s*Education\s*<\/label>/,
  );
  assert.match(
    html,
    /<label class="nd-tab" for="tab-language" data-tab="language">\s*<span aria-hidden="true">🌐<\/span>\s*Language\s*<\/label>/,
  );
});

test("renders all 4 panels simultaneously in DOM with correct attributes", () => {
  const panels = html.match(/<div class="nd-db__panel"[^>]*>/g) ?? [];
  assert.equal(panels.length, 4, "all 4 panels present in DOM simultaneously");

  // Projects panel: active, not hidden
  assert.match(
    html,
    /<div class="nd-db__panel" id="panel-projects" data-tab-panel="projects" aria-labelledby="tab-projects">/,
  );

  // Inactive panels: hidden attribute present for a11y
  assert.match(
    html,
    /<div class="nd-db__panel" id="panel-skills" data-tab-panel="skills" aria-labelledby="tab-skills" hidden=""?>/,
  );
  assert.match(
    html,
    /<div class="nd-db__panel" id="panel-education" data-tab-panel="education" aria-labelledby="tab-education" hidden=""?>/,
  );
  assert.match(
    html,
    /<div class="nd-db__panel" id="panel-language" data-tab-panel="language" aria-labelledby="tab-language" hidden=""?>/,
  );

  // Allows panel content injection via props
  const customHtml = renderToStaticMarkup(
    <DatabaseView
      projectsContent={<div id="custom-projects">Custom Projects</div>}
      skillsContent={<div id="custom-skills">Custom Skills</div>}
      educationContent={<div id="custom-education">Custom Education</div>}
      languageContent={<div id="custom-language">Custom Language</div>}
    />,
  );
  assert.match(customHtml, /<div id="custom-projects">Custom Projects<\/div>/);
  assert.match(customHtml, /<div id="custom-skills">Custom Skills<\/div>/);
  assert.match(customHtml, /<div id="custom-education">Custom Education<\/div>/);
  assert.match(customHtml, /<div id="custom-language">Custom Language<\/div>/);
});

test("verifies :has() CSS rules exist in src/app/globals.css (ADR-0008, WCAG 1.4.1)", () => {
  const css = fs.readFileSync(
    path.resolve(__dirname, "../src/app/globals.css"),
    "utf8",
  );

  // Default panel state is hidden
  assert.match(css, /\.nd-db__panel\s*\{\s*display:\s*none;/);

  // Panel switching rules via :has()
  assert.match(
    css,
    /\.nd-db:has\(#tab-projects:checked\)\s*\[data-tab-panel="projects"\]/,
  );
  assert.match(
    css,
    /\.nd-db:has\(#tab-skills:checked\)\s*\[data-tab-panel="skills"\]/,
  );
  assert.match(
    css,
    /\.nd-db:has\(#tab-education:checked\)\s*\[data-tab-panel="education"\]/,
  );
  assert.match(
    css,
    /\.nd-db:has\(#tab-language:checked\)\s*\[data-tab-panel="language"\]/,
  );

  // Active tab pill styling via :has()
  assert.match(
    css,
    /\.nd-db:has\(#tab-projects:checked\)\s*\[data-tab="projects"\]/,
  );
  assert.match(
    css,
    /\.nd-db:has\(#tab-skills:checked\)\s*\[data-tab="skills"\]/,
  );
  assert.match(
    css,
    /\.nd-db:has\(#tab-education:checked\)\s*\[data-tab="education"\]/,
  );
  assert.match(
    css,
    /\.nd-db:has\(#tab-language:checked\)\s*\[data-tab="language"\]/,
  );

  // Active state visual indicator: background, font-weight, 2px indicator (WCAG 1.4.1)
  assert.match(css, /background:\s*var\(--color-surface-subtle\)/);
  assert.match(
    css,
    /font-weight:\s*(?:600|var\(--font-weight-semibold\))/,
  );
  assert.match(
    css,
    /border-bottom:\s*var\(--(?:border-emphasis|space-2)\)\s*solid\s*var\(--color-accent\)/,
  );

  // Inactive state text color
  assert.match(css, /color:\s*var\(--color-text-secondary\)/);
});

test("verifies mobile touch target height (≥ 44px) and anti-clip rules (NFR-D07, F2)", () => {
  const css = fs.readFileSync(
    path.resolve(__dirname, "../src/app/globals.css"),
    "utf8",
  );

  // Mobile media query rules
  assert.match(css, /@media\s*\(max-width:\s*639px\)/);
  assert.match(css, /flex-wrap:\s*nowrap/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /min-height:\s*44px/);
});

test("verifies 0 client JavaScript required (server component, no client hooks)", () => {
  const componentSource = fs.readFileSync(
    path.resolve(__dirname, "../src/components/DatabaseView.tsx"),
    "utf8",
  );

  assert.doesNotMatch(componentSource, /["']use client["']/);
  assert.doesNotMatch(componentSource, /useState/);
  assert.doesNotMatch(componentSource, /useEffect/);
  assert.doesNotMatch(componentSource, /useCallback/);
  assert.doesNotMatch(componentSource, /useRef/);
});
