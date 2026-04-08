"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AvatarFallback from "@/components/ui/AvatarFallback";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";
import { AdminLoader } from "@/components/ui/AdminLoader";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import { buildRibbonRackMedals, sortHeroMedalEntries } from "@/lib/rack-engine";
import type { MedalDeviceRule } from "@/lib/medal-device-rules";

interface MedalType {
  _id: string;
  name: string;
  shortName: string;
  basePoints: number;
  ribbonColors: string[];
  precedenceOrder: number;
  ribbonImageUrl?: string;
  deviceLogic?: string;
  deviceRule?: MedalDeviceRule;
  countryCode?: string;
  inventoryCategory?: string;
}

interface Medal {
  medalType: MedalType;
  count: number;
  hasValor: boolean;
  valorDevices: number;
  arrowheads?: number;
  deviceImages?: { url: string; deviceType: string; count: number }[];
  wikiRibbonUrl?: string;
}

interface Hero {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  branch: string;
  avatarUrl?: string;
  score: number;
  published: boolean;
  biography: string;
  wars: string[];
  combatTours: number;
  hadCombatCommand: boolean;
  powHeroism: boolean;
  multiServiceOrMultiWar: boolean;
  countryCode?: string;
  combatAchievements: {
    type: string;
    confirmedKills: number;
    probableKills: number;
    damagedAircraft: number;
    flightLeadership: boolean;
    shipsSunk: number;
    warPatrols: number;
    majorEngagements: number;
    definingMissions: number;
  };
  medals: Medal[];
}

/* -- Section header reused from HeroForm pattern -- */
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-[var(--color-gold)]">{title}</h2>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

/* -- Read-only field -- */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="text-sm text-[var(--color-text)]">{value}</div>
    </div>
  );
}

/* -- Boolean indicator -- */
function BooleanField({ label, value, description }: { label: string; value: boolean; description?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0">
      <div
        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
          value
            ? "bg-green-500/20 text-green-500"
            : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
        }`}
      >
        {value ? "\u2713" : "\u2013"}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${value ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

export default function ViewHeroPage() {
  const params = useParams();
  const [hero, setHero] = useState<Hero | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/heroes/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Hero not found");
        return r.json();
      })
      .then((data) => {
        setHero(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load hero");
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return <AdminLoader label="Loading hero details\u2026" />;

  if (error || !hero) {
    return (
      <div className="animate-fade-in-up">
        <div className="text-center py-16">
          <p className="text-4xl mb-3">!</p>
          <p className="font-semibold text-red-400 mb-2">{error || "Hero not found"}</p>
          <Link href="/admin/heroes" className="btn-secondary text-sm mt-4 inline-block">
            Back to Heroes
          </Link>
        </div>
      </div>
    );
  }

  const orderedMedalEntries = sortHeroMedalEntries(
    hero.medals.filter((m) => m.medalType),
    { nationalCountryCode: hero.countryCode },
  );
  const ribbonMedals = buildRibbonRackMedals(orderedMedalEntries, {
    serviceBranch: hero.branch,
    nationalCountryCode: hero.countryCode,
  });

  const combatType = hero.combatAchievements?.type;
  const hasCombatAchievements = combatType && combatType !== "none";

  const COMBAT_LABELS: Record<string, string> = {
    infantry: "Infantry", armor: "Armor / Cavalry", artillery: "Artillery",
    aviation: "Aviation", airborne: "Airborne", special_operations: "Special Operations",
    submarine: "Submarine", surface: "Surface / Naval", amphibious: "Amphibious",
    reconnaissance: "Reconnaissance", air_defense: "Air Defense", engineering: "Combat Engineering",
    signal: "Signal / Comms", intelligence: "Intelligence", medical: "Combat Medical",
    logistics: "Logistics", chemical: "CBRN", electronic_warfare: "Electronic Warfare",
    cyber: "Cyber Warfare", military_police: "Military Police", ordnance: "Ordnance / EOD",
    sniper: "Sniper",
  };
  const combatTypeLabel = (combatType && COMBAT_LABELS[combatType]) || "None";

  return (
    <div className="animate-fade-in-up mx-auto w-full max-w-4xl">
      {/* ── Navigation bar ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href="/admin/heroes" className="btn-secondary text-sm py-1.5 px-4">
          &larr; Back to Heroes
        </Link>
        <Link
          href={`/admin/heroes/${hero._id}/edit`}
          className="btn-primary text-sm py-1.5 px-4"
        >
          Edit Hero
        </Link>
        {hero.published && hero.slug && (
          <Link
            href={`/heroes/${hero.slug}`}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors ml-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Public Profile &rarr;
          </Link>
        )}
      </div>

      {/* ── Hero header ───────────────────────────────────────── */}
      <section className="hero-card p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full overflow-hidden shrink-0"
            style={{ boxShadow: "0 0 0 3px var(--color-gold)" }}
          >
            {hero.avatarUrl ? (
              <SafeWikimediaImg
                src={hero.avatarUrl}
                alt={hero.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <AvatarFallback name={hero.name} size={96} />
            )}
          </div>

          {/* Name, rank, branch, wars, score, published */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{hero.name}</h1>
              <span className="score-badge text-lg">{hero.score} pts</span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                  hero.published
                    ? "bg-green-500/15 text-green-600 border-green-500/30"
                    : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                }`}
              >
                {hero.published ? "Published" : "Draft"}
              </span>
            </div>
            <p className="text-[var(--color-text-muted)]">
              {hero.rank} &mdash; {hero.branch}
            </p>
            {hero.wars && hero.wars.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {hero.wars.map((war) => (
                  <span
                    key={war}
                    className="text-xs px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full"
                  >
                    {war}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Content grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Awards & Medals ─────────────────────────────────── */}
        <section className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <SectionHeader
            title="Awards & Medals"
            sub={`${orderedMedalEntries.length} decoration${orderedMedalEntries.length !== 1 ? "s" : ""} on record`}
          />

          {orderedMedalEntries.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
              No medals recorded.
            </p>
          ) : (
            <>
              {ribbonMedals.length > 0 && (
                <div className="mb-5 flex w-full justify-center border-b border-[var(--color-border)] pb-5">
                  <RibbonRack
                    medals={ribbonMedals}
                    rowLayout="rankListPyramid"
                    countryCode={hero.countryCode}
                    scale={3}
                  />
                </div>
              )}
            <div className="space-y-1">
              {orderedMedalEntries.map((m, idx) => (
                <div
                  key={idx}
                  className="py-2 px-3 border-b border-[var(--color-border)] last:border-0"
                >
                  <Link
                    href={`/medals/${m.medalType._id}`}
                    className="text-sm font-medium hover:text-[var(--color-gold)] transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.medalType.name}{m.count > 1 ? ` (${m.count})` : ""}
                  </Link>
                </div>
              ))}
            </div>
            </>
          )}
        </section>

        {/* ── Biography ───────────────────────────────────────── */}
        {hero.biography && (
          <section className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <SectionHeader title="Biography" />
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap">
              {hero.biography}
            </p>
          </section>
        )}

        {/* ── Service Record ──────────────────────────────────── */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <SectionHeader title="Service Record" />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Combat Tours" value={hero.combatTours} />
            <Field
              label="Wars / Theaters"
              value={
                hero.wars && hero.wars.length > 0
                  ? hero.wars.join(", ")
                  : null
              }
            />
          </div>

          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <BooleanField
              label="Combat Command"
              value={hero.hadCombatCommand}
              description="Held unit-level command in active combat"
            />
            <BooleanField
              label="POW / Heroism"
              value={hero.powHeroism}
              description="Extended captivity, escape, or leadership under torture"
            />
            <BooleanField
              label="Multi-Service or Multi-War"
              value={hero.multiServiceOrMultiWar}
              description="Served in multiple branches or across multiple wars"
            />
          </div>
        </section>

        {/* ── Combat Achievements ─────────────────────────────── */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <SectionHeader title="Combat Achievements" />

          <Field label="Type" value={combatTypeLabel} />

          {hasCombatAchievements && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
              {combatType === "aviation" && (
                <>
                  <Field
                    label="Confirmed Kills"
                    value={hero.combatAchievements.confirmedKills}
                  />
                  <Field
                    label="Probable Kills"
                    value={hero.combatAchievements.probableKills ?? 0}
                  />
                  <Field
                    label="Aircraft Damaged"
                    value={hero.combatAchievements.damagedAircraft ?? 0}
                  />
                  <Field
                    label="Flight leadership"
                    value={hero.combatAchievements.flightLeadership ? "Yes" : "No"}
                  />
                </>
              )}
              {combatType === "submarine" && (
                <>
                  <Field
                    label="Ships Sunk"
                    value={hero.combatAchievements.shipsSunk}
                  />
                  <Field
                    label="War Patrols"
                    value={hero.combatAchievements.warPatrols ?? 0}
                  />
                </>
              )}
              {(combatType === "surface" || !["aviation", "submarine"].includes(combatType!)) && (
                <Field
                  label="Major Engagements"
                  value={hero.combatAchievements.majorEngagements}
                />
              )}
              <Field
                label="Defining Missions"
                value={hero.combatAchievements.definingMissions}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
