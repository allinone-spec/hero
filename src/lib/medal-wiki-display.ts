/** Split stored wiki/catalog text into paragraphs for display */

function removeRawWikiStyleNoise(text: string): string {
  return text
    // Inline CSS snippets that occasionally leak from wiki parser output
    .replace(/\.mw-parser-output[\s\S]*?(?=(?:\n\n|$))/gi, "")
    // Media-query blocks that appear as plain text
    .replace(/@media\s+[^{]+\{[\s\S]*?\}/gi, "")
    // Any remaining CSS rule blocks in plain text
    .replace(/[^{\n]+\{[^}]*\}/g, "")
    // Collapse extra whitespace after removals
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitWikiParagraphs(text: string | undefined | null): string[] {
  if (!text?.trim()) return [];
  return removeRawWikiStyleNoise(text)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * True when catalog `description` duplicates or is fully contained in wiki summary
 * (so we do not repeat the same blurb on medal page + modal).
 */
export function isCatalogDescriptionRedundant(description: string, wikiSummary: string): boolean {
  const d = description.replace(/\s+/g, " ").trim().toLowerCase();
  const w = wikiSummary.replace(/\s+/g, " ").trim().toLowerCase();
  if (!d) return true;
  if (!w) return false;
  if (d === w) return true;
  if (d.length < 24) return false;
  if (w.includes(d)) return true;
  if (d.includes(w) && w.length > 80) return true;
  return false;
}
