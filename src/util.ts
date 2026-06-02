/** Shared helpers. */

/** Escape text for safe insertion into HTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Zero-pad a number GeoCities-style (folder 7 -> "0007"). */
export function pad(n: number, len = 4): string {
  return String(n).padStart(len, "0");
}

/** A stable slug for handles -> filenames. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
