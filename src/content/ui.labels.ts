/**
 * ui.labels.ts — seluruh label UI (TECH-SPEC v2.0 §2.2, §3.2, §3.3; OQ-T01).
 *
 * Aturan sumber konten (§1.3 butir 4): setiap string yang tampil berasal dari
 * `cv.data.ts` (konten) atau berkas ini (label). Komponen tidak memuat literal
 * teks, sehingga peralihan bahasa (OQ-T01) hanya menyentuh satu berkas + `lang`
 * pada `layout.tsx` (mitigasi R-T7).
 *
 * TASK-202 mengisi label header saja (yang dibutuhkan §3.2); TASK-203 menambahkan
 * label seksi About (§3.3); TASK-205 melengkapinya dengan judul seksi, label tab,
 * dan teks tombol modal.
 */

export interface UiLabels {
  /** Tautan lewati navigasi — elemen fokusabel pertama (AC-009.4 warisan). */
  skipLink: string;
  header: {
    /** Peran kedua pada subtitle header (design-spec v10 §1.2). */
    backendRole: string;
    /**
     * Lokasi versi header: `West Jakarta, Indonesia` (D-034/design-spec v10
     * §1.2) — sengaja berbeda dari `profile.location` (`West Jakarta, DKI
     * Jakarta`) yang tetap dipakai untuk metadata & JSON-LD (TECH-SPEC §3.2).
     */
    location: string;
    /** Isi callout/quote block header (design-spec v10 §1.3–§1.4, verbatim). */
    callout: string;
    /**
     * Nama aksesibel `<aside>` callout. Blok kutipan informatif, bukan
     * dekorasi, sehingga wajib punya nama (TECH-SPEC §3.2 a11y).
     */
    calloutLabel: string;
  };
  about: {
    /** Judul seksi About (H2). */
    heading: string;
    /** Awalan label tautan email. */
    emailLabel: string;
    /** Awalan label tautan LinkedIn. */
    linkedinLabel: string;
    /** Panah tautan eksternal (↗), tersembunyi dari screen reader. */
    externalArrow: string;
  };
  // TASK-205: Section headings, tab labels, modal labels, footer
  sections: {
    /** Work Experience section heading (H2). */
    experience: string;
    /** Database View section heading (H2, sr-only). */
    database: string;
    /** Footer copyright label. */
    footer: string;
  };
  tabs: {
    /** Projects tab label. */
    projects: string;
    /** Skills tab label. */
    skills: string;
    /** Education tab label. */
    education: string;
    /** Language tab label. */
    language: string;
  };
  modal: {
    /** Close button label. */
    close: string;
    /** Source label prefix. */
    sourceLabel: string;
    /** Key technologies label. */
    keyTechnologies: string;
  };
}

export const uiLabels: UiLabels = {
  skipLink: "Skip to content",
  header: {
    backendRole: "Backend Developer",
    location: "West Jakarta, Indonesia",
    callout:
      "Specializing in high-throughput banking systems, distributed backend architecture, and OpenAPI-driven services with Go, Java Spring Boot, and PostgreSQL.",
    calloutLabel: "Quote",
  },
  about: {
    heading: "About Me",
    emailLabel: "Email",
    linkedinLabel: "LinkedIn",
    externalArrow: "↗",
  },
  // TASK-205: Section headings, tab labels, modal labels, footer
  sections: {
    experience: "Work Experience",
    database: "Projects, Skills, Education and Language",
    footer: "© {year} Fakhri Ramdani",
  },
  tabs: {
    projects: "Projects",
    skills: "Skills",
    education: "Education",
    language: "Language",
  },
  modal: {
    close: "Close",
    sourceLabel: "Source",
    keyTechnologies: "Key Technologies",
  },
};
