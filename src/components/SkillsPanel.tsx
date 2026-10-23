import React from "react";
import { cvData } from "@/content/cv.data";

const levelMap = new Map(cvData.skills.map((s) => [s.name, s.level]));

/**
 * SkillsPanel — Notion gallery view for skill groups (TECH-SPEC v2.0 §3.8, FR-D04).
 *
 * Renders exactly 4 skill group cards partitioning 20 skills (14 hard + 6 soft).
 * Displays level label only when declared in cvData.skills (level !== null).
 * Strictly 0 progress bars, 0 percentages, 0 star ratings (AC-D04.3).
 */
export function SkillsPanel() {
  return (
    <div className="nd-grid" data-panel-content="skills">
      {cvData.skillGroups.map((group) => (
        <article
          key={group.title}
          className="nd-card nd-skillgroup"
          data-skill-card
          data-skill-group={group.title}
        >
          <h3>{group.title}</h3>
          <ul className="nd-tags">
            {group.skills.map((skill) => {
              const level = levelMap.get(skill);
              return (
                <li
                  key={skill}
                  data-skill
                  {...(level != null ? { "data-level": level } : {})}
                >
                  {skill}
                  {level != null ? (
                    <>
                      {" "}
                      <span className="nd-tag__level">{level}</span>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}
