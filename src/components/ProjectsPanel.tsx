import React from "react";
import { cvData } from "@/content/cv.data";
import { formatPeriod } from "@/lib/date";

/**
 * ProjectsPanel — Notion gallery view for projects (TECH-SPEC v2.0 §3.6, FR-D06).
 *
 * Renders exactly 5 project cards in pure HTML (0 KB JS baseline).
 * First card has nd-project--featured class applying grid-column: 1 / -1
 * on screens >= 640px to resolve F3 orphan card.
 */
export function ProjectsPanel() {
  return (
    <div className="nd-grid" data-panel-content="projects">
      {cvData.projects.map((project, index) => {
        const isFeatured = index === 0;
        return (
          <article
            key={project.id}
            className={`nd-card nd-project${isFeatured ? " nd-project--featured" : ""}`}
            data-project-card
            data-project-id={project.id}
          >
            <h3>
              <a
                className="nd-project__title"
                href={`#modal-${project.id}`}
                data-modal-trigger={project.id}
              >
                {project.title}
              </a>
            </h3>
            <p className="nd-project__meta">
              {project.employer} · {project.role} · {formatPeriod(project.period)}
            </p>
            <p className="nd-project__summary">{project.summary}</p>
            <ul className="nd-tags">
              {project.tags.map((tag) => (
                <li key={tag} data-tech-tag>
                  {tag}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
