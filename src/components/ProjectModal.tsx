import React from "react";
import { cvData } from "@/content/cv.data";
import { uiLabels } from "@/content/ui.labels";
import { formatPeriod } from "@/lib/date";

/**
 * ProjectModal — native <dialog> elements for all 5 projects (TECH-SPEC v2.0 §3.7, FR-D07).
 *
 * Renders all 5 project modals in static HTML for 0 KB JS baseline via CSS :target.
 * Accessible markup:
 *  - Native <dialog> elements with id="modal-<id>", data-modal="<id>", aria-labelledby, aria-modal="true"
 *  - Heading H3 with unique id modal-title-<id>
 *  - Close link pointing to #database with data-modal-close and accessible aria-label
 *  - Metadata: employer · role · period (formatted via formatPeriod)
 *  - Tech tags (whitelisted) with data-tech-tag
 *  - Verbatim project description (length >= 150 chars)
 *  - Source label prefix from uiLabels.modal.sourceLabel
 */
export function ProjectModal() {
  return (
    <>
      {cvData.projects.map((project) => (
        <dialog
          key={project.id}
          className="nd-modal"
          id={`modal-${project.id}`}
          data-modal={project.id}
          aria-labelledby={`modal-title-${project.id}`}
          aria-modal="true"
        >
          <div className="nd-modal__content">
            <div className="nd-modal__header">
              <h3 id={`modal-title-${project.id}`} className="nd-modal__title">
                {project.title}
              </h3>
              <a
                className="nd-modal__close"
                href="#database"
                data-modal-close
                aria-label={`${uiLabels.modal.close}: ${project.title}`}
              >
                {uiLabels.modal.close}
              </a>
            </div>
            <p className="nd-modal__meta">
              {project.employer} · {project.role} · {formatPeriod(project.period)}
            </p>
            <ul className="nd-tags">
              {project.tags.map((t) => (
                <li key={t} data-tech-tag>
                  {t}
                </li>
              ))}
            </ul>
            <div className="nd-modal__body">
              <p>{project.description}</p>
            </div>
            <p className="nd-modal__source">
              {uiLabels.modal.sourceLabel}: {project.source}
            </p>
          </div>
        </dialog>
      ))}
    </>
  );
}

export { ProjectModal as ProjectModals };
