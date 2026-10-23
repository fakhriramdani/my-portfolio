/**
 * tests/project-modal.test.tsx — ProjectModal Dialog component & CSS :target baseline
 * (TASK-208, TECH-SPEC v2.0 §3.7, FR-D07, AC-D07.1–.4).
 *
 * Coverage:
 *  · AC-D07.1 — Exactly 5 static <dialog className="nd-modal"> rendered in static HTML
 *  · AC-D07.2 — Title, employer, period, role, full description (>= 150 chars), tech tags, source label
 *  · AC-D07.3 — Close affordance pointing to #database with data-modal-close and accessible aria-label
 *  · AC-D07.4 — Mobile dimensions, overflow scroll, desktop max-width 760px
 *  · A11y attributes — aria-modal="true", aria-labelledby, id matching modal-<id>
 *  · Pure CSS baseline — :target rules and backdrop overlay in src/app/globals.css
 *  · NFR-11 — 0 client JavaScript required (server component, no hooks)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectModal } from "../src/components/ProjectModal";
import Home from "../src/app/page";
import { cvData } from "../src/content/cv.data";
import { uiLabels } from "../src/content/ui.labels";

const ROOT = path.resolve(__dirname, "..");
const GLOBALS_PATH = path.join(ROOT, "src", "app", "globals.css");

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const modalHtml = renderToStaticMarkup(<ProjectModal />);
const pageHtml = renderToStaticMarkup(<Home />);

test("renders exactly 5 <dialog className=\"nd-modal\"> in static HTML (AC-D07.1)", () => {
  const dialogs = modalHtml.match(/<dialog[^>]*class="[^"]*nd-modal[^"]*"[^>]*>/g) ?? [];
  assert.equal(dialogs.length, 5, "exactly 5 dialog elements rendered in ProjectModal");

  const pageDialogs = pageHtml.match(/<dialog[^>]*class="[^"]*nd-modal[^"]*"[^>]*>/g) ?? [];
  assert.equal(pageDialogs.length, 5, "exactly 5 dialog elements rendered in Home page");
});

test("each dialog has id='modal-<id>', data-modal='<id>', aria-labelledby, and aria-modal='true'", () => {
  for (const project of cvData.projects) {
    const dialogRegex = new RegExp(
      `<dialog[^>]*id="modal-${escapeRegex(project.id)}"[^>]*data-modal="${escapeRegex(project.id)}"[^>]*aria-labelledby="modal-title-${escapeRegex(project.id)}"[^>]*aria-modal="true"`,
    );
    assert.match(
      modalHtml,
      dialogRegex,
      `dialog for "${project.id}" must have id, data-modal, aria-labelledby, and aria-modal="true"`,
    );
  }
});

test("each dialog has heading H3 with matching id and title", () => {
  for (const project of cvData.projects) {
    const titleRegex = new RegExp(
      `<h3[^>]*id="modal-title-${escapeRegex(project.id)}"[^>]*class="[^"]*nd-modal__title[^"]*"[^>]*>${escapeRegex(project.title)}</h3>`,
    );
    assert.match(
      modalHtml,
      titleRegex,
      `dialog heading H3 for "${project.id}" must match title`,
    );
  }
});

test("each dialog has close link pointing to #database with data-modal-close and accessible label (AC-D07.3)", () => {
  for (const project of cvData.projects) {
    const closeRegex = new RegExp(
      `<a[^>]*class="[^"]*nd-modal__close[^"]*"[^>]*href="#database"[^>]*data-modal-close(?:="true")?[^>]*aria-label="${escapeRegex(uiLabels.modal.close)}: ${escapeRegex(project.title)}"[^>]*>${escapeRegex(uiLabels.modal.close)}</a>`,
    );
    assert.match(
      modalHtml,
      closeRegex,
      `close link for "${project.id}" must have href="#database", data-modal-close, and accessible label`,
    );
  }
});

test("each dialog displays employer, role, formatted period, tags, and source reference (AC-D07.2)", () => {
  for (const project of cvData.projects) {
    // Employer and role
    assert.ok(
      modalHtml.includes(project.employer),
      `employer "${project.employer}" rendered for ${project.id}`,
    );
    assert.ok(
      modalHtml.includes(project.role),
      `role "${project.role}" rendered for ${project.id}`,
    );

    // Tags
    for (const tag of project.tags) {
      assert.match(
        modalHtml,
        new RegExp(`<li[^>]*data-tech-tag(?:="true")?[^>]*>${escapeRegex(tag)}</li>`),
        `tag "${tag}" rendered for ${project.id}`,
      );
    }

    // Source label
    const expectedSource = `${uiLabels.modal.sourceLabel}: ${project.source}`;
    assert.ok(
      modalHtml.includes(expectedSource),
      `source reference "${expectedSource}" rendered for ${project.id}`,
    );
  }
});

test("verified project descriptions are rendered verbatim without trimming (length >= 150 chars) (AC-D07.2)", () => {
  for (const project of cvData.projects) {
    assert.ok(
      project.description.length >= 150,
      `project ${project.id} description must have length >= 150 chars (got ${project.description.length})`,
    );
    assert.ok(
      modalHtml.includes(project.description),
      `project ${project.id} description must be rendered verbatim`,
    );
  }
});

test("verifies CSS :target baseline rules exist in src/app/globals.css (AC-D07.1, ADR-0008)", () => {
  const css = fs.readFileSync(GLOBALS_PATH, "utf8");

  // Default state hidden
  assert.match(
    css,
    /dialog\.nd-modal\s*\{[^}]*display:\s*none;/,
    "dialog.nd-modal must have display: none by default",
  );

  // Active :target state
  assert.match(
    css,
    /dialog\.nd-modal:target[^{]*\{[^}]*display:\s*block;/,
    "dialog.nd-modal:target must have display: block",
  );
  assert.match(
    css,
    /dialog\.nd-modal:target[^{]*\{[^}]*position:\s*fixed;/,
    "dialog.nd-modal:target must be position: fixed",
  );
  assert.match(
    css,
    /dialog\.nd-modal:target[^{]*\{[^}]*inset:\s*0;/,
    "dialog.nd-modal:target must have inset: 0",
  );
  assert.match(
    css,
    /dialog\.nd-modal:target[^{]*\{[^}]*z-index:\s*100;/,
    "dialog.nd-modal:target must have z-index: 100",
  );

  // Backdrop overlay styling
  assert.match(
    css,
    /dialog\.nd-modal(::backdrop|:target::backdrop)/,
    "dialog backdrop styling must be defined",
  );
  assert.match(
    css,
    /var\(--color-scrim\)/,
    "scrim token must be used for backdrop overlay",
  );

  // Dimensions & scroll
  assert.match(
    css,
    /max-width:\s*760px;/,
    "desktop max-width 760px must be defined",
  );
  assert.match(
    css,
    /overflow-y:\s*auto;/,
    "internal scroll overflow-y: auto must be defined",
  );

  // Mobile dimensions
  assert.match(
    css,
    /max-width:\s*var\(--container-doc-mobile\);/,
    "mobile container width token must be defined",
  );
  assert.match(
    css,
    /min-height:\s*44px;/,
    "close link must meet touch target minimum of 44px",
  );
});

test("verifies 0 client JavaScript required (server component, no client hooks) (NFR-11)", () => {
  const componentPath = path.join(ROOT, "src", "components", "ProjectModal.tsx");
  const code = fs.readFileSync(componentPath, "utf8");

  assert.doesNotMatch(code, /["']use client["']/, "must not be a client component");
  assert.doesNotMatch(code, /\buseState\b|\buseEffect\b|\buseRef\b|\buseCallback\b/, "must not use client hooks");
  assert.doesNotMatch(code, /onClick\b|onChange\b|onSubmit\b/, "must not attach client event handlers");
});
