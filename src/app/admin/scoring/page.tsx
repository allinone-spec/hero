"use client";

import { useEffect, useState } from "react";
import { AdminLoader } from "@/components/ui/AdminLoader";
import { MedalDisplayThumbRow } from "@/components/medals/MedalDisplayThumb";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface ScoringConfigForm {
  valorDevicePoints: number;
  theaterBonusPerWar: number;
  combatLeadershipBonus: number;
  powHeroismBonus: number;
  woundsBonusPerHeart: number;
  aviationKillThreshold: number;
  aviationKillPtsPerKill: number;
  aviationMissionPts: number;
  submarineShipThreshold: number;
  submarineShipPtsPerShip: number;
  submarineMissionPts: number;
  surfaceEngagementPts: number;
  surfaceMissionPts: number;
  multiServiceBonusPct: number;
  roundingBase: number;
}

interface MedalTypeRef {
  _id: string;
  name: string;
  shortName: string;
  category: string;
  basePoints: number;
  precedenceOrder: number;
  ribbonColors: string[];
  imageUrl: string;
  ribbonImageUrl?: string;
  wikiImages?: { url?: string }[];
}

const DEFAULTS: ScoringConfigForm = {
  valorDevicePoints: 2,
  theaterBonusPerWar: 5,
  combatLeadershipBonus: 10,
  powHeroismBonus: 15,
  woundsBonusPerHeart: 2,
  aviationKillThreshold: 5,
  aviationKillPtsPerKill: 5,
  aviationMissionPts: 10,
  submarineShipThreshold: 5,
  submarineShipPtsPerShip: 5,
  submarineMissionPts: 10,
  surfaceEngagementPts: 5,
  surfaceMissionPts: 10,
  multiServiceBonusPct: 5,
  roundingBase: 5,
};

const CATEGORY_COLORS: Record<string, string> = {
  valor:   "#d4a843",
  service: "#3b82f6",
  foreign: "#10b981",
  other:   "#9ca3af",
};

function RuleInput({
  label,
  description,
  value,
  onChange,
  suffix = "pts",
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--color-border)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="admin-input w-24 text-right"
        />
        <span className="text-xs text-[var(--color-text-muted)] w-8">{suffix}</span>
      </div>
    </div>
  );
}

export default function AdminScoringPage() {
  const { can } = usePrivileges();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [form, setForm] = useState<ScoringConfigForm>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const [recalcResult, setRecalcResult] = useState<string>("");
  const [medals, setMedals] = useState<MedalTypeRef[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/scoring-config").then((r) => r.json()),
      fetch("/api/medal-types").then((r) => r.json()),
    ]).then(([configData, medalData]) => {
      setForm({
        valorDevicePoints: configData.valorDevicePoints ?? DEFAULTS.valorDevicePoints,
        theaterBonusPerWar: configData.theaterBonusPerWar ?? DEFAULTS.theaterBonusPerWar,
        combatLeadershipBonus: configData.combatLeadershipBonus ?? DEFAULTS.combatLeadershipBonus,
        powHeroismBonus: configData.powHeroismBonus ?? DEFAULTS.powHeroismBonus,
        woundsBonusPerHeart: configData.woundsBonusPerHeart ?? DEFAULTS.woundsBonusPerHeart,
        aviationKillThreshold: configData.aviationKillThreshold ?? DEFAULTS.aviationKillThreshold,
        aviationKillPtsPerKill: configData.aviationKillPtsPerKill ?? DEFAULTS.aviationKillPtsPerKill,
        aviationMissionPts: configData.aviationMissionPts ?? DEFAULTS.aviationMissionPts,
        submarineShipThreshold: configData.submarineShipThreshold ?? DEFAULTS.submarineShipThreshold,
        submarineShipPtsPerShip: configData.submarineShipPtsPerShip ?? DEFAULTS.submarineShipPtsPerShip,
        submarineMissionPts: configData.submarineMissionPts ?? DEFAULTS.submarineMissionPts,
        surfaceEngagementPts: configData.surfaceEngagementPts ?? DEFAULTS.surfaceEngagementPts,
        surfaceMissionPts: configData.surfaceMissionPts ?? DEFAULTS.surfaceMissionPts,
        multiServiceBonusPct: configData.multiServiceBonusPct ?? DEFAULTS.multiServiceBonusPct,
        roundingBase: configData.roundingBase ?? DEFAULTS.roundingBase,
      });
      if (Array.isArray(medalData)) {
        setMedals(medalData.sort((a: MedalTypeRef, b: MedalTypeRef) => a.precedenceOrder - b.precedenceOrder));
      }
      setLoading(false);
    });
  }, []);

  const set = (key: keyof ScoringConfigForm) => (v: number) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("");
    const res = await fetch("/api/scoring-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaveStatus(res.ok ? "saved" : "error");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const handleRecalculate = async () => {
    const ok = await confirm({
      title: "Recalculate all scores",
      message: "Recalculate scores for ALL heroes using the current rules? Make sure you save first.",
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

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset scoring rules",
      message: "Reset all rules to default values?",
      danger: true,
      confirmLabel: "Reset",
    });
    if (!ok) return;
    setForm(DEFAULTS);
  };

  if (loading) return <AdminLoader label="Loading scoring config…" />;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <h1 className="text-2xl font-bold">USM-25 Scoring Rules</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={!can("/admin/scoring", "canEdit")}
            className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !can("/admin/scoring", "canEdit")}
            className="btn-primary text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                Saving…
              </>
            ) : (
              "Save Rules"
            )}
          </button>
        </div>
      </div>

      {saveStatus === "saved" && (
        <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 p-3 rounded animate-fade-in">
          Rules saved successfully.
        </div>
      )}
      {saveStatus === "error" && (
        <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded animate-fade-in">
          Failed to save rules.
        </div>
      )}

      {/* Medal Reference Grid */}
      {medals.length > 0 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Medal Reference</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            All medal types ranked by precedence order.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {medals.map((mt, i) => (
              <div
                key={mt._id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] animate-fade-in-up"
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
                {/* Info */}
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
                    <span className="score-badge text-[10px] px-1.5 py-0">{mt.basePoints} pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Base Scoring */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Base Scoring</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Flat bonuses applied to every hero.</p>
        <RuleInput
          label="Valor Device Points"
          description="Points per V device on any medal"
          value={form.valorDevicePoints}
          onChange={set("valorDevicePoints")}
        />
        <RuleInput
          label="Theater Bonus (per war)"
          description="Points per distinct war or theater served"
          value={form.theaterBonusPerWar}
          onChange={set("theaterBonusPerWar")}
        />
        <RuleInput
          label="Combat Leadership Bonus"
          description="Flat bonus for unit-level command in combat"
          value={form.combatLeadershipBonus}
          onChange={set("combatLeadershipBonus")}
        />
        <RuleInput
          label="POW / Heroism Bonus"
          description="Flat bonus for extended captivity, escape, or leadership under torture"
          value={form.powHeroismBonus}
          onChange={set("powHeroismBonus")}
        />
        <RuleInput
          label="Wounds Bonus (per additional Purple Heart)"
          description="Points per Purple Heart beyond the first"
          value={form.woundsBonusPerHeart}
          onChange={set("woundsBonusPerHeart")}
        />
      </section>

      {/* Aviation */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Aviation Modifiers</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Applied when a hero&apos;s combat achievement type is set to Aviation.</p>
        <RuleInput
          label="Kill Threshold"
          description="Confirmed kills required before the bonus applies"
          value={form.aviationKillThreshold}
          onChange={set("aviationKillThreshold")}
          suffix="kills"
        />
        <RuleInput
          label="Points per Kill (beyond threshold)"
          description="Points for each kill above the threshold"
          value={form.aviationKillPtsPerKill}
          onChange={set("aviationKillPtsPerKill")}
        />
        <RuleInput
          label="Points per Defining Mission"
          description="Points per historically defining aviation mission"
          value={form.aviationMissionPts}
          onChange={set("aviationMissionPts")}
        />
      </section>

      {/* Submarine */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Submarine Modifiers</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Applied when a hero&apos;s combat achievement type is set to Submarine.</p>
        <RuleInput
          label="Ship Threshold"
          description="Ships sunk required before the bonus applies"
          value={form.submarineShipThreshold}
          onChange={set("submarineShipThreshold")}
          suffix="ships"
        />
        <RuleInput
          label="Points per Ship (beyond threshold)"
          description="Points for each ship sunk above the threshold"
          value={form.submarineShipPtsPerShip}
          onChange={set("submarineShipPtsPerShip")}
        />
        <RuleInput
          label="Points per Extreme Risk Mission"
          description="Points per record or extreme risk submarine mission"
          value={form.submarineMissionPts}
          onChange={set("submarineMissionPts")}
        />
      </section>

      {/* Surface */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Surface / Naval Modifiers</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Applied when a hero&apos;s combat achievement type is set to Surface/Naval.</p>
        <RuleInput
          label="Points per Major Engagement"
          description="Points per major naval engagement"
          value={form.surfaceEngagementPts}
          onChange={set("surfaceEngagementPts")}
        />
        <RuleInput
          label="Points per Conspicuous Bravery Mission"
          description="Points per defining mission showing conspicuous bravery"
          value={form.surfaceMissionPts}
          onChange={set("surfaceMissionPts")}
        />
      </section>

      {/* Global Modifiers */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Global Modifiers</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Applied after all other bonuses are summed.</p>
        <RuleInput
          label="Multi-Service / Multi-War Bonus"
          description="Percentage of subtotal added for multi-service or multi-war service"
          value={form.multiServiceBonusPct}
          onChange={set("multiServiceBonusPct")}
          suffix="%"
        />
        <RuleInput
          label="Rounding Base"
          description="Final score is rounded to the nearest multiple of this value"
          value={form.roundingBase}
          onChange={set("roundingBase")}
          suffix="pts"
        />
      </section>

      {/* Recalculate */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-base font-semibold text-[var(--color-gold)] mb-1">Recalculate All Heroes</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          After saving new rules, use this to recalculate every hero&apos;s score using the updated config.
          Save your rules first before recalculating.
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
            "Recalculate All Hero Scores"
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
