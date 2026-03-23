/**
 * Canonical hero metadata tags for browse / filter / AI extraction.
 * Store lowercase snake_case in DB.
 */

export const HERO_METADATA_TAGS = [
  { id: "female", label: "Heroic women", hint: "Gender: female" },
  { id: "submariner", label: "Submarine commanders", hint: "Submarine service" },
  { id: "surface_commander", label: "Naval surface commanders", hint: "Surface ship command" },
  { id: "aviator", label: "Aviators / pilots", hint: "Pilot or aviator primary role" },
  { id: "ace", label: "Aces / air combat leaders", hint: "Aerial victories / ace status" },
  { id: "astronaut", label: "Space / astronauts", hint: "Astronaut or cosmonaut" },
  { id: "paratrooper", label: "Airborne / paratrooper", hint: "Airborne qualified / paratrooper" },
  { id: "double_moh", label: "Double Medal of Honor", hint: "Two Medals of Honor" },
  { id: "multiple_purple_hearts", label: "Multiple Purple Hearts", hint: "Notable PH count / wounded" },
  { id: "ground_combat", label: "Ground combat (Army focus)", hint: "Army ground combat leadership" },
  { id: "foreign_awards", label: "Foreign / allied decorations", hint: "Significant foreign awards" },
] as const;

export type HeroMetadataTagId = (typeof HERO_METADATA_TAGS)[number]["id"];

export function normalizeMetadataTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(HERO_METADATA_TAGS.map((t) => t.id));
  const out: string[] = [];
  for (const item of raw) {
    const s = String(item).trim().toLowerCase().replace(/\s+/g, "_");
    if (allowed.has(s) && !out.includes(s)) out.push(s);
  }
  return out;
}
