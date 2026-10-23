/**
 * tests/about.test.tsx — AboutTwoColumn component (TASK-203, TECH-SPEC v2.0 §3.3).
 *
 * Cakupan:
 *  · AC-D02.1 — bio byte-identik `cvData.profile.summary`
 *  · AC-D08.1 — tepat 2 tautan kontak (email, LinkedIn), 0 `tel:`, 0 unduh CV
 *  · Avatar rendering: 2 <img> (light/dark), alt="", aria-hidden="true", data-avatar
 *  · Accessible names: email visible text, LinkedIn aria-label "LinkedIn: <label>"
 *  · No phone, no download CV
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { AboutTwoColumn } from "../src/app/components/AboutTwoColumn";
import { cvData } from "../src/content/cv.data";
import { uiLabels } from "../src/content/ui.labels";

const html = renderToStaticMarkup(<AboutTwoColumn />);

test("renders section with id=about and H2 About Me (AC-D02.1)", () => {
  assert.match(html, /<section class="nd-section" id="about" aria-labelledby="about-heading">/);
  assert.match(html, /<h2 id="about-heading" class="nd-section__title">About Me<\/h2>/);
});

test("renders avatar wrapper with data-avatar and two img (light/dark)", () => {
  assert.match(html, /<div class="nd-about__avatar" data-avatar="">/);
  const light = html.match(/<img[^>]*class="nd-avatar--light"[^>]*>/);
  const dark = html.match(/<img[^>]*class="nd-avatar--dark"[^>]*>/);
  assert.ok(light, "avatar-light img missing");
  assert.ok(dark, "avatar-dark img missing");
  // both have alt="" and aria-hidden="true"
  assert.match(light[0], /alt=""/);
  assert.match(light[0], /aria-hidden="true"/);
  assert.match(dark[0], /alt=""/);
  assert.match(dark[0], /aria-hidden="true"/);
  // correct src and dimensions
  assert.match(light[0], /src="\/assets\/avatar-light\.png"/);
  assert.match(light[0], /width="160"/);
  assert.match(light[0], /height="160"/);
  assert.match(light[0], /decoding="async"/);
  assert.match(dark[0], /src="\/assets\/avatar-dark\.png"/);
  assert.match(dark[0], /width="160"/);
  assert.match(dark[0], /height="160"/);
});

test("bio text is byte-identical to cvData.profile.summary (AC-D02.1)", () => {
  const summaryMatch = html.match(/<p data-summary="">([\s\S]*?)<\/p>/);
  assert.ok(summaryMatch, "bio paragraph missing");
  assert.equal(summaryMatch[1], cvData.profile.summary);
});

test("exactly 2 contact links: email and linkedin (AC-D08.1)", () => {
  const emailLinks = html.match(/<a[^>]*data-contact-link="email"[^>]*>/g) ?? [];
  const linkedinLinks = html.match(/<a[^>]*data-contact-link="linkedin"[^>]*>/g) ?? [];
  assert.equal(emailLinks.length, 1, "exactly one email link");
  assert.equal(linkedinLinks.length, 1, "exactly one linkedin link");
  // no phone, no download CV
  assert.ok(!html.includes('href="tel:'), "no tel: link rendered");
  assert.ok(!html.includes('href="/fakhriramdani-cv.pdf"'), "no CV download link");
});

test("email link has correct href and visible label (no aria-label needed)", () => {
  const email = cvData.contacts.find((c) => c.kind === "email")!;
  const expectedHref = email.href;
  const expectedVisible = `${uiLabels.about.emailLabel}: ${email.label}`;
  const match = html.match(/<a[^>]*data-contact-link="email"[^>]*>([\s\S]*?)<\/a>/);
  assert.ok(match, "email link missing");
  assert.match(match[0], new RegExp(`href="${expectedHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(match[1]!.replace(/\s+/g, " "), new RegExp(expectedVisible.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("linkedin link has correct href, target, rel, aria-label, and arrow", () => {
  const linkedin = cvData.contacts.find((c) => c.kind === "linkedin")!;
  const expectedHref = linkedin.href;
  const expectedAriaLabel = `${uiLabels.about.linkedinLabel}: ${linkedin.label}`;
  const expectedVisibleHtml = `${uiLabels.about.linkedinLabel}: ${linkedin.label} <span aria-hidden="true">${uiLabels.about.externalArrow}</span>`;
  const match = html.match(/<a[^>]*data-contact-link="linkedin"[^>]*>([\s\S]*?)<\/a>/);
  assert.ok(match, "linkedin link missing");
  assert.match(match[0], new RegExp(`href="${expectedHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(match[0], /target="_blank"/);
  assert.match(match[0], /rel="noopener noreferrer"/);
  assert.match(match[0], new RegExp(`aria-label="${expectedAriaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  // inner HTML includes the span with aria-hidden arrow
  assert.match(match[1]!.replace(/\s+/g, " "), new RegExp(expectedVisibleHtml.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // arrow is aria-hidden
  assert.match(match[1]!, /<span aria-hidden="true">↗<\/span>/);
});

test("avatar CSS display rules prevent specificity collision in light mode", () => {
  const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
  assert.ok(
    !/\.nd-about__avatar\s+img\s*\{[^}]*display:\s*block/m.test(css),
    ".nd-about__avatar img must not declare display: block (overrides .nd-avatar--dark { display: none } in light mode)",
  );
  assert.match(css, /\.nd-avatar--light\s*\{[^}]*display:\s*block/);
  assert.match(css, /\.nd-avatar--dark\s*\{[^}]*display:\s*none/);
});
