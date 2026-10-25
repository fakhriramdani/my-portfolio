import { cvData } from '../src/content/cv.data.ts';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

// 14-item tech whitelist from PRD v1.2 §12.6
const TECH_WHITELIST = new Set([
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
]);

// 20 skills (14 hard + 6 soft) from cvData.skills
function runValidation() {
  const ALL_SKILLS = cvData.skills.map(s => s.name);
  const p = cvData.profile;
  if (!p.fullName || p.fullName !== "Fakhri Ramdani") {
    fail("E_CONTENT: profile.fullName is required");
  }
  if (!p.headline) {
    fail("E_CONTENT: profile.headline is required");
  }
  if (!p.location) {
    fail("E_CONTENT: profile.location is required");
  }
  if (!p.summary || typeof p.summary !== "string") {
    fail("E_CONTENT: profile.summary is required");
  }
  if (p.summary.length < 200 || p.summary.length > 900) {
    fail(`E_CONTENT: profile.summary length must be 200-900 (got ${p.summary.length})`);
  }

  // Contacts (CR-2 / D-067: exactly 2 contacts, email then linkedin)
  if (!Array.isArray(cvData.contacts) || cvData.contacts.length !== 2) {
    fail("E_CONTACT: exactly 2 contacts required (email, linkedin)");
  }
  const kinds = cvData.contacts.map(c => c.kind);
  if (kinds[0] !== 'email' || kinds[1] !== 'linkedin') {
    fail("E_CONTACT: kind must be email or linkedin");
  }
  for (const c of cvData.contacts) {
    if (!c.label) fail(`E_CONTACT: label is required for ${c.kind}`);
    if (c.kind === 'email' && !/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(c.href)) {
      fail("E_CONTACT: href must be mailto: or an https:// LinkedIn URL");
    }
    if (c.kind === 'linkedin' && !/^https:\/\/www\.linkedin\.com\/in\/[a-z0-9-]+$/.test(c.href)) {
      fail("E_CONTACT: href must be mailto: or an https:// LinkedIn URL");
    }
  }

  // Experience
  if (!Array.isArray(cvData.experience) || cvData.experience.length < 1) {
    fail("E_EXPERIENCE: at least 1 entry required");
  }
  for (const exp of cvData.experience) {
    if (!exp.employer) fail("E_EXPERIENCE: employer is required");
    if (!exp.role) fail("E_EXPERIENCE: role is required");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(exp.start)) {
      fail("E_EXPERIENCE: start must match YYYY-MM");
    }
    if (exp.end !== null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(exp.end)) {
      fail("E_EXPERIENCE: end must match YYYY-MM or be null");
    }
    if (exp.groups && exp.groups.length > 0) {
      for (const g of exp.groups) {
        if (!g.name) fail("E_GROUP: name is required");
        if (!Array.isArray(g.bullets) || g.bullets.length < 1 || g.bullets.length > 8) {
          fail("E_GROUP: bullets must contain 1-8 items");
        }
      }
    }
  }

  // Education
  if (!Array.isArray(cvData.education) || cvData.education.length < 1) {
    fail("E_EDUCATION: at least 1 entry required");
  }
  for (const edu of cvData.education) {
    if (!edu.degree) fail("E_EDUCATION: degree is required");
    if (!edu.institution) fail("E_EDUCATION: institution is required");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(edu.start) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(edu.end)) {
      fail("E_EDUCATION: start and end must match YYYY-MM");
    }
    if (!Array.isArray(edu.highlights) || edu.highlights.length < 1 || edu.highlights.length > 5) {
      fail("E_EDUCATION: highlights must contain 1-5 items");
    }
  }

  // Skills
  const skillNames = new Set<string>();
  for (const s of cvData.skills) {
    const lower = s.name.toLowerCase();
    if (skillNames.has(lower)) {
      fail(`E_SKILL: duplicate skill name "${s.name}"`);
    }
    skillNames.add(lower);
    if (s.category !== 'hard' && s.category !== 'soft') {
      fail("E_SKILL: category must be hard or soft");
    }
    if (s.level !== null && s.level !== 'Advanced' && s.level !== 'Intermediate') {
      fail("E_SKILL: level must be Advanced, Intermediate, or null");
    }
  }

  // Languages
  for (const l of cvData.languages) {
    if (!l.name) fail("E_LANGUAGE: name is required");
    if (!l.proficiency) fail("E_LANGUAGE: proficiency is required");
  }

  // Site Meta & Asset check
  const site = cvData.site;
  if (!site.title || site.title.length < 10 || site.title.length > 60) {
    fail(`E_META: title length must be 10-60 (got ${site.title?.length})`);
  }
  if (!site.description || site.description.length < 120 || site.description.length > 160) {
    fail(`E_META: description length must be 120-160 (got ${site.description?.length})`);
  }

  // ==================== TASK-205: New v2 Guards ====================

  // E_PROJECT: exactly 5 projects required
  if (!Array.isArray(cvData.projects) || cvData.projects.length !== 5) {
    fail(`E_PROJECT: exactly 5 projects required (got ${cvData.projects?.length ?? 0})`);
  }

  // E_PROJECT_FIELD: required field check
  // E_PROJECT_SUMMARY: summary length 80-240
  // E_PROJECT_DESC: description length 240-1200
  // E_PROJECT_TAGS: tags length 2-4
  // E_TAGS: tag must be in 14 whitelist
  // E_PROJECT_EMPLOYER: employer must exist in cvData.experience
  // E_PROJECT_ID: unique id check
  const employerSet = new Set(cvData.experience.map(e => e.employer));
  const projectIds = new Set<string>();
  for (const proj of cvData.projects) {
    // E_PROJECT_FIELD
    const requiredFields = ['id', 'title', 'employer', 'role', 'period', 'source', 'summary', 'description', 'tags'] as const;
    for (const field of requiredFields) {
      if (!proj[field] || (Array.isArray(proj[field]) && proj[field].length === 0)) {
        fail(`E_PROJECT_FIELD: project ${proj.id ?? 'unknown'} missing ${field}`);
      }
    }

    // E_PROJECT_SUMMARY
    if (proj.summary.length < 80 || proj.summary.length > 240) {
      fail(`E_PROJECT_SUMMARY: project ${proj.id} summary length must be 80-240 (got ${proj.summary.length})`);
    }

    // E_PROJECT_DESC
    if (proj.description.length < 150 || proj.description.length > 1200) {
      fail(`E_PROJECT_DESC: project ${proj.id} description length must be 150-1200 (got ${proj.description.length})`);
    }

    // E_PROJECT_TAGS
    if (proj.tags.length < 2 || proj.tags.length > 4) {
      fail(`E_PROJECT_TAGS: project ${proj.id} must have 2-4 tags (got ${proj.tags.length})`);
    }

    // E_TAGS
    for (const tag of proj.tags) {
      if (!TECH_WHITELIST.has(tag)) {
        fail(`E_TAGS: tag "${tag}" in project ${proj.id} is not in the 14-item tech whitelist`);
      }
    }

    // E_PROJECT_EMPLOYER
    if (!employerSet.has(proj.employer)) {
      fail(`E_PROJECT_EMPLOYER: project ${proj.id} employer "${proj.employer}" not found in experience[]`);
    }

    // E_PROJECT_ID
    if (projectIds.has(proj.id)) {
      fail(`E_PROJECT_ID: duplicate project id "${proj.id}"`);
    }
    projectIds.add(proj.id);
  }

  // E_SKILL_GROUP: exactly 4 skill groups
  if (!Array.isArray(cvData.skillGroups) || cvData.skillGroups.length !== 4) {
    fail(`E_SKILL_GROUP: exactly 4 skill groups required (got ${cvData.skillGroups?.length ?? 0})`);
  }

  // E_SKILL_PARTITION: each of the 20 skills appears in exactly 1 group
  const skillCount = new Map<string, number>();
  for (const group of cvData.skillGroups) {
    for (const skill of group.skills) {
      skillCount.set(skill, (skillCount.get(skill) ?? 0) + 1);
    }
  }
  for (const skill of ALL_SKILLS) {
    const count = skillCount.get(skill) ?? 0;
    if (count !== 1) {
      fail(`E_SKILL_PARTITION: skill "${skill}" must appear in exactly one group (found ${count})`);
    }
  }
  // Also check for skills not in ALL_SKILLS
  for (const [skill, count] of skillCount) {
    if (!ALL_SKILLS.includes(skill)) {
      fail(`E_SKILL_PARTITION: skill "${skill}" must appear in exactly one group (found ${count})`);
    }
  }

  // E_EDU_CARDS: exactly 3 education cards and 1:1 mapping of education[0].highlights
  if (!Array.isArray(cvData.educationCards) || cvData.educationCards.length !== 3) {
    fail(`E_EDU_CARDS: exactly 3 education cards required (got ${cvData.educationCards?.length ?? 0})`);
  }
  const highlights = cvData.education[0]?.highlights ?? [];
  for (const h of highlights) {
    const matching = cvData.educationCards.filter(c => c.description.includes(h));
    if (matching.length !== 1) {
      fail(`E_EDU_CARDS: highlight must appear in exactly one education card (found ${matching.length})`);
    }
  }

  // E_CONTACT: exactly 2 rendered contacts (email, linkedin)
  const renderedContacts = cvData.contacts;
  if (renderedContacts.length !== 2) {
    fail("E_CONTACT: exactly 2 rendered contacts required (email, linkedin)");
  }
  const renderedKinds = renderedContacts.map(c => c.kind);
  if (!renderedKinds.includes('email') || !renderedKinds.includes('linkedin')) {
    fail("E_CONTACT: exactly 2 rendered contacts required (email, linkedin)");
  }

  // E_LANG: exactly 2 language cards
  if (!Array.isArray(cvData.languageCards) || cvData.languageCards.length !== 2) {
    fail(`E_LANG: exactly 2 language cards required (got ${cvData.languageCards?.length ?? 0})`);
  }

  console.log("OK: Content validation passed successfully.");
}

runValidation();
