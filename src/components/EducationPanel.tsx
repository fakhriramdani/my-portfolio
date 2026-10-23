import React from "react";
import { cvData } from "@/content/cv.data";

/**
 * EducationPanel — Notion gallery view for education & honors (TECH-SPEC v2.0 §3.9, FR-D05).
 *
 * Renders exactly 3 education cards (degree, award, innovation) mapped from cvData.
 */
export function EducationPanel() {
  return (
    <div className="nd-grid" data-panel-content="education">
      {cvData.educationCards.map((card) => (
        <article key={card.title} className="nd-card nd-edu" data-edu-card>
          <h3>{card.title}</h3>
          {card.subtitle ? (
            <p className="nd-card__meta">{card.subtitle}</p>
          ) : null}
          {card.description ? (
            <p className="nd-card__body">{card.description}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
