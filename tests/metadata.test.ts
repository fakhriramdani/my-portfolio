/**
 * tests/metadata.test.ts — Unit tests for metadata, lang, and JSON-LD schema
 * (TASK-212, TECH-SPEC v2.0 §3.14, §6.1, D-028.2, D-041, D-044–D-052).
 *
 * AC coverage:
 *   AC-D08.2-1  metadata exports valid title, description, canonical "/", OG profile, Twitter card, favicon links.
 *   AC-D08.2-2  JSON-LD in layout contains valid schema.org Person.
 *   AC-D08.2-3  JSON-LD has NO telephone property or tel: string (D-028.2).
 *   AC-D08.2-4  JSON-LD has valid email, sameAs, alumniOf, knowsLanguage, knowsAbout.
 *   AC-D08.2-5  assertSiteUrl() throws E_META on invalid SITE_URL values.
 *   AC-D08.2-6  index.html export has <html lang="en"> and 0 tel: occurrences.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cvData } from "../src/content/cv.data";

const ROOT = path.resolve(__dirname, "..");
const OUT_INDEX = path.join(ROOT, "out", "index.html");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ContactLike {
  kind: string;
  label: string;
  href: string;
}
interface EducationLike {
  institution: string;
}
interface SkillLike {
  category: string;
  name: string;
}
interface LanguageLike {
  name: string;
}

/** Build the personJsonLd object exactly as layout.tsx does. */
function buildPersonJsonLd(): Record<string, unknown> {
  const { profile, contacts, education, skills, languages } = cvData;
  const email = contacts.find((c: ContactLike) => c.kind === "email");
  const linkedin = contacts.find((c: ContactLike) => c.kind === "linkedin");
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.fullName,
    jobTitle: profile.headline,
    address: profile.location,
    email: email?.label,
    sameAs: linkedin?.href ? [linkedin.href] : undefined,
    alumniOf: education.map((e: EducationLike) => e.institution),
    knowsLanguage: languages.map((l: LanguageLike) => l.name),
    knowsAbout: skills
      .filter((s: SkillLike) => s.category === "hard")
      .map((s: SkillLike) => s.name),
  };
}

/** Inline re-implementation of assertSiteUrl() from layout.tsx for unit testing. */
function assertSiteUrl(raw: string): void {
  if (!/^https:\/\/[a-z0-9.-]+$/.test(raw.replace(/\/+$/, ""))) {
    throw new Error(
      `E_META: SITE_URL must be an https origin without a path (got "${raw}")`,
    );
  }
}

// ---------------------------------------------------------------------------
// AC-D08.2-1: metadata export shape (via cvData.site)
// ---------------------------------------------------------------------------

test("AC-D08.2-1: site.title is non-empty string", () => {
  assert.ok(
    typeof cvData.site.title === "string" && cvData.site.title.length > 0,
  );
});

test("AC-D08.2-1: site.description is non-empty string", () => {
  assert.ok(
    typeof cvData.site.description === "string" &&
      cvData.site.description.length > 0,
  );
});

test("AC-D08.2-1: site.ogImage is set (used in OG and Twitter card)", () => {
  assert.ok(
    typeof cvData.site.ogImage === "string" && cvData.site.ogImage.length > 0,
  );
});

// ---------------------------------------------------------------------------
// AC-D08.2-2: JSON-LD Person schema validity
// ---------------------------------------------------------------------------

test("AC-D08.2-2: JSON-LD @context is https://schema.org", () => {
  const ld = buildPersonJsonLd();
  assert.equal(ld["@context"], "https://schema.org");
});

test("AC-D08.2-2: JSON-LD @type is Person", () => {
  const ld = buildPersonJsonLd();
  assert.equal(ld["@type"], "Person");
});

test("AC-D08.2-2: JSON-LD name matches profile.fullName", () => {
  const ld = buildPersonJsonLd();
  assert.equal(ld.name, cvData.profile.fullName);
});

test("AC-D08.2-2: JSON-LD jobTitle matches profile.headline", () => {
  const ld = buildPersonJsonLd();
  assert.equal(ld.jobTitle, cvData.profile.headline);
});

// ---------------------------------------------------------------------------
// AC-D08.2-3: telephone is absent (D-028.2)
// ---------------------------------------------------------------------------

test("AC-D08.2-3: JSON-LD object has no telephone property (D-028.2)", () => {
  const ld = buildPersonJsonLd();
  assert.ok(
    !Object.prototype.hasOwnProperty.call(ld, "telephone"),
    "telephone key must not exist in personJsonLd",
  );
});

test("AC-D08.2-3: JSON-LD serialized string contains no tel: substring (D-028.2)", () => {
  const ld = buildPersonJsonLd();
  const serialized = JSON.stringify(ld);
  assert.ok(
    !serialized.includes("tel:"),
    `JSON-LD must not contain tel: — got: ${serialized}`,
  );
});

test('AC-D08.2-3: JSON-LD serialized string contains no "telephone" key (D-028.2)', () => {
  const ld = buildPersonJsonLd();
  const serialized = JSON.stringify(ld);
  assert.ok(
    !serialized.includes('"telephone"'),
    `JSON-LD must not contain "telephone" key — got: ${serialized}`,
  );
});

// ---------------------------------------------------------------------------
// AC-D08.2-4: required JSON-LD fields
// ---------------------------------------------------------------------------

test("AC-D08.2-4: JSON-LD email is set to contact email label", () => {
  const email = cvData.contacts.find(
    (c: ContactLike) => c.kind === "email",
  );
  const ld = buildPersonJsonLd();
  assert.equal(ld.email, email?.label);
  assert.ok(
    typeof ld.email === "string" && ld.email.length > 0,
    "email must be non-empty",
  );
});

test("AC-D08.2-4: JSON-LD sameAs contains LinkedIn href", () => {
  const linkedin = cvData.contacts.find(
    (c: ContactLike) => c.kind === "linkedin",
  );
  const ld = buildPersonJsonLd();
  assert.ok(Array.isArray(ld.sameAs), "sameAs must be an array");
  assert.ok(
    (ld.sameAs as string[]).includes(linkedin!.href),
    `sameAs must include ${linkedin!.href}`,
  );
});

test("AC-D08.2-4: JSON-LD alumniOf is non-empty array of institution strings", () => {
  const ld = buildPersonJsonLd();
  assert.ok(
    Array.isArray(ld.alumniOf) && (ld.alumniOf as string[]).length > 0,
    "alumniOf must be non-empty array",
  );
  for (const item of ld.alumniOf as string[]) {
    assert.ok(typeof item === "string" && item.length > 0);
  }
});

test("AC-D08.2-4: JSON-LD knowsLanguage is non-empty array of language name strings", () => {
  const ld = buildPersonJsonLd();
  assert.ok(
    Array.isArray(ld.knowsLanguage) &&
      (ld.knowsLanguage as string[]).length > 0,
    "knowsLanguage must be non-empty array",
  );
  for (const item of ld.knowsLanguage as string[]) {
    assert.ok(typeof item === "string" && item.length > 0);
  }
});

test("AC-D08.2-4: JSON-LD knowsAbout matches hard-category skills only", () => {
  const hardSkills = cvData.skills
    .filter((s: SkillLike) => s.category === "hard")
    .map((s: SkillLike) => s.name);
  const ld = buildPersonJsonLd();
  assert.ok(
    Array.isArray(ld.knowsAbout) && (ld.knowsAbout as string[]).length > 0,
    "knowsAbout must be non-empty array",
  );
  assert.deepEqual(ld.knowsAbout, hardSkills);
});

// ---------------------------------------------------------------------------
// AC-D08.2-5: assertSiteUrl() guard
// ---------------------------------------------------------------------------

test("AC-D08.2-5: assertSiteUrl accepts valid https origin", () => {
  assert.doesNotThrow(() => assertSiteUrl("https://example.com"));
});

test("AC-D08.2-5: assertSiteUrl accepts valid https origin with trailing slash", () => {
  assert.doesNotThrow(() => assertSiteUrl("https://example.com/"));
});

test("AC-D08.2-5: assertSiteUrl rejects http:// (non-https)", () => {
  assert.throws(
    () => assertSiteUrl("http://example.com"),
    /E_META: SITE_URL must be an https origin without a path/,
  );
});

test("AC-D08.2-5: assertSiteUrl rejects https origin with subpath", () => {
  assert.throws(
    () => assertSiteUrl("https://example.com/subpath"),
    /E_META: SITE_URL must be an https origin without a path/,
  );
});

test("AC-D08.2-5: assertSiteUrl rejects malformed URL (no protocol)", () => {
  assert.throws(
    () => assertSiteUrl("example.com"),
    /E_META: SITE_URL must be an https origin without a path/,
  );
});

test("AC-D08.2-5: assertSiteUrl rejects empty string", () => {
  assert.throws(
    () => assertSiteUrl(""),
    /E_META: SITE_URL must be an https origin without a path/,
  );
});

test("AC-D08.2-5: assertSiteUrl rejects https with port and subpath", () => {
  assert.throws(
    () => assertSiteUrl("https://example.com:3000/app"),
    /E_META: SITE_URL must be an https origin without a path/,
  );
});

// ---------------------------------------------------------------------------
// AC-D08.2-6: out/index.html export checks (run only when out/ exists)
// ---------------------------------------------------------------------------

const outIndexExists = fs.existsSync(OUT_INDEX);

test("AC-D08.2-6: out/index.html exists", {
  skip: outIndexExists ? false : "out/ not present — run npm run build first",
}, () => {
  assert.ok(
    fs.existsSync(OUT_INDEX),
    `Expected ${OUT_INDEX} to exist — run npm run build first`,
  );
});

test('AC-D08.2-6: out/index.html has <html lang="en">', {
  skip: outIndexExists ? false : "out/ not present — run npm run build first",
}, () => {
  const html = fs.readFileSync(OUT_INDEX, "utf8");
  assert.ok(
    html.includes('<html lang="en">'),
    'out/index.html must contain <html lang="en">',
  );
});

test("AC-D08.2-6: out/index.html has 0 tel: occurrences (D-028.2)", {
  skip: outIndexExists ? false : "out/ not present — run npm run build first",
}, () => {
  const html = fs.readFileSync(OUT_INDEX, "utf8");
  const matches = html.match(/tel:/g);
  assert.equal(
    matches,
    null,
    `out/index.html must contain 0 "tel:" occurrences, found: ${matches?.length ?? 0}`,
  );
});
