/**
 * tests/gallery-panels.test.tsx — Gallery Panels (Projects, Skills, Education, Language)
 * (TASK-207, TECH-SPEC v2.0 §3.6, §3.8, §3.9, §3.10).
 *
 * Coverage:
 *  · AC-D06.1–.3 — Exactly 5 project cards in ProjectsPanel with title, meta, summary, tags
 *  · F3 — First project card is featured with nd-project--featured (grid-column: 1 / -1 on >= 640px)
 *  · Modal triggers — Anchors target #modal-<id> with matching data-modal-trigger
 *  · Whitelist — All project tags are within 14-item tech whitelist
 *  · AC-D04.1–.4 — Exactly 4 skill group cards partitioning 20 skills (14 hard + 6 soft)
 *  · AC-D04.3 — Zero progress bars, meter elements, percentages, or star ratings
 *  · BR-008 — Level labels rendered only where declared (level !== null)
 *  · AC-D05.1 — Exactly 3 education cards in EducationPanel
 *  · AC-D12.1/.2 — Exactly 2 language cards in LanguagePanel with proficiency text
 *  · CSS verification — Grid layout, featured card span, interactive states
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectsPanel } from "../src/components/ProjectsPanel";
import { SkillsPanel } from "../src/components/SkillsPanel";
import { EducationPanel } from "../src/components/EducationPanel";
import { LanguagePanel } from "../src/components/LanguagePanel";
import { cvData } from "../src/content/cv.data";

function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const WHITELIST_14 = [
  "Go",
  "Git",
  "PostgreSQL",
  "MySQL",
  "SQL Server",
  "Java / Spring Boot",
  "ASP.NET",
  "PHP / CakePHP",
  "Docker",
  "Oracle Database",
  "REST API Design",
  "OpenAPI/Swagger",
  "Unit Testing (Mockery)",
  "CI/CD",
];

/* ----------------------------------------------------------- ProjectsPanel */

test("ProjectsPanel renders exactly 5 project cards (AC-D06.1–.3)", () => {
  const html = renderToStaticMarkup(<ProjectsPanel />);
  const cards = html.match(/<article[^>]*data-project-card[^>]*>/g) ?? [];
  assert.equal(cards.length, 5, "exactly 5 project cards rendered");

  for (const project of cvData.projects) {
    assert.match(
      html,
      new RegExp(`data-project-id="${project.id}"`),
      `card for project id "${project.id}" must exist`,
    );
    assert.match(
      html,
      new RegExp(`href="#modal-${project.id}"`),
      `modal link for "${project.id}" must point to #modal-${project.id}`,
    );
    assert.match(
      html,
      new RegExp(`data-modal-trigger="${project.id}"`),
      `modal trigger attribute for "${project.id}" must exist`,
    );
    assert.ok(html.includes(htmlEscape(project.title)), `title for "${project.id}" missing`);
    assert.ok(html.includes(htmlEscape(project.employer)), `employer for "${project.id}" missing`);
    assert.ok(html.includes(htmlEscape(project.role)), `role for "${project.id}" missing`);
    assert.ok(html.includes(htmlEscape(project.summary)), `summary for "${project.id}" missing`);
  }
});

test("First project card has featured class to solve F3 orphan card (F3)", () => {
  const html = renderToStaticMarkup(<ProjectsPanel />);
  const firstProject = cvData.projects[0]!;

  assert.match(
    html,
    new RegExp(
      `<article[^>]*class="[^"]*nd-project--featured[^"]*"[^>]*data-project-id="${firstProject.id}"`,
    ),
    "first project card must have nd-project--featured class",
  );

  // Other 4 cards must NOT have nd-project--featured
  for (let i = 1; i < cvData.projects.length; i++) {
    const p = cvData.projects[i]!;
    assert.doesNotMatch(
      html,
      new RegExp(
        `<article[^>]*class="[^"]*nd-project--featured[^"]*"[^>]*data-project-id="${p.id}"`,
      ),
      `project card "${p.id}" must not have nd-project--featured class`,
    );
  }
});

test("All tags in project cards are within 14 whitelist and non-empty", () => {
  const html = renderToStaticMarkup(<ProjectsPanel />);
  const tagMatches = [...html.matchAll(/<li[^>]*data-tech-tag[^>]*>(.*?)<\/li>/g)];
  assert.ok(tagMatches.length >= 10, "at least 10 tags rendered across 5 projects");

  for (const match of tagMatches) {
    const tagText = match[1]!.trim();
    assert.ok(tagText.length > 0, "tag text must not be empty");
    assert.ok(
      WHITELIST_14.includes(tagText),
      `tag "${tagText}" must be in the 14-item tech whitelist`,
    );
  }
});

/* ------------------------------------------------------------- SkillsPanel */

test("SkillsPanel renders exactly 4 skill group cards partitioning 20 skills (AC-D04.1–.4)", () => {
  const html = renderToStaticMarkup(<SkillsPanel />);
  const cards = html.match(/<article[^>]*data-skill-card[^>]*>/g) ?? [];
  assert.equal(cards.length, 4, "exactly 4 skill group cards rendered");

  for (const group of cvData.skillGroups) {
    assert.ok(html.includes(htmlEscape(group.title)), `group "${group.title}" missing`);
  }

  const skillItems = [...html.matchAll(/<li[^>]*data-skill[^>]*>/g)];
  assert.equal(skillItems.length, 20, "exactly 20 skill items across all 4 groups");
});

test("SkillsPanel renders level label only when declared and 0 progress bars (BR-008, AC-D04.3)", () => {
  const html = renderToStaticMarkup(<SkillsPanel />);

  // Zero progress bars, meter elements, percentages, or star ratings (AC-D04.3)
  assert.doesNotMatch(html, /<progress\b/);
  assert.doesNotMatch(html, /<meter\b/);
  assert.doesNotMatch(html, /role="progressbar"/);
  assert.doesNotMatch(html, /%|\bpercent\b/i);
  assert.doesNotMatch(html, /★|⭐|star/i);

  // 9 skills have declared level, 11 skills have null level
  const withLevel = cvData.skills.filter((s) => s.level !== null);
  const withoutLevel = cvData.skills.filter((s) => s.level === null);
  assert.equal(withLevel.length, 9);
  assert.equal(withoutLevel.length, 11);

  for (const s of withLevel) {
    assert.match(
      html,
      new RegExp(`data-level="${s.level}"`),
      `skill "${s.name}" must have data-level="${s.level}"`,
    );
  }

  for (const s of withoutLevel) {
    assert.doesNotMatch(
      html,
      new RegExp(`data-skill[^>]*>${s.name}\\s*<span`),
      `skill "${s.name}" with null level must not render level span`,
    );
  }
});

/* ---------------------------------------------------------- EducationPanel */

test("EducationPanel renders exactly 3 education cards (AC-D05.1)", () => {
  const html = renderToStaticMarkup(<EducationPanel />);
  const cards = html.match(/<article[^>]*data-edu-card[^>]*>/g) ?? [];
  assert.equal(cards.length, 3, "exactly 3 education cards rendered");

  for (const card of cvData.educationCards) {
    assert.ok(html.includes(htmlEscape(card.title)), `title "${card.title}" missing`);
    if (card.subtitle) {
      assert.ok(html.includes(htmlEscape(card.subtitle)), `subtitle "${card.subtitle}" missing`);
    }
    if (card.description) {
      assert.ok(html.includes(htmlEscape(card.description)), `description "${card.description}" missing`);
    }
  }
});

/* ----------------------------------------------------------- LanguagePanel */

test("LanguagePanel renders exactly 2 language cards with proficiency text (AC-D12.1/.2)", () => {
  const html = renderToStaticMarkup(<LanguagePanel />);
  const cards = html.match(/<article[^>]*data-lang-card[^>]*>/g) ?? [];
  assert.equal(cards.length, 2, "exactly 2 language cards rendered");

  // Zero progress bars, percentages, or meter elements (AC-D12.2)
  assert.doesNotMatch(html, /<progress\b/);
  assert.doesNotMatch(html, /<meter\b/);
  assert.doesNotMatch(html, /%/);

  for (const card of cvData.languageCards) {
    assert.ok(html.includes(htmlEscape(card.name)), `language "${card.name}" missing`);
    assert.ok(html.includes(htmlEscape(card.proficiency)), `proficiency "${card.proficiency}" missing`);
  }
});

/* ------------------------------------------------------- CSS Grid & States */

test("verifies gallery grid and featured card CSS rules in globals.css (ADR-0008, F3)", () => {
  const css = fs.readFileSync(
    path.resolve(__dirname, "../src/app/globals.css"),
    "utf8",
  );

  // Grid container: 1 col mobile, 2 col >= 640px
  assert.match(css, /\.nd-grid\s*\{[\s\S]*?display:\s*grid;/);
  assert.match(css, /grid-template-columns:\s*1fr;/);
  assert.match(css, /@media\s*\(min-width:\s*640px\)\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);

  // Featured card span
  assert.match(css, /\.nd-project--featured\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;/);

  // Card interactive state for .nd-project
  assert.match(css, /\.nd-project:hover\s*\{[\s\S]*?border-color:\s*var\(--color-text-tertiary\);/);
  assert.match(css, /\.nd-project:hover\s*\{[\s\S]*?box-shadow:/);
  assert.match(css, /\.nd-project:active\s*\{[\s\S]*?transform:\s*translateY\(1px\);/);
  assert.match(css, /\.nd-project__title:focus-visible\s*\{[\s\S]*?outline:/);

  // Reduced motion
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.nd-project\s*\{[\s\S]*?transition:\s*none;/);
});
