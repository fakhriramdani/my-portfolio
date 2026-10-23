import { test } from "node:test";
import assert from "node:assert/strict";
import { cvData } from "../src/content/cv.data";
import { uiLabels } from "../src/content/ui.labels";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

test("header identity strings are exact (BR-001)", () => {
  assert.equal(cvData.profile.fullName, "Fakhri Ramdani");
  assert.equal(cvData.profile.headline, "Software Engineer");
  assert.equal(cvData.profile.location, "West Jakarta, DKI Jakarta");
});

test("exactly 2 contacts in email→linkedin order (BR-002…004, CR-2)", () => {
  assert.deepEqual(
    cvData.contacts.map((c) => c.kind),
    ["email", "linkedin"],
  );
});

test("no phone contact entry exists in content data (BR-002, CR-2, D-067)", () => {
  const phone = (cvData.contacts as Array<{ kind: string }>).find((c) => c.kind === "phone");
  assert.equal(phone, undefined, "contacts must not contain phone entry");
});

test("email is lowercase (BR-003)", () => {
  const email = cvData.contacts.find((c) => c.kind === "email")!;
  assert.equal(email.label, "fakhriramdani1@gmail.com");
  assert.equal(email.href, "mailto:fakhriramdani1@gmail.com");
});

test("linkedin href is the pinned URL (BR-004)", () => {
  const li = cvData.contacts.find((c) => c.kind === "linkedin")!;
  assert.equal(li.href, "https://www.linkedin.com/in/fakhri-ramdani-183769ab");
});

test("experience: 2 entries, reverse-chronological (BR-007, AC-004.1)", () => {
  assert.equal(cvData.experience.length, 2);
  assert.equal(cvData.experience[0]!.employer, "Bank Sinarmas");
  assert.equal(cvData.experience[1]!.employer, "PT CDC Global Informatika");
  assert.equal(cvData.experience[0]!.start, "2021-09");
  assert.equal(cvData.experience[1]!.start, "2019-10");
});

test("Bank Sinarmas sub-groups order + bullet counts (AC-004.3, AC-004.4)", () => {
  const [sinarmas] = cvData.experience;
  assert.equal(sinarmas!.groups.length, 2);
  assert.equal(sinarmas!.groups[0]!.name, "Syariah Banking Project");
  assert.equal(sinarmas!.groups[1]!.name, "Digital Banking Project");
  assert.equal(sinarmas!.groups[0]!.bullets.length, 4);
  assert.equal(sinarmas!.groups[1]!.bullets.length, 2);
  assert.equal(sinarmas!.groups.reduce((n, g) => n + g.bullets.length, 0), 6);
});

test("CDC has 4 bullets (AC-004.4)", () => {
  const cdc = cvData.experience[1]!;
  assert.equal(cdc.bullets.length, 4);
});

test("education content (AC-005.1, AC-005.2)", () => {
  assert.equal(cvData.education.length, 1);
  const edu = cvData.education[0]!;
  assert.equal(edu.degree, "Bachelor's Degree in Informatics Engineering");
  assert.equal(edu.institution, "Indonesia Computer University (UNIKOM)");
  assert.equal(edu.highlights.length, 2);
});

test("skills: 14 hard + 6 soft, unique (AC-006.1)", () => {
  const hard = cvData.skills.filter((s) => s.category === "hard");
  const soft = cvData.skills.filter((s) => s.category === "soft");
  assert.equal(hard.length, 14);
  assert.equal(soft.length, 6);
  const names = cvData.skills.map((s) => s.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, "duplicate skill names");
});

test("proficiency levels only where declared (BR-008, AC-006.2)", () => {
  const hard = cvData.skills.filter((s) => s.category === "hard");
  const advanced = hard.filter((s) => s.level === "Advanced").map((s) => s.name);
  const intermediate = hard
    .filter((s) => s.level === "Intermediate")
    .map((s) => s.name);
  const unlabelled = hard.filter((s) => s.level === null).map((s) => s.name);

  assert.deepEqual(advanced, [
    "Go",
    "Git",
    "PostgreSQL",
    "MySQL",
    "SQL Server",
  ]);
  assert.deepEqual(intermediate, [
    "Java / Spring Boot",
    "ASP.NET",
    "PHP / CakePHP",
    "Docker",
  ]);
  assert.equal(unlabelled.length, 5);
});

test("languages (AC-007.1)", () => {
  assert.deepEqual(cvData.languages, [
    { name: "English", proficiency: "Fluent" },
    { name: "Indonesian", proficiency: "Native" },
  ]);
});

test("site meta lengths (AC-011.1)", () => {
  assert.ok(cvData.site.title.length <= 60);
  assert.ok(cvData.site.description.length >= 120);
  assert.ok(cvData.site.description.length <= 160);
  assert.equal(cvData.site.cvPdf, "/fakhriramdani-cv.pdf");
});

test("summary verbatim numeric token: only '5' in '5+ years' (AC-003.3)", () => {
  const nums = cvData.profile.summary.match(/\d+/g) ?? [];
  assert.deepEqual(nums, ["5"]);
});


// ---------------------------------------------------------------------------
// TASK-205: Content Model v2 Tests
// ---------------------------------------------------------------------------

test("v2 projects: exactly 5 projects with valid structure, employers, tags (AC-D06.1–.3, BR-013)", () => {
  assert.equal(cvData.projects.length, 5);
  const employers = new Set(cvData.experience.map((e) => e.employer));
  const ids = new Set();
  const WHITELIST_14 = [
    "Go", "Git", "PostgreSQL", "MySQL", "SQL Server",
    "Java / Spring Boot", "ASP.NET", "PHP / CakePHP", "Docker",
    "Oracle Database", "REST API Design", "OpenAPI/Swagger",
    "Unit Testing (Mockery)", "CI/CD"
  ];

  for (const p of cvData.projects) {
    assert.ok(p.id && p.id.length > 0);
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(employers.has(p.employer), `unknown employer ${p.employer}`);
    assert.ok(p.summary.length >= 80 && p.summary.length <= 240, `summary length ${p.summary.length}`);
    assert.ok(p.description.length >= 150 && p.description.length <= 1200, `desc length ${p.description.length}`);
    assert.ok(p.tags.length >= 2 && p.tags.length <= 4, `tags length ${p.tags.length}`);
    for (const tag of p.tags) {
      assert.ok(WHITELIST_14.includes(tag), `tag ${tag} not in whitelist`);
    }
  }
});

test("v2 skillGroups: exactly 4 groups partitioning 14 hard + 6 soft skills (AC-D04.1–.2)", () => {
  assert.equal(cvData.skillGroups.length, 4);
  const titles = cvData.skillGroups.map((g) => g.title);
  assert.deepEqual(titles, [
    "Backend Languages & Frameworks",
    "Databases & Storage Engines",
    "API Design & DevOps Tools",
    "Professional & Interpersonal Skills"
  ]);
  const allSkills = cvData.skills.map((s) => s.name);
  const partitioned = cvData.skillGroups.flatMap((g) => g.skills);
  assert.equal(partitioned.length, 20);
  assert.deepEqual(new Set(partitioned), new Set(allSkills));
});

test("v2 educationCards: exactly 3 cards (degree, award, innovation) (AC-D05.1)", () => {
  assert.equal(cvData.educationCards.length, 3);
  assert.match(cvData.educationCards[0]!.title, /Bachelor/);
  assert.match(cvData.educationCards[1]!.title, /Robogames/);
  assert.match(cvData.educationCards[2]!.title, /Robot Icon/);
});

test("v2 languageCards: exactly 2 cards with proficiency strings (AC-D12.1)", () => {
  assert.equal(cvData.languageCards.length, 2);
  assert.equal(cvData.languageCards[0]!.name, "English");
  assert.equal(cvData.languageCards[0]!.proficiency, "Fluent");
  assert.equal(cvData.languageCards[1]!.name, "Indonesian");
  assert.equal(cvData.languageCards[1]!.proficiency, "Native");
});

test("v2 uiLabels: complete v2 english labels defined (sections, tabs, modal)", () => {
  assert.equal(uiLabels.sections.experience, "Work Experience");
  assert.equal(uiLabels.sections.database, "Projects, Skills, Education and Language");
  assert.match(uiLabels.sections.footer, /©/);
  assert.equal(uiLabels.tabs.projects, "Projects");
  assert.equal(uiLabels.tabs.skills, "Skills");
  assert.equal(uiLabels.tabs.education, "Education");
  assert.equal(uiLabels.tabs.language, "Language");
  assert.equal(uiLabels.modal.close, "Close");
  assert.equal(uiLabels.modal.sourceLabel, "Source");
  assert.equal(uiLabels.modal.keyTechnologies, "Key Technologies");
});

/* ------------------------------------------------------------------ negative
   Guard negative fixture tests per TECH-SPEC §6.1 DoD. */

const ROOT = path.resolve(__dirname, "..");

function makeContentFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-guard-"));
  for (const entry of ["scripts", "src", "public"]) {
    fs.cpSync(path.join(ROOT, entry), path.join(dir, entry), {
      recursive: true,
    });
  }
  fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "junction");
  return dir;
}

function runContentGuard(dir: string): { status: number | null; output: string } {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx/esm", path.join(dir, "scripts", "validate-content.ts")],
    { cwd: dir, encoding: "utf8" },
  );
  const stdout = result.stdout ? String(result.stdout) : "";
  const stderr = result.stderr ? String(result.stderr) : "";
  return {
    status: result.status,
    output: [stdout, stderr].join("\n"),
  };
}

function patchFile(file: string, find: RegExp | string, replace: string): void {
  const content = fs.readFileSync(file, "utf8");
  const next = content.replace(find, replace);
  if (next === content) {
    throw new Error("patch failed: pattern not found");
  }
  fs.writeFileSync(file, next, "utf8");
}

test("guard fails when project count != 5 (E_PROJECT)", () => {
  const dir = makeContentFixture();
  try {
    const file = path.join(dir, "src", "content", "cv.data.ts");
    patchFile(file, /id: "syariah-banking-display",/, "// id dropped");
    patchFile(file, /projects: \[\s*\{[\s\S]*?\},/, "projects: [");
    const { status, output } = runContentGuard(dir);
    assert.equal(status, 1);
    assert.match(output, /E_PROJECT: exactly 5 projects required/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("guard fails when project tag is not in whitelist (E_TAGS)", () => {
  const dir = makeContentFixture();
  try {
    const file = path.join(dir, "src", "content", "cv.data.ts");
    patchFile(file, /"PostgreSQL", "Docker", "Git"/, '"PostgreSQL", "Docker", "Kubernetes"');
    const { status, output } = runContentGuard(dir);
    assert.equal(status, 1);
    assert.match(output, /E_TAGS: tag "Kubernetes" in project syariah-banking-display is not in the 14-item tech whitelist/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("guard fails when skill partition is incomplete (E_SKILL_PARTITION)", () => {
  const dir = makeContentFixture();
  try {
    const file = path.join(dir, "src", "content", "cv.data.ts");
    patchFile(file, /"Go", "Java \/ Spring Boot"/, '"Java / Spring Boot"');
    const { status, output } = runContentGuard(dir);
    assert.equal(status, 1);
    assert.match(output, /E_SKILL_PARTITION: skill "Go" must appear in exactly one group/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("guard fails when educationCards count != 3 (E_EDU_CARDS)", () => {
  const dir = makeContentFixture();
  try {
    const file = path.join(dir, "src", "content", "cv.data.ts");
    patchFile(file, /educationCards: \[\s*\{[\s\S]*?\},/, "educationCards: [");
    const { status, output } = runContentGuard(dir);
    assert.equal(status, 1);
    assert.match(output, /E_EDU_CARDS: exactly 3 education cards required/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("guard fails when educationCards highlight is corrupted (E_EDU_CARDS)", () => {
  const dir = makeContentFixture();
  try {
    const file = path.join(dir, "src", "content", "cv.data.ts");
    patchFile(file, /Silver Medal in the Robo Speeder/, 'Bronze Medal in Chess');
    const { status, output } = runContentGuard(dir);
    assert.equal(status, 1);
    assert.match(output, /E_EDU_CARDS: highlight must appear in exactly one education card/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("guard fails when languageCards count != 2 (E_LANG)", () => {
  const dir = makeContentFixture();
  try {
    const file = path.join(dir, "src", "content", "cv.data.ts");
    patchFile(file, /languageCards: \[\s*\{[\s\S]*?\},/, "languageCards: [");
    const { status, output } = runContentGuard(dir);
    assert.equal(status, 1);
    assert.match(output, /E_LANG: exactly 2 language cards required/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
