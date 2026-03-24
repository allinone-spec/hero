/**
 * Short-lived session hints in sessionStorage so the navbar can show the correct user
 * immediately after login (before auth and site "me" API round-trips). Cleared after a successful snapshot fetch.
 */

export type SiteSessionHint = { email: string; role: "owner" | "user" };

export type AdminSessionHint = {
  email: string;
  name: string;
  groupSlug: string;
  isSuperAdmin: boolean;
};

const SITE_KEY = "mnb:session-hint:site";
const ADMIN_KEY = "mnb:session-hint:admin";

function safeParse<T>(raw: string | null, guard: (x: unknown) => x is T): T | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return guard(v) ? v : null;
  } catch {
    return null;
  }
}

function isSiteHint(x: unknown): x is SiteSessionHint {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as SiteSessionHint).email === "string" &&
    ((x as SiteSessionHint).role === "owner" || (x as SiteSessionHint).role === "user")
  );
}

function isAdminHint(x: unknown): x is AdminSessionHint {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as AdminSessionHint).email === "string" &&
    typeof (x as AdminSessionHint).name === "string" &&
    typeof (x as AdminSessionHint).groupSlug === "string" &&
    typeof (x as AdminSessionHint).isSuperAdmin === "boolean"
  );
}

export function writeSiteMemberHint(profile: SiteSessionHint): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SITE_KEY, JSON.stringify(profile));
  } catch {
    /* quota / private mode */
  }
}

export function readSiteMemberHint(): SiteSessionHint | null {
  if (typeof window === "undefined") return null;
  return safeParse(sessionStorage.getItem(SITE_KEY), isSiteHint);
}

export function clearSiteMemberHint(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SITE_KEY);
  } catch {
    /* ignore */
  }
}

export function writeAdminHint(profile: AdminSessionHint): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function readAdminHint(): AdminSessionHint | null {
  if (typeof window === "undefined") return null;
  return safeParse(sessionStorage.getItem(ADMIN_KEY), isAdminHint);
}

export function clearAdminHint(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAllSessionHints(): void {
  clearSiteMemberHint();
  clearAdminHint();
}
