"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import type { RibbonMedal } from "@/components/ribbon-rack/RibbonRack";
import MedalWikiModal from "@/components/medals/MedalWikiModal";
import ScoreBreakdown from "@/components/scoring/ScoreBreakdown";
import RankInsignia from "@/components/heroes/RankInsignia";
import { ScoreBreakdownItem } from "@/types";

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface HeroDetail {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  branch: string;
  avatarUrl?: string;
  score: number;
  biography: string;
  wars: string[];
  combatTours: number;
  ownerUserId?: string | null;
  medals: {
    medalType: {
      _id: string;
      name: string;
      shortName: string;
      precedenceOrder: number;
      ribbonColors: string[];
      basePoints: number;
      imageUrl?: string;
      ribbonImageUrl?: string;
      deviceLogic?: string;
      wikiSummary?: string;
    };
    count: number;
    hasValor: boolean;
    valorDevices: number;
    arrowheads?: number;
    deviceImages?: { url: string; deviceType: string; count: number }[];
    wikiRibbonUrl?: string;
    wikiDeviceText?: string;
  }[];
  ribbonMaxPerRow?: number;
  rackGap?: number;
}

interface Props {
  hero: HeroDetail;
  scoreBreakdown: ScoreBreakdownItem[];
  scoreTotal: number;
  rankPosition: number;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

/** Describe OLC / Stars / V-devices for a medal entry */
function describeDevices(count: number, hasValor: boolean, branch: string): string {
  const parts: string[] = [];
  const additional = Math.max(0, count - 1);

  if (additional > 0) {
    const silver = Math.floor(additional / 5);
    const bronze = additional % 5;
    const isNavy = /navy|marine|coast guard/i.test(branch);

    if (isNavy) {
      if (silver > 0) parts.push(`${silver} Silver Star${silver > 1 ? "s" : ""}`);
      if (bronze > 0) parts.push(`${bronze} Gold Star${bronze > 1 ? "s" : ""}`);
    } else {
      if (silver > 0) parts.push(`${silver} Silver Oak Leaf Cluster${silver > 1 ? "s" : ""}`);
      if (bronze > 0) parts.push(`${bronze} Bronze Oak Leaf Cluster${bronze > 1 ? "s" : ""}`);
    }
  }

  if (hasValor) parts.push('"V" Device');

  return parts.length > 0 ? `w/ ${parts.join(" & ")}` : "";
}

/** Check if medal is a unit citation (gets gold frame on ribbon) */
function isUnitCitation(name: string): boolean {
  return /\bunit\b/i.test(name) || /\bpresidential.*citation\b/i.test(name);
}

function AdoptHeroCta({ heroId, hasOwner }: { heroId: string; hasOwner: boolean }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [memberSignedIn, setMemberSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site/me", { cache: "no-store", credentials: "include" })
      .then((r) => {
        if (!cancelled) setMemberSignedIn(r.ok);
      })
      .catch(() => {
        if (!cancelled) setMemberSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (hasOwner) return null;

  async function startCheckout() {
    setBusy(true);
    setHint("");
    try {
      const res = await fetch("/api/stripe/create-adoption-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ heroId }),
      });
      let data: { url?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setHint(res.ok ? "Checkout unavailable" : `Request failed (${res.status})`);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setHint(data.error || "Checkout unavailable");
    } catch {
      setHint("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4 mt-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-gold)] mb-2">
        Support & adopt
      </h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-3">
        Become the named supporter for this profile and edit the tribute biography and portrait (member account
        required). Proceeds help keep the archive online.
      </p>
      <button
        type="button"
        onClick={startCheckout}
        disabled={busy}
        className="btn-secondary text-sm disabled:opacity-60"
      >
        {busy ? "Redirecting…" : "Adopt this hero"}
      </button>
      {hint && <p className="text-xs text-red-300 mt-2">{hint}</p>}
      {memberSignedIn === true && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          You&apos;re signed in as a site member — use the button above to open secure checkout.
        </p>
      )}
      {memberSignedIn === false && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          <Link href="/login?role=member" className="text-[var(--color-gold)] hover:underline">
            Sign in
          </Link>{" "}
          as a site member before adopting; checkout is tied to your member account.
        </p>
      )}
    </div>
  );
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function HeroDetailClient({
  hero,
  scoreBreakdown,
  scoreTotal,
  rankPosition,
}: Props) {
  const [ribbonModalMedal, setRibbonModalMedal] = useState<RibbonMedal | null>(null);

  const sortedMedals = [...hero.medals]
    .filter((m) => m.medalType)
    .sort((a, b) => a.medalType.precedenceOrder - b.medalType.precedenceOrder);

  const ribbonMedals = sortedMedals.map((m) => ({
    medalId: m.medalType._id,
    name: m.medalType.name,
    count: m.count,
    precedenceOrder: m.medalType.precedenceOrder,
    ribbonColors: m.medalType.ribbonColors?.length > 0 ? m.medalType.ribbonColors : ["#808080"],
    ribbonImageUrl: m.wikiRibbonUrl || m.medalType.ribbonImageUrl,
    hasValor: m.hasValor,
    arrowheads: m.arrowheads ?? 0,
    isUnitCitation: isUnitCitation(m.medalType.name),
    deviceImages: m.deviceImages,
    deviceLogic: m.medalType.deviceLogic,
    wikiSummary: m.medalType.wikiSummary,
  }));

  const rackMaxPerRow = hero.ribbonMaxPerRow || 3;

  // Split biography into paragraphs
  const bioParas = hero.biography
    ? hero.biography.split(/\n\n+/).filter((p) => p.trim())
    : [];

  const hasOwner = Boolean(hero.ownerUserId);

  return (
    <div className="animate-fade-in-up">
      {/* Navigation — hidden in print */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="/rankings"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Rankings
        </Link>
        <button
          onClick={() => window.print()}
          className="btn-secondary text-sm inline-flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Profile
        </button>
      </div>

      {/* ── Print-Ready Profile ─────────────────────────────────────────────── */}
      <div className="hero-profile-page bg-white text-black border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Profile Header */}
        <div className="relative text-center px-6 pt-8 pb-6 border-b border-[var(--color-border)]">
          {/* Score + Rank — top left */}
          <div className="absolute top-4 left-4 no-print flex flex-col items-start gap-1.5">
            <span className="score-badge text-sm">{hero.score} pts</span>
            <span className="text-xs font-semibold text-[var(--color-gold)]">Ranked #{rankPosition}</span>
          </div>

          {/* Rank insignia — top right */}
          <div className="absolute top-4 right-4">
            <RankInsignia rank={hero.rank} branch={hero.branch} size={52} />
          </div>

          {/* Portrait */}
          <div className="inline-block mb-3">
            <div
              className="w-28 h-36 sm:w-32 sm:h-40 rounded overflow-hidden mx-auto"
              style={{ border: "3px solid var(--color-gold)" }}
            >
              {hero.avatarUrl ? (
                <img
                  src={hero.avatarUrl}
                  alt={hero.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full bg-[var(--color-bg)] flex items-center justify-center text-4xl font-bold text-[var(--color-text-muted)]">
                  {hero.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Name & Rank */}
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider profile-name">
            {hero.name}
          </h1>
          <p className="text-base text-[var(--color-text-muted)] mt-1 tracking-wide">
            {hero.rank}, {hero.branch}
          </p>


          {/* Wars */}
          {hero.wars.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap justify-center">
              {hero.wars.map((war) => (
                <span
                  key={war}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-full"
                >
                  {war}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Two-Column Body ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
          {/* Left Column — Awards & Decorations (1/3) */}
          <div className="md:col-span-1 px-5 py-5 md:border-r border-[var(--color-border)]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-4">
              Awards & Decorations
            </h2>
            <ol className="space-y-1.5 text-sm list-none">
              {sortedMedals.map((m, idx) => {
                const devices = m.wikiDeviceText
                  || describeDevices(m.count, m.hasValor, hero.branch);
                return (
                  <li key={idx} className="py-1.5 border-b border-[var(--color-border)]/50 last:border-0">
                    <Link
                      href={`/medals/${m.medalType._id}`}
                      className="font-medium hover:text-[var(--color-gold)] transition-colors print-link"
                    >
                      {m.medalType.name}
                      {m.count > 1 && !devices ? ` (${m.count})` : ""}
                    </Link>
                    {devices && (
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5 italic leading-snug">
                        {devices}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Right Column — Ribbon Rack + Biography (2/3) */}
          <div className="md:col-span-2 px-5 py-5">
            {/* Ribbon Rack */}
            {ribbonMedals.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-3">
                  Ribbon Rack
                </h2>
                <div className="flex justify-center">
                  <RibbonRack
                    medals={ribbonMedals}
                    maxPerRow={rackMaxPerRow}
                    scale={3}
                    onRibbonClick={(m) => setRibbonModalMedal(m)}
                  />
                </div>
              </div>
            )}

            {/* Biography */}
            {bioParas.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-3">
                  Biography
                </h2>
                <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[var(--color-text-muted)] profile-bio">
                  {bioParas.map((para, idx) => (
                    <p key={idx}>{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Score Breakdown (web only) ──────────────────────────────────────── */}
      <div className="no-print mt-8">
        <AdoptHeroCta heroId={hero._id} hasOwner={hasOwner} />
        <ScoreBreakdown breakdown={scoreBreakdown} total={scoreTotal} />
      </div>

      <MedalWikiModal
        medal={
          ribbonModalMedal
            ? {
                medalId: ribbonModalMedal.medalId,
                name: ribbonModalMedal.name,
                wikiSummary: ribbonModalMedal.wikiSummary,
              }
            : null
        }
        onClose={() => setRibbonModalMedal(null)}
      />
    </div>
  );
}
