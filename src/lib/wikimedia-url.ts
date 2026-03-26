/**
 * Normalize Wikipedia / Wikimedia image URLs for browsers and server fetch.
 * - Trims whitespace
 * - Protocol-relative URLs (//upload…) → https:
 * - Upgrades http → https on known Wikimedia hosts (avoids mixed-content blocks)
 */
function isWikimediaHttpHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "upload.wikimedia.org" ||
    h === "commons.wikimedia.org" ||
    h === "static.wikimedia.org" ||
    h.endsWith(".wikimedia.org") ||
    h.endsWith(".wikipedia.org")
  );
}

export function normalizeWikimediaImageUrl(raw: string | undefined | null): string {
  if (raw == null) return "";
  let u = String(raw).trim();
  if (!u) return "";
  if (u.startsWith("//")) u = `https:${u}`;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "http:" && isWikimediaHttpHost(parsed.hostname)) {
      parsed.protocol = "https:";
      return parsed.href;
    }
    return u;
  } catch {
    return u;
  }
}
