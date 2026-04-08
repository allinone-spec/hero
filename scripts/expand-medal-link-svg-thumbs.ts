/**
 * Rewrite ribbon URL columns in `Final_Medal_Sheet_Client.csv` from Wikipedia #/media/File:….svg
 * to concrete Commons raster thumb URLs (default 1920px PNG for SVGs).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const CSV_PATH = path.join(
  process.cwd(),
  "data/medal-inventory/Final_Medal_Sheet_Client.csv"
);
const PAUSE_MS = 80;

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function serializeCSVRow(fields: string[]): string {
  return fields
    .map((f) => {
      if (!f) return f;
      if (/[",\n\r]/.test(f)) return `"${f.replace(/"/g, '""')}"`;
      return f;
    })
    .join(",");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const WIDTH_TRY = [1920, 800, 300] as const;

const FETCH_HEADERS = {
  Accept: "*/*",
  "User-Agent": "HeroesMedalThumbScript/1.0 (batch CSV; contact: local)",
} as const;

const REDIRECT_MAX_HOPS = 20;

/**
 * Wikimedia often chains Special:FilePath → Special:Redirect → upload.
 * `redirect: "follow"` can stop before the final upload URL; follow Location manually.
 */
async function followRedirectsToFinalUrl(url: string): Promise<string> {
  let current = url;
  for (let hop = 0; hop < REDIRECT_MAX_HOPS; hop++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const r = await fetch(current, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: FETCH_HEADERS,
      });
      await r.body?.cancel();
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        if (!loc) return current;
        current = new URL(loc, current).href;
        if (/\bupload\.wikimedia\.org\b/i.test(current)) return current;
        continue;
      }
      if (/\bupload\.wikimedia\.org\b/i.test(r.url)) return r.url;
      return r.url || current;
    } finally {
      clearTimeout(t);
    }
  }
  return current;
}

async function resolveRasterThumb(name: string): Promise<string | null> {
  const {
    fetchWikimediaThumbnailUrl,
    wikimediaSpecialFilePathUrl,
  } = await import("../src/lib/wikimedia-url");
  for (const w of WIDTH_TRY) {
    let t = await fetchWikimediaThumbnailUrl(name, w, {});
    if (t) return t;
    t = await fetchWikimediaThumbnailUrl(name, w, { wiki: "enwiki" });
    if (t) return t;
  }
  const sp = wikimediaSpecialFilePathUrl(name, { widthPx: 1920 });
  try {
    const finalU = await followRedirectsToFinalUrl(sp);
    if (/\bupload\.wikimedia\.org\b/i.test(finalU)) return finalU;
  } catch {
    /* keep Special:FilePath */
  }
  return sp;
}

async function main() {
  const { extractWikimediaFilenameFromUrl } = await import("../src/lib/wikimedia-url");

  const raw = readFileSync(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) {
    console.error("CSV empty");
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  let medalLinkIdx = header.indexOf("Ribbon_File_Direct_URL");
  if (medalLinkIdx < 0) medalLinkIdx = header.indexOf("Ribbon_Thumbnail_URL");
  if (medalLinkIdx < 0) medalLinkIdx = header.indexOf("Ribbon_Link");
  if (medalLinkIdx < 0) medalLinkIdx = header.indexOf("Medal_Link");
  if (medalLinkIdx < 0) {
    console.error(
      "No Ribbon_File_Direct_URL / Ribbon_Thumbnail_URL / Ribbon_Link / Medal_Link column",
    );
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const outLines: string[] = [lines[0]];

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (line.trim() === "") {
      outLines.push(line);
      continue;
    }

    const fields = parseCSVLine(line);
    if (fields.length <= medalLinkIdx) {
      outLines.push(line);
      skipped++;
      continue;
    }

    const link = fields[medalLinkIdx]?.trim() ?? "";
    if (!link) {
      outLines.push(line);
      continue;
    }
    const isUploadThumb =
      /\bupload\.wikimedia\.org\b/i.test(link) && /\/thumb\//i.test(link);
    const isSpecialFilePath =
      /\/wiki\/Special:FilePath\//i.test(link) ||
      /\/Special:FilePath\//i.test(link);
    if (isUploadThumb && !isSpecialFilePath) {
      outLines.push(line);
      continue;
    }

    if (isSpecialFilePath && /\.svg/i.test(link)) {
      try {
        const finalU = await followRedirectsToFinalUrl(link);
        if (/\bupload\.wikimedia\.org\b/i.test(finalU)) {
          fields[medalLinkIdx] = finalU;
          outLines.push(serializeCSVRow(fields));
          updated++;
          await sleep(PAUSE_MS);
          continue;
        }
      } catch {
        /* fall through */
      }
    }

    const name = extractWikimediaFilenameFromUrl(link);
    const isSvg =
      /\.svg$/i.test(name ?? "") ||
      /File:[^#?&]*\.svg/i.test(link) ||
      /\/media\/File:[^#?&]*\.svg/i.test(link);

    if (!isSvg || !name || !/\.svg$/i.test(name.trim())) {
      outLines.push(line);
      continue;
    }

    const thumb: string | null = await resolveRasterThumb(name);

    await sleep(PAUSE_MS);

    if (thumb) {
      fields[medalLinkIdx] = thumb;
      outLines.push(serializeCSVRow(fields));
      updated++;
    } else {
      console.warn(`No thumb: ${name} (row ~${li + 1})`);
      outLines.push(line);
      failed++;
    }
  }

  writeFileSync(CSV_PATH, outLines.join("\n") + (raw.endsWith("\n") ? "\n" : ""), "utf8");
  console.log(
    `Ribbon/Medal link SVG → Commons raster URL (API widths ${WIDTH_TRY.join(", ")}px, else Special:FilePath): updated ${updated}, failed ${failed}, skipped short rows ${skipped}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
