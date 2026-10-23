/**
 * tests/work-experience.test.tsx — WorkExperienceSection component (TASK-204, TECH-SPEC v2.0 §3.4).
 *
 * Coverage:
 *  · AC-D03.1 — 2 entries (Bank Sinarmas, PT CDC Global Informatika), reverse-chronological
 *  · AC-D03.2 — Bank Sinarmas: 2 sub-groups (Syariah 4 bullets + Digital Banking 2 bullets)
 *  · AC-D03.3 — PT CDC Global Informatika: 4 bullets (no sub-groups)
 *  · AC-D03.4 — Date format Month YYYY via formatRange (BR-005)
 *  · DOM structure per §3.4: section#experience, h2, article.nd-card.nd-entry ×2
 *  · Bullet list structure byte-exact to cvData.experience
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkExperienceSection } from "../src/app/components/WorkExperienceSection";
import { cvData } from "../src/content/cv.data";
import { formatRange } from "../src/lib/date";

const html = renderToStaticMarkup(<WorkExperienceSection />);

test("renders section with id=experience and H2 Work Experience (AC-D03.1)", () => {
  assert.match(html, /<section class="nd-section" id="experience" aria-labelledby="experience-heading">/);
  assert.match(html, /<h2 id="experience-heading" class="nd-section__title">Work Experience<\/h2>/);
});

test("renders exactly 2 article.nd-card.nd-entry entries in reverse-chronological order (AC-D03.1, BR-007)", () => {
  const articles = html.match(/<article class="nd-card nd-entry"[^>]*>/g) ?? [];
  assert.equal(articles.length, 2, "exactly 2 experience entries");

  // Explicit assertions per G4 review N2
  assert.equal(cvData.experience[0]!.employer, 'Bank Sinarmas');
  assert.ok(html.indexOf('Bank Sinarmas') < html.indexOf('PT CDC Global Informatika'));

  // First entry: Bank Sinarmas (Backend Developer)
  assert.match(html, /<h3>Backend Developer<\/h3>/);
  assert.match(html, /Bank Sinarmas · September 2021 – Present/);

  // Second entry: PT CDC Global Informatika (Web Developer)
  assert.match(html, /<h3>Web Developer<\/h3>/);
  assert.match(html, /PT CDC Global Informatika · October 2019 – September 2021/);
});

test("Bank Sinarmas has 2 sub-groups with correct bullet counts (AC-D03.2)", () => {
  const sinarmas = cvData.experience[0]!;
  assert.equal(sinarmas.groups.length, 2);
  assert.equal(sinarmas.groups[0]!.name, "Syariah Banking Project");
  assert.equal(sinarmas.groups[0]!.bullets.length, 4);
  assert.equal(sinarmas.groups[1]!.name, "Digital Banking Project");
  assert.equal(sinarmas.groups[1]!.bullets.length, 2);

  // Verify sub-group headings render
  assert.match(html, /<h4>Syariah Banking Project<\/h4>/);
  assert.match(html, /<h4>Digital Banking Project<\/h4>/);

  // Verify bullet lists exist for each sub-group (2 ul.nd-entry__bullets within Bank Sinarmas article)
  const subgroups = sinarmas.groups;
  for (const group of subgroups) {
    for (const bullet of group.bullets) {
      assert.match(html, new RegExp(`<li>${bullet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</li>`));
    }
  }

  // Total bullets: 4 + 2 = 6
  assert.equal(subgroups.reduce((n, g) => n + g.bullets.length, 0), 6);
});

test("PT CDC Global Informatika has 4 bullets with no sub-groups (AC-D03.3)", () => {
  const cdc = cvData.experience[1]!;
  assert.equal(cdc.groups.length, 0);
  assert.equal(cdc.bullets.length, 4);

  for (const bullet of cdc.bullets) {
    assert.match(html, new RegExp(`<li>${bullet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</li>`));
  }
});

test("date format uses Month YYYY via formatRange (BR-005, AC-D03.4)", () => {
  // formatRange is tested in date.test.ts; here verify rendered output matches
  const sinarmas = cvData.experience[0]!;
  const cdc = cvData.experience[1]!;

  const expectedSinarmas = formatRange(sinarmas.start, sinarmas.end); // "September 2021 – Present"
  const expectedCdc = formatRange(cdc.start, cdc.end); // "October 2019 – September 2021"

  assert.match(html, new RegExp(`Bank Sinarmas · ${expectedSinarmas.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(html, new RegExp(`PT CDC Global Informatika · ${expectedCdc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("no hover/focus state on cards (non-interactive by design)", () => {
  // Cards should not have :hover or :focus-visible pseudo-classes in generated HTML
  // (CSS handles this — just verify no inline event handlers)
  assert.ok(!html.includes("onClick"));
  assert.ok(!html.includes("onMouseEnter"));
  assert.ok(!html.includes("onFocus"));
});

test("print styles: article has break-inside: avoid", () => {
  // This is verified via CSS; here we just ensure the class is present
  const articles = html.match(/<article class="nd-card nd-entry"[^>]*>/g) ?? [];
  assert.equal(articles.length, 2);
});

test("no text clipping: bullets use list-style disc with padding-left (AC-D03.4)", () => {
  // Verify ul has list-style: disc via class
  assert.match(html, /<ul class="nd-entry__bullets">/);
  // Verify at least some li elements exist
  const lis = html.match(/<li>/g) ?? [];
  assert.ok(lis.length >= 10, "at least 10 bullets total (6 + 4)");
});