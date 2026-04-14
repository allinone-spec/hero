import { NON_HEROIC_VALOR_TIER } from "@/lib/medal-inventory-scoring";

export type MedalValorBehavior = {
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  vDeviceAllowed: boolean;
};

/**
 * Derives V-device vs inherent-valor flags for scoring from catalog fields.
 * When Valor_Tier ≥ 5, no heroic scoring applies regardless of flags.
 */
export function inferMedalValorBehavior(input: {
  medalId: string;
  medalName: string;
  deviceText: string;
  valorTier: number;
}): MedalValorBehavior {
  if (input.valorTier >= NON_HEROIC_VALOR_TIER) {
    return { requiresValorDevice: false, inherentlyValor: false, vDeviceAllowed: false };
  }

  const id = input.medalId.toLowerCase();
  const n = input.medalName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const dev = input.deviceText.toLowerCase();
  const vInDevice = /\bv\s*device/i.test(dev);

  const requiresVOnly =
    vInDevice ||
    /\bbronze star\b/.test(n) ||
    /\bair medal\b/.test(n) ||
    (n.includes("distinguished flying cross") && n.includes("united states")) ||
    /\bcommendation medal\b/.test(n) ||
    n.includes("joint service commendation") ||
    /\bachievement medal\b/.test(n);

  const inherent =
    /\bmedal of honor\b/.test(n) ||
    /\bvictoria cross\b/.test(n) ||
    id.includes("param-vir") ||
    id.includes("ashoka-chakra") ||
    /malta george cross/.test(n) ||
    (n.includes("george cross") && !n.includes("malta")) ||
    /\bnavy cross\b/.test(n) ||
    (n.includes("distinguished service cross") && n.includes("united states")) ||
    (n.includes("air force cross") && n.includes("united states")) ||
    n.includes("coast guard cross") ||
    /\bconspicuous gallantry cross\b/.test(n) ||
    (n.includes("air force cross") && n.includes("united kingdom")) ||
    (n.includes("distinguished service cross") && n.includes("australia")) ||
    /\bdistinguished service order\b/.test(n) ||
    /\balbert medal\b/.test(n) ||
    /\bsilver star\b/.test(n) ||
    /\bpurple heart\b/.test(n) ||
    /\bsoldier's medal\b|\bnavy and marine corps medal\b|\bairman's medal\b/.test(n) ||
    /\bmilitary cross\b/.test(n) ||
    (n.includes("distinguished flying cross") && n.includes("united kingdom")) ||
    (n.includes("distinguished service cross") && n.includes("united kingdom")) ||
    /\bdistinguished conduct medal\b/.test(n) ||
    /\bconspicuous gallantry medal\b/.test(n) ||
    n.includes("star of gallantry") ||
    n.includes("new zealand gallantry star") ||
    n.includes("maha vir chakra") ||
    n.includes("kirti chakra") ||
    (/\bvir chakra\b/.test(n) && !id.includes("param-vir")) ||
    n.includes("shaurya chakra") ||
    (n.includes("medal for gallantry") && n.includes("australia")) ||
    /\bmilitary medal\b/.test(n) ||
    /queen's gallantry medal|king's gallantry medal/.test(n) ||
    /mention in despatches|mention in dispatches/.test(n) ||
    n.includes("commendation for gallantry") ||
    n.includes("african distinguished conduct");

  if (inherent) {
    return { requiresValorDevice: false, inherentlyValor: true, vDeviceAllowed: requiresVOnly || vInDevice };
  }
  if (requiresVOnly) {
    return { requiresValorDevice: true, inherentlyValor: false, vDeviceAllowed: true };
  }
  return { requiresValorDevice: false, inherentlyValor: false, vDeviceAllowed: vInDevice };
}
