"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import MedalWikiModal from "@/components/medals/MedalWikiModal";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import ScoreBreakdown from "@/components/scoring/ScoreBreakdown";
import RankInsignia from "@/components/heroes/RankInsignia";
import { describeMedalDevices, type MedalDeviceRule } from "@/lib/medal-device-rules";
import { buildRibbonRackMedals, sortHeroMedalEntries, type RackRenderMedal } from "@/lib/rack-engine";
import { ScoreBreakdownItem } from "@/types";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";

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
  adoptionExpiry?: string | null;
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
      deviceRule?: MedalDeviceRule;
      countryCode?: string;
      inventoryCategory?: string;
      wikiSummary?: string;
      history?: string;
      awardCriteria?: string;
      description?: string;
      wikipediaUrl?: string;
      appearance?: string;
      established?: string;
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
  countryCode?: string;
}

interface Props {
  hero: HeroDetail;
  scoreBreakdown: ScoreBreakdownItem[];
  scoreTotal: number;
  rankPosition: number;
  /** Published hero count — for "rank of N" global context */
  totalPublishedHeroes?: number;
  /** Branch / specialty / conflict slices (same score ordering as global) */
  contextualRanks?: { label: string; rank: number; total: number }[];
  profileBackHref: string;
  profileBackLabel: string;
}

const profileBackNavClass =
  "text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1";

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function SupportAdoptPanel({
  heroId,
  ownerUserId,
  adoptionExpiry,
  heroSlug,
}: {
  heroId: string;
  ownerUserId?: string | null;
  adoptionExpiry?: string | null;
  heroSlug: string;
}) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [showVerifyEmailCta, setShowVerifyEmailCta] = useState(false);
  /** null = session check not finished */
  const [me, setMe] = useState<null | { signedIn: boolean; userId: string | null }>(null);

  const ownerId = ownerUserId ? String(ownerUserId) : null;
  const hasActiveOwner = Boolean(
    ownerId && (!adoptionExpiry || new Date(adoptionExpiry).getTime() > Date.now())
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site/me", { cache: "no-store", credentials: "include" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) {
          const j = (await r.json().catch(() => ({}))) as { id?: string };
          setMe({ signedIn: true, userId: j.id ? String(j.id) : null });
        } else {
          setMe({ signedIn: false, userId: null });
        }
      })
      .catch(() => {
        if (!cancelled) setMe({ signedIn: false, userId: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const iAmOwner = Boolean(ownerId && me?.signedIn && me.userId && ownerId === me.userId);

  if (hasActiveOwner && me === null) {
    return (
      <div
        className="no-print mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/30 p-4"
        aria-hidden
      >
        <div className="mb-2 h-3 w-36 rounded bg-[var(--color-border)]/60" />
        <div className="h-3 w-full max-w-md rounded bg-[var(--color-border)]/40" />
      </div>
    );
  }

  if (hasActiveOwner && iAmOwner) {
    return (
      <div className="no-print mt-6 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-2">
          Support & adopt
        </h3>
        <p className="text-sm text-[var(--color-text)] mb-3">
          You are the named supporter for this hero.
          {adoptionExpiry ? ` Your support is active until ${new Date(adoptionExpiry).toLocaleDateString()}.` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/heroes/${heroSlug}/edit`} className="btn-secondary text-sm">
            Edit tribute
          </Link>
          <Link href="/my-heroes" className="btn-secondary text-sm">
            My Heroes
          </Link>
        </div>
      </div>
    );
  }

  if (hasActiveOwner && !iAmOwner) {
    return (
      <div className="no-print mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-gold)] mb-2">
          Support & adopt
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          This profile already has a named supporter. Adoptions are limited to one active supporter per hero.
        </p>
      </div>
    );
  }

  async function startCheckout() {
    setBusy(true);
    setHint("");
    setShowVerifyEmailCta(false);
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
      const msg = data.error || "Checkout unavailable";
      setHint(msg);
      setShowVerifyEmailCta(res.status === 403 && /verify your email/i.test(msg));
    } catch {
      setHint("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-gold)] mb-2">
        Support & adopt
      </h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-3">
        Become the named supporter for this profile and edit the tribute biography and portrait (Owner account
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
      {showVerifyEmailCta && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          <Link href="/login?role=member" className="text-[var(--color-gold)] hover:underline">
            Sign in
          </Link>{" "}
          and use &quot;Resend verification&quot; if you did not get the email, or open the link we sent when you
          registered.
        </p>
      )}
      {me?.signedIn && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          You&apos;re signed in as an Owner — use the button above to open secure checkout.
        </p>
      )}
      {me && !me.signedIn && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          <Link href="/login?role=member" className="text-[var(--color-gold)] hover:underline">
            Sign in
          </Link>{" "}
          as an Owner before adopting; checkout is tied to your Owner account.
        </p>
      )}
    </div>
  );
}

/** After Stripe Checkout, confirm adoption when webhooks are not delivered (e.g. local dev). */
function StripeAdoptionReturnSync({ heroSlug }: { heroSlug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    const adopted = searchParams.get("adopted");
    const sessionId = searchParams.get("session_id");
    if (adopted !== "1" || !sessionId || ran.current) return;
    ran.current = true;

    (async () => {
      const res = await fetch("/api/stripe/verify-adoption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setVerifyError(
          data.error ||
            "Could not confirm adoption in the app. If you were charged, check My Heroes later or contact support.",
        );
        return;
      }
      router.replace(`/heroes/${heroSlug}`, { scroll: false });
      router.refresh();
    })();
  }, [searchParams, router, heroSlug]);

  if (!verifyError) return null;
  return (
    <p className="no-print mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {verifyError}
    </p>
  );
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function HeroDetailClient({
  hero,
  scoreBreakdown,
  scoreTotal,
  rankPosition,
  totalPublishedHeroes,
  contextualRanks,
  profileBackHref,
  profileBackLabel,
}: Props) {
  const [selectedMedal, setSelectedMedal] = useState<RackRenderMedal | null>(null);

  const sortedMedals = sortHeroMedalEntries([...hero.medals], {
    nationalCountryCode: hero.countryCode,
  });

  const ribbonMedals = buildRibbonRackMedals(sortedMedals, {
    serviceBranch: hero.branch,
    nationalCountryCode: hero.countryCode,
  });

  // Split biography into paragraphs
  const bioParas = hero.biography
    ? hero.biography.split(/\n\n+/).filter((p) => p.trim())
    : [];

  return (
    <div className="animate-fade-in-up">
      <MedalWikiModal medal={selectedMedal} onClose={() => setSelectedMedal(null)} />
      <Suspense fallback={null}>
        <StripeAdoptionReturnSync heroSlug={hero.slug} />
      </Suspense>
      {/* Navigation — hidden in print */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={profileBackHref} className={profileBackNavClass}>
          {profileBackLabel}
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
          <div className="absolute top-4 left-4 no-print flex flex-col items-start gap-1.5 max-w-[min(100%,14rem)]">
            <span className="score-badge text-sm" title="Live USM-25 total (same rules as breakdown below)">
              {scoreTotal} pts
            </span>
            <span className="text-xs font-semibold text-[var(--color-gold)]">
              #{rankPosition}
              {typeof totalPublishedHeroes === "number" ? ` of ${totalPublishedHeroes}` : ""} global
            </span>
            {contextualRanks && contextualRanks.length > 0 && (
              <ul className="text-[10px] leading-snug text-[var(--color-text-muted)] space-y-0.5 list-none pl-0 mt-1 border-t border-[var(--color-border)]/60 pt-1.5">
                {contextualRanks.map((row, idx) => (
                  <li key={`${row.label}-${idx}`}>
                    <span className="text-[var(--color-text-muted)]">{row.label}:</span>{" "}
                    <span className="text-[var(--color-gold)]/90">
                      #{row.rank} of {row.total}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
                <SafeWikimediaImg
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
                  || describeMedalDevices({
                    count: m.count,
                    hasValor: m.hasValor,
                    arrowheads: m.arrowheads,
                    deviceRule: m.medalType.deviceRule ?? m.medalType.deviceLogic,
                    serviceBranch: hero.branch,
                  });
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
                    rowLayout="rankListPyramid"
                    countryCode={hero.countryCode}
                    scale={3}
                    onRibbonClick={setSelectedMedal}
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
        <SupportAdoptPanel
          heroId={hero._id}
          ownerUserId={hero.ownerUserId}
          adoptionExpiry={hero.adoptionExpiry}
          heroSlug={hero.slug}
        />
        <ScoreBreakdown breakdown={scoreBreakdown} total={scoreTotal} />
      </div>

    </div>
  );
}
