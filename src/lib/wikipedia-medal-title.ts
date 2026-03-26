/**
 * Resolve English Wikipedia article title for a military medal name.
 * Used by medal wiki scraper and admin "fetch from web" image API.
 */

export const WIKIPEDIA_EN_API_HEADERS = {
  "User-Agent": "HeroesArchive/1.0 (educational research)",
};

const FETCH_MS = 12_000;

async function wikiGet(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    return await fetch(url, { headers: WIKIPEDIA_EN_API_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** MediaWiki: existing articles have a positive numeric pageid; missing pages omit it or set missing. */
function isExistingWikiPage(page: unknown): page is { title: string; pageid: number } {
  if (!page || typeof page !== "object") return false;
  const p = page as { missing?: unknown; pageid?: unknown; title?: unknown };
  if (p.missing === true) return false;
  const id = p.pageid;
  return typeof id === "number" && id > 0 && typeof p.title === "string";
}

export function sanitizeMedalNameForWiki(s: string): string {
  return s
    .trim()
    .replace(/[\u201C\u201D\u2018\u2019]/g, '"')
    .replace(/^["']+|["']+$/g, "")
    .split(/\r?\n/)[0]
    .trim();
}

function dedupeVariants(vars: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of vars) {
    const t = v.trim();
    if (t.length < 2) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function buildTitleVariants(medalName: string): string[] {
  const raw = sanitizeMedalNameForWiki(medalName);
  if (!raw) return [];
  const base = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();

  const variants = [
    raw,
    base,
    `${base} (United States)`,
    `${base} (United States Navy)`,
    `${base} (U.S. Navy)`,
    `${base} (medal)`,
  ];

  const navy = /^Navy\s+(.+)/i.exec(base);
  if (navy) variants.push(`${navy[1]} (United States Navy)`);

  const army = /^Army\s+(.+)/i.exec(base);
  if (army) variants.push(`${army[1]} (United States)`);

  const af = /^Air\s+Force\s+(.+)/i.exec(base);
  if (af) variants.push(`${af[1]} (United States)`);

  const cg = /^Coast\s+Guard\s+(.+)/i.exec(base);
  if (cg) variants.push(`${cg[1]} (United States)`);

  return dedupeVariants(variants);
}

async function queryTitlesResolve(term: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&format=json&redirects=1`;
  const res = await wikiGet(url);
  if (!res.ok) return null;
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const d = data as { error?: unknown; query?: { pages?: Record<string, unknown> } };
  if (d.error) return null;
  const pages = d.query?.pages;
  if (!pages) return null;
  for (const page of Object.values(pages)) {
    if (isExistingWikiPage(page)) return page.title;
  }
  return null;
}

async function searchWikiTitles(query: string): Promise<string[]> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json" +
    `&srsearch=${encodeURIComponent(query)}&srlimit=12&srnamespace=0`;
  const res = await wikiGet(url);
  if (!res.ok) return [];
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  if (typeof data !== "object" || data === null) return [];
  const d = data as { error?: unknown; query?: { search?: { title: string }[] } };
  if (d.error) return [];
  const hits = d.query?.search;
  if (!Array.isArray(hits)) return [];
  return hits.map((h) => h.title).filter((t): t is string => typeof t === "string" && t.length > 0);
}

async function opensearchTitles(query: string): Promise<string[]> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=opensearch&format=json" +
    `&search=${encodeURIComponent(query)}&limit=10&namespace=0`;
  const res = await wikiGet(url);
  if (!res.ok) return [];
  try {
    const data = (await res.json()) as unknown[];
    const titles = data[1];
    return Array.isArray(titles)
      ? titles.filter((t): t is string => typeof t === "string" && t.length > 0)
      : [];
  } catch {
    return [];
  }
}

async function resolveFromCandidateNames(candidates: string[]): Promise<string | null> {
  const seen = new Set<string>();
  for (const name of candidates) {
    const q = sanitizeMedalNameForWiki(name);
    if (!q) continue;

    for (const term of buildTitleVariants(q)) {
      const resolved = await queryTitlesResolve(term);
      if (resolved) return resolved;
    }

    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    for (const title of await searchWikiTitles(q)) {
      const resolved = await queryTitlesResolve(title);
      if (resolved) return resolved;
    }

    for (const title of await opensearchTitles(q)) {
      const resolved = await queryTitlesResolve(title);
      if (resolved) return resolved;
    }

    const base = q.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (base.length >= 4 && base !== q) {
      for (const title of await searchWikiTitles(base)) {
        const resolved = await queryTitlesResolve(title);
        if (resolved) return resolved;
      }
    }
  }

  return null;
}

/**
 * Resolve to a canonical Wikipedia page title, or null if nothing matches.
 */
export async function resolveMedalWikipediaTitle(medalName: string): Promise<string | null> {
  const primary = sanitizeMedalNameForWiki(medalName);
  if (!primary) return null;
  return resolveFromCandidateNames([primary]);
}

/**
 * After optional AI normalization: try normalized string first, then original (AI can garble names).
 */
export async function resolveMedalWikipediaTitleWithFallback(
  originalName: string,
  normalizedName: string,
): Promise<string | null> {
  const o = sanitizeMedalNameForWiki(originalName);
  const n = sanitizeMedalNameForWiki(normalizedName);
  if (n && n.toLowerCase() !== o.toLowerCase()) {
    const fromNorm = await resolveFromCandidateNames([n]);
    if (fromNorm) return fromNorm;
  }
  if (o) return resolveFromCandidateNames([o]);
  return null;
}
