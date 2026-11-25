/**
 * The resident CSV layout shared by Export and Upload. Upload only accepts a file whose
 * header row matches what Export writes, so admins edit an exported file and upload it back.
 */
export const RESIDENT_COLUMNS = ["room", "full_name", "degree", "major", "grade", "institution", "note"] as const;
export type ResidentColumn = (typeof RESIDENT_COLUMNS)[number];

/** Layout of files exported before the degree column existed; still accepted on Upload. */
const LEGACY_COLUMNS: readonly ResidentColumn[] = ["room", "full_name", "major", "grade", "institution", "note"];

/** Read-only columns Export adds after the editable ones; Upload ignores them. */
const norm = (h: string) => h.replace(/^﻿/, "").trim().toLowerCase();

/** The resident columns a header row uses (current or legacy layout), or null if it fits neither. */
export function residentHeaderColumns(header: string[]): readonly ResidentColumn[] | null {
  const cells = header.map(norm);
  while (cells.length && cells[cells.length - 1] === "") cells.pop();
  for (const layout of [RESIDENT_COLUMNS, LEGACY_COLUMNS]) {
    const base = cells.slice(0, layout.length);
    const extra = cells.slice(layout.length);
    const baseOk = base.length === layout.length && base.every((c, i) => c === layout[i]);
    const extraOk =
      extra.length === 0 ||
      (extra.length === 2 && /^status(\s*\(.*\))?$/.test(extra[0]) && extra[1] === "submitted_at");
    if (baseOk && extraOk) return layout;
  }
  return null;
}

/**
 * Check a CSV header row against the Export layout. Returns an error message, or null if it fits.
 * Accepts the resident columns alone, or followed by the export's "status (…)" and "submitted_at".
 * Files exported before the degree column was added are accepted too.
 */
export function checkResidentHeader(header: string[]): string | null {
  if (residentHeaderColumns(header)) return null;
  const cells = header.map(norm);
  const missing = RESIDENT_COLUMNS.filter((c) => !cells.includes(c));
  return (
    `File not supported: the columns don't match the Export file. ` +
    (missing.length ? `Missing: ${missing.join(", ")}. ` : "") +
    `The first row must be: ${RESIDENT_COLUMNS.join(", ")} (in this order). Tip: click Export, edit that file, and upload it.`
  );
}

/** Undo the formula guard toCsv adds (a leading ' before = + - @). */
export function unguardCell(v: string): string {
  return /^'[=+\-@]/.test(v) ? v.slice(1) : v;
}
