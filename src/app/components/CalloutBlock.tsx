import { uiLabels } from "@/content/ui.labels";

/**
 * CalloutBlock — blok kutipan Notion di bawah header (TECH-SPEC v2.0 §3.2).
 *
 * `<aside>` diberi nama aksesibel dari `uiLabels` karena isinya informatif
 * (pernyataan spesialisasi), bukan ornamen. Gaya (border kiri 4 px aksen,
 * latar `--color-callout-bg`, radius `--radius-callout`) ada di `globals.css`
 * region V2 — hanya token, tanpa literal (ADR-0007).
 */
export function CalloutBlock() {
  return (
    <aside
      className="nd-callout"
      data-callout=""
      aria-label={uiLabels.header.calloutLabel}
    >
      <p>{uiLabels.header.callout}</p>
    </aside>
  );
}
