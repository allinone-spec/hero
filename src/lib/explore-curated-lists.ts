/**
 * Preset drill-downs for /explore — maps editorial “list” names to metadataTags + branch filters.
 * Tags must match HERO_METADATA_TAGS ids (see metadata-tags.ts).
 */

export type CuratedExplorePreset =
  | {
      kind: "explore";
      id: string;
      title: string;
      blurb: string;
      country: string;
      branch?: string;
      tag?: string;
      limit?: number;
      sort?: "score" | "comparison";
    }
  | {
      kind: "link";
      id: string;
      title: string;
      blurb: string;
      href: string;
    };

export const EXPLORE_CURATED_PRESETS: CuratedExplorePreset[] = [
  {
    kind: "link",
    id: "top_decorated_alltime",
    title: "Top decorated — all-time (USM-25 score)",
    blurb: "Full published leaderboard sorted by archive score.",
    href: "/rankings",
  },
  {
    kind: "link",
    id: "biggest_ribbon_rack",
    title: "Biggest ribbon racks (medal count)",
    blurb: "Open rankings and use “Sort by medal count” in the list controls.",
    href: "/rankings",
  },
  {
    kind: "explore",
    id: "heroic_women",
    title: "Heroic women",
    blurb: "Heroes tagged female (verify tags in admin if someone is missing).",
    country: "US",
    tag: "female",
    limit: 20,
  },
  {
    kind: "explore",
    id: "army_ground_top",
    title: "U.S. Army — ground combat",
    blurb: "Army branch + ground_combat tag.",
    country: "US",
    branch: "U.S. Army",
    tag: "ground_combat",
    limit: 25,
  },
  {
    kind: "explore",
    id: "navy_top",
    title: "U.S. Navy heroes",
    blurb: "All published Navy profiles in score order.",
    country: "US",
    branch: "U.S. Navy",
    limit: 20,
  },
  {
    kind: "explore",
    id: "usmc_top",
    title: "U.S. Marine Corps heroes",
    blurb: "Top Marines by score.",
    country: "US",
    branch: "U.S. Marine Corps",
    limit: 20,
  },
  {
    kind: "explore",
    id: "usaf_top",
    title: "U.S. Air Force & aviation",
    blurb: "Air Force branch; add aviator/ace tags in admin for tighter lists.",
    country: "US",
    branch: "U.S. Air Force",
    limit: 20,
  },
  {
    kind: "explore",
    id: "submarine_commanders",
    title: "Submarine commanders",
    blurb: "Navy + submariner tag.",
    country: "US",
    branch: "U.S. Navy",
    tag: "submariner",
    limit: 20,
  },
  {
    kind: "explore",
    id: "surface_commanders",
    title: "Naval surface commanders",
    blurb: "Navy + surface_commander tag.",
    country: "US",
    branch: "U.S. Navy",
    tag: "surface_commander",
    limit: 20,
  },
  {
    kind: "explore",
    id: "purple_hearts",
    title: "Multiple Purple Hearts / wounded",
    blurb: "multiple_purple_hearts tag.",
    country: "US",
    tag: "multiple_purple_hearts",
    limit: 20,
  },
  {
    kind: "explore",
    id: "aces_aviation",
    title: "Aviators, aces & air combat",
    blurb: "Tagged ace (add aviator in admin as needed).",
    country: "US",
    tag: "ace",
    limit: 20,
  },
  {
    kind: "explore",
    id: "double_moh",
    title: "Double Medal of Honor",
    blurb: "double_moh tag only when citations support it.",
    country: "US",
    tag: "double_moh",
    limit: 20,
  },
  {
    kind: "explore",
    id: "foreign_awards",
    title: "Foreign & allied decorations",
    blurb: "foreign_awards tag.",
    country: "US",
    tag: "foreign_awards",
    limit: 20,
  },
  {
    kind: "explore",
    id: "space_heroes",
    title: "Space — astronauts & cosmonauts",
    blurb: "astronaut tag (cosmonauts normalized to astronaut).",
    country: "US",
    tag: "astronaut",
    limit: 20,
  },
  {
    kind: "explore",
    id: "cross_country_model",
    title: "Cross-country comparison index",
    blurb: "Optional model score for US vs UK etc. — not an official equivalence.",
    country: "US",
    limit: 20,
    sort: "comparison",
  },
];

export function curatedPresetHref(p: Extract<CuratedExplorePreset, { kind: "explore" }>): string {
  const q = new URLSearchParams();
  q.set("country", p.country);
  if (p.branch) q.set("branch", p.branch);
  if (p.tag) q.set("tag", p.tag);
  if (p.limit != null) q.set("limit", String(p.limit));
  if (p.sort) q.set("sort", p.sort);
  return `/explore/heroes?${q.toString()}`;
}
