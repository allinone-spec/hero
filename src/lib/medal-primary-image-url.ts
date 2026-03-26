/** First non-empty `wikiImages[].url` (skips blank slots). */
export function getFirstWikiImageUrl(wikiImages?: { url?: string }[]): string | null {
  if (!Array.isArray(wikiImages)) return null;
  for (const img of wikiImages) {
    const t = typeof img?.url === "string" ? img.url.trim() : "";
    if (t) return t;
  }
  return null;
}

/**
 * Primary medal art URL for detail banners and thumbs.
 * Same order as MedalDisplayThumb: imageUrl → ribbonImageUrl → first usable wikiImages[].url
 */
export function getMedalPrimaryImageUrl(m: {
  imageUrl?: string;
  ribbonImageUrl?: string;
  wikiImages?: { url?: string }[];
}): string | null {
  for (const c of [m.imageUrl, m.ribbonImageUrl]) {
    const t = typeof c === "string" ? c.trim() : "";
    if (t) return t;
  }
  return getFirstWikiImageUrl(m.wikiImages);
}
