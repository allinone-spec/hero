const SKIP_WORDS = new Set(["of", "the", "and", "for", "with", "in", "to", "a", "an"]);

/**
 * Derive an abbreviation from a medal full name. Strips parenthetical qualifiers before
 * taking initials so "Victoria Cross (Canada)" → "VC", not "VC(".
 */
export function deriveShortNameFromMedalName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const parenAcronym = trimmed.match(/\(([A-Z]{2,6})\)\s*$/);
  if (parenAcronym) return parenAcronym[1];

  const withoutParens = trimmed.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const words = withoutParens
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !SKIP_WORDS.has(w.toLowerCase()))
    .filter((w) => /^[A-Za-z]/.test(w));

  if (words.length === 0) return trimmed.slice(0, 8).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 6);
}

/** Use stored shortName when sane; otherwise re-derive from full name (fixes bad DB values like "VC("). */
export function medalShortLabelForDisplay(shortName: string | undefined | null, fullName: string): string {
  const s = (shortName ?? "").trim();
  if (s.length > 0 && !/[()]/.test(s)) return s;
  return deriveShortNameFromMedalName(fullName);
}
