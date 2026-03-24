/** Short labels for medal/hero country codes in admin filters. */
export const ISO_COUNTRY_LABELS: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  UK: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  BE: "Belgium",
  PL: "Poland",
  UA: "Ukraine",
  JP: "Japan",
  KR: "South Korea",
  UN: "United Nations",
  NATO: "NATO",
};

export function countryOptionLabel(code: string): string {
  const c = code.trim().toUpperCase();
  const label = ISO_COUNTRY_LABELS[c];
  return label ? `${c} — ${label}` : c;
}
