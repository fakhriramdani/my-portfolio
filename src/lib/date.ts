const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "2021-09" -> "September 2021" (BR-005). */
export function formatMonthYear(ym: string): string {
  const [year, month] = ym.split("-");
  const idx = Number(month) - 1;
  const name = MONTHS[idx];
  if (!name) {
    throw new Error(`Invalid month in date: ${ym}`);
  }
  return `${name} ${year}`;
}

/** "2021-09", null -> "September 2021 – Present" (en dash, BR-005). */
export function formatRange(start: string, end: string | null): string {
  if (end === null) {
    return `${formatMonthYear(start)} – Present`;
  }
  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
}

/** "2021-09 – Present" -> "September 2021 – Present" (BR-005). */
export function formatPeriod(period: string): string {
  return period.replace(/\b\d{4}-\d{2}\b/g, (ym) => formatMonthYear(ym));
}
