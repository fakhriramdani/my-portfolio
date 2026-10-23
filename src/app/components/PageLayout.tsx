import type { ReactNode } from "react";
import { uiLabels } from "@/content/ui.labels";

interface PageLayoutProps {
  /** Blok header dokumen (`HeaderBlock`, §3.2). */
  header?: ReactNode;
  /** Isi dokumen — seluruh seksi (§3.3–§3.10). */
  children: ReactNode;
  /** Blok footer dokumen (§3.11); ditambahkan pada task berikutnya. */
  footer?: ReactNode;
}

/**
 * PageLayout — pembungkus dokumen Notion (TECH-SPEC v2.0 §3.1, FR-D10).
 *
 * Server component tanpa state. Kontainer terpusat 358 px (< 1024 px) /
 * 880 px (≥ 1024 px) dengan `margin-inline: auto` dan padding horisontal token;
 * lebar dan padding hanya berasal dari token `--container-doc*` / `--space-24`
 * (ADR-0007). Struktur landmark: satu `<main id="main">` yang menjadi target
 * skip-link, dan `tabindex="-1"` supaya target fokusabel setelah lompatan
 * (AC-009.4 warisan).
 */
export function PageLayout({ header, children, footer }: PageLayoutProps) {
  return (
    <div className="nd-page">
      <a className="skip-link" href="#main">
        {uiLabels.skipLink}
      </a>
      {header}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      {footer}
    </div>
  );
}
