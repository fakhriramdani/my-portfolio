import React from "react";
import { uiLabels } from "@/content/ui.labels";
import { ProjectsPanel } from "./ProjectsPanel";
import { SkillsPanel } from "./SkillsPanel";
import { EducationPanel } from "./EducationPanel";
import { LanguagePanel } from "./LanguagePanel";

export interface DatabaseViewProps {
  projectsContent?: React.ReactNode;
  skillsContent?: React.ReactNode;
  educationContent?: React.ReactNode;
  languageContent?: React.ReactNode;
}

/**
 * DatabaseView — pure HTML-first, 0 KB JS baseline tab navigation (TECH-SPEC v2.0 §3.5).
 *
 * Implements 4-panel switching via native radio inputs + CSS :has().
 * Accessible markup:
 *  - Section with sr-only H2 (AC-D09.1)
 *  - role="radiogroup" on TabBar (AC-D09.2)
 *  - Native <input type="radio"> controls for keyboard navigation
 *  - Associated <label> elements for click targets and visual pills
 *  - Decorative icon glyphs wrapped in aria-hidden="true" (CR Nit N2)
 *  - 4 panels with data-tab-panel and aria-labelledby
 *  - Hidden attribute on non-active panels in initial HTML for a11y
 */
export function DatabaseView({
  projectsContent = <ProjectsPanel />,
  skillsContent = <SkillsPanel />,
  educationContent = <EducationPanel />,
  languageContent = <LanguagePanel />,
}: DatabaseViewProps = {}) {
  return (
    <section
      className="nd-db"
      id="database"
      aria-labelledby="database-heading"
      data-database-view
    >
      <h2 id="database-heading" className="nd-sr-only">
        {uiLabels.sections.database}
      </h2>
      <div
        className="nd-tabbar"
        role="radiogroup"
        aria-label="Database view"
        data-tabbar
      >
        <input
          className="nd-sr-only"
          type="radio"
          name="dbview"
          id="tab-projects"
          value="projects"
          defaultChecked
          data-tab-input
        />
        <input
          className="nd-sr-only"
          type="radio"
          name="dbview"
          id="tab-skills"
          value="skills"
          data-tab-input
        />
        <input
          className="nd-sr-only"
          type="radio"
          name="dbview"
          id="tab-education"
          value="education"
          data-tab-input
        />
        <input
          className="nd-sr-only"
          type="radio"
          name="dbview"
          id="tab-language"
          value="language"
          data-tab-input
        />
        <label className="nd-tab" htmlFor="tab-projects" data-tab="projects">
          <span aria-hidden="true">▦</span> {uiLabels.tabs.projects}
        </label>
        <label className="nd-tab" htmlFor="tab-skills" data-tab="skills">
          <span aria-hidden="true">⚡</span> {uiLabels.tabs.skills}
        </label>
        <label className="nd-tab" htmlFor="tab-education" data-tab="education">
          <span aria-hidden="true">🎓</span> {uiLabels.tabs.education}
        </label>
        <label className="nd-tab" htmlFor="tab-language" data-tab="language">
          <span aria-hidden="true">🌐</span> {uiLabels.tabs.language}
        </label>
      </div>
      <div
        className="nd-db__panel"
        id="panel-projects"
        data-tab-panel="projects"
        aria-labelledby="tab-projects"
      >
        {projectsContent}
      </div>
      <div
        className="nd-db__panel"
        id="panel-skills"
        data-tab-panel="skills"
        aria-labelledby="tab-skills"
        hidden
      >
        {skillsContent}
      </div>
      <div
        className="nd-db__panel"
        id="panel-education"
        data-tab-panel="education"
        aria-labelledby="tab-education"
        hidden
      >
        {educationContent}
      </div>
      <div
        className="nd-db__panel"
        id="panel-language"
        data-tab-panel="language"
        aria-labelledby="tab-language"
        hidden
      >
        {languageContent}
      </div>
    </section>
  );
}
