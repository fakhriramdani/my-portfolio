import React from "react";
import { cvData } from "@/content/cv.data";

/**
 * LanguagePanel — Notion gallery view for languages (TECH-SPEC v2.0 §3.10, FR-D15).
 *
 * Renders exactly 2 language cards (English, Indonesian) with proficiency text.
 * Strictly 0 progress bars, 0 percentages, 0 star ratings (AC-D12.2).
 */
export function LanguagePanel() {
  return (
    <div className="nd-grid" data-panel-content="language">
      {cvData.languageCards.map((card) => (
        <article key={card.name} className="nd-card nd-lang" data-lang-card>
          <h3>{card.name}</h3>
          <p className="nd-card__meta">{card.proficiency}</p>
        </article>
      ))}
    </div>
  );
}
