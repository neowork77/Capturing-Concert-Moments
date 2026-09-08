/**
 * Normalizes camera name for consistent comparison across LINE bot, Admin, and Landing Page.
 * Strips common prefixes like "กล้อง", extra spaces, and handles case-insensitivity.
 */
export function normalizeCameraName(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/^กล้อง\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if two camera name strings refer to the same camera model.
 * Handles variations like:
 * - "RICOH GR IIIx + Flash" vs "กล้อง RICOH GR IIIx + Flash"
 * - "Fujifilm instax mini 11" vs "Fujifilm instax mini 11 Instant Film กล้องโพลารอยด์"
 * - Case insensitivity and whitespace differences
 */
export function isSameCamera(cam1?: string | null, cam2?: string | null): boolean {
  if (!cam1 && !cam2) return true;
  if (!cam1 || !cam2) return false;

  const n1 = normalizeCameraName(cam1);
  const n2 = normalizeCameraName(cam2);

  if (n1 === n2) return true;

  // Prevent false positive matching on very short strings
  if (n1.length >= 4 && n2.length >= 4) {
    // Check specific brand/model keywords
    const isRicoh1 = n1.includes("ricoh") || n1.includes("gr3") || n1.includes("gr 3") || n1.includes("griiix") || n1.includes("gr iii");
    const isRicoh2 = n2.includes("ricoh") || n2.includes("gr3") || n2.includes("gr 3") || n2.includes("griiix") || n2.includes("gr iii");
    if (isRicoh1 && isRicoh2) return true;
    if (isRicoh1 !== isRicoh2 && (isRicoh1 || isRicoh2)) return false;

    const isFuji1 = n1.includes("fuji") || n1.includes("instax");
    const isFuji2 = n2.includes("fuji") || n2.includes("instax");
    if (isFuji1 && isFuji2) return true;
    if (isFuji1 !== isFuji2 && (isFuji1 || isFuji2)) return false;

    // General inclusion
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  return false;
}
