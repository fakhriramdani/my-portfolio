import { cvData } from "@/content/cv.data";
import { uiLabels } from "@/content/ui.labels";

/**
 * AboutTwoColumn — seksi "About Me" dua kolom (TECH-SPEC v2.0 §3.3).
 *
 * DOM per spesifikasi:
 * <section class="nd-section" id="about" aria-labelledby="about-heading">
 *   <h2 id="about-heading" class="nd-section__title">About Me</h2>
 *   <div class="nd-about">
 *     <div class="nd-about__avatar" data-avatar>
 *       <img src="/assets/avatar-light.png" alt="" aria-hidden="true" width="160" height="160" class="nd-avatar--light" decoding="async" />
 *       <img src="/assets/avatar-dark.png"  alt="" aria-hidden="true" width="160" height="160" class="nd-avatar--dark"  decoding="async" />
 *     </div>
 *     <div class="nd-about__body">
 *       <p data-summary>{profile.summary}</p>
 *       <ul class="nd-contacts">
 *         <li><a data-contact-link="email" href="mailto:...">Email: ...</a></li>
 *         <li><a data-contact-link="linkedin" href="https://..." target="_blank" rel="noopener noreferrer" aria-label="LinkedIn: ...">LinkedIn: ... ↗</a></li>
 *       </ul>
 *     </div>
 *   </div>
 * </section>
 *
 * Batasan mengikat (D-028):
 * - Tepat 2 tautan kontak (email + LinkedIn), 0 `tel:`, 0 unduh CV.
 * - Avatar dekoratif: `alt=""` + `aria-hidden="true"` (nama sudah diumumkan H1).
 * - Bio byte-identik dengan `cvData.profile.summary`.
 */
export function AboutTwoColumn() {
  const { profile, contacts } = cvData;
  const contactLinks = contacts.filter(
    (c) => c.kind === "email" || c.kind === "linkedin"
  );

  return (
    <section className="nd-section" id="about" aria-labelledby="about-heading">
      <h2 id="about-heading" className="nd-section__title">
        {uiLabels.about.heading}
      </h2>
      <div className="nd-about">
        <div className="nd-about__avatar" data-avatar="">
          {/* eslint-disable @next/next/no-img-element -- aset avatar 160×160 statis; `next/image` tidak diperlukan karena `images.unoptimized = true` dan DOM §3.3 mensyaratkan `<img>` polos dengan `decoding="async"` (0 KB JS). */}
          <img
            src="/assets/avatar-light.png"
            alt=""
            aria-hidden="true"
            width={160}
            height={160}
            className="nd-avatar--light"
            decoding="async"
          />
          <img
            src="/assets/avatar-dark.png"
            alt=""
            aria-hidden="true"
            width={160}
            height={160}
            className="nd-avatar--dark"
            decoding="async"
          />
          {/* eslint-enable @next/next/no-img-element */}
        </div>
        <div className="nd-about__body">
          <p data-summary="">{profile.summary}</p>
          <ul className="nd-contacts">
            {contactLinks.map((contact) => (
              <li key={contact.kind}>
                {contact.kind === "email" ? (
                  <a
                    data-contact-link="email"
                    href={contact.href}
                  >
                    {uiLabels.about.emailLabel}: {contact.label}
                  </a>
                ) : (
                  <a
                    data-contact-link="linkedin"
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${uiLabels.about.linkedinLabel}: ${contact.label}`}
                  >
                    {uiLabels.about.linkedinLabel}: {contact.label}{" "}
                    <span aria-hidden="true">{uiLabels.about.externalArrow}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}