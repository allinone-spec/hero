/**
 * Canonical hero metadata tags for browse / filter / AI extraction.
 * Store lowercase snake_case in DB.
 */

export const HERO_METADATA_TAGS = [
  { id: "male", label: "Male heroes", hint: "Gender: male" },
  { id: "female", label: "Heroic women", hint: "Gender: female" },
  { id: "army", label: "Army", hint: "Service branch: Army" },
  { id: "navy", label: "Navy", hint: "Service branch: Navy" },
  { id: "usmc", label: "Marine Corps", hint: "Service branch: U.S. Marine Corps" },
  { id: "usaf", label: "Air Force", hint: "Service branch: U.S. Air Force or aviation" },
  { id: "coast_guard", label: "Coast Guard", hint: "Service branch: U.S. Coast Guard" },
  { id: "space_force", label: "Space Force", hint: "Service branch: U.S. Space Force" },
  { id: "submariner", label: "Submarine commanders", hint: "Submarine service" },
  { id: "surface_commander", label: "Naval surface commanders", hint: "Surface ship command" },
  { id: "aviator", label: "Aviators / pilots", hint: "Pilot or aviator primary role" },
  { id: "pilot", label: "Pilots", hint: "Pilot specialty" },
  { id: "ace", label: "Aces / air combat leaders", hint: "Aerial victories / ace status" },
  { id: "astronaut", label: "Space / astronauts", hint: "Astronaut or cosmonaut" },
  { id: "paratrooper", label: "Airborne / paratrooper", hint: "Airborne qualified / paratrooper" },
  { id: "surface_warfare", label: "Surface warfare", hint: "Naval surface warfare" },
  { id: "special_operations", label: "Special operations", hint: "Special operations / commando service" },
  { id: "double_moh", label: "Double Medal of Honor", hint: "Two Medals of Honor" },
  { id: "multiple_purple_hearts", label: "Multiple Purple Hearts", hint: "Notable PH count / wounded" },
  { id: "ground_combat", label: "Ground combat (Army focus)", hint: "Army ground combat leadership" },
  { id: "foreign_awards", label: "Foreign / allied decorations", hint: "Significant foreign awards" },
  { id: "wwi", label: "World War I", hint: "Conflict: World War I" },
  { id: "wwii", label: "World War II", hint: "Conflict: World War II" },
  { id: "korea", label: "Korean War", hint: "Conflict: Korea" },
  { id: "vietnam", label: "Vietnam War", hint: "Conflict: Vietnam" },
  { id: "iraq", label: "Iraq War", hint: "Conflict: Iraq" },
  { id: "afghanistan", label: "War in Afghanistan", hint: "Conflict: Afghanistan" },
  { id: "war_on_terror", label: "War on Terror", hint: "Conflict: Global War on Terror" },
] as const;

export type HeroMetadataTagId = (typeof HERO_METADATA_TAGS)[number]["id"];

export function normalizeMetadataTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(HERO_METADATA_TAGS.map((t) => t.id));
  const aliases: Record<string, string> = {
    marine_corps: "usmc",
    marines: "usmc",
    air_force: "usaf",
    aviator_pilot: "aviator",
    submarine: "submariner",
    submariner: "submariner",
    cosmonaut: "astronaut",
    surface: "surface_commander",
    world_war_i: "wwi",
    world_war_ii: "wwii",
    korean_war: "korea",
    vietnam_war: "vietnam",
    iraq_war: "iraq",
    operation_enduring_freedom: "afghanistan",
    gwot: "war_on_terror",
  };
  const out: string[] = [];
  for (const item of raw) {
    const source = String(item).trim().toLowerCase().replace(/\s+/g, "_");
    const s = aliases[source] ?? source;
    if (allowed.has(s) && !out.includes(s)) out.push(s);
  }
  return out;
}
