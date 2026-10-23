import { cvData } from "@/content/cv.data";
import { uiLabels } from "@/content/ui.labels";
import { CalloutBlock } from "./CalloutBlock";

/**
 * HeaderBlock — header dokumen personal (TECH-SPEC v2.0 §3.2, D-034).
 *
 * Isi: tepat satu `<h1>` berisi nama pemilik, subtitle rangkai
 * `headline · backendRole · lokasi`, lalu callout kutipan. Statis, tanpa state.
 *
 * Batasan mengikat D-028/D-034 yang dibuktikan `tests/page.test.tsx`:
 * 0 badge status, 0 ikon/emoji, 0 CTA atau tombol unduh CV, 0 tautan `tel:`.
 */
export function HeaderBlock() {
  const { fullName, headline } = cvData.profile;
  const subtitle = [
    headline,
    uiLabels.header.backendRole,
    uiLabels.header.location,
  ].join(" · ");

  return (
    <header className="nd-header" data-header="">
      <h1 className="nd-header__title" data-owner-name="">
        {fullName}
      </h1>
      <p className="nd-header__meta" data-subtitle="">
        {subtitle}
      </p>
      <CalloutBlock />
    </header>
  );
}
