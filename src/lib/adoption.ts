export function nowUtc(): Date {
  return new Date();
}

export function isAdoptionActive(adoptionExpiry?: Date | string | null): boolean {
  if (!adoptionExpiry) return false;
  const ts = new Date(adoptionExpiry).getTime();
  return Number.isFinite(ts) && ts > Date.now();
}

export function nextAdoptionExpiry(currentExpiry?: Date | string | null): Date {
  const base = isAdoptionActive(currentExpiry) ? new Date(currentExpiry as Date | string) : nowUtc();
  const next = new Date(base);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}
