"use client";

import { useEffect, useState } from "react";
import { AdminLoader } from "@/components/ui/AdminLoader";
import { MedalDisplayThumbRow } from "@/components/medals/MedalDisplayThumb";
import MedalWikiModal, { type MedalModalData } from "@/components/medals/MedalWikiModal";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { heroicCatalogScoreCaption } from "@/lib/medal-heroic-catalog-display";
import { USM25_MATRIX_SECTIONS } from "@/lib/usm25-matrix-sections";

interface MedalTypeRef {
  _id: string;
  name: string;
  shortName: string;
  category: string;
  basePoints: number;
  valorPoints?: number;
  tier?: number;
  precedenceOrder: number;
  ribbonColors: string[];
  imageUrl: string;
  ribbonImageUrl?: string;
  wikiImages?: { url?: string }[];
}

/** Valor_Tier (1–4 = heroic catalog; 5 = rack only, 0 catalog pts). Not “precedence”. */
function formatValorTierLabel(tier: number | undefined): string {
  if (tier == null || tier < 1) return "?";
  if (tier >= 90) return "—";
  return `VT${tier}`;
}

/** Catalog Bong_Score shown in Medal Reference (matches CSV for heroic tiers). */
function catalogBongDisplay(mt: MedalTypeRef): number {
  const t = mt.tier;
  if (t == null || t < 1 || t >= 5) return 0;
  return Math.max(mt.valorPoints ?? 0, mt.basePoints ?? 0);
}

function apiMedalJsonToModal(d: Record<string, unknown>): MedalModalData {
  const tierRaw = d.tier;
  const tier = typeof tierRaw === "number" ? tierRaw : Number(tierRaw);
  const basePoints = Number(d.basePoints) || 0;
  const valorPoints = Number(d.valorPoints ?? d.basePoints) || 0;
  return {
    medalId: String(d._id ?? ""),
    name: String(d.name ?? "Medal"),
    wikiSummary: typeof d.wikiSummary === "string" ? d.wikiSummary : undefined,
    history: typeof d.history === "string" ? d.history : undefined,
    awardCriteria: typeof d.awardCriteria === "string" ? d.awardCriteria : undefined,
    imageUrl: typeof d.imageUrl === "string" ? d.imageUrl : undefined,
    ribbonImageUrl: typeof d.ribbonImageUrl === "string" ? d.ribbonImageUrl : undefined,
    description: typeof d.description === "string" ? d.description : undefined,
    wikipediaUrl: typeof d.wikipediaUrl === "string" ? d.wikipediaUrl : undefined,
    appearance: typeof d.appearance === "string" ? d.appearance : undefined,
    established: typeof d.established === "string" ? d.established : undefined,
    heroicScoreCaption: heroicCatalogScoreCaption({
      valorTier: Number.isFinite(tier) ? tier : undefined,
      basePoints,
      valorPoints,
      requiresValorDevice: Boolean(d.requiresValorDevice),
      inherentlyValor: Boolean(d.inherentlyValor),
      hasValor: false,
      count: 1,
    }),
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  valor: "#d4a843",
  service: "#3b82f6",
  foreign: "#10b981",
  other: "#9ca3af",
};

export default function AdminScoringPage() {
  const { can } = usePrivileges();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string>("");
  const [medals, setMedals] = useState<MedalTypeRef[]>([]);
  const [medalsRefreshing, setMedalsRefreshing] = useState(false);
  const [modalMedal, setModalMedal] = useState<MedalModalData | null>(null);
  const [modalLoadingId, setModalLoadingId] = useState<string | null>(null);

  const loadMedalCatalog = async () => {
    setMedalsRefreshing(true);
    try {
      const r = await fetch(`/api/medal-types?t=${Date.now()}`, { cache: "no-store" });
      const medalData = await r.json();
      if (Array.isArray(medalData)) {
        setMedals(
          medalData.sort((a: MedalTypeRef, b: MedalTypeRef) => a.precedenceOrder - b.precedenceOrder)
        );
      }
    } finally {
      setMedalsRefreshing(false);
    }
  };

  useEffect(() => {
    fetch(`/api/medal-types?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((medalData) => {
        if (Array.isArray(medalData)) {
          setMedals(
            medalData.sort((a: MedalTypeRef, b: MedalTypeRef) => a.precedenceOrder - b.precedenceOrder)
          );
        }
        setLoading(false);
      });
  }, []);

  async function openMedalModal(medalId: string) {
    setModalLoadingId(medalId);
    try {
      const r = await fetch(`/api/medal-types/${medalId}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as Record<string, unknown>;
      setModalMedal(apiMedalJsonToModal(d));
    } finally {
      setModalLoadingId(null);
    }
  }

  const handleRecalculate = async () => {
    const ok = await confirm({
      title: "Recalculate all scores",
      message: "Recalculate catalog heroic scores for every hero? Run this after medal import or catalog changes.",
      confirmLabel: "Recalculate",
    });
    if (!ok) return;
    setRecalculating(true);
    setRecalcResult("");
    const res = await fetch("/api/scoring-config/recalculate", { method: "POST" });
    const data = await res.json();
    setRecalculating(false);
    if (res.ok) {
      setRecalcResult(`${data.recalculated} hero score(s) recalculated.`);
    } else {
      setRecalcResult("Recalculation failed.");
    }
  };

  if (loading) return <AdminLoader label="Loading medal catalog…" />;

  return (
    <div className="animate-fade-in-up space-y-6">
      <MedalWikiModal medal={modalMedal} onClose={() => setModalMedal(null)} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <h1 className="text-2xl font-bold">USM-25.2 Scoring</h1>
      </div>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-base font-semibold text-[var(--color-gold)] mb-2">Heroic matrix (summary)</h2>
        <div className="text-xs text-[var(--color-text-muted)] leading-relaxed space-y-2">
          <p>
            <span className="text-[var(--color-text)]">Core rule:</span> Standard service ribbons, training
            awards, and campaign medals score{" "}
            <span className="text-[var(--color-gold)] font-medium">0</span> heroic points. Only documented
            heroism uses the catalog <span className="font-mono text-[11px]">Bong_Score</span> on a 1–100
            logarithmic-style scale. Tier 1 apex decorations (for example Medal of Honor, Victoria Cross)
            use <span className="text-[var(--color-gold)] font-medium">100</span> catalog points; George
            Cross is <span className="text-[var(--color-gold)] font-medium">95</span> in the sheet.
          </p>
          <p>
            <span className="text-[var(--color-text)]">USM-25.2 / matrix 25-2:</span> The U.S. Purple Heart is{" "}
            <span className="font-mono text-[11px]">Valor_Tier 5</span> (wounded in action — rack only,{" "}
            <span className="text-[var(--color-gold)] font-medium">0</span> heroic points), so multiple PHs cannot
            outrank apex gallantry awards on the leaderboard.
          </p>
          <p>
            <span className="text-[var(--color-text)]">Valor_Tier:</span> Only tiers{" "}
            <span className="font-mono text-[11px]">1–4</span> contribute heroic catalog points.{" "}
            <span className="font-mono text-[11px]">Valor_Tier ≥ 5</span> (or service/campaign categories)
            always earns <span className="text-[var(--color-gold)] font-medium">0</span> toward the heroic
            score; those medals still display on the rack. After editing{" "}
            <code className="text-[10px]">Final_Medal_Sheet_Client.csv</code>, run medal import and
            recalculate heroes.
          </p>
          <p>
            <a href="/scoring" className="text-[var(--color-gold)] hover:underline">
              Full methodology (public)
            </a>
            {" — "}U.S. vs Commonwealth parity and V-device rules (catalog-only totals).
          </p>
        </div>
      </section>

      <details className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 group">
        <summary className="text-base font-semibold text-[var(--color-gold)] cursor-pointer list-none flex items-center justify-between gap-2">
          <span>Full methodology (same narrative as public /scoring)</span>
          <span className="text-xs font-normal text-[var(--color-text-muted)] group-open:hidden">Expand</span>
          <span className="text-xs font-normal text-[var(--color-text-muted)] hidden group-open:inline">Collapse</span>
        </summary>
        <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-4">
          <a href="/scoring" className="text-[var(--color-gold)] hover:underline">
            Open public scoring page
          </a>{" "}
          for the same content in print-friendly layout.
        </p>
        <div className="max-h-[70vh] overflow-y-auto space-y-5 pr-1 border-t border-[var(--color-border)] pt-4">
          {USM25_MATRIX_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-[var(--color-gold)] mb-2">{section.title}</h3>
              <ul className="space-y-2 text-xs text-[var(--color-text-muted)] leading-relaxed list-disc pl-4">
                {section.items.map((item, idx) => (
                  <li key={idx} className="marker:text-[var(--color-gold)]/70">
                    <span className="text-[var(--color-text)]">{item.label}</span>
                    {item.points ? (
                      <span className="block sm:inline sm:ml-2 text-[var(--color-gold)] font-semibold">{item.points}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {medals.length > 0 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Medal Reference</h2>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
                Live data from <code className="text-[10px]">MedalType</code> (imported from the client CSV).{" "}
                <strong>VT</strong> = Valor_Tier: 1–4 = heroic catalog points; 5 = shown on rack only (0 heroic pts).{" "}
                <strong>—</strong> = legacy default tier (re-run <code className="text-[10px]">npm run import-medals</code>
                ). <strong>?</strong> = missing or invalid tier. This is not ribbon <em>precedence</em> (sort order uses{" "}
                <code className="text-[10px]">precedenceOrder</code>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadMedalCatalog()}
              disabled={medalsRefreshing}
              className="btn-secondary text-xs shrink-0 self-start disabled:opacity-50"
            >
              {medalsRefreshing ? "Refreshing…" : "Refresh medal catalog"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {medals.map((mt, i) => (
              <button
                key={mt._id}
                type="button"
                onClick={() => openMedalModal(mt._id)}
                disabled={Boolean(modalLoadingId)}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] animate-fade-in-up text-left w-full hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-surface-hover)]/30 transition-colors disabled:opacity-60"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="shadow-md rounded-lg shrink-0">
                  <MedalDisplayThumbRow
                    imageUrl={mt.imageUrl}
                    ribbonImageUrl={mt.ribbonImageUrl}
                    wikiImages={mt.wikiImages}
                    ribbonColors={mt.ribbonColors}
                    shortName={mt.shortName}
                    name={mt.name}
                    borderColor={CATEGORY_COLORS[mt.category] || "#9ca3af"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight truncate">{mt.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[mt.category] || "#9ca3af"}22`,
                        color: CATEGORY_COLORS[mt.category] || "#9ca3af",
                      }}
                    >
                      {mt.category}
                    </span>
                    <span className="score-badge text-[10px] px-1.5 py-0" title="Valor_Tier + catalog Bong_Score">
                      {modalLoadingId === mt._id ? "…" : `${formatValorTierLabel(mt.tier)} · ${catalogBongDisplay(mt)} pts`}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Recalculate all heroes</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Recomputes each hero&apos;s score from the current medal catalog (no stored scoring rules).
        </p>
        <button
          onClick={handleRecalculate}
          disabled={recalculating || !can("/admin/scoring", "canEdit")}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {recalculating ? (
            <>
              <LoadingSpinner size="sm" />
              Recalculating…
            </>
          ) : (
            "Recalculate all hero scores"
          )}
        </button>
        {recalcResult && (
          <p className="text-sm text-[var(--color-text-muted)] mt-3 animate-fade-in">{recalcResult}</p>
        )}
      </section>
      {confirmDialog}
    </div>
  );
}
