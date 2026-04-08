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
  // Stored without scheme — browser would resolve as relative to /medals/[id] and break the image
  const hasSchemeOrRoot =
    /^(https?:|\/\/|data:)/i.test(u) || u.startsWith("/");
  if (!hasSchemeOrRoot && /\b(wikipedia|wikimedia)\.org\b/i.test(u)) {
    u = `https://${u.replace(/^\/+/, "")}`;
  }
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

/**
 * Extract a Commons/Wikipedia file name from common URL shapes (upload, /wiki/File:, thumb).
 */
export function extractWikimediaFilenameFromUrl(raw: string | undefined | null): string | null {
  const u = normalizeWikimediaImageUrl(raw ?? "");
  if (!u) return null;
  try {
    const parsed = new URL(u);
    const path = parsed.pathname;
    const wikiFile = path.match(/\/wiki\/File:(.+)$/i);
    if (wikiFile?.[1]) {
      return decodeURIComponent(wikiFile[1].replace(/_/g, " "));
    }
    /** e.g. https://en.wikipedia.org/wiki/Medal_of_Honor#/media/File:Foo.svg */
    if (parsed.hash) {
      const hm = parsed.hash.match(/File:([^#?&]+)/i);
      if (hm?.[1]) {
        let seg = hm[1];
        try {
          seg = decodeURIComponent(seg);
        } catch {
          /* keep encoded segment */
        }
        return seg.replace(/_/g, " ");
      }
    }
    if (!isWikimediaHttpHost(parsed.hostname)) return null;
    const parts = path.split("/").filter(Boolean);
    const ti = parts.indexOf("thumb");
    // .../commons/thumb/a/ab/Original.svg/220px-Original.svg.png
    if (ti >= 0 && parts.length >= ti + 4) {
      return decodeURIComponent(parts[ti + 3].replace(/_/g, " "));
    }
    const last = parts[parts.length - 1];
    if (last && !/^\d+px-/.test(last)) {
      return decodeURIComponent(last.replace(/_/g, " "));
    }
    return null;
  } catch {
    return null;
  }
}

export type WikimediaFilePathWiki = "commons" | "enwiki";

/**
 * Build a URL that redirects to a raster thumbnail (PNG) for SVG or other originals.
 * Use as `<img src>` — the browser follows the redirect to the scaled file.
 *
 * @see https://www.mediawiki.org/wiki/Manual:Special:FilePath
 */
export function wikimediaSpecialFilePathUrl(
  fileName: string,
  options?: { widthPx?: number; wiki?: WikimediaFilePathWiki }
): string {
  const host =
    options?.wiki === "enwiki" ? "en.wikipedia.org" : "commons.wikimedia.org";
  const title = fileName.trim();
  const q =
    typeof options?.widthPx === "number" && options.widthPx > 0
      ? `?width=${Math.round(options.widthPx)}`
      : "";
  return `https://${host}/wiki/Special:FilePath/${encodeURIComponent(title)}${q}`;
}

/**
 * From an upload.wikimedia.org URL (or /wiki/File:…), produce a thumb-friendly URL
 * (defaults to Commons `Special:FilePath` + `?width=`).
 */
export function wikimediaUrlToThumbnailPageUrl(
  raw: string | undefined | null,
  widthPx: number,
  options?: { wiki?: WikimediaFilePathWiki }
): string | null {
  const name = extractWikimediaFilenameFromUrl(raw);
  if (!name) return null;
  return wikimediaSpecialFilePathUrl(name, { widthPx, wiki: options?.wiki });
}

/**
 * Resolve the final thumbnail URL via the MediaWiki API (no redirect).
 * Works server-side or client-side; use for prefetch or non-IMG contexts.
 */
export async function fetchWikimediaThumbnailUrl(
  fileName: string,
  widthPx: number,
  options?: { wiki?: WikimediaFilePathWiki }
): Promise<string | null> {
  const origin =
    options?.wiki === "enwiki"
      ? "https://en.wikipedia.org"
      : "https://commons.wikimedia.org";
  const api = new URL(`${origin}/w/api.php`);
  api.searchParams.set("action", "query");
  api.searchParams.set("titles", `File:${fileName.replace(/^File:/i, "")}`);
  api.searchParams.set("redirects", "1");
  api.searchParams.set("prop", "imageinfo");
  api.searchParams.set("iiprop", "url");
  api.searchParams.set("iiurlwidth", String(Math.round(widthPx)));
  api.searchParams.set("format", "json");
  api.searchParams.set("origin", "*");

  const res = await fetch(api.href);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        { imageinfo?: { thumburl?: string; url?: string }[] }
      >;
    };
  };
  const pages = data.query?.pages;
  if (!pages) return null;
  const first = Object.values(pages)[0];
  const info = first?.imageinfo?.[0];
  return info?.thumburl ?? info?.url ?? null;
}
