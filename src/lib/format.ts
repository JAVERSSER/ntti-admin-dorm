export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Fallback grade list, used only until the "grades" table exists (admins manage it on the Grades page). */
export const GRADES = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "C1", "C2", "C3"];

/** Degree suggestions on the resident form (admins can still type another). */
export const DEGREES = ["Bachelor's degree", "Associate degree", "C1", "C2", "C3"];

/** Dormitory local time zone (Cambodia, UTC+7, no DST). */
const TZ_OFFSET = "+07:00";

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Phnom_Penh" }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh",
  }).format(d);
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(Number(n ?? 0));
}

/** Escape SQL LIKE wildcards and PostgREST filter syntax in user search input. */
export function sanitizeSearch(input: string | undefined | null): string {
  return (input ?? "").trim().slice(0, 80).replace(/[%_\\]/g, "\\$&").replace(/[,()*]/g, " ");
}

/** Current month in Phnom Penh as YYYY-MM. */
export function currentMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date());
  return parts.slice(0, 7);
}

/** Parse YYYY-MM; returns the [start, end) timestamps in dormitory local time, or null. */
export function monthRange(value: string): { start: string; end: string; label: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: `${year}-${m[2]}-01T00:00:00${TZ_OFFSET}`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00${TZ_OFFSET}`,
    label: `${MONTHS[month - 1]} ${year}`,
  };
}

/** Last N months (newest first) as YYYY-MM options. */
export function monthOptions(count = 24): { value: string; label: string }[] {
  const [y, m] = currentMonth().split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const yy = d.getUTCFullYear();
    const mm = d.getUTCMonth() + 1;
    return { value: `${yy}-${String(mm).padStart(2, "0")}`, label: `${MONTHS[mm - 1]} ${yy}` };
  });
}

/** "2026-12-01" (a payment's for_month) → "December 2026". */
export function formatMonth(value: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(value ?? "");
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "—";
}
