import { cvData } from "@/content/cv.data";
import { formatRange } from "@/lib/date";

/**
 * WorkExperienceSection — Notion Document style cards for 2 employers
 * (TECH-SPEC v2.0 §3.4, FR-D03, AC-D03.1–.4).
 *
 * Data from `cvData.experience` (source of truth). Reverse-chronological
 * order (BR-007): Bank Sinarmas first.
 */
export function WorkExperienceSection() {
  return (
    <section className="nd-section" id="experience" aria-labelledby="experience-heading">
      <h2 id="experience-heading" className="nd-section__title">
        Work Experience
      </h2>
      {cvData.experience.map((entry) => (
        <article key={entry.employer} className="nd-card nd-entry">
          <h3>{entry.role}</h3>
          <p className="nd-entry__meta">
            {entry.employer} · {formatRange(entry.start, entry.end)}
          </p>
          {entry.groups.length > 0 ? (
            entry.groups.map((group) => (
              <div key={group.name} className="nd-entry__subgroup">
                <h4>{group.name}</h4>
                <ul className="nd-entry__bullets">
                  {group.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <ul className="nd-entry__bullets">
              {entry.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </section>
  );
}