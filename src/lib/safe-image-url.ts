/** Returns the string only if it is a plausible http(s) image URL for use in <img src>. */
export function safeHttpImageUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return t;
  } catch {
    return undefined;
  }
}
