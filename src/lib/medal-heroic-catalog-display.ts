import { NON_HEROIC_VALOR_TIER } from "@/lib/medal-inventory-scoring";

/** Same rules as `calculateScore` per-medal resolution — for UI captions only. */
export function heroicCatalogPointsPerInstance(opts: {
  valorTier?: number | null;
  basePoints: number;
  valorPoints: number;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  hasValor: boolean;
}): number {
  const t = opts.valorTier;
  if (t == null || t < 1 || t >= NON_HEROIC_VALOR_TIER) return 0;
  if (opts.inherentlyValor) return opts.valorPoints;
  if (opts.requiresValorDevice) return opts.hasValor ? opts.valorPoints : 0;
  return opts.basePoints;
}

export function heroicCatalogScoreCaption(opts: {
  valorTier?: number | null;
  basePoints: number;
  valorPoints: number;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  hasValor: boolean;
  count: number;
}): string {
  const per = heroicCatalogPointsPerInstance(opts);
  const total = per * Math.max(1, opts.count || 1);
  if (opts.valorTier != null && opts.valorTier >= NON_HEROIC_VALOR_TIER) {
    return "0 heroic catalog pts (rack / service tier)";
  }
  if (total === 0 && opts.requiresValorDevice && !opts.hasValor) {
    return "0 heroic catalog pts (V device required for valor line)";
  }
  if (total === 0) return "0 heroic catalog pts";
  if (opts.count > 1) return `${total} heroic catalog pts (${per} × ${opts.count})`;
  return `${total} heroic catalog pts`;
}
