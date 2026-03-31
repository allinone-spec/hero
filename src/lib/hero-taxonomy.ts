/**
 * Canonical branch / war labels so filters, contextual ranks, and API queries
 * agree even when Mongo has historically mixed strings ("US Army" vs "U.S. Army").
 *
 * Extend the equivalence groups as you discover more duplicates in data.
 */

function trimCollapse(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** First string in each group is the canonical label stored on new writes. */
const BRANCH_EQUIVALENT_GROUPS: readonly string[][] = [
  ["U.S. Army", "US Army", "U.S Army", "United States Army", "USA Army"],
  ["U.S. Navy", "US Navy", "U.S Navy", "United States Navy", "USA Navy"],
  ["U.S. Marine Corps", "US Marine Corps", "U.S. Marine Corps", "United States Marine Corps", "USMC", "U.S.M.C."],
  ["U.S. Air Force", "US Air Force", "U.S Air Force", "United States Air Force", "USAF", "U.S.A.F."],
  ["U.S. Coast Guard", "US Coast Guard", "United States Coast Guard", "USCG"],
  ["U.S. Space Force", "US Space Force", "United States Space Force", "USSF"],
  ["British Army", "UK Army", "United Kingdom Army"],
  ["Royal Navy", "Royal Navy (UK)", "RN", "UK Royal Navy"],
  ["Royal Air Force", "RAF", "Royal Air Force (UK)", "UK Royal Air Force"],
  ["Royal Marines", "Royal Marines (UK)"],
  ["Canadian Army", "Canadian Armed Forces Land"],
  ["Royal Canadian Navy", "Canadian Navy"],
  ["Royal Canadian Air Force", "RCAF", "Canadian Air Force"],
  ["Australian Army", "Australian Defence Force Army"],
  ["Royal Australian Navy", "RAN"],
  ["Royal Australian Air Force", "RAAF"],
];

const WAR_EQUIVALENT_GROUPS: readonly string[][] = [
  ["Crimean War", "The Crimean War"],
  ["World War I", "World War 1", "WWI", "WW I", "First World War", "Great War"],
  ["World War II", "World War 2", "WWII", "WW II", "Second World War"],
  ["Korean War", "Korea War"],
  ["Vietnam War", "Viet Nam War", "Second Indochina War"],
  ["Gulf War", "First Gulf War", "Persian Gulf War", "Operation Desert Storm"],
  ["Iraq War", "Second Gulf War", "Operation Iraqi Freedom"],
  ["War in Afghanistan", "Afghanistan War", "Operation Enduring Freedom"],
];

function findCanonicalInGroups(input: string, groups: readonly string[][]): string | null {
  const t = trimCollapse(input);
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const group of groups) {
    if (group.some((g) => g.toLowerCase() === lower)) {
      return group[0];
    }
  }
  return null;
}

/** Canonical branch string for comparisons, filters, and new writes. */
export function normalizeBranch(input: string): string {
  const t = trimCollapse(input);
  if (!t) return t;
  return findCanonicalInGroups(t, BRANCH_EQUIVALENT_GROUPS) ?? t;
}

/** All DB values that should count as this branch for Mongo $in queries. */
export function branchVariantsForQuery(branchRawOrCanonical: string): string[] {
  const t = trimCollapse(branchRawOrCanonical);
  if (!t) return [];
  const lower = t.toLowerCase();
  for (const group of BRANCH_EQUIVALENT_GROUPS) {
    if (group.some((g) => g.toLowerCase() === lower)) {
      return [...group];
    }
  }
  return [t];
}

/** Canonical war label. */
export function normalizeWar(input: string): string {
  const t = trimCollapse(input);
  if (!t) return t;
  return findCanonicalInGroups(t, WAR_EQUIVALENT_GROUPS) ?? t;
}

export function warVariantsForQuery(warRawOrCanonical: string): string[] {
  const t = trimCollapse(warRawOrCanonical);
  if (!t) return [];
  const lower = t.toLowerCase();
  for (const group of WAR_EQUIVALENT_GROUPS) {
    if (group.some((g) => g.toLowerCase() === lower)) {
      return [...group];
    }
  }
  return [t];
}

/** Dedupe by canonical war label; use on API create/update. */
export function normalizeWarsArray(wars: string[] | undefined): string[] {
  if (!wars?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of wars) {
    const c = normalizeWar(w);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/** Client/server: does hero match selected branch pill (canonical or legacy raw)? */
export function heroBranchMatchesFilter(heroBranch: string | undefined, selected: string): boolean {
  if (selected === "All") return true;
  return normalizeBranch(heroBranch ?? "") === normalizeBranch(selected);
}

/** Hero has at least one war tag matching selected era (canonical or legacy). */
export function heroWarsMatchFilter(heroWars: string[] | undefined, selected: string): boolean {
  if (selected === "All") return true;
  const needle = normalizeWar(selected);
  return (heroWars ?? []).some((w) => normalizeWar(w) === needle);
}
